import { useState, useEffect, useMemo } from 'react'
import { Folder, FolderSearch, RefreshCw, AlertTriangle, CheckCircle, Search, FileWarning, Eye, Film, Trash2 } from 'lucide-react'
import ConflictModal from '../components/ConflictModal'

interface ExportProjectProps {
  settings: any
  onSettingsChange: (settings: any) => void
  showBranding?: boolean
}

// ============ FORMAT HELPERS ============

function isValidNumber(value: any): boolean {
  return typeof value === 'number' && Number.isFinite(value)
}

function safeNumber(value: any, fallback = 0): number {
  return isValidNumber(value) ? value : fallback
}

function formatBytes(value: any): string {
  if (!isValidNumber(value)) return 'Đang tính...'
  if (value <= 0) return '0 B'
  const gb = value / 1024 / 1024 / 1024
  const mb = value / 1024 / 1024
  if (gb >= 1) return `${gb.toFixed(2)} GB`
  return `${mb.toFixed(1)} MB`
}

function formatSpeed(value: any): string {
  if (!isValidNumber(value) || value <= 0) return 'Đang tính...'
  return `${(value / 1024 / 1024).toFixed(1)} MB/s`
}

function formatEta(value: any): string {
  if (!isValidNumber(value) || value <= 0) return 'Đang tính...'
  const seconds = Math.ceil(value)
  if (seconds < 60) return `Còn khoảng ${seconds} giây`
  const minutes = Math.floor(seconds / 60)
  const remainSeconds = seconds % 60
  if (minutes < 60) return `Còn khoảng ${minutes} phút ${remainSeconds} giây`
  const hours = Math.floor(minutes / 60)
  const remainMinutes = minutes % 60
  return `Còn khoảng ${hours} giờ ${remainMinutes} phút`
}

function formatDataDisplay(processed: number, total: number): string {
  if (total <= 0) return 'Đang tính...'
  return `${formatBytes(processed)} / ${formatBytes(total)}`
}

// ============ COMPONENT ============

