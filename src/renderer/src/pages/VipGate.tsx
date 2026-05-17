import { useState } from 'react'
import { Lock, Eye, EyeOff, Star } from 'lucide-react'
import facebookIcon from '../assets/facebook.webp'

interface VipGateProps {
  onActivated: () => void
}

export default function VipGate({ onActivated }: VipGateProps): React.JSX.Element {
  const [key, setKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleActivate = async (): Promise<void> => {
    if (!key.trim()) {
      setError('Vui lòng nhập License Key')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await window.api.license.activate(key)
      if (result.success) {
        setSuccess(true)
        setError('')
        setTimeout(() => {
          onActivated()
        }, 1200)
      } else {
        setError('License Key không hợp lệ')
        setSuccess(false)
      }
    } catch {
      setError('Đã xảy ra lỗi khi kích hoạt')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      handleActivate()
    }
  }

  return (
    <div className="vip-gate-card">
      {/* Decorative glow */}
      <div className="vip-gate-glow" />

      {/* Icon */}
      <div className="vip-gate-icon">
        <Lock size={32} />
      </div>

      {/* Title */}
      <h2 className="vip-gate-title">Tính năng VIP</h2>
      <p className="vip-gate-desc">
        Tải video từ YouTube, TikTok, Instagram và 1000+ nguồn chỉ bằng cách paste link
      </p>

      {/* Success state */}
      {success && (
        <div className="vip-gate-success">
          <div className="vip-gate-success-icon">🎉</div>
          <span>Kích hoạt thành công!</span>
        </div>
      )}

      {/* Input */}
      {!success && (
        <>
          <div className="vip-gate-input-wrapper">
            <Lock size={16} className="vip-gate-input-icon" />
            <input
              type={showKey ? 'text' : 'password'}
              className="vip-gate-input"
              placeholder="VIP-XXXX-XXXX-XXXX"
              value={key}
              onChange={(e) => {
                setKey(e.target.value)
                setError('')
              }}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            <button
              className="vip-gate-eye-btn"
              onClick={() => setShowKey(!showKey)}
              title={showKey ? 'Ẩn key' : 'Hiện key'}
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && (
            <div className="vip-gate-error">
              {error}
            </div>
          )}

          <button
            className="btn btn-primary vip-gate-btn"
            onClick={handleActivate}
            disabled={loading || !key.trim()}
          >
            {loading ? (
              <>
                <div className="vip-gate-spinner" />
                Đang xác minh...
              </>
            ) : (
              <>
                <Star size={16} />
                Kích hoạt
              </>
            )}
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            marginTop: '24px',
            paddingTop: '20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            fontSize: '13px',
            color: 'var(--text-muted)',
            width: '100%'
          }}>
            <span>Yêu cầu mã kích hoạt:</span>
            <button
              onClick={() => window.api.openExternal('https://www.facebook.com/realthanhng/')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: "'Inter', sans-serif"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                e.currentTarget.style.color = '#93c5fd';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.15)';
                e.currentTarget.style.color = '#60a5fa';
              }}
            >
              <img src={facebookIcon} alt="Facebook" style={{ width: '13px', height: '13px', objectFit: 'contain' }} />
              <span>Facebook</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
