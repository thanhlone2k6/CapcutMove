import fs from 'fs-extra'
import path from 'path'
import archiver from 'archiver'
import { ScanResult } from './assetCollector'

export interface ExportProgress {
  stage: string
  message: string
  processedBytes: number
  totalBytes: number
  percent: number
  speedBytesPerSec: number
  etaSeconds: number | null
  processedFiles: number
  totalFiles: number
}

export interface ExportParams {
  projectPath: string
  projectName: string
  outputFolder: string
  scanResult: ScanResult
  manualResolutions?: Record<string, string>
  overrideZipPath?: string
}

let isCancelled = false

export function cancelCurrentExport() {
  isCancelled = true
}

function safeNum(v: any, fb = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fb
}

function makeProgress(p: Partial<ExportProgress>): ExportProgress {
  const etaRaw = p.etaSeconds
  return {
    stage: p.stage || 'unknown',
    message: p.message || '',
    processedBytes: safeNum(p.processedBytes),
    totalBytes: safeNum(p.totalBytes),
    percent: safeNum(p.percent),
    speedBytesPerSec: safeNum(p.speedBytesPerSec),
    etaSeconds: etaRaw !== undefined && etaRaw !== null && Number.isFinite(etaRaw) ? etaRaw : null,
    processedFiles: safeNum(p.processedFiles),
    totalFiles: safeNum(p.totalFiles)
  }
}

async function calculateTotalSize(params: ExportParams): Promise<number> {
  let total = 0
  const mr = params.manualResolutions || {}
  try {
    const pf = await fs.readdir(params.projectPath, { recursive: true })
    for (const f of pf) {
      try {
        const s = await fs.stat(path.join(params.projectPath, f as string))
        if (s.isFile()) total += s.size
      } catch (_) {}
    }
  } catch (_) {}
  const seen = new Set<string>()
  for (const a of params.scanResult.assets) {
    let sp = a.originalPath
    if (!a.exists && mr[a.id]) sp = mr[a.id]
    const ap = path.resolve(sp)
    if (seen.has(ap)) continue
    seen.add(ap)
    try {
      if (await fs.pathExists(sp)) {
        const s = await fs.stat(sp)
        if (s.isFile()) total += s.size
      }
    } catch (_) {}
  }
  for (const font of params.scanResult.fontReport) {
    if (font.status === 'found' && font.fontPath) {
      try { total += (await fs.stat(font.fontPath)).size } catch (_) {}
    }
  }
  return total
}

