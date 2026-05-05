import { useState, useEffect } from 'react'
import ExportProject from './pages/ExportProject'
import ImportProject from './pages/ImportProject'
import CreatorWidget from './components/CreatorWidget'
import SupportModal from './components/SupportModal'
import './index.css'

function App(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export')
  const [settings, setSettings] = useState<any>(null)
  const [showDonate, setShowDonate] = useState(false)

  useEffect(() => {
    window.api.getSettings().then(setSettings)
  }, [])

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
