import { useState, useEffect } from 'react'
import { Download, FolderOpen, CheckCircle, AlertTriangle, Copy, Check } from 'lucide-react'

interface WhisperSetupModalProps {
  onClose: () => void
  onInstalled: () => void
  whisperPath: string | null
}

type SetupStage = 'idle' | 'downloading' | 'extracting' | 'done' | 'error'

export default function WhisperSetupModal({
  onClose,
  onInstalled,
  whisperPath
}: WhisperSetupModalProps): React.JSX.Element {
  const [stage, setStage] = useState<SetupStage>('idle')
  const [percent, setPercent] = useState(0)
  const [speed, setSpeed] = useState('')
  const [message, setMessage] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [pathCopied, setPathCopied] = useState(false)

  useEffect(() => {
    const unsub = window.api.whisper.onDownloadProgress((info): void => {
      setStage(info.stage as SetupStage)
      setPercent(info.percent)
      if (info.speed) setSpeed(info.speed)
      if (info.message) setMessage(info.message)

      if (info.stage === 'done') {
        onInstalled()
        setTimeout(() => onClose(), 1500)
      } else if (info.stage === 'error') {
        setErrorMsg(info.message || 'Tải xuống hoặc giải nén thất bại.')
      }
    })
    return () => unsub()
  }, [onInstalled, onClose])

  const handleDownload = async (): Promise<void> => {
    setStage('downloading')
    setPercent(0)
    setErrorMsg('')
    setMessage('Đang kết nối máy chủ...')
    try {
      const res = await window.api.whisper.download()
      if (res.success) {
        onInstalled()
        setTimeout(() => onClose(), 1500)
      } else {
        setStage('error')
        setErrorMsg(res.error || 'Quá trình cài đặt tự động thất bại.')
      }
    } catch (err: unknown) {
      setStage('error')
      setErrorMsg((err as Error).message || 'Lỗi không xác định.')
    }
  }

  const handleCancelDownload = (): void => {
    window.api.whisper.cancelDownload()
    setStage('idle')
    setPercent(0)
    setMessage('')
  }

  const handleSelectFolder = async (): Promise<void> => {
    setErrorMsg('')
    try {
      const res = await window.api.whisper.select()
      if (res.success) {
        onInstalled()
        onClose()
      } else {
        setErrorMsg(res.error || 'Thư mục chọn không hợp lệ.')
      }
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Lỗi chọn thư mục.')
    }
  }

  const handleCopyPath = async (): Promise<void> => {
    if (whisperPath) {
      await window.api.copyToClipboard(whisperPath)
      setPathCopied(true)
      setTimeout(() => setPathCopied(false), 2000)
    }
  }

  const getPlatformSizeLabel = (): string => {
    return navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '~1.5GB' : '~3GB'
  }

  const isBusy = stage === 'downloading' || stage === 'extracting'

  return (
    <div
      onClick={!isBusy ? onClose : undefined}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 520,
          width: '92%',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Thiết lập Whisper AI
          </h3>
          {!isBusy && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: 20,
                cursor: 'pointer',
                lineHeight: 1,
                padding: 4
              }}
            >
              &times;
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {stage === 'idle' && (
            <div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20, textAlign: 'center' }}>
                Tính năng Transcript offline yêu cầu Whisper engine.
                <br />
                Chọn cách thiết lập bên dưới.
              </p>

              {/* Detected path */}
              {whisperPath && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Đường dẫn hiện tại
                  </div>
                  <div className="trs-path-box">
                    <span style={{ flex: 1 }}>{whisperPath}</span>
                    <button className="trs-path-copy" onClick={handleCopyPath}>
                      {pathCopied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Error */}
              {errorMsg && (
                <div className="trs-error-banner" style={{ marginBottom: 16 }}>
                  <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Two option cards */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                <div className="trs-setup-card primary" onClick={handleDownload}>
                  <div className="trs-setup-card-icon purple">
                    <Download size={20} />
                  </div>
                  <div className="trs-setup-card-title">Tải về ({getPlatformSizeLabel()})</div>
                  <div className="trs-setup-card-sub">Tải tự động từ GitHub</div>
                </div>

                <div className="trs-setup-card" onClick={handleSelectFolder}>
                  <div className="trs-setup-card-icon muted">
                    <FolderOpen size={20} />
                  </div>
                  <div className="trs-setup-card-title">Tôi đã cài sẵn</div>
                  <div className="trs-setup-card-sub">Chọn thư mục Whisper</div>
                </div>
              </div>

              {/* Cancel */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={onClose}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: 12,
                    cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif",
                    padding: '6px 16px'
                  }}
                >
                  Hủy
                </button>
              </div>
            </div>
          )}

          {isBusy && (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              {/* Spinner */}
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: 20 }}>
                <div
                  className="spin"
                  style={{
                    width: 52,
                    height: 52,
                    border: '3px solid var(--accent-purple)',
                    borderTopColor: 'transparent',
                    borderRadius: '50%'
                  }}
                />
                <Download
                  size={18}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: 'var(--accent-purple)'
                  }}
                />
              </div>

              <h4 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                {stage === 'downloading' ? 'Đang tải gói cài đặt...' : 'Đang cài đặt và cấu hình...'}
              </h4>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20 }}>
                {message || 'Vui lòng giữ kết nối mạng ổn định...'}
              </p>

              {/* Progress bar */}
              <div style={{ marginBottom: 20 }}>
                <div className="trs-progress-bar" style={{ height: 8 }}>
                  <div className="trs-progress-fill" style={{ width: `${percent}%` }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                  <span>Tiến độ: {percent}%</span>
                  {stage === 'downloading' && <span>Tốc độ: {speed}</span>}
                </div>
              </div>

              <button className="trs-cancel-btn" style={{ width: 'auto', padding: '8px 24px', display: 'inline-flex' }} onClick={handleCancelDownload}>
                Huỷ tải về
              </button>
            </div>
          )}

          {stage === 'done' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ color: 'var(--success)', marginBottom: 16 }}>
                <CheckCircle size={48} />
              </div>
              <h4 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                Thiết Lập Thành Công!
              </h4>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                Đang mở khu vực làm việc...
              </p>
            </div>
          )}

          {stage === 'error' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ color: 'var(--danger)', marginBottom: 16 }}>
                <AlertTriangle size={48} />
              </div>
              <h4 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                Lỗi Cấu Hình Whisper
              </h4>
              <p style={{ fontSize: 13, color: 'var(--danger)', marginBottom: 20 }}>
                {errorMsg || 'Đã có lỗi xảy ra trong quá trình thiết lập.'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
                <button
                  className="trs-start-btn"
                  style={{ width: 'auto', padding: '10px 28px' }}
                  onClick={() => {
                    setStage('idle')
                    setErrorMsg('')
                  }}
                >
                  Thử lại cài đặt
                </button>
                <button
                  onClick={onClose}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: 12,
                    cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif",
                    padding: '6px 16px'
                  }}
                >
                  Đóng
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
