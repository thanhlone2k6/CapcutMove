import { app, clipboard, globalShortcut, BrowserWindow } from 'electron'
import { exec } from 'child_process'
import path from 'path'
import fs from 'fs-extra'
import { getSettings } from './settingsService'

function getMainWindow(): BrowserWindow | null {
  const windows = BrowserWindow.getAllWindows()
  return windows.length > 0 ? windows[0] : null
}

function emitToRenderer(channel: string, ...args: any[]) {
  const win = getMainWindow()
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, ...args)
  }
}

const csharpCode = `using System;
using System.Runtime.InteropServices;

public class Program {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [STAThread]
    public static void Main() {
        IntPtr hwnd = GetForegroundWindow();
        if (hwnd == IntPtr.Zero) return;
        
        Type type = Type.GetTypeFromProgID("Shell.Application");
        if (type == null) return;
        
        dynamic shell = Activator.CreateInstance(type);
        var windows = shell.Windows();
        
        for (int i = 0; i < windows.Count; i++) {
            var window = windows.Item(i);
            if ((IntPtr)window.HWND == hwnd) {
                try {
                    string path = window.Document.Folder.Self.Path;
                    if (!string.IsNullOrEmpty(path)) {
                        Console.WriteLine(path);
                        return;
                    }
                } catch {}
            }
        }
    }
}`;

let helperExePath: string | null = null;

export async function ensureExplorerHelper(): Promise<string | null> {
  if (helperExePath && await fs.pathExists(helperExePath)) {
    return helperExePath;
  }
  
  const userDataPath = app.getPath('userData');
  const exePath = path.join(userDataPath, 'GetActiveExplorer.exe');
  
  if (await fs.pathExists(exePath)) {
    helperExePath = exePath;
    return exePath;
  }
  
  const csPath = path.join(userDataPath, 'GetActiveExplorer.cs');
  await fs.writeFile(csPath, csharpCode);
  
  const cscPath = 'C:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319\\csc.exe';
  if (!(await fs.pathExists(cscPath))) {
    return null;
  }
  
  return new Promise((resolve) => {
    exec(`"${cscPath}" /nologo /out:"${exePath}" "${csPath}"`, (err) => {
      if (err) {
        resolve(null);
      } else {
        helperExePath = exePath;
        resolve(exePath);
      }
    });
  });
}

async function getActiveExplorerPath(): Promise<string | null> {
  if (process.platform !== 'win32') return null
  
  const exePath = await ensureExplorerHelper();
  
  if (exePath) {
    return new Promise((resolve) => {
      exec(`"${exePath}"`, (err, stdout) => {
        if (err || !stdout.trim()) {
          resolve(null)
        } else {
          resolve(stdout.trim())
        }
      })
    })
  }

  const psScript = `
Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class Win32 { [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow(); }'
$hwnd = [Win32]::GetForegroundWindow()
$shell = New-Object -ComObject Shell.Application
foreach ($window in $shell.Windows()) {
  if ($window.HWND -eq $hwnd) {
    $path = $window.Document.Folder.Self.Path
    if ($path) {
      $bytes = [System.Text.Encoding]::UTF8.GetBytes($path)
      $b64 = [Convert]::ToBase64String($bytes)
      Write-Output $b64
    }
    break
  }
}
`
  const b64 = Buffer.from(psScript, 'utf16le').toString('base64')

  return new Promise((resolve) => {
    exec(`powershell.exe -NoProfile -EncodedCommand ${b64}`, (err, stdout) => {
      if (err || !stdout.trim()) {
        resolve(null)
      } else {
        try {
          const result = Buffer.from(stdout.trim(), 'base64').toString('utf8')
          resolve(result || null)
        } catch (e) {
          resolve(null)
        }
      }
    })
  })
}

