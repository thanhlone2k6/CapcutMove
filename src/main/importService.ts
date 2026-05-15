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
  const startTime = Date.now()
  let processedBytes = 0

  if (isCancelled) throw new Error('Cancelled')

  emit({
    stage: 'extracting_zip', message: 'Reading ZIP structure...',
    processedBytes: 0, totalBytes: 0, percent: 0,
    speedBytesPerSec: 0, etaSeconds: null,
    processedFiles: 0, totalFiles: 0
  })

  // Use Open.file (central directory) instead of streaming Extract.
  // This properly handles ZIP64 format and large files exported from other machines.
  const directory = await unzipper.Open.file(zipPath)
  const files = directory.files.filter((f: any) => f.type === 'File')
  const totalFiles = files.length
  const totalBytes = files.reduce((sum: number, f: any) => sum + safeNum(f.uncompressedSize), 0)

  const tempDir = path.join(app.getPath('temp'), '_capcut_import_' + Date.now())
  await fs.ensureDir(tempDir)

  try {
    let filesDone = 0

    for (const entry of files) {
      if (isCancelled) throw new Error('Import cancelled by user.')

      const outputPath = path.join(tempDir, entry.path)
      await fs.ensureDir(path.dirname(outputPath))

      // Stream each file individually to avoid memory issues with large videos
      await new Promise<void>((resolve, reject) => {
        const src = (entry as any).stream()
        const dest = fs.createWriteStream(outputPath)
        src.on('error', (err: Error) => reject(err))
        dest.on('error', (err: Error) => reject(err))
        dest.on('finish', () => resolve())
        src.pipe(dest)
      })

      filesDone++
      processedBytes += safeNum((entry as any).uncompressedSize)

      const elapsed = (Date.now() - startTime) / 1000
      const speed = elapsed > 0 ? processedBytes / elapsed : 0
      const eta = speed > 0 && totalBytes > 0 ? Math.max(0, (totalBytes - processedBytes) / speed) : null
      const pct = totalBytes > 0 ? Math.min(99, Math.floor((processedBytes / totalBytes) * 100)) : 0

      emit({
        stage: 'extracting_zip',
        message: `Extracting... (${filesDone}/${totalFiles} files)`,
        processedBytes, totalBytes,
        percent: pct,
        speedBytesPerSec: speed,
        etaSeconds: eta,
        processedFiles: filesDone,
        totalFiles
      })
    }

    emit({
      stage: 'importing_project', message: 'Copying project to CapCut folder...',
      processedBytes: totalBytes, totalBytes, percent: 100,
      speedBytesPerSec: 0, etaSeconds: 0,
      processedFiles: totalFiles, totalFiles
    })

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

    emit({
      stage: 'copying_assets', message: 'Moving assets to output folder...',
      processedBytes: totalBytes, totalBytes, percent: 100,
      speedBytesPerSec: 0, etaSeconds: 0,
      processedFiles: totalFiles, totalFiles
    })

    const extractedAssetsDir = path.join(tempDir, 'assets_collected')
    const finalAssetsDir = path.join(targetCapCutFolder, finalProjectName, 'assets_collected')
    if (await fs.pathExists(extractedAssetsDir)) {
      await fs.move(extractedAssetsDir, finalAssetsDir, { overwrite: true })
    }

    if (doPatch) {
      emit({
        stage: 'patching_paths', message: 'Patching media paths...',
        processedBytes: totalBytes, totalBytes, percent: 100,
        speedBytesPerSec: 0, etaSeconds: 0,
        processedFiles: totalFiles, totalFiles
      })

      const pathMapPath = path.join(tempDir, 'path_map.json')
      if (await fs.pathExists(pathMapPath)) {
        const pathMap = await fs.readJson(pathMapPath)
        await patchPaths({ projectPath: targetProjectDir, assetsFolder: finalAssetsDir, pathMap }, sendProgress)
      }
    }

    emit({
      stage: 'done', message: 'Import successful.',
      processedBytes: totalBytes, totalBytes, percent: 100,
      speedBytesPerSec: 0, etaSeconds: 0,
      processedFiles: totalFiles, totalFiles
    })

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
