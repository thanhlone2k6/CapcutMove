import { useState, useEffect } from 'react'
import { RefreshCw, ArrowUpCircle } from 'lucide-react'

export default function UpdateWidget() {
  const [updateInfo, setUpdateInfo] = useState<any>(null)
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'>('idle')
  const [progress, setProgress] = useState<any>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const unsub = window.api.onUpdateStatus((info: any) => {
      setStatus(info.status)
      if (info.status === 'downloading') {
        setProgress(info.data)
      } else if (info.status === 'available') {
        setUpdateInfo(info.data)
      } else if (info.status === 'error') {
        setErrorMessage(info.data)
      }
    })
    return () => unsub()
  }, [])

  const handleCheckUpdate = async () => {
    setErrorMessage(null)
    setStatus('checking')
    await window.api.checkForUpdates()
  }

  const handleRestart = () => {
    window.api.restartAppToUpdate()
  }

  return (
    <div className="update-widget card" style={{ padding: '12px 16px', marginBottom: 16, border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: 8, borderRadius: 8, color: 'var(--accent-purple)' }}>
            <ArrowUpCircle size={20} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>App Version v0.1.1</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {status === 'idle' && 'Check for latest updates'}
              {status === 'checking' && 'Đang kiểm tra cập nhật...'}
              {status === 'available' && `Có bản mới: v${updateInfo?.version}`}
              {status === 'not-available' && 'Bạn đang dùng bản mới nhất.'}
              {status === 'downloading' && `Đang tải update: ${Math.floor(progress?.percent || 0)}%`}
              {status === 'downloaded' && 'Tải xong, bấm Restart để cập nhật'}
              {status === 'error' && `Lỗi update: ${errorMessage}`}
            </div>
          </div>
        </div>

        {status === 'downloaded' ? (
          <button className="btn btn-primary" onClick={handleRestart} style={{ padding: '6px 12px', fontSize: 12 }}>
            <RefreshCw size={14} /> Restart to Update
          </button>
        ) : (
          <button 
            className="btn btn-icon" 
            onClick={handleCheckUpdate} 
            disabled={status === 'checking' || status === 'downloading'}
            title="Check for updates"
          >
            <RefreshCw size={16} className={status === 'checking' ? 'spin' : ''} />
          </button>
        )}
      </div>

      {status === 'downloading' && (
        <div style={{ marginTop: 10 }}>
          <div className="progress-bar" style={{ height: 4 }}>
            <div className="progress-fill" style={{ width: `${progress?.percent || 0}%` }}></div>
          </div>
        </div>
      )}
    </div>
  )
}
