import { useState } from 'react'
import { Download as DownloadIcon, FileText, Music } from 'lucide-react'
import VideoDownloader from '../VideoDownloader'
import Transcript from './Transcript'
import SfxVault from './SfxVault'
import VipGate from '../VipGate'

interface VipToolsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSettingsChange: (settings: any) => void
  isVipActive: boolean
  vipChecked: boolean
  handleVipActivated: () => void
}

export default function VipTools({
  settings,
  onSettingsChange,
  isVipActive,
  vipChecked,
  handleVipActivated
}: VipToolsProps): React.JSX.Element {
  const [vipSubTab, setVipSubTab] = useState<'download' | 'transcript' | 'sfx'>('download')
  const [downloadActiveCount, setDownloadActiveCount] = useState(0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
        <button
          className={`vip-sub-tab ${vipSubTab === 'transcript' ? 'active' : ''}`}
          onClick={() => setVipSubTab('transcript')}
        >
          <FileText size={14} />
          <span>Transcript</span>
        </button>
        <button
          className={`vip-sub-tab ${vipSubTab === 'sfx' ? 'active' : ''}`}
          onClick={() => setVipSubTab('sfx')}
        >
          <Music size={14} />
          <span>Kho SFX</span>
        </button>
      </div>

      {/* VIP sub-tab content — with lock overlay when inactive */}
      <div
        className="vip-sub-content"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* Blurred preview behind overlay when locked */}
        <div
          className={`vip-preview-layer ${!isVipActive ? 'locked' : ''}`}
          style={{
            display: vipSubTab === 'download' ? 'flex' : 'none',
            height: '100%',
            width: '100%',
            minHeight: 0,
            overflow: 'hidden'
          }}
        >
          <VideoDownloader
            settings={settings}
            onSettingsChange={onSettingsChange}
            onActiveCountChange={setDownloadActiveCount}
          />
        </div>

        <div
          className={`vip-preview-layer ${!isVipActive ? 'locked' : ''}`}
          style={{
            display: vipSubTab === 'transcript' ? 'flex' : 'none',
            height: '100%',
            width: '100%',
            minHeight: 0,
            overflow: 'hidden'
          }}
        >
          <Transcript />
        </div>

        <div
          className={`vip-preview-layer ${!isVipActive ? 'locked' : ''}`}
          style={{
            display: vipSubTab === 'sfx' ? 'flex' : 'none',
            height: '100%',
            width: '100%',
            minHeight: 0,
            overflow: 'hidden'
          }}
        >
          <SfxVault />
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
              <div
                className="spin"
                style={{
                  width: 16,
                  height: 16,
                  border: '2px solid var(--accent-purple)',
                  borderTopColor: 'transparent',
                  borderRadius: '50%'
                }}
              />
              <span>Đang kiểm tra...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
