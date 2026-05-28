import { useState, useEffect, useRef } from 'react'
import { FileText, Upload, X, Play, AlertCircle, Loader2 } from 'lucide-react'
import WhisperSetupModal from './WhisperSetupModal'
import TranscriptResult, { Segment } from './TranscriptResult'

export interface MediaFileInfo {
  name: string
  path: string
  size: number
}

const LANGUAGES_LIST = [
  { name: 'Afrikaans', code: 'af' },
  { name: 'Albanian', code: 'sq' },
  { name: 'Amharic', code: 'am' },
  { name: 'Arabic', code: 'ar' },
  { name: 'Armenian', code: 'hy' },
  { name: 'Assamese', code: 'as' },
  { name: 'Azerbaijani', code: 'az' },
  { name: 'Bashkir', code: 'ba' },
  { name: 'Basque', code: 'eu' },
  { name: 'Belarusian', code: 'be' },
  { name: 'Bengali', code: 'bn' },
  { name: 'Bosnian', code: 'bs' },
  { name: 'Breton', code: 'br' },
  { name: 'Bulgarian', code: 'bg' },
  { name: 'Catalan', code: 'ca' },
  { name: 'Chinese', code: 'zh' },
  { name: 'Croatian', code: 'hr' },
  { name: 'Czech', code: 'cs' },
  { name: 'Danish', code: 'da' },
  { name: 'Dutch', code: 'nl' },
  { name: 'English', code: 'en' },
  { name: 'Estonian', code: 'et' },
  { name: 'Faroese', code: 'fo' },
  { name: 'Finnish', code: 'fi' },
  { name: 'French', code: 'fr' },
  { name: 'Galician', code: 'gl' },
  { name: 'Georgian', code: 'ka' },
  { name: 'German', code: 'de' },
  { name: 'Greek', code: 'el' },
  { name: 'Gujarati', code: 'gu' },
  { name: 'Haitian Creole', code: 'ht' },
  { name: 'Hausa', code: 'ha' },
  { name: 'Hawaiian', code: 'haw' },
  { name: 'Hebrew', code: 'he' },
  { name: 'Hindi', code: 'hi' },
  { name: 'Hungarian', code: 'hu' },
  { name: 'Icelandic', code: 'is' },
  { name: 'Indonesian', code: 'id' },
  { name: 'Italian', code: 'it' },
  { name: 'Japanese', code: 'ja' },
  { name: 'Javanese', code: 'jw' },
  { name: 'Kannada', code: 'kn' },
  { name: 'Kazakh', code: 'kk' },
  { name: 'Khmer', code: 'km' },
  { name: 'Korean', code: 'ko' },
  { name: 'Lao', code: 'lo' },
  { name: 'Latin', code: 'la' },
  { name: 'Latvian', code: 'lv' },
  { name: 'Lingala', code: 'ln' },
  { name: 'Lithuanian', code: 'lt' },
  { name: 'Luxembourgish', code: 'lb' },
  { name: 'Macedonian', code: 'mk' },
  { name: 'Malagasy', code: 'mg' },
  { name: 'Malay', code: 'ms' },
  { name: 'Malayalam', code: 'ml' },
  { name: 'Maltese', code: 'mt' },
  { name: 'Maori', code: 'mi' },
  { name: 'Marathi', code: 'mr' },
  { name: 'Mongolian', code: 'mn' },
  { name: 'Myanmar', code: 'my' },
  { name: 'Nepali', code: 'ne' },
  { name: 'Norwegian', code: 'no' },
  { name: 'Occitan', code: 'oc' },
  { name: 'Pashto', code: 'ps' },
  { name: 'Persian', code: 'fa' },
  { name: 'Polish', code: 'pl' },
  { name: 'Portuguese', code: 'pt' },
  { name: 'Punjabi', code: 'pa' },
  { name: 'Romanian', code: 'ro' },
  { name: 'Russian', code: 'ru' },
  { name: 'Sanskrit', code: 'sa' },
  { name: 'Serbian', code: 'sr' },
  { name: 'Shona', code: 'sn' },
  { name: 'Sindhi', code: 'sd' },
  { name: 'Sinhala', code: 'si' },
  { name: 'Slovak', code: 'sk' },
  { name: 'Slovenian', code: 'sl' },
  { name: 'Somali', code: 'so' },
  { name: 'Spanish', code: 'es' },
  { name: 'Sundanese', code: 'su' },
  { name: 'Swahili', code: 'sw' },
  { name: 'Swedish', code: 'sv' },
  { name: 'Tagalog', code: 'tl' },
  { name: 'Tajik', code: 'tg' },
  { name: 'Tamil', code: 'ta' },
  { name: 'Tatar', code: 'tt' },
  { name: 'Telugu', code: 'te' },
  { name: 'Thai', code: 'th' },
  { name: 'Tibetan', code: 'bo' },
  { name: 'Turkish', code: 'tr' },
  { name: 'Turkmen', code: 'tk' },
  { name: 'Ukrainian', code: 'uk' },
  { name: 'Urdu', code: 'ur' },
  { name: 'Uzbek', code: 'uz' },
  { name: 'Vietnamese', code: 'vi' },
  { name: 'Welsh', code: 'cy' },
  { name: 'Yiddish', code: 'yi' },
  { name: 'Yoruba', code: 'yo' }
]

