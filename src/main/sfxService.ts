import { app, dialog } from 'electron'
import path from 'path'
import fs from 'fs-extra'
import crypto from 'crypto'
import archiver from 'archiver'
import unzipper from 'unzipper'
import { spawn } from 'child_process'
import { ensureFfmpeg } from './videoDownloadService'

export interface SfxFile {
  id: string
  name: string
  filePath: string
  addedAt: number
}

export interface SfxGroup {
  id: string
  name: string
  color: string
  files: SfxFile[]
}

const libraryPath = path.join(app.getPath('userData'), 'sfx-library.json')
const sfxFilesDir = path.join(app.getPath('userData'), 'sfx-files')

/**
 * Loads the SFX library JSON metadata.
 */
export async function loadLibrary(): Promise<SfxGroup[]> {
  try {
    if (await fs.pathExists(libraryPath)) {
      const data = await fs.readJson(libraryPath)
      if (Array.isArray(data)) {
        return data
      }
    }
  } catch (err) {
    console.error('Failed to load SFX library:', err)
  }
  return []
}

/**
 * Saves the SFX library JSON metadata.
 */
export async function saveLibrary(library: SfxGroup[]): Promise<void> {
  try {
    await fs.ensureDir(path.dirname(libraryPath))
    await fs.writeJson(libraryPath, library, { spaces: 2 })
  } catch (err) {
    console.error('Failed to save SFX library:', err)
  }
}

/**
 * Copies external sound files into the app's userData dir and updates database.
 */
export async function addFiles(groupId: string, filePaths: string[]): Promise<SfxFile[]> {
  const targetGroupDir = path.join(sfxFilesDir, groupId)
  await fs.ensureDir(targetGroupDir)

  const addedFiles: SfxFile[] = []

  for (const srcPath of filePaths) {
    try {
      if (!(await fs.pathExists(srcPath))) continue

      const baseName = path.basename(srcPath)
      const ext = path.extname(srcPath)
      const nameWithoutExt = path.basename(srcPath, ext)

      // Auto increment filename if file already exists in group folder
      let destName = baseName
      let destPath = path.join(targetGroupDir, destName)
      let counter = 1
      while (await fs.pathExists(destPath)) {
        destName = `${nameWithoutExt} (${counter})${ext}`
        destPath = path.join(targetGroupDir, destName)
        counter++
      }

      // Copy file
      await fs.copy(srcPath, destPath)

      addedFiles.push({
        id: crypto.randomUUID(),
        name: nameWithoutExt,
        filePath: destPath,
        addedAt: Date.now()
      })
    } catch (err) {
      console.error(`Failed to copy SFX file ${srcPath}:`, err)
    }
  }

  // Update library JSON
  const library = await loadLibrary()
  const group = library.find((g) => g.id === groupId)
  if (group) {
    group.files = [...group.files, ...addedFiles]
    await saveLibrary(library)
  }

  return addedFiles
}

/**
 * Deletes a file from both the library list and user disk folder.
 */
export async function deleteFile(groupId: string, fileId: string): Promise<SfxGroup[]> {
  const library = await loadLibrary()
  const group = library.find((g) => g.id === groupId)
  if (group) {
    const fileIndex = group.files.findIndex((f) => f.id === fileId)
    if (fileIndex !== -1) {
      const file = group.files[fileIndex]
      try {
        if (await fs.pathExists(file.filePath)) {
          await fs.remove(file.filePath)
        }
      } catch (err) {
        console.error(`Failed to delete disk file ${file.filePath}:`, err)
      }
      group.files.splice(fileIndex, 1)
      await saveLibrary(library)
    }
  }
  return library
}

/**
 * Moves a file from one group to another.
 */
export async function moveToGroup(fileId: string, fromGroupId: string, toGroupId: string): Promise<SfxGroup[]> {
  const library = await loadLibrary()
  const fromGroup = library.find((g) => g.id === fromGroupId)
  const toGroup = library.find((g) => g.id === toGroupId)

  if (fromGroup && toGroup) {
    const fileIndex = fromGroup.files.findIndex((f) => f.id === fileId)
    if (fileIndex !== -1) {
      const file = fromGroup.files[fileIndex]
      
      // Physically move the file
      const targetGroupDir = path.join(sfxFilesDir, toGroupId)
      await fs.ensureDir(targetGroupDir)

      const baseName = path.basename(file.filePath)
      const ext = path.extname(file.filePath)
      const nameWithoutExt = path.basename(file.filePath, ext)

      let destName = baseName
      let destPath = path.join(targetGroupDir, destName)
      let counter = 1
      while (await fs.pathExists(destPath) && destPath !== file.filePath) {
        destName = `${nameWithoutExt} (${counter})${ext}`
        destPath = path.join(targetGroupDir, destName)
        counter++
      }

      if (destPath !== file.filePath) {
        await fs.move(file.filePath, destPath)
        file.filePath = destPath
      }

      // Move in JSON array
      fromGroup.files.splice(fileIndex, 1)
      toGroup.files.push(file)
      await saveLibrary(library)
    }
  }
  return library
}

/**
 * Trims and adjusts volume of an SFX file using ffmpeg.
 */
