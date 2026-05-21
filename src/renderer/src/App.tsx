import { useState, useEffect, useRef } from 'react'
import { ArrowUpCircle, RefreshCw, Star, Lock, Zap, HelpCircle } from 'lucide-react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import ExportProject from './pages/ExportProject'
import ImportProject from './pages/ImportProject'
import VipTools from './pages/VipTools'
import CreatorWidget from './components/CreatorWidget'
import SupportModal from './components/SupportModal'
import UpdateWidget from './components/UpdateWidget'
import './index.css'

type MainTab = 'free' | 'vip'
type FreeSubTab = 'export' | 'import'

function App(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<MainTab>('free')
  const [freeSubTab, setFreeSubTab] = useState<FreeSubTab>('export')
  const [settings, setSettings] = useState<any>(null)
  const [showDonate, setShowDonate] = useState(false)
  const [isVipActive, setIsVipActive] = useState(false)
  const [vipChecked, setVipChecked] = useState(false)
  const [showVipToast, setShowVipToast] = useState(false)
  const vipToastShown = useRef(false)
  const [updateStatus, setUpdateStatus] = useState<
    'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  >('idle')
  const [updateProgress, setUpdateProgress] = useState<any>(null)
  const [updateInfo, setUpdateInfo] = useState<any>(null)

  useEffect(() => {
    window.scrollTo(0, 0)
    if (document.body) document.body.scrollTop = 0
    if (document.documentElement) document.documentElement.scrollTop = 0
    const rootEl = document.getElementById('root')
    if (rootEl) rootEl.scrollTop = 0

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

  const startTutorial = (): void => {
    if (freeSubTab === 'export') {
      const driverObj = driver({
        showProgress: true,
        nextBtnText: 'Tiếp tục',
        prevBtnText: 'Quay lại',
        doneBtnText: 'Hoàn thành',
        showButtons: ['next', 'previous', 'close'],
        steps: [
          {
            element: '.export-settings-card',
            popover: {
              title: '1. Cài đặt thư mục',
              description:
                'Nơi cài đặt thư mục dự án CapCut gốc và thư mục lưu trữ file ZIP kết quả.'
            }
          },
          {
            element: '.capcut-folder-group .input-wrapper',
            popover: {
              title: 'Thư mục dự án CapCut',
              description:
                'App tự động tìm thư mục mặc định của CapCut. Nếu bạn dùng bản portable hoặc cài ở ổ đĩa khác, vui lòng click biểu tượng Kính lúp hoặc Thư mục để chọn lại.'
            }
          },
          {
            element: '.output-folder-group .input-wrapper',
            popover: {
              title: 'Thư mục xuất file ZIP',
              description: 'Chọn thư mục lưu trữ gói dự án ZIP của bạn sau khi xuất.'
            }
          },
          {
            element: '.export-preview-card',
            popover: {
              title: '2. Danh sách dự án',
              description:
                'Chọn dự án CapCut muốn đóng gói ở danh sách bên phải. Có hỗ trợ tìm kiếm tên và sắp xếp theo ngày/kích thước.'
            }
          },
          {
            element: '.export-action-card',
            popover: {
              title: '3. Thực hiện Export',
              description:
                'Bấm "Export ZIP Package" để đóng gói dự án của bạn kèm đầy đủ các file media liên quan thành một file ZIP duy nhất.'
            }
          }
        ]
      })
      driverObj.drive()
    } else {
      const driverObj = driver({
        showProgress: true,
        nextBtnText: 'Tiếp tục',
        prevBtnText: 'Quay lại',
        doneBtnText: 'Hoàn thành',
        showButtons: ['next', 'previous', 'close'],
        steps: [
          {
            element: '.import-zip-card',
            popover: {
              title: '1. Chọn file ZIP',
              description:
                'Bấm "Browse ZIP Package" để chọn file .zip dự án CapCut đã đóng gói từ trước.'
            }
          },
          {
            element: '.import-folders-card',
            popover: {
              title: '2. Chọn thư mục CapCut',
              description:
                'Chọn thư mục chứa các dự án CapCut trên máy này để giải nén dự án vào đó.'
            }
          },
          {
            element: '.import-experimental-card',
            popover: {
              title: '3. Tự động vá đường dẫn (Patch Paths)',
              description:
                'Tích chọn mục này để app tự động sửa lại đường dẫn file media trong dự án cho đúng với máy mới, giúp bạn mở lên dùng ngay không cần relink thủ công.'
            }
          },
          {
            element: '.import-action-card',
            popover: {
              title: '4. Thực hiện Import',
              description:
                'Bấm nút "Import Package" để tiến hành giải nén và nạp dự án vào ứng dụng CapCut của bạn.'
            }
          }
        ]
      })
      driverObj.drive()
    }
  }

  const formatSpeed = (bytesPerSec: number): string => {
    if (!bytesPerSec) return '0 KB/s'
    return formatBytes(bytesPerSec) + '/s'
  }

  // ─── Update Blocking Screen ─────────────────────────
  if (
    updateStatus === 'available' ||
    updateStatus === 'downloading' ||
    updateStatus === 'downloaded'
  ) {
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
          <h2
            style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}
          >
            Phát Hiện Bản Cập Nhật Mới!
          </h2>
          <div
            style={{
              fontSize: 14,
              color: 'var(--accent-purple)',
              fontWeight: 600,
              marginBottom: 20
            }}
          >
            Phiên bản v{updateInfo?.version || 'mới'} đang được tải xuống...
          </div>

          <div style={{ width: '100%', marginBottom: 16 }}>
            <div className="progress-bar main-progress-thick">
              <div className="progress-fill" style={{ width: `${percent}%` }}></div>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 12,
                color: 'var(--text-secondary)',
                marginTop: 8
              }}
            >
              <span>
                {updateStatus === 'downloaded' ? 'Tải xong 100%' : `Tiến độ: ${percent}%`}
              </span>
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
              <div
                style={{ fontSize: 13, color: 'var(--success)', fontWeight: 500, marginBottom: 24 }}
              >
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

  if (!settings) {
    return (
      <div className="scanning-overlay">
        <div className="scanning-card">
          <div className="scanning-spinner">
            <RefreshCw size={40} className="spin" style={{ color: 'var(--accent-purple)' }} />
          </div>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: 'var(--text-primary)',
              textAlign: 'center'
            }}
          >
            Đang tải cấu hình...
          </h2>
        </div>
      </div>
    )
  }

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
        <div
          style={{
            display: activeTab === 'free' ? 'flex' : 'none',
            height: '100%',
            flexDirection: 'column'
          }}
        >
          {/* Free sub-tabs */}
          <div className="free-sub-tabs" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              className="btn-tutorial-help"
              onClick={startTutorial}
              title="Hướng dẫn sử dụng"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '10px 12px 10px 4px',
                display: 'flex',
                alignItems: 'center',
                height: '100%',
                transition: 'var(--transition)'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-purple-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
            >
              <HelpCircle size={18} style={{ marginRight: 4 }} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>Hướng dẫn</span>
            </button>

            <div style={{ display: 'flex' }}>
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
        <div style={{ display: activeTab === 'vip' ? 'block' : 'none', height: '100%' }}>
          <VipTools
            settings={settings}
            onSettingsChange={setSettings}
            isVipActive={isVipActive}
            vipChecked={vipChecked}
            handleVipActivated={handleVipActivated}
          />
        </div>
      </div>
    </div>
  )
}

export default App
