import { autoUpdater } from 'electron-updater'
import { BrowserWindow, ipcMain, app } from 'electron'
import { is } from '@electron-toolkit/utils'
import axios from 'axios'

export function setupAutoUpdater(mainWindow: BrowserWindow) {
  // Only check for updates in production
  if (is.dev) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  const GITHUB_API = 'https://api.github.com/repos/thanhlone2k6/CapcutMove/releases/latest'
  const currentVersion = app.getVersion()

  const sendStatusToWindow = (status: string, data?: any) => {
    if (mainWindow.isDestroyed()) return
    mainWindow.webContents.send('update-status', { status, data })
  }

  // Handle auto-updater events
  autoUpdater.on('download-progress', (progressObj) => {
    sendStatusToWindow('downloading', progressObj)
  })

  autoUpdater.on('update-downloaded', (info) => {
    sendStatusToWindow('downloaded', info)
  })

  autoUpdater.on('error', (err) => {
    sendStatusToWindow('error', err.message)
  })

  // Core Logic: Fast Check using GitHub API
  const performCheck = async (manual = false) => {
    try {
      if (manual) sendStatusToWindow('checking')

      const response = await axios.get(GITHUB_API, { timeout: 10000 })
      const latestVersion = response.data.tag_name.replace('v', '')

      if (latestVersion !== currentVersion) {
        // New version found, now let autoUpdater handle the download
        sendStatusToWindow('available', { version: latestVersion })
        await autoUpdater.checkForUpdates()
      } else {
        if (manual) sendStatusToWindow('not-available')
      }
    } catch (error: any) {
      console.error('Update check failed:', error)
      // Fallback to standard autoUpdater if API fails
      try {
        await autoUpdater.checkForUpdates()
      } catch (innerError: any) {
        if (manual) sendStatusToWindow('error', 'Không thể kết nối máy chủ cập nhật.')
      }
    }
  }

  // IPC Handlers
  ipcMain.handle('check-for-updates', async () => {
    await performCheck(true)
  })

  ipcMain.handle('restart-app-to-update', () => {
    autoUpdater.quitAndInstall()
  })

  // Initial check after 3 seconds
  setTimeout(() => performCheck(false), 3000)
}
