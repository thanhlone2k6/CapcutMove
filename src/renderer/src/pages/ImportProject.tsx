import { useState, useEffect } from 'react'
import { Folder, FileArchive, CheckCircle, Copy, FolderOpen, AlertTriangle } from 'lucide-react'
import ConflictModal from '../components/ConflictModal'

interface ImportProjectProps {
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

export default function ImportProject({
  settings,
  onSettingsChange
}: ImportProjectProps): React.JSX.Element {
  const [zipPath, setZipPath] = useState('')
  const [capcutFolder, setCapcutFolder] = useState(settings.lastCapCutProjectsFolder || '')
  const [patchPaths, setPatchPaths] = useState(true)

  useEffect(() => {
    if (settings?.lastCapCutProjectsFolder !== undefined) {
      setCapcutFolder(settings.lastCapCutProjectsFolder || '')
    }
  }, [settings?.lastCapCutProjectsFolder])

  const [isImporting, setIsImporting] = useState(false)
  const [progress, setProgress] = useState<any>(null)
  const [importResult, setImportResult] = useState<any>(null)
  const [importError, setImportError] = useState<string | null>(null)

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
    onResolve: (_finalName: string) => {}
  })

  const handleBrowseZip = async () => {
    const p = await window.api.selectZipFile()
    if (p) setZipPath(p)
  }

  const handleAutoDetect = async () => {
    const path = await window.api.autoDetectFolder()
    if (path) {
      setCapcutFolder(path)
      updateSetting('lastCapCutProjectsFolder', path)
    } else {
      setImportError('Không tự tìm thấy thư mục CapCut. Hãy chọn thủ công.')
    }
  }

  const handleBrowseCapcut = async () => {
    const p = await window.api.selectFolder()
    if (p) {
      setCapcutFolder(p)
      updateSetting('lastCapCutProjectsFolder', p)
    }
  }

  const updateSetting = (key: string, value: string) => {
    const newSettings = { ...settings, [key]: value }
    onSettingsChange(newSettings)
    window.api.saveSettings(newSettings)
  }

  const startImport = async (finalName: string) => {
    const unsub = window.api.onProgress((info: any) => setProgress(info))
    try {
      const res = await window.api.importPackage({
        zipPath,
        targetCapCutFolder: capcutFolder,
        patchPaths,
        newProjectName: finalName
      })
      setImportResult(res)
      await window.api.openCapcut()
    } catch (err: any) {
      setImportError('Import failed: ' + err.message)
    } finally {
      setIsImporting(false)
      unsub()
    }
  }

  const handleImport = async () => {
    if (!zipPath || !capcutFolder) return
    setImportError(null)

    const isRunning = await window.api.checkCapcutRunning()
    if (isRunning) {
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
          setConflictModal((prev) => ({ ...prev, isOpen: false }))
          if (action === 'overwrite') {
            await window.api.killCapcut()
            await new Promise((r) => setTimeout(r, 1000))
            proceedImport()
          } else if (action === 'rename') {
            proceedImport()
          }
        }
      })
      return
    }

    await proceedImport()
  }

  const proceedImport = async () => {
    setIsImporting(true)
    setProgress(null)
    setImportResult(null)

    try {
      const { projectName, exists } = await window.api.checkZipProject(zipPath, capcutFolder)
      const targetPath = `${capcutFolder}${window.api.sep || '/'}${projectName}`

      if (exists) {
        setConflictModal({
          isOpen: true,
          title: 'Project đã tồn tại',
          message: `Máy này đã có project tên "${projectName}". Bạn muốn làm gì?`,
          existingPath: targetPath,
          projectName: projectName,
          overwriteLabel: 'Ghi đè project cũ',
          renameLabel: 'Tự động đổi tên (thêm số)',
          hideRename: false,
          onResolve: async (action: string) => {
            setConflictModal((prev) => ({ ...prev, isOpen: false }))
            if (action === 'overwrite') {
              await window.api.removePath(targetPath)
              startImport(projectName)
            } else if (action === 'rename') {
              const availablePath = await window.api.getAvailableName(targetPath)
              const newName = availablePath.split(/[\\/]/).pop() || projectName
              startImport(newName)
            }
          }
        })
      } else {
        await startImport(projectName)
      }
    } catch (err: any) {
      setImportError('Import failed: ' + err.message)
      setIsImporting(false)
    }
  }

  const handleCancelImport = async () => {
    await window.api.cancelImport()
  }

  // ============ COMPUTED PROGRESS VALUES ============
  const processedBytes = safeNumber(progress?.processedBytes, 0)
  const totalBytes = safeNumber(progress?.totalBytes, 0)
  const percent =
    totalBytes > 0
      ? Math.min(100, Math.max(0, Math.floor((processedBytes / totalBytes) * 100)))
      : safeNumber(progress?.percent, 0)

  return (
    <div style={{ height: '100%', overflowY: 'auto', paddingRight: 8, paddingBottom: 24 }}>
      <div className="card import-zip-card">
        <h2>1. Select ZIP Package</h2>
        <div className="input-group">
          <label className="input-label">Chọn file ZIP đã được export</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="input-wrapper">
              <input
                type="text"
                className="text-input"
                value={zipPath}
                onChange={(e) => setZipPath(e.target.value)}
                placeholder="Chọn file .zip dự án..."
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={handleBrowseZip}
              style={{ width: 'fit-content' }}
            >
              <FileArchive size={16} /> Browse ZIP Package
            </button>
          </div>
        </div>
      </div>

      <div className="card import-folders-card">
        <h2>2. Target Folders</h2>
        <div className="input-group">
          <label className="input-label">CapCut Projects Folder trên máy này</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="input-wrapper">
              <input
                type="text"
                className="text-input"
                value={capcutFolder}
                onChange={(e) => setCapcutFolder(e.target.value)}
                placeholder="Chọn thư mục dự án CapCut..."
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn"
                onClick={handleAutoDetect}
                title="Tự động tìm đường dẫn mặc định"
              >
                Auto Detect
              </button>
              <button className="btn" onClick={handleBrowseCapcut}>
                <Folder size={16} /> Browse Folder
              </button>
            </div>
          </div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
          Tài nguyên media (assets) sẽ tự động được giải nén vào thư mục dự án bên trong CapCut
          Projects Folder để tiện quản lý.
        </p>
      </div>

      <div className="card import-experimental-card">
        <h2>3. Experimental Settings</h2>
        <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={patchPaths}
            onChange={(e) => setPatchPaths(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: 'var(--accent-purple)' }}
          />
          <div>
            <strong style={{ display: 'block', fontSize: 14 }}>
              Patch media paths trong project
            </strong>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              App sẽ tự động sửa đường dẫn trong file JSON để trỏ về thư mục assets mới. Rất tiện
              lợi nhưng có thể không tương thích với một số phiên bản CapCut mới nhất.
            </span>
          </div>
        </label>
      </div>

      <div className="card import-action-card">
        <h2>4. Import</h2>

        {importError && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>
            <AlertTriangle size={18} />
            <span>{importError}</span>
          </div>
        )}

        <button
          className="btn btn-primary"
          onClick={handleImport}
          disabled={isImporting || !zipPath || !capcutFolder}
          style={{ width: '100%', padding: 16, fontSize: 16 }}
        >
          {isImporting ? 'Importing...' : 'Import Package'}
        </button>

        {isImporting && progress && (
          <div className="progress-container" style={{ marginTop: 24 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 8,
                fontSize: 11,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                alignItems: 'center'
              }}
            >
              <span>{progress.message || 'Processing...'}</span>
              <button
                onClick={handleCancelImport}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: 'var(--danger)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: 4,
                  padding: '2px 8px',
                  fontSize: 10,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)')}
              >
                HỦY
              </button>
            </div>

            <div className="progress-bar main-progress-thick">
              <div className="progress-fill" style={{ width: `${percent}%` }}></div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 12,
                alignItems: 'flex-end'
              }}
            >
              <div
                style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'monospace' }}
              >
                {totalBytes > 0 && (
                  <>
                    <div
                      style={{
                        color: 'var(--text-primary)',
                        fontSize: 15,
                        fontWeight: 600,
                        marginBottom: 2
                      }}
                    >
                      {formatBytes(processedBytes)} / {formatBytes(totalBytes)}
                    </div>
                    <div style={{ opacity: 0.8 }}>
                      Speed: {formatSpeed(safeNumber(progress?.speedBytesPerSec, 0))}
                    </div>
                  </>
                )}
                {totalBytes <= 0 && (
                  <div style={{ color: 'var(--text-primary)', fontSize: 14 }}>
                    {progress.message || 'Processing...'}
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <strong style={{ fontSize: 20, color: 'var(--accent-purple)' }}>{percent}%</strong>
              </div>
            </div>
          </div>
        )}

        {importResult && (
          <div
            className="alert alert-success"
            style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle size={20} />
              <strong style={{ fontSize: 16 }}>Import Successful!</strong>
            </div>

            <div style={{ background: 'var(--bg-main)', padding: 16, borderRadius: 8 }}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  New Project Path
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <code style={{ flex: 1, wordBreak: 'break-all', fontSize: 13 }}>
                    {importResult.newProjectPath}
                  </code>
                  <button
                    className="btn btn-icon"
                    onClick={() => window.api.openPath(importResult.newProjectPath)}
                    title="Open Folder"
                  >
                    <FolderOpen size={16} />
                  </button>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Extracted Assets Path
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <code
                    style={{
                      flex: 1,
                      wordBreak: 'break-all',
                      fontSize: 13,
                      color: 'var(--accent-purple-hover)'
                    }}
                  >
                    {importResult.newAssetsPath}
                  </code>
                  <button
                    className="btn btn-icon"
                    onClick={() => window.api.copyToClipboard(importResult.newAssetsPath)}
                    title="Copy Path"
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    className="btn btn-icon"
                    onClick={() => window.api.openPath(importResult.newAssetsPath)}
                    title="Open Folder"
                  >
                    <FolderOpen size={16} />
                  </button>
                </div>
              </div>
            </div>

            {!patchPaths && (
              <div className="alert alert-info" style={{ margin: 0 }}>
                <strong>Hướng dẫn Relink:</strong> Mở CapCut &gt; Mở project &gt; Media sẽ báo đỏ
                (Missing) &gt; Chọn các file bị thiếu &gt; Chuột phải &gt; Link to Media &gt; Trỏ về
                đường dẫn Assets Path bên trên.
              </div>
            )}

            {importResult.patchReport && (
              <div
                className="alert alert-info"
                style={{
                  margin: 0,
                  marginTop: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8
                }}
              >
                <h4 style={{ margin: 0, fontSize: 14 }}>Báo cáo Patch Paths</h4>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, lineHeight: 1.6 }}>
                  <li>Tổng file media: {importResult.patchReport.totalMappings}</li>
                  <li>
                    Đã thay thế chính xác (Exact Match):{' '}
                    {importResult.patchReport.exactPathReplacements}
                  </li>
                  <li>
                    Đã thay thế tự động (Basename Match):{' '}
                    {importResult.patchReport.basenameFallbackReplacements}
                  </li>
                </ul>

                {importResult.patchReport.missingNewPaths?.length > 0 && (
                  <div
                    style={{
                      color: 'var(--danger)',
                      fontSize: 13,
                      background: 'rgba(239, 68, 68, 0.1)',
                      padding: 8,
                      borderRadius: 4
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                      <AlertTriangle size={14} /> {importResult.patchReport.missingNewPaths.length}{' '}
                      file không tồn tại trên máy này (bỏ qua patch):
                    </div>
                    <ul
                      style={{
                        margin: '4px 0 0',
                        paddingLeft: 16,
                        maxHeight: 100,
                        overflowY: 'auto'
                      }}
                    >
                      {importResult.patchReport.missingNewPaths.map((p: string, i: number) => (
                        <li key={i}>{p.split(/[\\/]/).pop()}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {importResult.patchReport.unresolvedOldPaths?.length > 0 && (
                  <div
                    style={{
                      color: 'var(--danger)',
                      fontSize: 13,
                      background: 'rgba(239, 68, 68, 0.1)',
                      padding: 8,
                      borderRadius: 4
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                      <AlertTriangle size={14} />{' '}
                      {importResult.patchReport.unresolvedOldPaths.length} đường dẫn cũ chưa thể xử
                      lý:
                    </div>
                    <ul
                      style={{
                        margin: '4px 0 0',
                        paddingLeft: 16,
                        maxHeight: 100,
                        overflowY: 'auto',
                        wordBreak: 'break-all'
                      }}
                    >
                      {importResult.patchReport.unresolvedOldPaths.map((p: string, i: number) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {importResult.patchReport.unresolvedOldPaths?.length === 0 &&
                  importResult.patchReport.missingNewPaths?.length === 0 && (
                    <div
                      style={{
                        color: 'var(--success)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontWeight: 600,
                        fontSize: 13
                      }}
                    >
                      <CheckCircle size={14} /> Patch hoàn tất. Không cần relink thủ công.
                    </div>
                  )}

                {(importResult.patchReport.unresolvedOldPaths?.length > 0 ||
                  importResult.patchReport.missingNewPaths?.length > 0) && (
                  <div
                    style={{
                      color: 'var(--warning)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontWeight: 600,
                      fontSize: 13
                    }}
                  >
                    <AlertTriangle size={14} /> Patch một phần. Cần relink thủ công các file còn
                    thiếu.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
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
        onCancel={() => {
          setConflictModal((prev) => ({ ...prev, isOpen: false }))
          setIsImporting(false)
        }}
      />
    </div>
  )
}
