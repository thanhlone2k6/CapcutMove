import React, { useState } from 'react'
import { Coffee, Copy, Check } from 'lucide-react'
import facebookIcon from '../assets/facebook.webp'
import donateImage from '../assets/donate.jpg'
import instagramIcon from '../assets/instagram.webp'
import zaloIcon from '../assets/zalo.png'

interface CreatorWidgetProps {
  onDonateClick: () => void
}

const CreatorWidget: React.FC<CreatorWidgetProps> = ({ onDonateClick }) => {
  const [showZaloToast, setShowZaloToast] = useState(false)

  const handleFBClick = () => {
    window.api.openExternal('https://www.facebook.com/realthanhng/')
  }

  const handleInstagramClick = () => {
    window.api.openExternal('https://instagram.com/drafty.lab')
  }

  const handleZaloClick = () => {
    window.api.copyToClipboard('0343813454')
    setShowZaloToast(true)
    setTimeout(() => setShowZaloToast(false), 2000)
  }

  return (
    <>
      <div className="branding-badge">
        {/* Facebook */}
        <div className="creator-item build-by" onClick={handleFBClick}>
          {facebookIcon ? (
            <img src={facebookIcon} alt="fb" className="creator-icon-img" />
          ) : (
            <div className="creator-icon-img fallback-icon" style={{ background: '#1877f2' }}>F</div>
          )}
          <span>Build by ThanhNguyen</span>
        </div>

        {/* Instagram */}
        <div className="creator-item instagram-btn" onClick={handleInstagramClick}>
          <img src={instagramIcon} alt="insta" className="creator-icon-img" />
          <span>Bạn cần tìm editor- Bấm vào đây</span>
        </div>

        {/* Zalo */}
        <div className="creator-item zalo-btn" onClick={handleZaloClick}>
          <img src={zaloIcon} alt="zalo" className="creator-icon-img" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>0343813454</span>
            <Copy size={12} style={{ opacity: 0.6 }} />
          </div>
          {showZaloToast && (
            <div className="zalo-toast">
              <Check size={12} />
              Đã copy số Zalo
            </div>
          )}
        </div>
        
        {/* Coffee */}
        <div className="donate-btn" onClick={onDonateClick}>
          <div className="donate-text-wrapper">
            <Coffee size={16} />
            <span>Buy me a coffee</span>
          </div>
          {donateImage && (
            <img src={donateImage} alt="coffee" className="donate-banner-img" />
          )}
        </div>
      </div>
    </>
  )
}

export default CreatorWidget