export async function handlePasteCommand() {
  const settings = await getSettings()
  if (!settings.pastePngEnabled) return

  const shortcutStr = (global.currentPastePngShortcut || '').toLowerCase().replace(/\s+/g, '')
  const isCtrlV = shortcutStr === 'commandorcontrol+v' || shortcutStr === 'ctrl+v'

  const passThrough = async () => {
    if (global.currentPastePngShortcut) {
      globalShortcut.unregister(global.currentPastePngShortcut)
    }
    const vbsCode = `Set WshShell = WScript.CreateObject("WScript.Shell")
WScript.Sleep 20
WshShell.SendKeys "^v"`
    const vbsPath = path.join(app.getPath('userData'), 'passthrough.vbs')
    await fs.writeFile(vbsPath, vbsCode)
    
    exec(`cscript //nologo "${vbsPath}"`, () => {
      setTimeout(() => {
        if (global.currentPastePngShortcut) {
          globalShortcut.register(global.currentPastePngShortcut, handlePasteCommand)
        }
      }, 150)
    })
  }

  const image = clipboard.readImage()
  if (image.isEmpty()) {
    if (isCtrlV) {
      await passThrough()
      return
    }
    emitToRenderer('pastePng:error', 'Clipboard không có ảnh')
    return
  }

  const folderPath = await getActiveExplorerPath()
  if (!folderPath) {
    if (isCtrlV) {
      await passThrough()
      return
    }
    emitToRenderer('pastePng:error', 'Hãy mở một folder trong File Explorer rồi bấm hotkey')
    return
  }

  try {
    const stat = await fs.stat(folderPath)
    if (!stat.isDirectory()) {
      if (isCtrlV) {
        await passThrough()
        return
      }
      emitToRenderer('pastePng:error', 'Path không phải là thư mục hợp lệ')
      return
    }
  } catch (e) {
    if (isCtrlV) {
      await passThrough()
      return
    }
    emitToRenderer('pastePng:error', 'Không thể truy cập thư mục hiện tại')
    return
  }

  const date = new Date()
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  const ss = String(date.getSeconds()).padStart(2, '0')

  const baseName = `pasted-image-${yyyy}-${mm}-${dd}_${hh}-${min}-${ss}`
  let finalPath = path.join(folderPath, `${baseName}.png`)
  let counter = 1

  while (await fs.pathExists(finalPath)) {
    finalPath = path.join(folderPath, `${baseName}-${counter}.png`)
    counter++
  }

  try {
    const pngBuffer = image.toPNG()
    await fs.writeFile(finalPath, pngBuffer)
    emitToRenderer('pastePng:success', finalPath)
  } catch (err: any) {
    emitToRenderer('pastePng:error', `Lỗi khi lưu file: ${err.message || err}`)
  }
}

export async function registerPastePngShortcut(shortcut?: string) {
  const currentShortcut = shortcut || (await getSettings()).pastePngShortcut || 'CommandOrControl+Alt+V'
  const enabled = (await getSettings()).pastePngEnabled

  // We should only unregister this specific feature's old shortcut. 
  // For simplicity, we can just unregister it right before registering.
  // We need to keep track of the currently registered shortcut.
  if (global.currentPastePngShortcut) {
    globalShortcut.unregister(global.currentPastePngShortcut)
  }

  if (enabled && currentShortcut) {
    try {
      const success = globalShortcut.register(currentShortcut, handlePasteCommand)
      if (success) {
        global.currentPastePngShortcut = currentShortcut
      } else {
        console.warn(`Failed to register shortcut: ${currentShortcut}`)
        emitToRenderer('pastePng:error', `Không thể đăng ký hotkey: ${currentShortcut} (có thể bị app khác chiếm)`)
      }
    } catch (e: any) {
      console.warn('Error registering shortcut:', e)
      emitToRenderer('pastePng:error', `Lỗi đăng ký hotkey: ${e.message}`)
    }
  }
}

export function unregisterPastePngShortcut() {
  if (global.currentPastePngShortcut) {
    try {
      globalShortcut.unregister(global.currentPastePngShortcut)
      global.currentPastePngShortcut = undefined
    } catch (e) {
      // ignore
    }
  }
}

export async function initPastePngService() {
  const settings = await getSettings()
  if (settings.pastePngEnabled && settings.pastePngShortcut) {
    await registerPastePngShortcut(settings.pastePngShortcut)
  }
}

// Ensure type definitions for global
declare global {
  var currentPastePngShortcut: string | undefined
}
