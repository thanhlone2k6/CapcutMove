import { ipcMain, dialog, shell, clipboard } from 'electron'
import * as settingsService from './settingsService'
import * as projectResolver from './projectResolver'
import * as capcutLocator from './capcutLocator'
import * as processChecker from './processChecker'
import * as assetCollector from './assetCollector'
import * as zipService from './zipService'
import * as importService from './importService'
import * as pathPatchService from './pathPatchService'
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
}
