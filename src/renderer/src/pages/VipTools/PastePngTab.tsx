import React, { useState, useEffect } from 'react'
import { ClipboardPaste, Power, Keyboard, Info, CheckCircle2, XCircle } from 'lucide-react'

export default function PastePngTab(): React.JSX.Element {
  const [enabled, setEnabled] = useState(false)
  const [shortcut, setShortcut] = useState('CommandOrControl+Alt+V')
  const [isEditingShortcut, setIsEditingShortcut] = useState(false)
  const [tempShortcut, setTempShortcut] = useState('')
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    // Load initial settings
    window.api.pastePng.getSettings().then((settings) => {
      setEnabled(settings.enabled)
      setShortcut(settings.shortcut)
    })

    // Listeners for paste events
    const unsubSuccess = window.api.pastePng.onSuccess((filePath) => {
      showToast(`Đã lưu ảnh PNG:\n${filePath}`, 'success')
    })

    const unsubError = window.api.pastePng.onError((msg) => {
      showToast(msg, 'error')
    })

    return () => {
      unsubSuccess()
      unsubError()
    }
  }, [])

  const showToast = (text: string, type: 'success' | 'error') => {
    setToastMsg({ text, type })
    setTimeout(() => {
      setToastMsg((prev) => (prev?.text === text ? null : prev))
    }, 4000)
  }

  const handleToggle = async () => {
    const newState = !enabled
    setEnabled(newState)
    await window.api.pastePng.setEnabled(newState)
    if (newState) {
      showToast(`Paste PNG đã bật - Hotkey: ${shortcut}`, 'success')
    } else {
      showToast('Paste PNG đã tắt', 'success')
    }
  }

  const handleShortcutKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.key === 'Escape') {
      setIsEditingShortcut(false)
      setTempShortcut('')
      return
    }

    const keys: string[] = []
    if (e.ctrlKey) keys.push('CommandOrControl')
    if (e.altKey) keys.push('Alt')
    if (e.shiftKey) keys.push('Shift')
    if (e.metaKey && process.platform === 'darwin') keys.push('Cmd')

    // Don't just register modifiers
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
      setTempShortcut(keys.join('+'))
      return
    }

    // Add main key
    let mainKey = e.key.toUpperCase()
    if (mainKey === ' ') mainKey = 'Space'

    keys.push(mainKey)
    const newShortcut = keys.join('+')
    setTempShortcut(newShortcut)
  }

  const handleSaveShortcut = async () => {
    if (!tempShortcut || tempShortcut === shortcut) {
      setIsEditingShortcut(false)
      return
    }

    // Validate simple shortcut (at least one modifier + one key ideally, but we let Electron handle rejection)
    if (!tempShortcut.includes('+')) {
      showToast('Hotkey nên chứa tổ hợp phím (vd: Ctrl + phím)', 'error')
      // Still allow it if they really want, but warn them
    }

    await window.api.pastePng.setShortcut(tempShortcut)
    setShortcut(tempShortcut)
    setIsEditingShortcut(false)
    setTempShortcut('')
    showToast(`Đã cập nhật Hotkey: ${tempShortcut}`, 'success')
  }

  return (
    <div style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      {/* Toast Notification */}
      {toastMsg && (
        <div
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            background: toastMsg.type === 'success' ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            zIndex: 100,
            animation: 'fadeIn 0.3s ease',
            maxWidth: 350,
            wordBreak: 'break-word'
          }}
        >
          {toastMsg.type === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
          <span style={{ fontSize: 13, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{toastMsg.text}</span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ padding: 12, background: 'rgba(168, 85, 247, 0.1)', borderRadius: 12 }}>
          <ClipboardPaste size={28} color="var(--accent-purple)" />
        </div>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Paste PNG Nhanh
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Lưu ảnh trực tiếp từ clipboard vào thư mục File Explorer đang mở
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Toggle Card */}
        <div
          className="glass-panel"
          style={{
            padding: 24,
            borderRadius: 16,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(23, 23, 23, 0.5)',
            border: `1px solid ${enabled ? 'var(--accent-purple)' : 'rgba(255,255,255,0.08)'}`,
            transition: 'all 0.3s ease'
          }}
        >
          <button
            onClick={handleToggle}
            style={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: enabled ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)',
              border: enabled ? 'none' : '2px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: enabled ? '0 10px 30px rgba(168, 85, 247, 0.4)' : 'none',
              transition: 'all 0.3s ease',
              marginBottom: 20
            }}
          >
            <Power size={48} color={enabled ? '#fff' : 'var(--text-muted)'} />
          </button>
          
          <div style={{ fontSize: 18, fontWeight: 600, color: enabled ? 'var(--accent-purple)' : 'var(--text-secondary)' }}>
            {enabled ? 'Đang bật Paste PNG' : 'Bật Paste PNG'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
            {enabled ? 'Ứng dụng đang lắng nghe hotkey của bạn' : 'Click để kích hoạt tính năng này'}
          </div>
        </div>

        {/* Settings Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            className="glass-panel"
            style={{
              padding: 20,
              borderRadius: 16,
              background: 'rgba(23, 23, 23, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Keyboard size={16} color="var(--accent-purple)" />
              Cài đặt Hotkey
            </h3>
            
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="text"
                readOnly
                value={isEditingShortcut ? tempShortcut : shortcut.replace('CommandOrControl', 'Ctrl')}
                onFocus={() => {
                  setIsEditingShortcut(true)
                  setTempShortcut(shortcut)
                }}
                onBlur={() => {
                  setTimeout(() => {
                    if (isEditingShortcut) setIsEditingShortcut(false)
                  }, 200)
                }}
                onKeyDown={handleShortcutKeyDown}
                placeholder="Click vào để đổi phím..."
                style={{
                  flex: 1,
                  background: isEditingShortcut ? 'rgba(168, 85, 247, 0.1)' : 'rgba(0,0,0,0.3)',
                  border: `1px solid ${isEditingShortcut ? 'var(--accent-purple)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 8,
                  padding: '10px 16px',
                  color: '#fff',
                  fontSize: 14,
                  outline: 'none',
                  cursor: 'pointer',
                  textAlign: 'center',
                  fontWeight: 600,
                  letterSpacing: 1
                }}
              />
              {isEditingShortcut && (
                <button
                  onClick={handleSaveShortcut}
                  className="btn btn-primary"
                  style={{ padding: '0 16px', borderRadius: 8, fontSize: 13 }}
                >
                  Lưu
                </button>
              )}
            </div>
            {isEditingShortcut && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
                Bấm tổ hợp phím mới. Bấm Esc để hủy.
              </div>
            )}
          </div>

          <div
            className="glass-panel"
            style={{
              padding: 20,
              borderRadius: 16,
              background: 'rgba(23, 23, 23, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              flex: 1
            }}
          >
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Info size={16} color="var(--accent-orange)" />
              Hướng dẫn sử dụng
            </h3>
            
            <ol style={{ paddingLeft: 20, margin: 0, color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.8 }}>
              <li><strong>Copy ảnh</strong> từ bất kì đâu (Chrome, Zalo, Photoshop, chụp màn hình...)</li>
              <li>Mở <strong>Windows File Explorer</strong> đến thư mục bạn muốn lưu.</li>
              <li>Bấm tổ hợp phím <strong style={{ color: 'var(--accent-purple)' }}>{shortcut.replace('CommandOrControl', 'Ctrl')}</strong></li>
              <li>Ảnh sẽ tự động được lưu thành file PNG vào thư mục bạn đang mở.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