export async function editFile(groupId: string, fileId: string, trimStart: number, trimEnd: number, volume: number): Promise<SfxGroup[]> {
  const library = await loadLibrary()
  const group = library.find((g) => g.id === groupId)
  if (group) {
    const file = group.files.find((f) => f.id === fileId)
    if (file && await fs.pathExists(file.filePath)) {
      const ffmpegPath = await ensureFfmpeg()
      const ext = path.extname(file.filePath)
      const tempPath = file.filePath.replace(ext, `_temp${ext}`)

      return new Promise((resolve, reject) => {
        const volumeArg = `volume=${(volume / 100).toFixed(2)}`
        const args = [
          '-i', file.filePath,
          '-ss', trimStart.toString(),
          '-to', trimEnd.toString(),
          '-filter:a', volumeArg,
          '-y', tempPath
        ]

        const child = spawn(ffmpegPath, args, { windowsHide: true })

        child.on('close', async (code) => {
          if (code === 0) {
            try {
              await fs.remove(file.filePath)
              await fs.move(tempPath, file.filePath)
              resolve(library)
            } catch (err) {
              reject(err)
            }
          } else {
            if (await fs.pathExists(tempPath)) {
              await fs.remove(tempPath)
            }
            reject(new Error(`FFmpeg exited with code ${code}`))
          }
        })

        child.on('error', (err) => {
          reject(err)
        })
      })
    }
  }
  return library
}

/**
 * Exports the SFX library metadata and audio files to a single backup ZIP file.
 */
export async function exportLibrary(mainWindow: any): Promise<string | null> {
  const library = await loadLibrary()
  if (library.length === 0) {
    throw new Error('Thư viện âm thanh của bạn đang trống!')
  }

  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Xuất Thư Viện SFX',
    defaultPath: path.join(app.getPath('downloads'), `sfx-library-backup-${new Date().toISOString().slice(0, 10)}.zip`),
    filters: [{ name: 'Zip Files', extensions: ['zip'] }]
  })

  if (result.canceled || !result.filePath) {
    return null
  }

  const zipPath = result.filePath
  const output = fs.createWriteStream(zipPath)
  const archive = archiver('zip', { zlib: { level: 9 } })

  return new Promise((resolve, reject) => {
    output.on('close', () => resolve(zipPath))
    archive.on('error', (err) => reject(err))

    archive.pipe(output)

    // Add metadata JSON (we will normalize filePaths when zipping)
    const exportedLibrary = JSON.parse(JSON.stringify(library)) as SfxGroup[]

    for (const group of exportedLibrary) {
      for (const file of group.files) {
        if (fs.existsSync(file.filePath)) {
          // Flat structure inside the ZIP
          const zipRelativePath = `sounds/${group.id}/${path.basename(file.filePath)}`
          archive.file(file.filePath, { name: zipRelativePath })
          // Modify filePath in zip manifest to be relative to the import base
          file.filePath = zipRelativePath
        }
      }
    }

    archive.append(JSON.stringify(exportedLibrary, null, 2), { name: 'sfx-library.json' })
    archive.finalize()
  })
}

/**
 * Imports and resolves a backup ZIP file. Supports 'merge' and 'replace' modes.
 */
export async function importLibrary(
  zipPath: string,
  mode: 'merge' | 'replace'
): Promise<SfxGroup[]> {
  const tempImportDir = path.join(app.getPath('userData'), 'sfx-imported-temp')
  await fs.remove(tempImportDir)
  await fs.ensureDir(tempImportDir)

  // Unzip backup file
  await fs
    .createReadStream(zipPath)
    .pipe(unzipper.Extract({ path: tempImportDir }))
    .promise()

  const backupMetaPath = path.join(tempImportDir, 'sfx-library.json')
  if (!(await fs.pathExists(backupMetaPath))) {
    await fs.remove(tempImportDir)
    throw new Error('Tệp ZIP không hợp lệ hoặc thiếu tệp sfx-library.json')
  }

  const backupLibrary = (await fs.readJson(backupMetaPath)) as SfxGroup[]
  const currentLibrary = mode === 'replace' ? [] : await loadLibrary()

  if (mode === 'replace') {
    // Clean up current sfx-files dir
    await fs.remove(sfxFilesDir)
  }
  await fs.ensureDir(sfxFilesDir)

  // Process groups from backup
  for (const backupGroup of backupLibrary) {
    let targetGroup = currentLibrary.find((g) => g.name === backupGroup.name)

    if (!targetGroup) {
      // Create new group
      targetGroup = {
        id: backupGroup.id, // Keep or generate new UUID
        name: backupGroup.name,
        color: backupGroup.color || '#a855f7',
        files: []
      }
      currentLibrary.push(targetGroup)
    }

    const groupDir = path.join(sfxFilesDir, targetGroup.id)
    await fs.ensureDir(groupDir)

    for (const file of backupGroup.files) {
      // Find the file in extracted temp
      const tempFilePath = path.join(tempImportDir, file.filePath) // file.filePath was modified to relative path 'sounds/groupId/filename'
      if (await fs.pathExists(tempFilePath)) {
        const baseName = path.basename(tempFilePath)
        const ext = path.extname(tempFilePath)
        const nameWithoutExt = path.basename(tempFilePath, ext)

        let destName = baseName
        let destPath = path.join(groupDir, destName)
        let counter = 1
        while (await fs.pathExists(destPath)) {
          destName = `${nameWithoutExt} (${counter})${ext}`
          destPath = path.join(groupDir, destName)
          counter++
        }

        // Copy from temp extract to permanent user group directory
        await fs.copy(tempFilePath, destPath)

        // Add to group list
        targetGroup.files.push({
          id: file.id || crypto.randomUUID(),
          name: file.name,
          filePath: destPath,
          addedAt: file.addedAt || Date.now()
        })
      }
    }
  }

  // Clean up temp extraction folder
  await fs.remove(tempImportDir)

  // Save the new resolved library
  await saveLibrary(currentLibrary)

  return currentLibrary
}
