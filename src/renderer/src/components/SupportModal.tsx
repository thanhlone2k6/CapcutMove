import React from 'react'
import qrSupport from '../assets/qr-support.jpg'

interface SupportModalProps {
  onClose: () => void
}

const SupportModal: React.FC<SupportModalProps> = ({ onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Support Author</h3>
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-body" style={{ textAlign: 'center' }}>
          {qrSupport ? (
            <img src={qrSupport} alt="QR Code" className="support-qr" />
          ) : (
            <div style={{ padding: 40, background: '#111', borderRadius: 12 }}>
              Chưa cấu hình ảnh QR
            </div>
          )}
          <p style={{ color: 'var(--text-secondary)', marginTop: 16 }}>
            Quét mã để mời mình ly cà phê nhé! Cảm ơn bạn rất nhiều ❤️
          </p>
        </div>
      </div>
    </div>
  )
}

export default SupportModal
