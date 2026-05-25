import { ipcMain, dialog, shell, clipboard, app } from 'electron'
import * as settingsService from './settingsService'
import * as projectResolver from './projectResolver'
import * as capcutLocator from './capcutLocator'
import * as processChecker from './processChecker'
import * as assetCollector from './assetCollector'
import * as zipService from './zipService'
import * as importService from './importService'
import * as pathPatchService from './pathPatchService'
import * as licenseService from './licenseService'
import * as videoDownloadService from './videoDownloadService'
import * as transcriptService from './transcriptService'
import fs from 'fs-extra'
import path from 'path'
import { getAvailableName } from './utils'

export function registerIpcHandlers(mainWindow: Electron.BrowserWindow) {
  ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('select-zip-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'Zip Files', extensions: ['zip'] }]
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('select-missing-file', async (_, extension: string) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'Media Files', extensions: extension ? [extension.replace('.', '')] : ['*'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle(
    'save-file-dialog',
    async (_, params: { content: string; defaultName: string; filters: any[] }) => {
      const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: params.defaultName,
        filters: params.filters
      })
      if (result.canceled || !result.filePath) return { success: false }
      const fs = require('fs-extra')
      await fs.writeFile(result.filePath, params.content, 'utf8')
      return { success: true, filePath: result.filePath }
    }
  )

  ipcMain.handle('list-projects', async (_, folderPath: string) => {
    return await projectResolver.listProjects(folderPath)
  })

  ipcMain.handle('check-project', async (_, projectPath: string) => {
    return await projectResolver.checkProject(projectPath)
  })

  ipcMain.handle('delete-project', async (_, projectPath: string) => {
    const fs = require('fs-extra')
    await fs.remove(projectPath)
  })

  ipcMain.handle('scan-assets', async (_, projectPath: string) => {
    return await assetCollector.scanAssets(projectPath)
  })

  ipcMain.handle('export-zip', async (event, params: any) => {
    const sendProgress = (info: any) => event.sender.send('progress-update', info)
    return await zipService.exportZip(params, sendProgress)
  })

  ipcMain.handle('check-zip-project', async (_, zipPath: string, targetCapCutFolder: string) => {
    return await importService.checkZipProject(zipPath, targetCapCutFolder)
  })

  ipcMain.handle('check-project-exists', async (_, folderPath: string, projectName: string) => {
    const fullPath = path.join(folderPath, projectName)
    const exists = await fs.pathExists(fullPath)
    return exists
  })

  ipcMain.handle('check-path-exists', async (_, ...parts: string[]) => {
    const p = path.join(...parts)
    return await fs.pathExists(p)
  })

  ipcMain.handle('get-available-name', async (_, ...parts: string[]) => {
    const p = path.join(...parts)
    return await getAvailableName(p)
  })

  ipcMain.handle('remove-path', async (_, ...parts: string[]) => {
    const p = path.join(...parts)
    return await fs.remove(p)
  })

  ipcMain.handle('cancel-export', async () => {
    zipService.cancelCurrentExport()
  })

  ipcMain.handle('cancel-import', async () => {
    importService.cancelCurrentImport()
  })

  ipcMain.handle('import-package', async (event, params: any) => {
    const sendProgress = (info: any) => event.sender.send('progress-update', info)
    return await importService.importPackage(params, sendProgress)
  })

  ipcMain.handle('patch-paths', async (event, params: any) => {
    const sendProgress = (info: any) => event.sender.send('progress-update', info)
    return await pathPatchService.patchPaths(params, sendProgress)
  })

  ipcMain.handle('open-path', async (_, pathToOpen: string) => {
    await shell.showItemInFolder(pathToOpen)
  })

  ipcMain.handle('copy-to-clipboard', async (_, text: string) => {
    clipboard.writeText(text)
  })

  ipcMain.handle('open-external', async (_, url: string) => {
    await shell.openExternal(url)
  })

  ipcMain.handle('get-settings', async () => {
    return await settingsService.getSettings()
  })

  ipcMain.handle('save-settings', async (_, settings: any) => {
    await settingsService.saveSettings(settings)
  })

  ipcMain.handle('check-capcut-running', async () => {
    return await processChecker.isCapCutRunning()
  })

  ipcMain.handle('kill-capcut', async () => {
    await processChecker.killCapCut()
  })

  ipcMain.handle('open-capcut', async () => {
    await processChecker.openCapCut()
  })

  ipcMain.handle('auto-detect-folder', async () => {
    return await capcutLocator.autoDetectFolder()
  })

  ipcMain.handle('get-app-version', () => {
    return app.getVersion()
  })

  // ─── License handlers ─────────────────────────────────────
  ipcMain.handle('license:validate', (_event, key: string) => {
    return { valid: licenseService.isValidKey(key) }
  })

  ipcMain.handle('license:activate', (_event, key: string) => {
    const valid = licenseService.isValidKey(key)
    if (valid) {
      licenseService.saveLicense(key)
    }
    return { success: valid }
  })

  ipcMain.handle('license:check', () => {
    return { active: licenseService.isLicenseActive() }
  })

  // ─── Video download handlers ──────────────────────────────
  ipcMain.handle(
    'download:start',
    async (_event, params: { url: string; outputDir: string; mode: 'video' | 'audio' }) => {
      const id = await videoDownloadService.startDownload(
        mainWindow,
        params.url,
        params.outputDir,
        params.mode
      )
      return { id }
    }
  )

  ipcMain.handle('download:cancel', (_event, params: { id: string }) => {
    videoDownloadService.cancelDownload(params.id)
  })

  ipcMain.handle('download:openFile', async (_event, params: { filePath: string }) => {
    await shell.openPath(params.filePath)
  })

  ipcMain.handle('download:showInFolder', (_event, params: { filePath: string }) => {
    try {
      const fs = require('fs-extra')
      const path = require('path')

      if (params.filePath && fs.existsSync(params.filePath)) {
        shell.showItemInFolder(params.filePath)
      } else if (params.filePath) {
        // Fallback: Open containing folder if file not found
        const dir = path.dirname(params.filePath)
        if (fs.existsSync(dir)) {
          shell.openPath(dir)
        }
      }
    } catch (err) {
      console.error('Failed to show item in folder:', err)
    }
  })

  ipcMain.handle('download:deleteFile', async (_event, params: { filePath: string }) => {
    await fs.remove(params.filePath)
  })

  ipcMain.handle('download:checkYtDlp', async () => {
    return { ready: await videoDownloadService.checkYtDlpReady() }
  })

  ipcMain.handle('download:ensureYtDlp', async () => {
    await videoDownloadService.ensureYtDlp()
    return { ready: true }
  })

  ipcMain.handle('read-clipboard', () => {
    return clipboard.readText()
  })

  // ─── Whisper Transcript Handlers ──────────────────────────
  ipcMain.handle('whisper:check', async () => {
    const path = await transcriptService.getSavedOrDetectedWhisperPath()
    return { ready: !!path, path }
  })

  ipcMain.handle('whisper:select', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    })
    if (result.canceled) return { success: false }
    const selectedPath = result.filePaths[0]
    const execPath = transcriptService.getExecPathForFolder(selectedPath)
    const exists = await fs.pathExists(execPath)
    if (exists) {
      const settings = await settingsService.getSettings()
      await settingsService.saveSettings({
        vip: {
          ...settings.vip,
          whisperPath: selectedPath
        }
      })
      return { success: true, path: selectedPath }
    } else {
      const execName =
        process.platform === 'win32' ? 'faster-whisper-xxl.exe' : 'whisper-cli hoặc main'
      return { success: false, error: `Thư mục không chứa tệp thực thi hợp lệ (${execName}).` }
    }
  })

  ipcMain.handle('whisper:download', async (_, url?: string) => {
    try {
      const path = await transcriptService.downloadWhisper(mainWindow, url)
      return { success: true, path }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('whisper:cancel-download', () => {
    transcriptService.cancelDownloadWhisper()
  })

  ipcMain.handle(
    'whisper:transcribe',
    async (_, params: { mediaPath: string; model?: string; language?: string }) => {
      try {
        const result = await transcriptService.startTranscribe(mainWindow, params.mediaPath, {
          model: params.model,
          language: params.language
        })
        return { success: true, segments: result.segments }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    }
  )

  ipcMain.handle('whisper:cancel-transcribe', () => {
    transcriptService.cancelTranscribe()
  })

  // ─── Quick Links Handlers ────────────────────────────────
  ipcMain.handle('quicklinks:get', async () => {
    return await settingsService.getQuickLinks()
  })

  ipcMain.handle('quicklinks:save', async (_, links: any[]) => {
    await settingsService.saveQuickLinks(links)
  })

  ipcMain.handle(
    'quicklinks:open',
    async (_, item: { type: 'folder' | 'link'; path: string }) => {
      if (item.type === 'folder') {
        const err = await shell.openPath(item.path)
        if (err) {
          return { success: false, error: err }
        }
        return { success: true }
      } else {
        try {
          await shell.openExternal(item.path)
          return { success: true }
        } catch (err: any) {
          return { success: false, error: err.message }
        }
      }
    }
  )

  ipcMain.handle('quicklinks:export-csv', async (_, csvContent: string) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Xuất Quick Links',
      defaultPath: path.join(app.getPath('downloads'), 'quick-links.csv'),
      filters: [{ name: 'CSV Files', extensions: ['csv'] }]
    })
    if (!result.canceled && result.filePath) {
      await fs.writeFile(result.filePath, csvContent, 'utf-8')
      return { success: true }
    }
    return { success: false }
  })

  ipcMain.handle('quicklinks:import-csv', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Nhập Quick Links từ CSV',
      filters: [{ name: 'CSV Files', extensions: ['csv'] }],
      properties: ['openFile']
    })
    if (!result.canceled && result.filePaths[0]) {
      const content = await fs.readFile(result.filePaths[0], 'utf-8')
      return { success: true, content }
    }
    return { success: false }
  })
}