export async function exportZip(
  params: ExportParams,
  sendProgress: (info: ExportProgress) => void
): Promise<string> {
  const { projectPath, projectName, outputFolder, scanResult, overrideZipPath } = params
  const mr = params.manualResolutions || {}
  const zipPath = overrideZipPath || path.join(outputFolder, `${projectName}_capcut_package.zip`)
  isCancelled = false
  const startTime = Date.now()
  const emit = (p: Partial<ExportProgress>) => sendProgress(makeProgress(p))

  emit({ stage: 'preparing', message: 'Calculating total size...', processedBytes: 0, totalBytes: 0, percent: 0, speedBytesPerSec: 0, etaSeconds: null, processedFiles: 0, totalFiles: 0 })

  const totalBytes = await calculateTotalSize(params)
  if (totalBytes <= 0) throw new Error('Không có dữ liệu để export.')

  let lastProcessed = 0

  emit({ stage: 'creating_zip', message: 'Creating ZIP...', processedBytes: 0, totalBytes, percent: 0, speedBytesPerSec: 0, etaSeconds: null, processedFiles: 0, totalFiles: 0 })

  const output = fs.createWriteStream(zipPath)
  const archive = archiver('zip', { zlib: { level: 9 } })

  return new Promise((resolve, reject) => {
    let rejected = false

    const doCancel = () => {
      if (rejected) return
      rejected = true
      clearInterval(cancelCheck)
      
      // Stop archiver first
      try {
        archive.unpipe(output)
        archive.removeAllListeners()
        archive.on('error', () => {}) 
        archive.destroy()
      } catch (_) {}
      
      // Then handle output stream
      try {
        output.removeAllListeners()
        output.on('error', () => {})
        output.end()
        output.destroy() 
      } catch (_) {}

      setTimeout(() => fs.remove(zipPath).catch(() => {}), 1000)
      reject(new Error('Export cancelled by user.'))
    }

    const cancelCheck = setInterval(() => {
      if (isCancelled) doCancel()
    }, 500)

    // Suppress stream errors during cancel
    output.on('error', () => {})

    output.on('close', () => {
      clearInterval(cancelCheck)
      if (!rejected) {
        emit({ stage: 'done', message: 'Export complete', processedBytes: totalBytes, totalBytes, percent: 100, speedBytesPerSec: 0, etaSeconds: 0, processedFiles: 0, totalFiles: 0 })
        resolve(zipPath)
      }
    })

    archive.on('error', (err) => {
      clearInterval(cancelCheck)
      if (!rejected) {
        emit({ stage: 'error', message: err.message, processedBytes: lastProcessed, totalBytes, percent: totalBytes > 0 ? Math.floor((lastProcessed / totalBytes) * 100) : 0, speedBytesPerSec: 0, etaSeconds: null })
        reject(err)
      }
    })

    archive.on('progress', (data: any) => {
      if (isCancelled) { doCancel(); return }
      if (rejected) return
      const pb = safeNum(data?.fs?.processedBytes)
      lastProcessed = pb
      const elapsed = (Date.now() - startTime) / 1000
      const speed = elapsed > 0 ? pb / elapsed : 0
      const eta = speed > 0 && totalBytes > 0 ? Math.max(0, (totalBytes - pb) / speed) : null
      const pct = totalBytes > 0 ? Math.min(99, Math.floor((pb / totalBytes) * 100)) : 0

      emit({ stage: 'creating_zip', message: 'Creating ZIP...', processedBytes: pb, totalBytes, percent: pct, speedBytesPerSec: speed, etaSeconds: eta, processedFiles: safeNum(data?.entries?.processed), totalFiles: safeNum(data?.entries?.total) })
    })

    archive.pipe(output)
    archive.directory(projectPath, `project/${projectName}`)

    const pathMap: any[] = []
    const missingFiles: any[] = []
    const foundFiles: any[] = []

    for (const asset of scanResult.assets) {
      let src = asset.originalPath
      let isManual = false
      if (!asset.exists && mr[asset.id]) { src = mr[asset.id]; isManual = true }
      const exists = fs.existsSync(src)
      if (exists && asset.collectedRelativePath) {
        archive.file(src, { name: asset.collectedRelativePath })
        pathMap.push({ originalPath: asset.originalPath, collectedRelativePath: asset.collectedRelativePath, type: asset.type, exists: true, status: isManual ? 'manual_resolved' : 'found' })
        foundFiles.push(asset.originalPath)
      } else {
        missingFiles.push(asset.originalPath)
        pathMap.push({ originalPath: asset.originalPath, exists: false, status: 'missing' })
      }
    }

    for (const font of scanResult.fontReport) {
      if (font.status === 'found' && font.fontPath) {
        archive.file(font.fontPath, { name: `assets_collected/fonts/${font.fontName}` })
      }
    }

    emit({ stage: 'writing_metadata', message: 'Writing metadata and finalizing ZIP...', processedBytes: lastProcessed, totalBytes, percent: totalBytes > 0 ? Math.min(99, Math.floor((lastProcessed / totalBytes) * 100)) : 0, speedBytesPerSec: 0, etaSeconds: null })

    const manifest = { projectName, exportedAt: new Date().toISOString(), totalAssets: foundFiles.length, totalSizeBytes: totalBytes }
    archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' })
    archive.append(JSON.stringify(pathMap, null, 2), { name: 'path_map.json' })
    archive.append(JSON.stringify(missingFiles, null, 2), { name: 'missing_files.json' })
    archive.finalize()
  })
}
