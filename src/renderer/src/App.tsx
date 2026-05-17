import { useState, useEffect, useRef } from 'react'
import { ArrowUpCircle, RefreshCw, Star, Lock, Download as DownloadIcon, Zap } from 'lucide-react'
import ExportProject from './pages/ExportProject'
import ImportProject from './pages/ImportProject'
import VipGate from './pages/VipGate'
import VideoDownloader from './pages/VideoDownloader'
import CreatorWidget from './components/CreatorWidget'
import SupportModal from './components/SupportModal'
import UpdateWidget from './components/UpdateWidget'
import './index.css'

type MainTab = 'free' | 'vip'
type FreeSubTab = 'export' | 'import'
type VipSubTab = 'download'

function App(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<MainTab>('free')
  const [freeSubTab, setFreeSubTab] = useState<FreeSubTab>('export')
  const [vipSubTab, setVipSubTab] = useState<VipSubTab>('download')
  const [settings, setSettings] = useState<any>(null)
  const [showDonate, setShowDonate] = useState(false)
  const [isVipActive, setIsVipActive] = useState(false)
  const [vipChecked, setVipChecked] = useState(false)
  const [downloadActiveCount, setDownloadActiveCount] = useState(0)
  const [showVipToast, setShowVipToast] = useState(false)
  const vipToastShown = useRef(false)
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'>('idle')
  const [updateProgress, setUpdateProgress] = useState<any>(null)
  const [updateInfo, setUpdateInfo] = useState<any>(null)

  useEffect(() => {
    window.api.getSettings().then(async (loadedSettings) => {
      const currentSettings = { ...loadedSettings }
      const folderPath = currentSettings.lastCapCutProjectsFolder
      let exists = false
      if (folderPath) {
        exists = await window.api.checkPathExists(folderPath, '')
      }

      if (!folderPath || !exists) {
        const autoPath = await window.api.autoDetectFolder()
        if (autoPath) {
          currentSettings.lastCapCutProjectsFolder = autoPath
          await window.api.saveSettings({ lastCapCutProjectsFolder: autoPath })
        }
      }
      setSettings(currentSettings)
    })

    // Check VIP status
    window.api.license.check().then(({ active }) => {
      setIsVipActive(active)
      setVipChecked(true)
    })

    const unsub = window.api.onUpdateStatus((info: any) => {
      setUpdateStatus(info.status)
      if (info.status === 'downloading') {
        setUpdateProgress(info.data)
      } else if (info.status === 'available') {
        setUpdateInfo(info.data)
      }
    })
    return () => unsub()
  }, [])

  const handleVipActivated = (): void => {
    setIsVipActive(true)
    if (!vipToastShown.current) {
      vipToastShown.current = true
      setShowVipToast(true)
      setTimeout(() => setShowVipToast(false), 3000)
    }
  }

  const handleRestart = (): void => {
    window.api.restartAppToUpdate()
  }

  const formatBytes = (bytes: number): string => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const formatSpeed = (bytesPerSec: number): string => {
    if (!bytesPerSec) return '0 KB/s'
    return formatBytes(bytesPerSec) + '/s'
  }

  // ─── Update Blocking Screen ─────────────────────────
  if (updateStatus === 'available' || updateStatus === 'downloading' || updateStatus === 'downloaded') {
    const percent = Math.floor(updateProgress?.percent || 0)
    const transferredStr = formatBytes(updateProgress?.transferred || 0)
    const totalStr = formatBytes(updateProgress?.total || 0)
    const speedStr = formatSpeed(updateProgress?.bytesPerSecond || 0)

    return (
      <div className="update-blocking-overlay">
        <div className="update-blocking-card">
          <div className="update-glowing-ring">
            <ArrowUpCircle size={40} className={updateStatus !== 'downloaded' ? 'spin' : ''} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
            Phát Hiện Bản Cập Nhật Mới!
          </h2>
          <div style={{ fontSize: 14, color: 'var(--accent-purple)', fontWeight: 600, marginBottom: 20 }}>
            Phiên bản v{updateInfo?.version || 'mới'} đang được tải xuống...
          </div>
          
          <div style={{ width: '100%', marginBottom: 16 }}>
            <div className="progress-bar main-progress-thick">
              <div className="progress-fill" style={{ width: `${percent}%` }}></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
              <span>{updateStatus === 'downloaded' ? 'Tải xong 100%' : `Tiến độ: ${percent}%`}</span>
              {updateStatus === 'downloading' && <span>{speedStr}</span>}
            </div>
          </div>

          {updateStatus === 'downloading' && (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
              Đã tải: {transferredStr} / {totalStr}
            </div>
          )}

          {updateStatus === 'available' && (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
              Đang kết nối máy chủ và chuẩn bị tải xuống...
            </div>
          )}

          {updateStatus === 'downloaded' && (
            <>
              <div style={{ fontSize: 13, color: 'var(--success)', fontWeight: 500, marginBottom: 24 }}>
                Bản cập nhật đã được tải xuống hoàn tất!
              </div>
              <button 
                className="btn btn-primary" 
                onClick={handleRestart}
                style={{ 
                  width: '100%', 
                  padding: '12px 24px', 
                  fontSize: 14, 
                  borderRadius: 12,
                  boxShadow: '0 8px 24px rgba(168, 85, 247, 0.4)'
                }}
              >
                <RefreshCw size={16} style={{ marginRight: 8 }} />
                Khởi động lại để Cập nhật ngay
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  if (!settings) return <div className="app-container" style={{ padding: 24 }}>Loading...</div>

  return (
    <div className="app-container">
      {/* Branding & Donation Container */}
      <div className="branding-container">
        <CreatorWidget onDonateClick={() => setShowDonate(true)} />
      </div>

      {showDonate && <SupportModal onClose={() => setShowDonate(false)} />}

      {/* VIP Toast */}
      {showVipToast && (
        <div className="vip-activated-toast">
          <Star size={14} />
          <span>VIP đang hoạt động ✓</span>
        </div>
      )}

      {/* ═══ Main Tab Bar ═══ */}
      <div className="header">
        <button 
          className={`tab-btn tab-btn-free ${activeTab === 'free' ? 'active' : ''}`}
          onClick={() => setActiveTab('free')}
        >
          <Zap size={14} className="tab-free-icon" />
          Free
        </button>
        <button 
          className={`tab-btn tab-btn-vip ${activeTab === 'vip' ? 'active' : ''}`}
          onClick={() => setActiveTab('vip')}
        >
          {isVipActive ? (
            <Star size={14} className="tab-vip-icon unlocked" />
          ) : (
            <Lock size={12} className="tab-vip-icon locked" />
          )}
          VIP
        </button>
      </div>

      <div className="main-content">
        <UpdateWidget />

        {/* ═══ FREE TAB ═══ */}
        <div style={{ display: activeTab === 'free' ? 'flex' : 'none', height: '100%', flexDirection: 'column' }}>
          {/* Free sub-tabs */}
          <div className="free-sub-tabs">
            <button
              className={`free-sub-tab ${freeSubTab === 'export' ? 'active' : ''}`}
              onClick={() => setFreeSubTab('export')}
            >
              Export Project
            </button>
            <button
              className={`free-sub-tab ${freeSubTab === 'import' ? 'active' : ''}`}
              onClick={() => setFreeSubTab('import')}
            >
              Import Project
            </button>
          </div>

          {/* Free sub-tab content */}
          <div className="free-sub-content">
            <div style={{ display: freeSubTab === 'export' ? 'block' : 'none', height: '100%' }}>
              <ExportProject settings={settings} onSettingsChange={setSettings} />
            </div>
            <div style={{ display: freeSubTab === 'import' ? 'block' : 'none', height: '100%' }}>
              <ImportProject settings={settings} onSettingsChange={setSettings} />
            </div>
          </div>
        </div>

        {/* ═══ VIP TAB ═══ */}
        <div style={{ display: activeTab === 'vip' ? 'flex' : 'none', height: '100%', flexDirection: 'column' }}>
          {/* VIP sub-tabs (always visible even when locked) */}
          <div className="vip-sub-tabs">
            <button
              className={`vip-sub-tab ${vipSubTab === 'download' ? 'active' : ''}`}
              onClick={() => setVipSubTab('download')}
            >
              <DownloadIcon size={14} />
              <span>Tải Video</span>
              {isVipActive && downloadActiveCount > 0 && (
                <span className="vip-sub-tab-badge">{downloadActiveCount}</span>
              )}
            </button>
            {/* More sub-tabs can be added here */}
          </div>

          {/* VIP sub-tab content — with lock overlay when inactive */}
          <div className="vip-sub-content">
            {/* Blurred preview behind overlay when locked */}
            <div
              className={`vip-preview-layer ${!isVipActive ? 'locked' : ''}`}
              style={{ display: vipSubTab === 'download' ? 'flex' : 'none', height: '100%', width: '100%', minHeight: 0, overflow: 'hidden' }}
            >
              <VideoDownloader
                settings={settings}
                onSettingsChange={setSettings}
                onActiveCountChange={setDownloadActiveCount}
              />
            </div>

            {/* Lock overlay — only when not activated */}
            {vipChecked && !isVipActive && (
              <div className="vip-lock-overlay">
                <VipGate onActivated={handleVipActivated} />
              </div>
            )}

            {/* Loading state while checking */}
            {!vipChecked && (
              <div className="vip-lock-overlay">
                <div className="vdl-engine-status">
                  <div className="spin" style={{ width: 16, height: 16, border: '2px solid var(--accent-purple)', borderTopColor: 'transparent', borderRadius: '50%' }} />
                  <span>Đang kiểm tra...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
