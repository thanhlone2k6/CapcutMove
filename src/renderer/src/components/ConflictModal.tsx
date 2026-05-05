import React from 'react'
import { AlertTriangle, Copy, Trash2, X } from 'lucide-react'

interface ConflictModalProps {
  isOpen: boolean
  title: string
  message: string
  existingName: string
  onOverwrite: () => void
  onAutoRename: () => void
  onCancel: () => void
  overwriteLabel?: string
  renameLabel?: string
  hideRename?: boolean
}

const ConflictModal: React.FC<ConflictModalProps> = ({
  isOpen,
  title,
  message,
  existingName,
  onOverwrite,
  onAutoRename,
  onCancel,
  overwriteLabel,
  renameLabel,
  hideRename
}) => {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" style={{ zIndex: 2000 }} onClick={onCancel}>
      <div className="modal-content" style={{ maxWidth: 450 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ 
              width: 36, 
              height: 36, 
              borderRadius: '50%', 
              background: 'rgba(234, 179, 8, 0.1)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'var(--warning)'
            }}>
              <AlertTriangle size={20} />
            </div>
            <h3>{title}</h3>
          </div>
          <button className="close-btn" onClick={onCancel}><X size={20} /></button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
            {message}
          </p>
          
          <div style={{ 
            background: 'rgba(255,255,255,0.03)', 
            padding: 12, 
            borderRadius: 8, 
            border: '1px solid var(--border)',
            fontSize: 13,
            fontFamily: 'monospace',
            marginBottom: 24,
            wordBreak: 'break-all'
          }}>
            {existingName}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {!hideRename && (
              <button className="btn btn-primary" style={{ justifyContent: 'center', padding: '12px' }} onClick={onAutoRename}>
                <Copy size={16} style={{ marginRight: 8 }} /> {renameLabel || 'Thêm (1) vào cuối tên'}
              </button>
            )}
            
            <button className="btn" style={{ justifyContent: 'center', padding: '12px', border: '1px solid var(--danger)', color: 'var(--danger)' }} onClick={onOverwrite}>
              <Trash2 size={16} style={{ marginRight: 8 }} /> {overwriteLabel || 'Ghi đè file/thư mục cũ'}
            </button>
            
            <button className="btn" style={{ justifyContent: 'center', padding: '12px' }} onClick={onCancel}>
              Hủy bỏ
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConflictModal
