import { app } from 'electron'
import fs from 'fs-extra'
import path from 'path'
import unzipper from 'unzipper'
import { patchPaths } from './pathPatchService'

export interface ImportParams {
  zipPath: string
  targetCapCutFolder: string
  patchPaths: boolean
  newProjectName?: string
}

export interface ImportProgress {
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

let isCancelled = false
export function cancelCurrentImport() {
  isCancelled = true
}

function safeNum(v: any, fb = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fb
}

function makeProgress(p: Partial<ImportProgress>): ImportProgress {
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

export async function checkZipProject(zipPath: string, targetCapCutFolder: string): Promise<{ projectName: string; exists: boolean }> {
  const directory = await unzipper.Open.file(zipPath)
  const file = directory.files.find((d: any) => d.path === 'manifest.json')
  if (!file) throw new Error('Invalid package: manifest.json not found.')

  const content = await file.buffer()
  const manifest = JSON.parse(content.toString())

  const targetProjectDir = path.join(targetCapCutFolder, manifest.projectName)
  const exists = await fs.pathExists(targetProjectDir)

  return { projectName: manifest.projectName, exists }
}

export async function importPackage(params: ImportParams, sendProgress: (info: any) => void): Promise<any> {
  const { zipPath, targetCapCutFolder, patchPaths: doPatch, newProjectName } = params
  isCancelled = false

  const emit = (p: Partial<ImportProgress>) => sendProgress(makeProgress(p))

  // Get zip total size for progress
  const zipStat = await fs.stat(zipPath)
  const totalBytes = zipStat.size
  const startTime = Date.now()
  let processedBytes = 0

  if (isCancelled) throw new Error('Cancelled')

  emit({ stage: 'extracting_zip', message: 'Extracting package...', processedBytes: 0, totalBytes, percent: 0, speedBytesPerSec: 0, etaSeconds: null, processedFiles: 0, totalFiles: 0 })

  const tempDir = path.join(app.getPath('temp'), '_capcut_import_' + Date.now())
  await fs.ensureDir(tempDir)

  try {
    // Extract with progress tracking via stream bytes
    await new Promise<void>((resolve, reject) => {
      const readStream = fs.createReadStream(zipPath)
      const extractor = unzipper.Extract({ path: tempDir })
      
      let rejected = false
      const checkCancel = setInterval(() => {
        if (isCancelled && !rejected) {
          rejected = true
          clearInterval(checkCancel)
          readStream.unpipe(extractor)
          readStream.destroy()
          extractor.destroy()
          reject(new Error('Import cancelled by user.'))
        }
      }, 500)

      readStream.on('data', (chunk) => {
        if (isCancelled) return
        processedBytes += chunk.length
        const elapsed = (Date.now() - startTime) / 1000
        const speed = elapsed > 0 ? processedBytes / elapsed : 0
        const eta = speed > 0 && totalBytes > 0 ? Math.max(0, (totalBytes - processedBytes) / speed) : null
        const pct = totalBytes > 0 ? Math.min(99, Math.floor((processedBytes / totalBytes) * 100)) : 0

        emit({ stage: 'extracting_zip', message: 'Extracting package...', processedBytes, totalBytes, percent: pct, speedBytesPerSec: speed, etaSeconds: eta, processedFiles: 0, totalFiles: 0 })
      })

      readStream.pipe(extractor)
        .on('close', () => {
          clearInterval(checkCancel)
          if (!rejected) resolve()
        })
        .on('error', (err) => {
          clearInterval(checkCancel)
          if (!rejected) reject(err)
        })
    })

    emit({ stage: 'importing_project', message: 'Copying project to CapCut folder...', processedBytes: totalBytes, totalBytes, percent: 100, speedBytesPerSec: 0, etaSeconds: 0, processedFiles: 0, totalFiles: 0 })

    // Read manifest
    const manifestPath = path.join(tempDir, 'manifest.json')
    if (!(await fs.pathExists(manifestPath))) {
      throw new Error('Invalid package: manifest.json not found.')
    }
    const manifest = await fs.readJson(manifestPath)
    const finalProjectName = newProjectName || manifest.projectName

    const extractedProjectDir = path.join(tempDir, 'project', manifest.projectName)
    const targetProjectDir = path.join(targetCapCutFolder, finalProjectName)

    await fs.copy(extractedProjectDir, targetProjectDir)

    emit({ stage: 'copying_assets', message: 'Moving assets to output folder...', processedBytes: totalBytes, totalBytes, percent: 100, speedBytesPerSec: 0, etaSeconds: 0, processedFiles: 0, totalFiles: 0 })

    const extractedAssetsDir = path.join(tempDir, 'assets_collected')
    const finalAssetsDir = path.join(targetCapCutFolder, finalProjectName, 'assets_collected')
    if (await fs.pathExists(extractedAssetsDir)) {
      await fs.move(extractedAssetsDir, finalAssetsDir, { overwrite: true })
    }

    if (doPatch) {
      emit({ stage: 'patching_paths', message: 'Patching media paths...', processedBytes: totalBytes, totalBytes, percent: 100, speedBytesPerSec: 0, etaSeconds: 0, processedFiles: 0, totalFiles: 0 })

      const pathMapPath = path.join(tempDir, 'path_map.json')
      if (await fs.pathExists(pathMapPath)) {
        const pathMap = await fs.readJson(pathMapPath)
        await patchPaths({ projectPath: targetProjectDir, assetsFolder: finalAssetsDir, pathMap }, sendProgress)
      }
    }

    emit({ stage: 'done', message: 'Import successful.', processedBytes: totalBytes, totalBytes, percent: 100, speedBytesPerSec: 0, etaSeconds: 0, processedFiles: 0, totalFiles: 0 })

    return {
      newProjectPath: targetProjectDir,
      newAssetsPath: finalAssetsDir
    }
  } finally {
    try {
      await fs.remove(tempDir)
    } catch (e) {
      console.warn('Failed to clean up temp dir', e)
    }
  }
}
