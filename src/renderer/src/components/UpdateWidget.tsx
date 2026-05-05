import { useState, useEffect } from 'react'
import { RefreshCw, ArrowUpCircle, CheckCircle, XCircle } from 'lucide-react'

export default function UpdateWidget() {
  const [updateInfo, setUpdateInfo] = useState<any>(null)
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'>('idle')
  const [progress, setProgress] = useState<any>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showResultToast, setShowResultToast] = useState(false)
  const [resultType, setResultType] = useState<'success' | 'info' | 'error'>('info')

  useEffect(() => {
    const unsub = window.api.onUpdateStatus((info: any) => {
      setStatus(info.status)
      if (info.status === 'downloading') {
        setProgress(info.data)
      } else if (info.status === 'available') {
        setUpdateInfo(info.data)
        setResultType('success')
        setShowResultToast(true)
        setTimeout(() => setShowResultToast(false), 5000)
      } else if (info.status === 'not-available') {
        setResultType('info')
        setShowResultToast(true)
        setTimeout(() => setShowResultToast(false), 3000)
      } else if (info.status === 'error') {
        setErrorMessage(info.data)
        setResultType('error')
        setShowResultToast(true)
        setTimeout(() => setShowResultToast(false), 5000)
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
          <button 
            onClick={handleCheckUpdate}
            disabled={status === 'checking' || status === 'downloading'}
            style={{ 
              background: 'rgba(168, 85, 247, 0.1)', 
              padding: 8, 
              borderRadius: 8, 
              color: 'var(--accent-purple)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease'
            }}
            className="update-check-btn"
          >
            <RefreshCw size={20} className={status === 'checking' ? 'spin' : ''} />
          </button>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>App Version v3.0.0</div>
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

        {status === 'downloaded' && (
          <button className="btn btn-primary" onClick={handleRestart} style={{ padding: '6px 12px', fontSize: 12 }}>
            <RefreshCw size={14} /> Restart to Update
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

      {/* Result Popups/Toasts */}
      {showResultToast && (
        <div className={`update-toast ${resultType}`} style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: resultType === 'success' ? '#10b981' : resultType === 'error' ? '#ef4444' : 'var(--bg-surface-elevated)',
          color: resultType === 'info' ? 'var(--text-primary)' : '#fff',
          padding: '12px 20px',
          borderRadius: 12,
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          zIndex: 9999,
          animation: 'toast-in 0.3s ease-out',
          border: resultType === 'info' ? '1px solid var(--border)' : 'none'
        }}>
          {resultType === 'success' && <ArrowUpCircle size={20} />}
          {resultType === 'info' && <CheckCircle size={20} style={{ color: '#10b981' }} />}
          {resultType === 'error' && <XCircle size={20} />}
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {resultType === 'success' && `Có bản cập nhật mới v${updateInfo?.version}!`}
            {resultType === 'info' && 'Bạn đang sử dụng phiên bản mới nhất.'}
            {resultType === 'error' && `Lỗi: ${errorMessage}`}
          </div>
        </div>
      )}
    </div>
  )
}
