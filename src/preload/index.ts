import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { QuickLinkGroup } from '../main/settingsService'

// Custom APIs for renderer
const api = {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectZipFile: () => ipcRenderer.invoke('select-zip-file'),
  selectMissingFile: (extension: string) => ipcRenderer.invoke('select-missing-file', extension),
  saveFileDialog: (params: { content: string; defaultName: string; filters: any[] }) =>
    ipcRenderer.invoke('save-file-dialog', params),
  listProjects: (folderPath: string) => ipcRenderer.invoke('list-projects', folderPath),
  checkProject: (projectPath: string) => ipcRenderer.invoke('check-project', projectPath),
  scanAssets: (projectPath: string) => ipcRenderer.invoke('scan-assets', projectPath),
  deleteProject: (projectPath: string) => ipcRenderer.invoke('delete-project', projectPath),
  exportZip: (params: any) => ipcRenderer.invoke('export-zip', params),
  checkZipProject: (zipPath: string, targetCapCutFolder: string) =>
    ipcRenderer.invoke('check-zip-project', zipPath, targetCapCutFolder),
  checkProjectExists: (folderPath: string, projectName: string) =>
    ipcRenderer.invoke('check-project-exists', folderPath, projectName),
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
  checkPathExists: (folder: string, file: string) =>
    ipcRenderer.invoke('check-path-exists', folder, file),
  getAvailableName: (folder: string, file?: string) =>
    file
      ? ipcRenderer.invoke('get-available-name', folder, file)
      : ipcRenderer.invoke('get-available-name', folder),
  removePath: (folder: string, file?: string) =>
    file
      ? ipcRenderer.invoke('remove-path', folder, file)
      : ipcRenderer.invoke('remove-path', folder),
  cancelExport: () => ipcRenderer.invoke('cancel-export'),
  cancelImport: () => ipcRenderer.invoke('cancel-import'),

  // Progress tracking listener
  onProgress: (callback: (progressInfo: any) => void) => {
    const subscription = (_event: any, info: any) => callback(info)
    ipcRenderer.on('progress-update', subscription)
    return () => ipcRenderer.removeListener('progress-update', subscription)
  },

  // Update APIs
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  restartAppToUpdate: () => ipcRenderer.invoke('restart-app-to-update'),
  onUpdateStatus: (callback: (info: any) => void) => {
    const subscription = (_event: any, info: any) => callback(info)
    ipcRenderer.on('update-status', subscription)
    return () => ipcRenderer.removeListener('update-status', subscription)
  },
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // License APIs
  license: {
    validate: (key: string) => ipcRenderer.invoke('license:validate', key),
    activate: (key: string) => ipcRenderer.invoke('license:activate', key),
    check: () => ipcRenderer.invoke('license:check')
  },

  // Video Download APIs
  download: {
    start: (params: { url: string; outputDir: string; mode: 'video' | 'audio' }) =>
      ipcRenderer.invoke('download:start', params),
    cancel: (id: string) => ipcRenderer.invoke('download:cancel', { id }),
    openFile: (filePath: string) => ipcRenderer.invoke('download:openFile', { filePath }),
    showInFolder: (filePath: string) => ipcRenderer.invoke('download:showInFolder', { filePath }),
    deleteFile: (filePath: string) => ipcRenderer.invoke('download:deleteFile', { filePath }),
    checkYtDlp: () => ipcRenderer.invoke('download:checkYtDlp'),
    ensureYtDlp: () => ipcRenderer.invoke('download:ensureYtDlp'),
    onProgress: (callback: (task: any) => void) => {
      const sub = (_event: any, task: any) => callback(task)
      ipcRenderer.on('download:progress', sub)
      return () => ipcRenderer.removeListener('download:progress', sub)
    },
    onDone: (callback: (task: any) => void) => {
      const sub = (_event: any, task: any) => callback(task)
      ipcRenderer.on('download:done', sub)
      return () => ipcRenderer.removeListener('download:done', sub)
    },
    onError: (callback: (task: any) => void) => {
      const sub = (_event: any, task: any) => callback(task)
      ipcRenderer.on('download:error', sub)
      return () => ipcRenderer.removeListener('download:error', sub)
    }
  },

  // Clipboard
  readClipboard: () => ipcRenderer.invoke('read-clipboard'),

  // Whisper Transcript APIs
  whisper: {
    check: (): Promise<{ ready: boolean; path: string | null }> => ipcRenderer.invoke('whisper:check'),
    select: (): Promise<{ success: boolean; path?: string; error?: string }> => ipcRenderer.invoke('whisper:select'),
    download: (url?: string): Promise<{ success: boolean; path?: string; error?: string }> => ipcRenderer.invoke('whisper:download', url),
    cancelDownload: (): Promise<void> => ipcRenderer.invoke('whisper:cancel-download'),
    transcribe: (params: { mediaPath: string; model?: string; language?: string }): Promise<{ success: boolean; segments?: any[]; error?: string }> =>
      ipcRenderer.invoke('whisper:transcribe', params),
    cancelTranscribe: (): Promise<void> => ipcRenderer.invoke('whisper:cancel-transcribe'),
    onDownloadProgress: (callback: (info: { stage: 'downloading' | 'extracting' | 'done' | 'error'; percent: number; speed?: string; message?: string }) => void): (() => void) => {
      const sub = (_event: unknown, info: { stage: 'downloading' | 'extracting' | 'done' | 'error'; percent: number; speed?: string; message?: string }): void => callback(info)
      ipcRenderer.on('whisper:download-progress', sub)
      return (): void => {
        ipcRenderer.removeListener('whisper:download-progress', sub)
      }
    },
    onTranscribeProgress: (callback: (info: { percent: number; speed?: string; status: 'initializing' | 'converting_audio' | 'transcribing' | 'done' | 'error' }) => void): (() => void) => {
      const sub = (_event: unknown, info: { percent: number; speed?: string; status: 'initializing' | 'converting_audio' | 'transcribing' | 'done' | 'error' }): void => callback(info)
      ipcRenderer.on('whisper:transcribe-progress', sub)
      return (): void => {
        ipcRenderer.removeListener('whisper:transcribe-progress', sub)
      }
    },
    onTranscribeLog: (callback: (line: string) => void): (() => void) => {
      const sub = (_event: unknown, line: string): void => callback(line)
      ipcRenderer.on('whisper:transcribe-log', sub)
      return (): void => {
        ipcRenderer.removeListener('whisper:transcribe-log', sub)
      }
    },
    onTranscribeSegment: (callback: (segment: { start: number; end: number; text: string }) => void): (() => void) => {
      const sub = (_event: unknown, segment: { start: number; end: number; text: string }): void => callback(segment)
      ipcRenderer.on('whisper:transcribe-segment', sub)
      return (): void => {
        ipcRenderer.removeListener('whisper:transcribe-segment', sub)
      }
    }
  },

  quickLinksGet: () => ipcRenderer.invoke('quicklinks:get'),
  quickLinksSave: (groups: QuickLinkGroup[]) => ipcRenderer.invoke('quicklinks:save', groups),
  quickLinksOpen: (item: { type: 'folder' | 'link'; path: string }) =>
    ipcRenderer.invoke('quicklinks:open', item),
  quickLinksExportCsv: (csvContent: string) => ipcRenderer.invoke('quicklinks:export-csv', csvContent),
  quickLinksImportCsv: () => ipcRenderer.invoke('quicklinks:import-csv'),
  fetchUrlTitle: (url: string) => ipcRenderer.invoke('fetch-url-title', url),
  autostartGet: () => ipcRenderer.invoke('autostart:get'),
  autostartSet: (enable: boolean) => ipcRenderer.invoke('autostart:set', enable),
  shortcutGet: () => ipcRenderer.invoke('shortcut:get'),
  shortcutSet: (shortcut: string) => ipcRenderer.invoke('shortcut:set', shortcut),
  onShortcutConflict: (callback: (shortcut: string) => void) => {
    const sub = (_event: any, shortcut: string) => callback(shortcut)
    ipcRenderer.on('shortcut:conflict', sub)
    return () => ipcRenderer.removeListener('shortcut:conflict', sub)
  },

  // Watermark APIs
  watermarkStart: (job: any) => ipcRenderer.invoke('watermark:start', job),
  watermarkCancel: () => ipcRenderer.invoke('watermark:cancel'),
  watermarkGetVideoInfo: (path: string) => ipcRenderer.invoke('watermark:getVideoInfo', path),
  onWatermarkProgress: (callback: (data: any) => void) => {
    const sub = (_event: any, data: any) => callback(data)
    ipcRenderer.on('watermark:progress', sub)
    return () => ipcRenderer.removeListener('watermark:progress', sub)
  },
  onWatermarkDone: (callback: () => void) => {
    const sub = () => callback()
    ipcRenderer.on('watermark:done', sub)
    return () => ipcRenderer.removeListener('watermark:done', sub)
  },
  onWatermarkError: (callback: (msg: string) => void) => {
    const sub = (_event: any, msg: string) => callback(msg)
    ipcRenderer.on('watermark:error', sub)
    return () => ipcRenderer.removeListener('watermark:error', sub)
  },

  // SFX APIs
  sfxLoadLibrary: () => ipcRenderer.invoke('sfx:loadLibrary'),
  sfxSaveLibrary: (library: any[]) => ipcRenderer.invoke('sfx:saveLibrary', library),
  sfxAddFiles: (groupId: string, filePaths: string[]) => ipcRenderer.invoke('sfx:addFiles', groupId, filePaths),
  sfxStartDrag: (filePath: string) => ipcRenderer.send('sfx:startDrag', filePath),
  sfxExportLibrary: () => ipcRenderer.invoke('sfx:exportLibrary'),
  sfxImportLibrary: (zipPath: string, mode: 'merge' | 'replace') => ipcRenderer.invoke('sfx:importLibrary', zipPath, mode),
  sfxDeleteFile: (groupId: string, fileId: string) => ipcRenderer.invoke('sfx:deleteFile', groupId, fileId),
  sfxMoveToGroup: (fileId: string, fromGroupId: string, toGroupId: string) => ipcRenderer.invoke('sfx:moveToGroup', fileId, fromGroupId, toGroupId),
  sfxEditFile: (groupId: string, fileId: string, trimStart: number, trimEnd: number, volume: number) => ipcRenderer.invoke('sfx:editFile', groupId, fileId, trimStart, trimEnd, volume),
  sfxReadFile: (filePath: string) => ipcRenderer.invoke('sfx:readFile', filePath),

  sep: process.platform === 'win32' ? '\\' : '/'
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
