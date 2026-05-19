import { ElectronAPI } from '@electron-toolkit/preload'

export interface ProjectInfo {
  name: string
  fullPath: string
  lastModified: number
  sizeBytes: number
  status: 'Valid' | 'Partial' | 'Invalid'
  hasCover: boolean
  coverDataUrl: string | null
}

export interface DownloadTask {
  id: string
  url: string
  status: 'queued' | 'downloading' | 'done' | 'error' | 'cancelled'
  title?: string
  progress: number
  downloadedBytes: number
  totalBytes: number
  speed?: string
  filePath?: string
  error?: string
  mode: 'video' | 'audio'
}

export interface API {
  selectFolder: () => Promise<string | null>
  selectZipFile: () => Promise<string | null>
  selectMissingFile: (extension: string) => Promise<string | null>
  listProjects: (folderPath: string) => Promise<ProjectInfo[]>
  checkProject: (projectPath: string) => Promise<any>
  scanAssets: (projectPath: string) => Promise<any>
  deleteProject: (projectPath: string) => Promise<void>
  exportZip: (params: any) => Promise<string>
  checkZipProject: (zipPath: string, targetCapCutFolder: string) => Promise<{ projectName: string; exists: boolean }>
  checkProjectExists: (folderPath: string, projectName: string) => Promise<boolean>
  importPackage: (params: any) => Promise<any>
  patchPaths: (params: any) => Promise<any>
  openPath: (path: string) => Promise<void>
  copyToClipboard: (text: string) => Promise<void>
  getSettings: () => Promise<any>
  saveSettings: (settings: any) => Promise<void>
  checkCapcutRunning: () => Promise<boolean>
  killCapcut: () => Promise<void>
  openCapcut: () => Promise<void>
  autoDetectFolder: () => Promise<string | null>
  openExternal: (url: string) => Promise<void>
  checkPathExists: (folder: string, file: string) => Promise<boolean>
  getAvailableName: (folder: string, file?: string) => Promise<string>
  removePath: (folder: string, file?: string) => Promise<void>
  cancelExport: () => Promise<void>
  cancelImport: () => Promise<void>
  onProgress: (callback: (progressInfo: any) => void) => () => void
  checkForUpdates: () => Promise<any>
  restartAppToUpdate: () => Promise<void>
  onUpdateStatus: (callback: (updateInfo: any) => void) => () => void
  getAppVersion: () => Promise<string>

  // License APIs
  license: {
    validate: (key: string) => Promise<{ valid: boolean }>
    activate: (key: string) => Promise<{ success: boolean }>
    check: () => Promise<{ active: boolean }>
  }

  // Video Download APIs
  download: {
    start: (params: { url: string; outputDir: string; mode: 'video' | 'audio' }) => Promise<{ id: string }>
    cancel: (id: string) => Promise<void>
    openFile: (filePath: string) => Promise<void>
    showInFolder: (filePath: string) => Promise<void>
    deleteFile: (filePath: string) => Promise<void>
    checkYtDlp: () => Promise<{ ready: boolean }>
    ensureYtDlp: () => Promise<{ ready: boolean }>
    onProgress: (callback: (task: DownloadTask) => void) => () => void
    onDone: (callback: (task: DownloadTask) => void) => () => void
    onError: (callback: (task: DownloadTask) => void) => () => void
  }

  // Clipboard
  readClipboard: () => Promise<string>
  sep: string
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
