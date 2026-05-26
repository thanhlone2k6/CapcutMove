import { app, shell, BrowserWindow, ipcMain, protocol, Tray, Menu, nativeImage, globalShortcut, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
// Define platform-specific icon paths
const isWin = process.platform === 'win32'
const appIconPath = join(__dirname, '../../resources/icon.ico')
const trayIconPath = isWin
  ? join(__dirname, '../../resources/icon.ico')
  : join(__dirname, '../../resources/icon.png')

import { registerIpcHandlers } from './ipcHandlers'
import { setupAutoUpdater } from './updateService'
import { trackAppOpened, shutdownAnalytics } from './analytics'
import { getSettings } from './settingsService'
import fs from 'fs-extra'

let mainWindow: BrowserWindow | null = null
let popupWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

function createTray(win: BrowserWindow) {
  tray = new Tray(nativeImage.createFromPath(trayIconPath))

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Mở CapCut Move',
      click: () => {
        win.show()
        win.focus()
      }
    },
    { type: 'separator' },
    {
      label: 'Thoát',
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setToolTip('CapCut Move')
  tray.setContextMenu(contextMenu)

  tray.on('double-click', () => {
    win.show()
    win.focus()
  })
}

function registerQuickLinkShortcut(shortcut: string) {
  globalShortcut.unregisterAll()

  console.log('[shortcut] registering:', shortcut)
  const success = globalShortcut.register(shortcut, () => {
    console.log('[shortcut] triggered:', shortcut)
    if (popupWindow && !popupWindow.isDestroyed()) {
      console.log('[shortcut] closing existing window')
      popupWindow.close()
      popupWindow = null
      return
    }
    showQuickLinkPopup()
  })

  console.log('[shortcut] register success:', success)

  if (!success && mainWindow && !mainWindow.isDestroyed()) {
    console.warn(`Shortcut ${shortcut} bị conflict, không register được`)
    mainWindow.webContents.send('shortcut:conflict', shortcut)
  }
}

function reRegisterShortcut(shortcut: string) {
  registerQuickLinkShortcut(shortcut)
}

function showQuickLinkPopup() {
  console.log('[popup] showQuickLinkPopup called')
  const { x, y } = screen.getCursorScreenPoint()
  console.log('[popup] cursor position:', x, y)

  if (popupWindow && !popupWindow.isDestroyed()) {
    console.log('[popup] closing existing window')
    popupWindow.close()
    popupWindow = null
    return
  }

  const display = screen.getDisplayNearestPoint({ x, y })

  const popupWidth = 260
  const popupHeight = 400
  const posX = Math.min(x, display.bounds.x + display.bounds.width - popupWidth)
  const posY = Math.min(y, display.bounds.y + display.bounds.height - popupHeight)

  console.log('[popup] creating new BrowserWindow at posX, posY:', posX, posY)
  popupWindow = new BrowserWindow({
    width: popupWidth,
    height: popupHeight,
    x: posX,
    y: posY,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    transparent: true,
    show: false, // Prevent immediate display until ready
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  // Redirect console logs/errors from popup window to main terminal
  popupWindow.webContents.on('console-message', (_event, _level, message, line, sourceId) => {
    console.log(`[popup console] ${message} (at ${sourceId}:${line})`)
  })

  let showTime = Date.now()

  popupWindow.once('ready-to-show', () => {
    console.log('[popup] ready-to-show fired')
    if (popupWindow && !popupWindow.isDestroyed()) {
      popupWindow.show()
      popupWindow.focus()
      showTime = Date.now()
    }
  })

  popupWindow.webContents.on('did-fail-load', (_e, code, desc) => {
    console.error('[popup] failed to load:', code, desc)
  })

  const url = is.dev && process.env['ELECTRON_RENDERER_URL']
    ? `${process.env['ELECTRON_RENDERER_URL']}/popup.html`
    : join(__dirname, '../renderer/popup.html')

  console.log('[popup] loading URL:', url)
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    popupWindow.loadURL(url)
  } else {
    popupWindow.loadFile(url)
  }

  // Prevent closing immediately when transient blur occurs within 600ms of display
  popupWindow.on('blur', () => {
    const elapsed = Date.now() - showTime
    console.log('[popup] window lost focus, elapsed ms:', elapsed)
    if (elapsed > 600) {
      console.log('[popup] closing window due to focus loss')
      popupWindow?.close()
      popupWindow = null
    } else {
      console.log('[popup] ignored transient blur event')
    }
  })
}

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    title: 'CapCutMove',
    icon: appIconPath,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: true // ensure web security
    }
  })

  mainWindow.on('ready-to-show', () => {
    if (!app.getLoginItemSettings().wasOpenedAsHidden) {
      mainWindow?.show()
    }
  })

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  // macOS: force webContents focus when window is activated so keyboard
  // events reach the renderer immediately (without requiring a click)
  mainWindow.on('focus', () => {
    mainWindow?.webContents.focus()
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

  // Create Tray icon
  createTray(mainWindow)

  // Load settings and register shortcut
  getSettings().then((settings) => {
    const shortcut = settings.quickLinkShortcut ?? 'Alt+Q'
    registerQuickLinkShortcut(shortcut)
  })

  registerIpcHandlers(mainWindow, reRegisterShortcut)

  // Initialize auto updater
  setupAutoUpdater(mainWindow)

  // Track app opened event
  trackAppOpened()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.thanhnguyen.capcutmove')

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
    error.code === 'ERR_STREAM_DESTROYED' ||
    (error.message &&
      (error.message.includes('ERR_STREAM_DESTROYED') ||
        error.message.includes('Cannot call write after a stream was destroyed') ||
        error.message.includes('stream.push() after EOF')))

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

app.on('before-quit', () => {
  isQuitting = true
  shutdownAnalytics()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
