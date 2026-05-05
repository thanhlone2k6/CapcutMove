import { app, shell, BrowserWindow, ipcMain, protocol } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { registerIpcHandlers } from './ipcHandlers'
import fs from 'fs-extra'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: true // ensure web security
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  registerIpcHandlers(mainWindow)
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  protocol.handle('safe-file', async (request) => {
    try {
      let url = request.url.replace(/^safe-file:\/\/*/, '')
      let filePath = decodeURIComponent(url)
      filePath = filePath.split('?')[0]
      
      if (/^\/[a-zA-Z]:\//.test(filePath)) {
        filePath = filePath.substring(1)
      }
      
      const data = await fs.readFile(filePath)
      return new Response(data)
    } catch (e) {
      console.error('Safe-file protocol error:', e)
      return new Response('Not found', { status: 404 })
    }
  })

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Handle uncaught exceptions to prevent the error dialog from showing for certain ignorable errors
process.on('uncaughtException', (error: any) => {
  const isStreamError = 
    (error.code === 'ERR_STREAM_DESTROYED') ||
    (error.message && (
      error.message.includes('ERR_STREAM_DESTROYED') || 
      error.message.includes('Cannot call write after a stream was destroyed') ||
      error.message.includes('stream.push() after EOF')
    ))

  if (isStreamError) {
    console.warn('Swallowed expected stream error during task cancellation:', error.message)
    return
  }
  
  console.error('Uncaught Exception:', error)
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
