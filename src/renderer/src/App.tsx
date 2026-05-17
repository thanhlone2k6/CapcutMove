import { useState, useEffect } from 'react'
import { ArrowUpCircle, RefreshCw } from 'lucide-react'
import ExportProject from './pages/ExportProject'
import ImportProject from './pages/ImportProject'
import CreatorWidget from './components/CreatorWidget'
import SupportModal from './components/SupportModal'
import UpdateWidget from './components/UpdateWidget'
import './index.css'

function App(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export')
  const [settings, setSettings] = useState<any>(null)
  const [showDonate, setShowDonate] = useState(false)
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

  const handleRestart = () => {
    window.api.restartAppToUpdate()
  }

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const formatSpeed = (bytesPerSec: number) => {
    if (!bytesPerSec) return '0 KB/s'
    return formatBytes(bytesPerSec) + '/s'
  }

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

      <div className="header">
        <button 
          className={`tab-btn ${activeTab === 'export' ? 'active' : ''}`}
          onClick={() => setActiveTab('export')}
        >
          Export Project
        </button>
        <button 
          className={`tab-btn ${activeTab === 'import' ? 'active' : ''}`}
          onClick={() => setActiveTab('import')}
        >
          Import Project
        </button>
      </div>

      <div className="main-content">
        <UpdateWidget />
        <div style={{ display: activeTab === 'export' ? 'block' : 'none', height: '100%' }}>
          <ExportProject settings={settings} onSettingsChange={setSettings} />
        </div>
        <div style={{ display: activeTab === 'import' ? 'block' : 'none', height: '100%' }}>
          <ImportProject settings={settings} onSettingsChange={setSettings} />
        </div>
      </div>
    </div>
  )
}

export default App

