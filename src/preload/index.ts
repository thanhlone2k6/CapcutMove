import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectZipFile: () => ipcRenderer.invoke('select-zip-file'),
  selectMissingFile: (extension: string) => ipcRenderer.invoke('select-missing-file', extension),
  listProjects: (folderPath: string) => ipcRenderer.invoke('list-projects', folderPath),
  checkProject: (projectPath: string) => ipcRenderer.invoke('check-project', projectPath),
  scanAssets: (projectPath: string) => ipcRenderer.invoke('scan-assets', projectPath),
  deleteProject: (projectPath: string) => ipcRenderer.invoke('delete-project', projectPath),
  exportZip: (params: any) => ipcRenderer.invoke('export-zip', params),
  checkZipProject: (zipPath: string, targetCapCutFolder: string) => ipcRenderer.invoke('check-zip-project', zipPath, targetCapCutFolder),
  checkProjectExists: (folderPath: string, projectName: string) => ipcRenderer.invoke('check-project-exists', folderPath, projectName),
  importPackage: (params: any) => ipcRenderer.invoke('import-package', params),
  patchPaths: (params: any) => ipcRenderer.invoke('patch-paths', params),
  openPath: (path: string) => ipcRenderer.invoke('open-path', path),
  copyToClipboard: (text: string) => ipcRenderer.invoke('copy-to-clipboard', text),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
  checkCapcutRunning: () => ipcRenderer.invoke('check-capcut-running'),
  killCapcut: () => ipcRenderer.invoke('kill-capcut'),
  openCapcut: () => ipcRenderer.invoke('open-capcut'),
  autoDetectFolder: () => ipcRenderer.invoke('auto-detect-folder'),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  checkPathExists: (folder: string, file: string) => ipcRenderer.invoke('check-path-exists', folder, file),
  getAvailableName: (folder: string, file?: string) => file ? ipcRenderer.invoke('get-available-name', folder, file) : ipcRenderer.invoke('get-available-name', folder),
  removePath: (folder: string, file?: string) => file ? ipcRenderer.invoke('remove-path', folder, file) : ipcRenderer.invoke('remove-path', folder),
  cancelExport: () => ipcRenderer.invoke('cancel-export'),
  cancelImport: () => ipcRenderer.invoke('cancel-import'),
  
  // Progress tracking listener
  onProgress: (callback: (progressInfo: any) => void) => {
    const subscription = (_event: any, info: any) => callback(info)
    ipcRenderer.on('progress-update', subscription)
    return () => ipcRenderer.removeListener('progress-update', subscription)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
