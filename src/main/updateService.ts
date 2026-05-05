import { autoUpdater } from 'electron-updater'
import { BrowserWindow, ipcMain } from 'electron'
import { is } from '@electron-toolkit/utils'

export function setupAutoUpdater(mainWindow: BrowserWindow) {
  // Only check for updates in production
  if (is.dev) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  // Send status messages to renderer
  const sendStatusToWindow = (status: string, data?: any) => {
    mainWindow.webContents.send('update-status', { status, data })
  }

  autoUpdater.on('checking-for-update', () => {
    sendStatusToWindow('checking')
  })

  autoUpdater.on('update-available', (info) => {
    sendStatusToWindow('available', info)
  })

  autoUpdater.on('update-not-available', (info) => {
    sendStatusToWindow('not-available', info)
  })

  autoUpdater.on('error', (err) => {
    sendStatusToWindow('error', err.message)
  })

  autoUpdater.on('download-progress', (progressObj) => {
    sendStatusToWindow('downloading', progressObj)
  })

  autoUpdater.on('update-downloaded', (info) => {
    sendStatusToWindow('downloaded', info)
  })

  // IPC Handlers
  ipcMain.handle('check-for-updates', async () => {
    try {
      // Add a timeout to avoid infinite spinning
      const timeout = setTimeout(() => {
        sendStatusToWindow('error', 'Kiểm tra quá lâu, vui lòng thử lại sau.')
      }, 15000)

      const result = await autoUpdater.checkForUpdatesAndNotify()
      clearTimeout(timeout)
      return result
    } catch (err: any) {
      sendStatusToWindow('error', err.message)
      return null
    }
  })

  ipcMain.handle('restart-app-to-update', () => {
    autoUpdater.quitAndInstall()
  })

  // Auto check after 3 seconds
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify().catch(err => {
      console.error('Initial update check failed:', err)
    })
  }, 3000)
}