export default function ExportProject({ settings, onSettingsChange }: ExportProjectProps): React.JSX.Element {
  const [capcutFolder, setCapcutFolder] = useState(settings.lastCapCutProjectsFolder || '')

  const [outputFolder, setOutputFolder] = useState(settings.lastOutputFolder || '')
  const [projects, setProjects] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortMode, setSortMode] = useState(settings.lastSortMode || 'Newest First')
  const [selectedProject, setSelectedProject] = useState<any>(null)

  const [checkResult, setCheckResult] = useState<any>(null)
  const [scanResult, setScanResult] = useState<any>(null)
  const [manualResolutions, setManualResolutions] = useState<Record<string, string>>({})

  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState<any>(null)
  const [exportCompletePath, setExportCompletePath] = useState<string | null>(null)
  const [exportTime, setExportTime] = useState(0)
  const [exportError, setExportError] = useState<string | null>(null)

  // Conflict Modal State
  const [conflictModal, setConflictModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    existingPath: '',
    projectName: '',
    overwriteLabel: '',
    renameLabel: '',
    hideRename: false,
    onResolve: (_action: string) => {}
  })

  const handleDeleteProject = async (e: React.MouseEvent, p: any) => {
    e.stopPropagation()
    setConflictModal({
      isOpen: true,
      title: 'Xác nhận xóa dự án',
      message: `Bạn có chắc muốn xóa vĩnh viễn dự án "${p.name}"?`,
      existingPath: p.fullPath,
      projectName: p.name,
      overwriteLabel: 'Xác nhận xóa',
      renameLabel: '',
      hideRename: true,
      onResolve: async (action: string) => {
        setConflictModal(prev => ({ ...prev, isOpen: false }))
        if (action === 'overwrite') {
          try {
            await window.api.deleteProject(p.fullPath)
            loadProjects(capcutFolder)
            if (selectedProject?.name === p.name) setSelectedProject(null)
          } catch (err: any) {
            console.error('Xóa thất bại:', err.message)
          }
        }
      }
    })
  }

  useEffect(() => {
    let timer: any
    if (isExporting) {
      setExportTime(0)
      timer = setInterval(() => {
        setExportTime(prev => prev + 50)
      }, 50)
    } else {
      clearInterval(timer)
    }
    return () => clearInterval(timer)
  }, [isExporting])

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const m = Math.floor(totalSeconds / 60)
    const s = totalSeconds % 60
    const milliseconds = Math.floor((ms % 1000) / 10)
    return `${m}:${s.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`
  }

  const normalizeString = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()

  const loadProjects = async (folder: string) => {
    if (!folder) return
    const list = await window.api.listProjects(folder)
    setProjects(list)

    if (list.length > 0) {
      console.log('[ExportProject] first project:', list[0])
      console.log('[ExportProject] coverDataUrl exists:', !!list[0]?.coverDataUrl)
    }

    // auto select last
    if (settings.lastSelectedProject && !selectedProject) {
      const found = list.find((p: any) => p.name === settings.lastSelectedProject)
      if (found) handleSelectProject(found)
    }
  }

  useEffect(() => {
    if (capcutFolder) loadProjects(capcutFolder)
  }, [capcutFolder])

  const handleAutoDetect = async () => {
    const path = await window.api.autoDetectFolder()
    if (path) {
      setCapcutFolder(path)
      updateSetting('lastCapCutProjectsFolder', path)
    } else {
      setExportError('Không tự tìm thấy thư mục CapCut. Hãy chọn thủ công.')
    }
  }

  const handleBrowseFolder = async () => {
    const p = await window.api.selectFolder()
    if (p) {
      setCapcutFolder(p)
      updateSetting('lastCapCutProjectsFolder', p)
    }
  }

  const handleBrowseOutput = async () => {
    const p = await window.api.selectFolder()
    if (p) {
      setOutputFolder(p)
      updateSetting('lastOutputFolder', p)
    }
  }

  const updateSetting = (key: string, value: any) => {
    const newSettings = { ...settings, [key]: value }
    onSettingsChange(newSettings)
    window.api.saveSettings(newSettings)
  }

  const filteredAndSortedProjects = useMemo(() => {
    let result = projects

    if (searchQuery) {
      const q = normalizeString(searchQuery)
      result = result.filter(p => normalizeString(p.name).includes(q))
    }

    result.sort((a, b) => {
      switch (sortMode) {
        case 'Newest First': return b.lastModified - a.lastModified
        case 'Oldest First': return a.lastModified - b.lastModified
        case 'Name A-Z': return a.name.localeCompare(b.name)
        case 'Name Z-A': return b.name.localeCompare(a.name)
        case 'Largest Size': return b.sizeBytes - a.sizeBytes
        case 'Smallest Size': return a.sizeBytes - b.sizeBytes
        default: return 0
      }
    })

    return result
  }, [projects, searchQuery, sortMode])

  const handleSelectProject = async (p: any) => {
    setSelectedProject(p)
    updateSetting('lastSelectedProject', p.name)
    setCheckResult(null)
    setScanResult(null)

    // Auto check
    const res = await window.api.checkProject(p.fullPath)
    setCheckResult(res)

    // Auto scan if valid
    if (res.valid) {
      const scanRes = await window.api.scanAssets(p.fullPath)
      setScanResult(scanRes)
      setManualResolutions({})
    }
  }


  const startExportProcess = async (finalZipPath: string) => {
    setIsExporting(true)
    setProgress(null)
    setExportCompletePath(null)
    setExportError(null)

    const unsub = window.api.onProgress((info: any) => setProgress(info))

    try {
      const zipPath = await window.api.exportZip({
        projectPath: selectedProject.fullPath,
        projectName: selectedProject.name,
        outputFolder,
        scanResult,
        manualResolutions,
        overrideZipPath: finalZipPath
      })
      setExportCompletePath(zipPath)
    } catch (err: any) {
      if (!err.message?.includes('cancelled')) {
        setExportError('Export failed: ' + err.message)
      }
    } finally {
      setIsExporting(false)
      setProgress(null)
      unsub()
    }
  }

  const handleCancelExport = async () => {
    if (typeof window.api.cancelExport === 'function') {
      await window.api.cancelExport()
    }
  }

  const handleExport = async () => {
    try {
      setExportError(null)
      if (!selectedProject || !outputFolder || !scanResult) {
        setExportError('Vui lòng chọn dự án và thư mục lưu trước khi Export.')
        return
      }

      const isRunning = await window.api.checkCapcutRunning()
      if (isRunning) {
        // Use conflict modal for CapCut running confirmation
        setConflictModal({
          isOpen: true,
          title: 'CapCut đang chạy',
          message: 'CapCut đang chạy. Cần đóng CapCut để tránh lỗi file. Tiếp tục?',
          existingPath: 'CapCut.exe',
          projectName: '',
          overwriteLabel: 'Đóng CapCut & Tiếp tục',
          renameLabel: 'Tiếp tục (Không khuyến nghị)',
          hideRename: false,
          onResolve: async (action: string) => {
            setConflictModal(prev => ({ ...prev, isOpen: false }))
            if (action === 'overwrite') {
              await window.api.killCapcut()
              await new Promise(r => setTimeout(r, 1000))
              proceedExport()
            } else if (action === 'rename') {
              // User chooses to skip closing
              proceedExport()
            }
          }
        })
        return
      }

      await proceedExport()
    } catch (err: any) {
      setExportError('Đã xảy ra lỗi khi chuẩn bị Export: ' + err.message)
    }
  }

  const proceedExport = async () => {
    const zipFileName = `${selectedProject.name}_capcut_package.zip`
    const exists = await window.api.checkPathExists(outputFolder, zipFileName)

    if (exists) {
      setConflictModal({
        isOpen: true,
        title: 'File export đã tồn tại',
        message: `Trong thư mục đích đã có file ${zipFileName}. Bạn muốn làm gì?`,
        existingPath: `${outputFolder}\\${zipFileName}`,
        projectName: selectedProject.name,
        overwriteLabel: 'Ghi đè file cũ',
        renameLabel: 'Tự động đổi tên (thêm số)',
        hideRename: false,
        onResolve: async (action: string) => {
          setConflictModal(prev => ({ ...prev, isOpen: false }))
          if (action === 'overwrite') {
            await window.api.removePath(outputFolder, zipFileName)
            startExportProcess(`${outputFolder}\\${zipFileName}`)
          } else if (action === 'rename') {
            const newPath = await window.api.getAvailableName(outputFolder, zipFileName)
            startExportProcess(newPath)
          }
        }
      })
      return
    }

    startExportProcess(`${outputFolder}\\${zipFileName}`)
  }

  const handleResetExport = () => {
    setExportCompletePath(null)
    setIsExporting(false)
    setProgress(null)
    setExportTime(0)
    setExportError(null)
  }

  // ============ COMPUTED PROGRESS VALUES ============
  const processedBytes = safeNumber(progress?.processedBytes, 0)
  const totalBytes = safeNumber(progress?.totalBytes, 0)
  const percent = totalBytes > 0
    ? Math.min(100, Math.max(0, Math.floor((processedBytes / totalBytes) * 100)))
    : 0
  const speedVal = safeNumber(progress?.speedBytesPerSec, 0)
  const etaVal = progress?.etaSeconds

  const missingAssets = useMemo(() => {
    if (!scanResult?.assets) return []
    return scanResult.assets.filter((a: any) => a.status === 'missing')
  }, [scanResult])

  return (
    <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 94px)' }}>
      {/* LEFT COLUMN: Settings & Export */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', paddingRight: 4 }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <h2>1. Settings</h2>
          <div className="input-group">
            <label className="input-label">CapCut Projects Folder</label>
            <div className="input-wrapper">
              <input
                type="text"
                className="text-input"
                value={capcutFolder}
                onChange={e => setCapcutFolder(e.target.value)}
                placeholder="C:\Users\admin\AppData\Local\CapCut\User Data\Projects\com.lveditor.draft"
              />
              <button className="btn btn-icon" onClick={handleAutoDetect} title="Auto Detect">
                <FolderSearch size={18} />
              </button>
              <button className="btn btn-icon" onClick={handleBrowseFolder} title="Browse">
                <Folder size={18} />
              </button>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Output ZIP Folder</label>
            <div className="input-wrapper">
              <input
                type="text"
                className="text-input"
                value={outputFolder}
                onChange={e => setOutputFolder(e.target.value)}
              />
              <button className="btn btn-icon" onClick={handleBrowseOutput} title="Browse">
                <Folder size={18} />
              </button>
            </div>
          </div>
        </div>

        {selectedProject && checkResult && (
          <div className="card" style={{ marginBottom: 0 }}>
            <h2>2. Status: {selectedProject.name}</h2>
            <div className={`alert ${checkResult.valid ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: scanResult ? 16 : 0 }}>
              {checkResult.valid ? <CheckCircle size={18} /> : <FileWarning size={18} />}
              <span>{checkResult.valid ? 'Project hợp lệ. (Đã tự động check)' : checkResult.error}</span>
            </div>

            {scanResult && (
              <div>
                <div className="summary-grid">
                  <div className="summary-card">
                    <span className="label">Total Found</span>
                    <span className="value" style={{ color: 'var(--success)' }}>{scanResult.totalFound}</span>
                  </div>
                  <div className="summary-card">
                    <span className="label">Total Size</span>
                    <span className="value">{(scanResult.totalSize / 1024 / 1024).toFixed(1)} MB</span>
                  </div>
                </div>
                {missingAssets.length > 0 && (
                  <div className="alert alert-warning" style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 14px', background: 'rgba(234, 179, 8, 0.1)', color: 'var(--warning)', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                      <AlertTriangle size={18} />
                      <span>{missingAssets.length} file không tìm thấy trên máy này và sẽ bị thiếu khi import sang máy khác:</span>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 24, fontSize: 13, opacity: 0.9, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {missingAssets.slice(0, 3).map((a: any, i: number) => (
                        <li key={i} title={a.originalPath} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {a.originalBasename || a.originalPath}
                        </li>
                      ))}
                      {missingAssets.length > 3 && (
                        <li style={{ fontStyle: 'italic', opacity: 0.8 }}>... và {missingAssets.length - 3} file khác</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="card" style={{ marginBottom: 0 }}>
          <h2>3. Export</h2>

          {exportError && (
            <div className="alert alert-error" style={{ marginBottom: 16 }}>
              <AlertTriangle size={18} />
              <span>{exportError}</span>
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={handleExport}
            disabled={!scanResult || isExporting || !outputFolder}
            style={{ width: '100%', padding: 16, fontSize: 16, display: 'flex', flexDirection: 'column', gap: 4, height: isExporting ? 80 : 'auto' }}
          >
            <span>{isExporting ? 'Exporting...' : 'Export ZIP Package'}</span>
            {!isExporting && missingAssets.length > 0 && (
              <span style={{ fontSize: 13, fontWeight: 400, opacity: 0.9, color: '#fde047' }}>
                (Package sẽ thiếu {missingAssets.length} file media)
              </span>
            )}
            {isExporting && (
              <span style={{ fontSize: 24, fontFamily: 'monospace', fontWeight: 700, opacity: 0.9 }}>
                {formatTime(exportTime)}
              </span>
            )}
          </button>

          {isExporting && progress && (
            <div className="progress-container" style={{ marginTop: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {progress.message || 'Processing...'}
                </span>
                <span style={{ color: 'var(--accent-purple-hover)', fontWeight: 600 }}>{formatEta(etaVal)}</span>
              </div>

              <div className="progress-bar main-progress-thick">
                <div className="progress-fill" style={{ width: `${percent}%` }}></div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, alignItems: 'flex-end' }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                  <div style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 600, marginBottom: 2 }}>
                    {formatDataDisplay(processedBytes, totalBytes)}
                  </div>
                  <div style={{ opacity: 0.8 }}>
                    Speed: {formatSpeed(speedVal)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent-purple)', lineHeight: 1 }}>
                    {percent}%
                  </div>
                </div>
              </div>

              <button
                onClick={handleCancelExport}
                style={{
                  width: '100%',
                  marginTop: 16,
                  padding: '12px 0',
                  fontSize: 14,
                  fontWeight: 700,
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: 'var(--danger)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  letterSpacing: 1
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)' }}
              >
                HỦY EXPORT
              </button>
            </div>
          )}

          {exportCompletePath && (
            <div className="alert alert-success" style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={20} />
                <strong style={{ fontSize: 16 }}>Export Successful!</strong>
              </div>
              <p style={{ wordBreak: 'break-all' }}>Package: <br/><code>{exportCompletePath}</code></p>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button className="btn" onClick={() => window.api.openPath(outputFolder)}>
                  <Folder size={16} /> Open Folder
                </button>
                <button className="btn" onClick={() => window.api.openPath(exportCompletePath)}>
                  <Eye size={16} /> Locate ZIP
                </button>
              </div>
              <button
                className="btn btn-primary"
                onClick={handleResetExport}
                style={{ width: '100%', marginTop: 8 }}
              >
                Tiếp tục Export dự án khác
              </button>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Project Preview */}
      <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', overflowY: 'hidden' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', marginBottom: 0, padding: 0 }}>
          <div style={{ padding: 20, borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h2 style={{ margin: 0 }}>Project Preview</h2>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-start' }}>
                <div className="input-wrapper" style={{ width: 180 }}>
                  <span style={{ position: 'absolute', padding: '10px 14px', color: '#71717a' }}><Search size={16} /></span>
                  <input
                    type="text"
                    className="text-input"
                    style={{ paddingLeft: 36, width: '100%' }}
                    placeholder="Tìm..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <select
                  className="text-input"
                  style={{ width: 140, minWidth: 140, maxWidth: 140, fontSize: 13 }}
                  value={sortMode}
                  onChange={e => {
                    setSortMode(e.target.value)
                    updateSetting('lastSortMode', e.target.value)
                  }}
                >
                  <option>Newest First</option>
                  <option>Oldest First</option>
                  <option>Name A-Z</option>
                  <option>Name Z-A</option>
                  <option>Largest Size</option>
                  <option>Smallest Size</option>
                </select>
                <button className="btn btn-icon" onClick={() => loadProjects(capcutFolder)} title="Refresh List" style={{ padding: 10 }}>
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
            {capcutFolder ? (
              <div className="project-grid" style={{ marginTop: 0, maxHeight: 'none' }}>
                {filteredAndSortedProjects.length === 0 ? (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
                    Không tìm thấy project. Hãy kiểm tra lại thư mục hoặc Refresh.
                  </div>
                ) : filteredAndSortedProjects.map(p => (
                  <div
                    key={p.fullPath}
                    className={`project-card ${selectedProject?.name === p.name ? 'selected' : ''}`}
                    onClick={() => handleSelectProject(p)}
                  >
                    <div className="project-thumb">
                      {p.coverDataUrl ? (
                        <img
                          src={p.coverDataUrl}
                          alt=""
                          className="project-cover-img"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).parentElement!.classList.add('fallback-active');
                          }}
                        />
                      ) : null}
                      <div className="project-cover-fallback">
                        <Film size={28} />
                        <span>No cover</span>
                      </div>
                    </div>
                    <div className="project-name" title={p.name}>{p.name}</div>
                    <div className="project-meta">
                      <span>{(p.sizeBytes / 1024 / 1024).toFixed(1)} MB</span>
                      <span>{new Date(p.lastModified).toLocaleDateString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className={`badge badge-${p.status.toLowerCase()}`}>{p.status}</span>
                      <button
                        className="btn-delete-prj"
                        onClick={(e) => handleDeleteProject(e, p)}
                        title="Xóa dự án"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                Vui lòng chọn thư mục CapCut Projects trước.
              </div>
            )}
          </div>
        </div>
      </div>

      <ConflictModal
        isOpen={conflictModal.isOpen}
        title={conflictModal.title}
        message={conflictModal.message}
        existingName={conflictModal.existingPath}
        overwriteLabel={conflictModal.overwriteLabel}
        renameLabel={conflictModal.renameLabel}
        hideRename={conflictModal.hideRename}
        onOverwrite={() => conflictModal.onResolve('overwrite')}
        onAutoRename={() => conflictModal.onResolve('rename')}
        onCancel={() => setConflictModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  )
}