type WhisperCheckState = 'checking' | 'ready' | 'not-ready'

export default function Transcript(): React.JSX.Element {
  const [whisperState, setWhisperState] = useState<WhisperCheckState>('checking')
  const [whisperPath, setWhisperPath] = useState<string | null>(null)
  const [showSetup, setShowSetup] = useState(false)

  // Transcription config
  const [mediaFile, setMediaFile] = useState<MediaFileInfo | null>(null)
  const [language, setLanguage] = useState<string>('auto')
  const [model, setModel] = useState<string>('base')
  const [outputFormat, setOutputFormat] = useState<'text' | 'srt'>('text')

  // Progress states
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [, setStatus] = useState<
    'idle' | 'initializing' | 'converting_audio' | 'transcribing' | 'done' | 'error'
  >('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [segments, setSegments] = useState<Segment[] | null>(null)

  // Realtime streaming
  const [logs, setLogs] = useState<string[]>([])
  const [liveSegments, setLiveSegments] = useState<Segment[]>([])

  // Drag & drop
  const [isDragging, setIsDragging] = useState(false)

  const logContainerRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  // --- Whisper check ---
  const checkWhisperStatus = async (): Promise<void> => {
    setWhisperState('checking')
    try {
      const res = await window.api.whisper.check()
      setWhisperState(res.ready ? 'ready' : 'not-ready')
      setWhisperPath(res.path)
    } catch {
      setWhisperState('not-ready')
    }
  }

  useEffect(() => {
    let active = true
    ;(async (): Promise<void> => {
      try {
        const res = await window.api.whisper.check()
        if (!active) return
        setWhisperState(res.ready ? 'ready' : 'not-ready')
        setWhisperPath(res.path)
      } catch {
        if (active) setWhisperState('not-ready')
      }
    })()
    return (): void => {
      active = false
    }
  }, [])

  // Auto-scroll log
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs])

  // Auto-scroll preview
  useEffect(() => {
    if (previewRef.current) {
      previewRef.current.scrollTop = previewRef.current.scrollHeight
    }
  }, [liveSegments])

  // Parse timestamp string like "01:57.140" or "00:01:57.140" to seconds
  const parseTimestamp = (ts: string): number => {
    const parts = ts.split(':')
    if (parts.length === 3) {
      return parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseFloat(parts[2])
    } else if (parts.length === 2) {
      return parseInt(parts[0], 10) * 60 + parseFloat(parts[1])
    }
    return parseFloat(ts) || 0
  }

  // Regex to parse segment lines from Whisper stderr
  const SEGMENT_RE = /\[([\d:.]+)\s*-+>\s*([\d:.]+)\]\s+(.+)/

  // Transcription event listeners
  useEffect(() => {
    if (!isTranscribing) return

    const unsubProgress = window.api.whisper.onTranscribeProgress((info): void => {
      setProgress(info.percent)
      setStatus(info.status)
      switch (info.status) {
        case 'initializing':
          setStatusMessage('Đang khởi tạo Whisper...')
          break
        case 'converting_audio':
          setStatusMessage('Đang trích xuất âm thanh (16kHz)...')
          break
        case 'transcribing':
          setStatusMessage(`Đang dịch giọng nói... (${info.percent}%)`)
          break
        case 'done':
          setStatusMessage('Hoàn tất!')
          break
        case 'error':
          setStatusMessage('Lỗi!')
          break
      }
    })

    const unsubLog = window.api.whisper.onTranscribeLog((line): void => {
      setLogs((prev) => [...prev, line])

      // Client-side fallback: parse segment from log line
      const match = line.match(SEGMENT_RE)
      if (match) {
        const seg = {
          start: parseTimestamp(match[1]),
          end: parseTimestamp(match[2]),
          text: match[3].trim()
        }
        setLiveSegments((prev) => {
          if (prev.some((s) => s.start === seg.start && s.end === seg.end)) return prev
          return [...prev, seg]
        })
      }
    })

    const unsubSegment = window.api.whisper.onTranscribeSegment((seg): void => {
      setLiveSegments((prev) => {
        if (prev.some((s) => s.start === seg.start && s.end === seg.end)) return prev
        return [...prev, seg]
      })
    })

    return (): void => {
      unsubProgress()
      unsubLog()
      unsubSegment()
    }
  }, [isTranscribing])

  // --- Handlers ---
  const handleSelectFile = async (): Promise<void> => {
    try {
      const filePath = await window.api.selectMissingFile('')
      if (filePath) {
        const parts = filePath.split(window.api.sep)
        setMediaFile({ name: parts[parts.length - 1], path: filePath, size: 0 })
        setErrorMsg('')
        setSegments(null)
      }
    } catch (err) {
      console.error('Failed to select file:', err)
    }
  }

  const handleDragOver = (e: React.DragEvent): void => {
    e.preventDefault()
    setIsDragging(true)
  }
  const handleDragLeave = (): void => setIsDragging(false)

  const handleDrop = (e: React.DragEvent): void => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      const isMedia =
        file.type.startsWith('video/') ||
        file.type.startsWith('audio/') ||
        /\.(mp4|mkv|avi|mov|mp3|wav|m4a|flac|ogg)$/i.test(file.name)
      if (isMedia) {
        // Use Electron's webUtils.getPathForFile() — file.path is deprecated in Electron 32+
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { webUtils } = (window as any).require?.('electron') ?? {}
        const filePath: string =
          webUtils?.getPathForFile(file) ||
          (file as unknown as { path: string } & File).path ||
          ''
        if (!filePath) {
          setErrorMsg('Không lấy được đường dẫn tệp. Hãy thử dùng nút chọn tệp thay vì kéo thả.')
          return
        }
        setMediaFile({
          name: file.name,
          path: filePath,
          size: file.size
        })
        setErrorMsg('')
        setSegments(null)
      } else {
        setErrorMsg('Định dạng tệp không được hỗ trợ.')
      }
    }
  }

  const handleStartTranscribe = async (): Promise<void> => {
    if (!mediaFile) return
    setIsTranscribing(true)
    setProgress(0)
    setLogs([])
    setLiveSegments([])
    setStatus('initializing')
    setStatusMessage('Đang chuẩn bị...')
    setErrorMsg('')
    try {
      const res = await window.api.whisper.transcribe({
        mediaPath: mediaFile.path,
        model,
        language
      })
      if (res.success && res.segments) {
        setSegments(res.segments)
        setStatus('done')
      } else {
        setErrorMsg(res.error || 'Dịch giọng nói thất bại.')
        setStatus('error')
      }
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Lỗi không xác định.')
      setStatus('error')
    } finally {
      setIsTranscribing(false)
    }
  }

  const handleCancelTranscribe = (): void => {
    window.api.whisper.cancelTranscribe()
    setIsTranscribing(false)
    setStatus('idle')
    setStatusMessage('')
  }

  const handleReset = (): void => {
    setMediaFile(null)
    setSegments(null)
    setLogs([])
    setLiveSegments([])
    setStatus('idle')
    setProgress(0)
    setErrorMsg('')
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return ''
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatTime = (seconds: number): string => {
    const s = Math.floor(seconds % 60)
    const m = Math.floor((seconds / 60) % 60)
    const h = Math.floor(seconds / 3600)
    const pad = (n: number): string => n.toString().padStart(2, '0')
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
  }

  // --- Status pill renderer ---
  const renderStatusPill = (): React.JSX.Element => {
    if (whisperState === 'checking') {
      return (
        <div className="trs-status-pill">
          <span className="trs-status-dot checking" />
          <Loader2 size={12} className="spin" />
          <span>Đang kiểm tra Whisper...</span>
        </div>
      )
    }
    if (whisperState === 'ready') {
      return (
        <div className="trs-status-pill">
          <span className="trs-status-dot ready" />
          <span>Whisper đã sẵn sàng · large-v2</span>
          <button className="trs-status-action" onClick={() => setShowSetup(true)}>
            Đổi đường dẫn
          </button>
        </div>
      )
    }
    return (
      <div className="trs-status-pill">
        <span className="trs-status-dot not-ready" />
        <span>Whisper chưa được cài đặt</span>
        <button className="trs-status-action" onClick={() => setShowSetup(true)}>
          Cài đặt ngay
        </button>
      </div>
    )
  }

  const SUPPORTED_FORMATS = ['.mp4', '.mov', '.avi', '.mkv', '.mp3', '.wav', '.m4a']

  const isFullPanel = isTranscribing || !!segments

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 16, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ marginBottom: 16, flexShrink: 0 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
          Transcript local bằng Whisper
        </h2>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 12px 0' }}>
          Trích xuất văn bản từ video/âm thanh · Offline bảo mật 100%
        </p>
        {renderStatusPill()}
      </div>

      {/* Error */}
      {errorMsg && (
        <div className="trs-error-banner" style={{ marginBottom: 12, flexShrink: 0 }}>
          <AlertCircle size={14} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: isFullPanel ? 'hidden' : undefined }}>
        {whisperState === 'not-ready' && !isTranscribing && !segments ? (
          /* ───── State 1: Not installed ───── */
          <div className="trs-not-installed">
            <div className="trs-not-installed-icon">
              <FileText size={32} />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              Tính năng Transcript cần Whisper AI
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 420, marginBottom: 24, lineHeight: '20px' }}>
              {window.api.sep === '\\'
                ? 'Purfview Faster Whisper XXL (~3GB) sẽ chạy offline hoàn toàn trên máy tính của bạn.'
                : 'whisper.cpp (~1.5GB) sẽ chạy offline hoàn toàn trên máy tính của bạn.'}
            </p>
            <button className="trs-install-btn" onClick={() => setShowSetup(true)}>
              Cài đặt Whisper
            </button>
          </div>
        ) : segments ? (
          /* ───── State 4: Result ───── */
          <div className="trs-processing-layout">
            {/* Left: Summary */}
            <div className="trs-left-panel">
              <div className="trs-panel-title">Thông tin</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Tên tệp</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                    {mediaFile?.name}
                  </div>
                </div>
                {mediaFile && mediaFile.size > 0 && (
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Kích thước</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {formatFileSize(mediaFile.size)}
                    </div>
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Mô hình</div>
                  <span className="trs-info-badge">{model}</span>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Ngôn ngữ</div>
                  <span className="trs-info-badge">
                    {language === 'auto' ? 'Auto detect' : (LANGUAGES_LIST.find((l) => l.code === language)?.name || language)}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Phân đoạn</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {segments.length} dòng
                  </div>
                </div>
                {segments.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Thời lượng</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {formatTime(segments[segments.length - 1].end)}
                    </div>
                  </div>
                )}
              </div>
              <button className="trs-start-btn" style={{ marginTop: 16 }} onClick={handleReset}>
                Dịch tệp khác
              </button>
            </div>

            {/* Right: TranscriptResult */}
            <div className="trs-right-panel" style={{ padding: 0 }}>
              <TranscriptResult
                segments={segments}
                mediaName={mediaFile?.name || 'audio'}
                outputFormat={outputFormat}
                onReset={handleReset}
              />
            </div>
          </div>
        ) : isTranscribing ? (
          /* ───── State 3: Processing ───── */
          <div className="trs-processing-layout">
            {/* Left: Progress */}
            <div className="trs-left-panel">
              <div className="trs-panel-title">Tiến trình</div>

              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, flexShrink: 0 }}>
                <div style={{ marginBottom: 4, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {mediaFile?.name}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  <span className="trs-info-badge">{model}</span>
                  <span className="trs-info-badge">
                    {language === 'auto' ? 'Auto' : language}
                  </span>
                  <span className="trs-info-badge">
                    {outputFormat === 'text' ? 'Văn bản' : '.srt'}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ marginBottom: 12, flexShrink: 0 }}>
                <div className="trs-progress-bar">
                  <div className="trs-progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                  <span>{statusMessage}</span>
                  <span>{progress}%</span>
                </div>
              </div>

              {/* Logs */}
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, flexShrink: 0 }}>
                Whisper Logs
              </div>
              <div className="trs-log-viewer" ref={logContainerRef}>
                {logs.length === 0 ? (
                  <span style={{ color: 'var(--text-muted)' }}>Đang chờ logs...</span>
                ) : (
                  logs.map((log, idx) => <div key={idx}>{log}</div>)
                )}
              </div>

              <button className="trs-cancel-btn" onClick={handleCancelTranscribe}>
                Hủy
              </button>
            </div>

            {/* Right: Realtime preview */}
            <div className="trs-right-panel">
              <div className="trs-panel-title">Xem trước (Real-time)</div>
              <div className="trs-scroll-area" ref={previewRef}>
                {liveSegments.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic' }}>
                    Đang chờ dòng dịch đầu tiên...
                  </div>
                ) : (
                  liveSegments.map((seg, i) => (
                    <div key={i} className="trs-live-segment">
                      <span className="trs-seg-time">
                        [{formatTime(seg.start)} → {formatTime(seg.end)}]
                      </span>
                      <span>{seg.text}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ───── State 2: Ready — file selection ───── */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 }}>
            {!mediaFile ? (
              /* Drop zone */
              <div
                className={`trs-dropzone ${isDragging ? 'dragging' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleSelectFile}
              >
                <div className="trs-dropzone-icon">
                  <Upload size={26} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                  Kéo thả tệp video/âm thanh vào đây
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 14px 0' }}>
                  Hoặc click để duyệt tệp từ máy tính
                </p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {SUPPORTED_FORMATS.map((fmt) => (
                    <span key={fmt} className="trs-format-pill">{fmt}</span>
                  ))}
                </div>
              </div>
            ) : (
              /* Config form */
              <div className="trs-config-card">
                {/* Selected file */}
                <div className="trs-file-row">
                  <div className="trs-file-icon">
                    <FileText size={18} />
                  </div>
                  <div className="trs-file-info">
                    <div className="trs-file-name">{mediaFile.name}</div>
                    <div className="trs-file-path">
                      {mediaFile.size > 0 ? formatFileSize(mediaFile.size) : mediaFile.path}
                    </div>
                  </div>
                  <button className="trs-file-remove" onClick={handleReset}>
                    <X size={18} />
                  </button>
                </div>

                {/* Controls row */}
                <div className="trs-controls-row">
                  <div>
                    <label className="trs-control-label">Mô hình AI</label>
                    <select
                      className="trs-select"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                    >
                      <option value="base">base (~140MB - Nhanh)</option>
                      <option value="small">small (~460MB - Khuyên dùng)</option>
                      <option value="medium">medium (~1.5GB)</option>
                      <option value="large-v2">large-v2 (~3GB)</option>
                    </select>
                  </div>
                  <div>
                    <label className="trs-control-label">Ngôn ngữ</label>
                    <select
                      className="trs-select"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                    >
                      <option value="auto">Auto detect</option>
                      <option value="vi">Tiếng Việt</option>
                      <option value="en">English</option>
                      <option value="" disabled>────────────────</option>
                      {LANGUAGES_LIST.map((lang) => (
                        <option key={lang.code} value={lang.code}>{lang.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="trs-control-label">Đầu ra</label>
                    <div className="trs-format-toggle">
                      <button
                        className={`trs-format-toggle-btn ${outputFormat === 'text' ? 'active' : ''}`}
                        onClick={() => setOutputFormat('text')}
                      >
                        Văn bản thô
                      </button>
                      <button
                        className={`trs-format-toggle-btn ${outputFormat === 'srt' ? 'active' : ''}`}
                        onClick={() => setOutputFormat('srt')}
                      >
                        Phụ đề .srt
                      </button>
                    </div>
                  </div>
                </div>

                {/* Start button */}
                <button
                  className="trs-start-btn"
                  disabled={whisperState !== 'ready'}
                  onClick={handleStartTranscribe}
                >
                  <Play size={14} fill="#fff" />
                  <span>Bắt đầu Transcript</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showSetup && (
        <WhisperSetupModal
          onClose={() => setShowSetup(false)}
          onInstalled={checkWhisperStatus}
          whisperPath={whisperPath}
        />
      )}
    </div>
  )
}
