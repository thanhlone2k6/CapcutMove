import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Download, FolderOpen, Trash2, X, Music, Video, Settings,
  Link, CheckCircle, AlertCircle, Loader2, Clipboard, RotateCw, Copy
} from 'lucide-react'

interface DownloadTask {
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

interface VideoDownloaderProps {
  settings: any
  onSettingsChange: (s: any) => void
  onActiveCountChange?: (count: number) => void
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function isValidUrl(str: string): boolean {
  return /^https?:\/\/.+/i.test(str.trim())
}

function getThumbnailUrl(url: string): string | null {
  if (!url) return null
  // YouTube standard, shorts, and mobile URLs
  const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/ ]{11})/i)
  if (ytMatch && ytMatch[1]) {
    return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`
  }
  return null
}

function getPlatformTag(url: string): React.JSX.Element {
  const lowerUrl = url.toLowerCase()
  
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '1px 5px',
        borderRadius: '4px',
        background: 'rgba(239, 68, 68, 0.08)',
        border: '1px solid rgba(239, 68, 68, 0.15)',
        color: '#f87171',
        fontSize: '9px',
        fontWeight: 700,
        textTransform: 'uppercase'
      }}>
        <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor">
          <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.517 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.871.508 9.388.508 9.388.508s7.517 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
        <span>YouTube</span>
      </span>
    )
  }
  
  if (lowerUrl.includes('tiktok.com')) {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '1px 5px',
        borderRadius: '4px',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        color: '#e2e8f0',
        fontSize: '9px',
        fontWeight: 700,
        textTransform: 'uppercase'
      }}>
        <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.86-.74-3.94-1.74-.22-.21-.42-.45-.6-.71-.02 1.69-.01 3.38-.02 5.07-.05 1.88-.58 3.77-1.63 5.34-1.22 1.87-3.23 3.23-5.46 3.69-1.92.42-3.98.24-5.78-.51-2.18-.89-3.98-2.67-4.9-4.88-.95-2.23-1.02-4.8-.18-7.09.84-2.34 2.65-4.32 4.95-5.26 1.73-.72 3.65-.89 5.5-.47.02 1.34.02 2.69.01 4.04-1.12-.34-2.35-.31-3.42.19-1.26.58-2.22 1.72-2.58 3.07-.46 1.68-.08 3.58.98 4.92 1.05 1.35 2.82 2.12 4.54 1.94 1.65-.13 3.19-1.12 3.86-2.63.45-.98.57-2.07.55-3.15-.01-4.22-.02-8.44-.02-12.66z"/>
        </svg>
        <span>TikTok</span>
      </span>
    )
  }
  
  if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.watch') || lowerUrl.includes('fb.com')) {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '1px 5px',
        borderRadius: '4px',
        background: 'rgba(59, 130, 246, 0.08)',
        border: '1px solid rgba(59, 130, 246, 0.15)',
        color: '#60a5fa',
        fontSize: '9px',
        fontWeight: 700,
        textTransform: 'uppercase'
      }}>
        <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
        <span>Facebook</span>
      </span>
    )
  }
  
  if (lowerUrl.includes('instagram.com')) {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '1px 5px',
        borderRadius: '4px',
        background: 'rgba(236, 72, 153, 0.08)',
        border: '1px solid rgba(236, 72, 153, 0.15)',
        color: '#f472b6',
        fontSize: '9px',
        fontWeight: 700,
        textTransform: 'uppercase'
      }}>
        <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
        </svg>
        <span>Instagram</span>
      </span>
    )
  }
  
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '1px 5px',
      borderRadius: '4px',
      background: 'rgba(107, 114, 128, 0.08)',
      border: '1px solid rgba(107, 114, 128, 0.15)',
      color: '#9ca3af',
      fontSize: '9px',
      fontWeight: 700,
      textTransform: 'uppercase'
    }}>
      <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
      </svg>
      <span>Web</span>
    </span>
  )
}

export default function VideoDownloader({
  settings,
  onSettingsChange,
  onActiveCountChange
}: VideoDownloaderProps): React.JSX.Element {
  const [tasks, setTasks] = useState<DownloadTask[]>([])
  const [urlInput, setUrlInput] = useState('')
  const [mode, setMode] = useState<'video' | 'audio'>(settings?.videoDownloadMode || 'video')
  const [outputDir, setOutputDir] = useState(settings?.lastVideoOutputDir || '')
  const [ytDlpReady, setYtDlpReady] = useState<boolean | null>(null)
  const [ytDlpDownloading, setYtDlpDownloading] = useState(false)
  const [clipboardToast, setClipboardToast] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const lastClipboardUrl = useRef('')
  const clipboardIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const dismissedUrls = useRef<Set<string>>(new Set())

  // Check yt-dlp on mount
  useEffect(() => {
    window.api.download.checkYtDlp().then(({ ready }) => {
      setYtDlpReady(ready)
      if (!ready) {
        setYtDlpDownloading(true)
        window.api.download.ensureYtDlp().then(() => {
          setYtDlpReady(true)
          setYtDlpDownloading(false)
        }).catch(() => {
          setYtDlpReady(false)
          setYtDlpDownloading(false)
        })
      }
    })
  }, [])

  // Subscribe to download events
  useEffect(() => {
    const unsubProgress = window.api.download.onProgress((task: DownloadTask) => {
      setTasks(prev => {
        const idx = prev.findIndex(t => t.id === task.id)
        if (idx >= 0) {
          const updated = [...prev]
          updated[idx] = task
          return updated
        }
        return [...prev, task]
      })
    })

    const unsubDone = window.api.download.onDone((task: DownloadTask) => {
      setTasks(prev => {
        const idx = prev.findIndex(t => t.id === task.id)
        if (idx >= 0) {
          const updated = [...prev]
          updated[idx] = task
          return updated
        }
        return [...prev, task]
      })
    })

    const unsubError = window.api.download.onError((task: DownloadTask) => {
      setTasks(prev => {
        const idx = prev.findIndex(t => t.id === task.id)
        if (idx >= 0) {
          const updated = [...prev]
          updated[idx] = task
          return updated
        }
        return [...prev, task]
      })
    })

    return () => {
      unsubProgress()
      unsubDone()
      unsubError()
    }
  }, [])

  // Report active count
  useEffect(() => {
    const activeCount = tasks.filter(t => t.status === 'downloading' || t.status === 'queued').length
    onActiveCountChange?.(activeCount)
  }, [tasks, onActiveCountChange])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Clipboard watcher
  useEffect(() => {
    const checkClipboard = async (): Promise<void> => {
      try {
        const text = await window.api.readClipboard()
        if (
          text &&
          text !== lastClipboardUrl.current &&
          isValidUrl(text) &&
          !dismissedUrls.current.has(text)
        ) {
          lastClipboardUrl.current = text
          setClipboardToast(text)
        }
      } catch {
        // ignore
      }
    }

    clipboardIntervalRef.current = setInterval(checkClipboard, 1500)

    return () => {
      if (clipboardIntervalRef.current) {
        clearInterval(clipboardIntervalRef.current)
      }
    }
  }, [])

  const startDownload = useCallback(async (url: string) => {
    if (!isValidUrl(url)) return

    let dir = outputDir
    if (!dir) {
      const selected = await window.api.selectFolder()
      if (!selected) return
      dir = selected
      setOutputDir(dir)
      await window.api.saveSettings({ lastVideoOutputDir: dir })
      onSettingsChange({ ...settings, lastVideoOutputDir: dir })
    }

    try {
      await window.api.download.start({ url: url.trim(), outputDir: dir, mode })
    } catch (err) {
      console.error('Failed to start download:', err)
    }
  }, [outputDir, mode, settings, onSettingsChange])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData('text')
    if (isValidUrl(pastedText)) {
      e.preventDefault()
      startDownload(pastedText)
      setUrlInput('')
    }
  }, [startDownload])

  const handlePasteFromClipboard = async (): Promise<void> => {
    try {
      const text = await window.api.readClipboard()
      if (text && text.trim()) {
        setUrlInput(text.trim())
        if (isValidUrl(text)) {
          startDownload(text)
          setUrlInput('')
        }
      }
    } catch (err) {
      console.error('Failed to read clipboard:', err)
    }
  }

  const handleInputKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && isValidUrl(urlInput)) {
      startDownload(urlInput)
      setUrlInput('')
    }
  }

  const handleSelectFolder = async (): Promise<void> => {
    const selected = await window.api.selectFolder()
    if (selected) {
      setOutputDir(selected)
      await window.api.saveSettings({ lastVideoOutputDir: selected })
      onSettingsChange({ ...settings, lastVideoOutputDir: selected })
    }
  }

  const handleModeChange = async (newMode: 'video' | 'audio'): Promise<void> => {
    setMode(newMode)
    await window.api.saveSettings({ videoDownloadMode: newMode })
    onSettingsChange({ ...settings, videoDownloadMode: newMode })
  }

  const handleCancel = (id: string): void => {
    window.api.download.cancel(id)
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'cancelled' } : t))
  }

  const handleShowInFolder = (filePath: string): void => {
    window.api.download.showInFolder(filePath)
  }

  const handleDeleteFile = async (task: DownloadTask): Promise<void> => {
    if (task.filePath) {
      await window.api.download.deleteFile(task.filePath)
    }
    setTasks(prev => prev.filter(t => t.id !== task.id))
  }

  const handleRemoveTask = (id: string): void => {
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  const handleClipboardAccept = (): void => {
    if (clipboardToast) {
      startDownload(clipboardToast)
      dismissedUrls.current.add(clipboardToast)
      setClipboardToast(null)
    }
  }

  const handleClipboardDismiss = (): void => {
    if (clipboardToast) {
      dismissedUrls.current.add(clipboardToast)
      setClipboardToast(null)
    }
  }

  const renderTaskThumbnail = (task: DownloadTask) => {
    const thumbUrl = getThumbnailUrl(task.url)
    if (thumbUrl) {
      return (
        <div className="vdl-task-thumbnail" style={{
          width: '80px',
          height: '45px',
          borderRadius: '6px',
          overflow: 'hidden',
          background: 'rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          flexShrink: 0,
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <img src={thumbUrl} alt="thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )
    }
    
    const isAudio = task.mode === 'audio'
    return (
      <div className="vdl-task-thumbnail" style={{
        width: '80px',
        height: '45px',
        borderRadius: '6px',
        overflow: 'hidden',
        background: isAudio
          ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(236, 72, 153, 0.15))'
          : 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(168, 85, 247, 0.15))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        flexShrink: 0,
        border: '1px solid rgba(255, 255, 255, 0.08)',
        color: isAudio ? 'var(--accent-purple)' : '#3b82f6'
      }}>
        {isAudio ? <Music size={18} /> : <Video size={18} />}
      </div>
    )
  }

  const downloadingTasks = tasks.filter(t => t.status === 'downloading' || t.status === 'queued')
  const completedTasks = tasks.filter(t => t.status === 'done')
  const errorTasks = tasks.filter(t => t.status === 'error' || t.status === 'cancelled')

  return (
    <div className="vdl-layout">
      {/* Settings Panel */}
      <div className="vdl-settings-panel">
        <div className="vdl-settings-header">
          <Settings size={16} />
          <span>Cài đặt</span>
        </div>

        {/* Format */}
        <div className="vdl-settings-section">
          <div className="vdl-settings-label">Định dạng xuất</div>
          <label className={`vdl-radio-item ${mode === 'video' ? 'active' : ''}`}>
            <input
              type="radio"
              name="downloadMode"
              checked={mode === 'video'}
              onChange={() => handleModeChange('video')}
            />
            <Video size={14} />
            <span>Video (MP4)</span>
          </label>
          <label className={`vdl-radio-item ${mode === 'audio' ? 'active' : ''}`}>
            <input
              type="radio"
              name="downloadMode"
              checked={mode === 'audio'}
              onChange={() => handleModeChange('audio')}
            />
            <Music size={14} />
            <span>Chỉ âm thanh (MP3)</span>
          </label>
        </div>

        {/* yt-dlp status */}
        <div className="vdl-settings-section">
          <div className="vdl-settings-label">Engine</div>
          <div className={`vdl-engine-status ${ytDlpReady ? 'ready' : ''}`}>
            {ytDlpDownloading ? (
              <>
                <Loader2 size={14} className="spin" />
                <span>Đang tải yt-dlp...</span>
              </>
            ) : ytDlpReady ? (
              <>
                <CheckCircle size={14} />
                <span>yt-dlp sẵn sàng</span>
              </>
            ) : (
              <>
                <AlertCircle size={14} />
                <span>yt-dlp chưa có</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Download Area */}
      <div className="vdl-download-area">
        {/* Clipboard toast */}
        {clipboardToast && (
          <div className="vdl-clipboard-toast">
            <div className="vdl-clipboard-toast-text">
              <Link size={14} />
              <span>Phát hiện link video, tải ngay không?</span>
            </div>
            <div className="vdl-clipboard-toast-url">{clipboardToast}</div>
            <div className="vdl-clipboard-toast-actions">
              <button className="btn btn-primary vdl-toast-btn" onClick={handleClipboardAccept}>
                Có
              </button>
              <button className="btn vdl-toast-btn" onClick={handleClipboardDismiss}>
                Bỏ qua
              </button>
            </div>
          </div>
        )}

        {/* URL Input */}
        <div className="vdl-url-section">
          <div className="vdl-url-label">
            <Link size={16} />
            <span>Paste link để tải ngay</span>
          </div>
          <div className="vdl-url-input-wrapper">
            <input
              ref={inputRef}
              type="text"
              className="vdl-url-input"
              placeholder="https://youtube.com/watch?v=..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onPaste={handlePaste}
              onKeyDown={handleInputKeyDown}
            />
            <button
              className="btn btn-secondary vdl-paste-btn"
              onClick={handlePasteFromClipboard}
              title="Dán link từ Clipboard"
              type="button"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                padding: '12px 16px',
                borderRadius: '10px'
              }}
            >
              <Clipboard size={14} />
              <span>Dán link</span>
            </button>
            {urlInput && isValidUrl(urlInput) && (
              <button
                className="btn btn-primary vdl-download-btn"
                onClick={() => {
                  startDownload(urlInput)
                  setUrlInput('')
                }}
              >
                <Download size={14} />
              </button>
            )}
          </div>
          <div className="vdl-url-hint">
            Hỗ trợ: YouTube, TikTok, Instagram, Facebook, Twitter/X, và 1000+ nguồn
          </div>

          {/* Large output directory selection directly below the input line */}
          <div className="vdl-output-section-large" style={{ marginTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '16px' }}>
            <div className="vdl-settings-label" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Thư mục lưu video
            </div>
            <button className="vdl-folder-btn-large" onClick={handleSelectFolder} style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px 18px',
              background: 'var(--bg-main)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'var(--transition)',
              textAlign: 'left'
            }}>
              <FolderOpen size={18} style={{ color: 'var(--accent-purple)', flexShrink: 0 }} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: 'rtl', textAlign: 'left' }}>
                {outputDir || 'Chọn thư mục để lưu video...'}
              </span>
              <span className="vdl-change-text" style={{ fontSize: '12px', color: 'var(--accent-purple)', fontWeight: 600, flexShrink: 0, paddingLeft: '12px', borderLeft: '1px solid var(--border)' }}>
                Thay đổi
              </span>
            </button>
          </div>
        </div>

        {/* Task Lists */}
        <div className="vdl-tasks-container">
          {/* Downloading */}
          {downloadingTasks.length > 0 && (
            <div className="vdl-task-group">
              <div className="vdl-task-group-header">
                <Download size={14} className="vdl-pulse" />
                <span>Đang tải ({downloadingTasks.length} task)</span>
              </div>
              {[...downloadingTasks].reverse().map((task, index) => (
                <div key={`downloading-${task.id}-${index}`} className="vdl-task-card downloading">
                  <div className="vdl-task-header">
                    {renderTaskThumbnail(task)}
                    <div className="vdl-task-info">
                      <div className="vdl-task-title" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {task.title || 'Đang lấy thông tin...'}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {task.mode === 'audio' ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: 'rgba(6, 182, 212, 0.1)',
                              border: '1px solid rgba(6, 182, 212, 0.2)',
                              color: '#22d3ee',
                              fontSize: '9px',
                              fontWeight: 700,
                              textTransform: 'uppercase'
                            }}>
                              <Music size={8} />
                              <span>Âm thanh</span>
                            </span>
                          ) : (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: 'rgba(168, 85, 247, 0.1)',
                              border: '1px solid rgba(168, 85, 247, 0.2)',
                              color: '#c084fc',
                              fontSize: '9px',
                              fontWeight: 700,
                              textTransform: 'uppercase'
                            }}>
                              <Video size={8} />
                              <span>Video</span>
                            </span>
                          )}
                          {getPlatformTag(task.url)}
                        </div>
                      </div>
                      <div className="vdl-task-meta">
                        {task.progress > 0 ? `${Math.round(task.progress)}%` : 'Đang chuẩn bị...'}
                        {task.downloadedBytes > 0 && ` • ${formatBytes(task.downloadedBytes)}`}
                        {task.totalBytes > 0 && ` / ${formatBytes(task.totalBytes)}`}
                        {task.speed && ` • ${task.speed}`}
                      </div>
                    </div>
                    <button
                      className="vdl-task-cancel"
                      onClick={() => handleCancel(task.id)}
                      title="Huỷ tải"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="vdl-task-progress">
                    <div
                      className="vdl-task-progress-fill"
                      style={{ width: `${Math.min(task.progress, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Completed */}
          {completedTasks.length > 0 && (
            <div className="vdl-task-group">
              <div className="vdl-task-group-header">
                <CheckCircle size={14} />
                <span>Đã hoàn thành ({completedTasks.length} task)</span>
              </div>
              {[...completedTasks].reverse().map((task, index) => (
                <div key={`completed-${task.id}-${index}`} className="vdl-task-card done" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div className="vdl-task-header" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {renderTaskThumbnail(task)}
                    <div className="vdl-task-info" style={{ flex: 1, minWidth: 0 }}>
                      <div className="vdl-task-title" style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {task.title || 'Video'}
                      </div>
                      <div className="vdl-task-meta" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                        <span className="vdl-status-badge success" style={{
                          background: 'rgba(16, 185, 129, 0.1)',
                          border: '1px solid rgba(16, 185, 129, 0.2)',
                          color: '#34d399',
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          textTransform: 'uppercase'
                        }}>Thành công</span>

                        {task.mode === 'audio' ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: 'rgba(6, 182, 212, 0.1)',
                            border: '1px solid rgba(6, 182, 212, 0.2)',
                            color: '#22d3ee',
                            fontSize: '9px',
                            fontWeight: 700,
                            textTransform: 'uppercase'
                          }}>
                            <Music size={8} />
                            <span>Âm thanh (MP3)</span>
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: 'rgba(168, 85, 247, 0.1)',
                            border: '1px solid rgba(168, 85, 247, 0.2)',
                            color: '#c084fc',
                            fontSize: '9px',
                            fontWeight: 700,
                            textTransform: 'uppercase'
                          }}>
                            <Video size={8} />
                            <span>Video (MP4)</span>
                          </span>
                        )}

                        {getPlatformTag(task.url)}

                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {task.totalBytes > 0 && formatBytes(task.totalBytes)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="vdl-task-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {task.filePath && (
                        <button
                          className="btn btn-secondary vdl-task-action-btn-open"
                          onClick={() => handleShowInFolder(task.filePath!)}
                          title="Mở thư mục chứa file"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            background: 'rgba(168, 85, 247, 0.1)',
                            border: '1px solid rgba(168, 85, 247, 0.2)',
                            color: 'var(--accent-purple)',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'var(--transition)'
                          }}
                        >
                          <FolderOpen size={13} />
                          <span>Mở thư mục</span>
                        </button>
                      )}
                      <button
                        className="vdl-task-action-btn danger"
                        onClick={() => handleDeleteFile(task)}
                        title="Xoá file"
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.15)',
                          color: '#ef4444',
                          cursor: 'pointer',
                          transition: 'var(--transition)'
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {errorTasks.length > 0 && (
            <div className="vdl-task-group">
              <div className="vdl-task-group-header error" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <AlertCircle size={14} style={{ color: '#ef4444' }} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Lỗi ({errorTasks.length} task)
                </span>
              </div>
              {[...errorTasks].reverse().map((task, index) => (
                <div key={`error-${task.id}-${index}`} className="vdl-task-card error" style={{
                  background: 'rgba(239, 68, 68, 0.03)',
                  border: '1px solid rgba(239, 68, 68, 0.15)',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '10px'
                }}>
                  <div className="vdl-task-header" style={{ display: 'flex', alignItems: 'center', gap: '14px', width: '100%' }}>
                    {renderTaskThumbnail(task)}
                    <div className="vdl-task-info" style={{ flex: 1, minWidth: 0 }}>
                      <div className="vdl-task-title" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {task.title || task.url}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span className="vdl-task-meta error" style={{ fontSize: '12px', color: '#ef4444', fontWeight: 500 }}>
                          {task.status === 'cancelled' ? 'Đã huỷ' : (task.error || 'Lỗi không xác định')}
                        </span>
                        
                        {task.mode === 'audio' ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: 'rgba(6, 182, 212, 0.08)',
                            border: '1px solid rgba(6, 182, 212, 0.15)',
                            color: '#22d3ee',
                            fontSize: '9px',
                            fontWeight: 700,
                            textTransform: 'uppercase'
                          }}>
                            <Music size={8} />
                            <span>Âm thanh</span>
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: 'rgba(168, 85, 247, 0.08)',
                            border: '1px solid rgba(168, 85, 247, 0.15)',
                            color: '#c084fc',
                            fontSize: '9px',
                            fontWeight: 700,
                            textTransform: 'uppercase'
                          }}>
                            <Video size={8} />
                            <span>Video</span>
                          </span>
                        )}

                        {getPlatformTag(task.url)}
                      </div>
                    </div>
                    
                    <div className="vdl-task-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto', flexShrink: 0 }}>
                      {/* Retry Button */}
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          startDownload(task.url)
                          handleRemoveTask(task.id)
                        }}
                        title="Tải lại video"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          background: 'rgba(59, 130, 246, 0.1)',
                          border: '1px solid rgba(59, 130, 246, 0.2)',
                          color: '#3b82f6',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'var(--transition)'
                        }}
                      >
                        <RotateCw size={12} />
                        <span>Thử lại</span>
                      </button>

                      {/* Copy Link Button */}
                      <button
                        className="vdl-task-action-btn"
                        onClick={() => {
                          navigator.clipboard.writeText(task.url)
                        }}
                        title="Sao chép đường dẫn"
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          transition: 'var(--transition)'
                        }}
                      >
                        <Copy size={13} />
                      </button>

                      {/* Delete Button */}
                      <button
                        className="vdl-task-action-btn danger"
                        onClick={() => handleRemoveTask(task.id)}
                        title="Xoá khỏi danh sách"
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.15)',
                          color: '#ef4444',
                          cursor: 'pointer',
                          transition: 'var(--transition)'
                        }}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {tasks.length === 0 && (
            <div className="vdl-empty-state">
              <Download size={40} />
              <p>Paste link vào ô trên để bắt đầu tải</p>
              <span>Hoặc copy link — app sẽ tự phát hiện</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
