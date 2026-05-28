import React, { useState, useEffect, useRef } from 'react'
import {
  UploadCloud,
  FileVideo,
  Trash2,
  Image as ImageIcon,
  Play,
  X,
  FolderOpen as FolderIcon
} from 'lucide-react'

interface VideoFile {
  path: string
  name: string
  size: number
}

export default function BatchWatermark(): React.JSX.Element {
  const [videoList, setVideoList] = useState<VideoFile[]>([])
  const [logoPath, setLogoPath] = useState<string>('')
  const [opacity, setOpacity] = useState<number>(80) // 0 - 100
  const [outputDir, setOutputDir] = useState<string>('')
  const [videoAspect, setVideoAspect] = useState<number>(16 / 9)

  // Logo percentage overlay specs (relative to video resolution/dimensions)
  const [logoPercent, setLogoPercent] = useState({ x: 10, y: 10, w: 20, h: 20 })

  // Dragging and resizing states
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const initialPos = useRef({ x: 0, y: 0 })
  const resizeStart = useRef({ x: 0, y: 0 })
  const initialSize = useRef({ w: 0, h: 0 })

  // Container refs
  const videoPlayerRef = useRef<HTMLVideoElement>(null)
  const previewContainerRef = useRef<HTMLDivElement>(null)

  // Job progress state
  const [isProcessing, setIsProcessing] = useState(false)
  const [progressInfo, setProgressInfo] = useState<{
    current: number
    total: number
    fileName: string
    percent?: number
    filePercent?: number
    errorMsg?: string
  } | null>(null)

  // Modal states
  const [showResultModal, setShowResultModal] = useState(false)
  const [resultModalType, setResultModalType] = useState<'success' | 'error'>('success')
  const [resultModalMessage, setResultModalMessage] = useState('')

  // Load last watermark directory from settings
  useEffect(() => {
    window.api.getSettings().then((settings) => {
      if (settings.lastWatermarkOutputDir) {
        setOutputDir(settings.lastWatermarkOutputDir)
      } else if (settings.lastVideoOutputDir) {
        setOutputDir(settings.lastVideoOutputDir)
      }
    })
  }, [])

  // Listen to IPC watermark updates
  useEffect(() => {
    const unsubProgress = window.api.onWatermarkProgress((data) => {
      setProgressInfo({
        current: data.current,
        total: data.total,
        fileName: data.fileName,
        percent: data.percent,
        filePercent: data.filePercent
      })
    })

    const unsubDone = window.api.onWatermarkDone(() => {
      setIsProcessing(false)
      setProgressInfo(null)
      setResultModalType('success')
      setResultModalMessage('Quá trình đóng dấu bản dịch video hàng loạt đã hoàn tất thành công!')
      setShowResultModal(true)
    })

    const unsubError = window.api.onWatermarkError((msg) => {
      setIsProcessing(false)
      setProgressInfo((prev) => (prev ? { ...prev, errorMsg: msg } : { current: 0, total: 0, fileName: '', errorMsg: msg }))
      setResultModalType('error')
      setResultModalMessage(msg)
      setShowResultModal(true)
    })

    return () => {
      unsubProgress()
      unsubDone()
      unsubError()
    }
  }, [])

  // Reset aspect ratio when video list is cleared
  useEffect(() => {
    if (videoList.length === 0) {
      setVideoAspect(16 / 9)
    }
  }, [videoList])

  // Measure preview container when first video changes or logo loaded
  const updatePreviewSize = () => {
    // No-op or trigger layout updates
  }

  const handleVideoMetadataLoaded = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget
    if (video.videoWidth && video.videoHeight) {
      setVideoAspect(video.videoWidth / video.videoHeight)
    }
    updatePreviewSize()
  }

  useEffect(() => {
    window.addEventListener('resize', updatePreviewSize)
    return () => window.removeEventListener('resize', updatePreviewSize)
  }, [])

  // Browse files
  const handleAddVideos = async () => {
    const file = await window.api.selectMissingFile('') // opens dialog to choose media
    if (file) {
      const parts = file.split(window.api.sep)
      const name = parts[parts.length - 1]
      // Verify duplicate
      if (videoList.some((v) => v.path === file)) return
      setVideoList((prev) => [...prev, { path: file, name, size: 0 }])
    }
  }

  // Select PNG logo
  const handleSelectLogo = async () => {
    const file = await window.api.selectMissingFile('png')
    if (file) {
      setLogoPath(file)
      setTimeout(updatePreviewSize, 100)
    }
  }

  // Select Output Folder
  const handleSelectOutputDir = async () => {
    const folder = await window.api.selectFolder()
    if (folder) {
      setOutputDir(folder)
      // Save setting
      window.api.getSettings().then((settings) => {
        window.api.saveSettings({ ...settings, lastWatermarkOutputDir: folder })
      })
    }
  }

  // Remove single file
  const removeVideo = (index: number) => {
    setVideoList((prev) => prev.filter((_, i) => i !== index))
  }

  // Clear all
  const clearAllVideos = () => {
    setVideoList([])
  }

  // Drag and Drop files
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    const validExtensions = ['.mp4', '.mov', '.avi', '.mkv']
    const added: VideoFile[] = []

    files.forEach((f) => {
      const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase()
      if (validExtensions.includes(ext)) {
        const filePath = (f as any).path || '';
        if (!videoList.some((v) => v.path === filePath) && !added.some((v) => v.path === filePath)) {
          added.push({
            path: filePath,
            name: f.name,
            size: f.size
          })
        }
      }
    })

    if (added.length > 0) {
      setVideoList((prev) => [...prev, ...added])
    }
  }

  // Mouse Handlers for Logo Dragging
  const handleLogoMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY }
    initialPos.current = { x: logoPercent.x, y: logoPercent.y }
  }

  // Mouse Handlers for Logo Resizing
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    resizeStart.current = { x: e.clientX, y: e.clientY }
    initialSize.current = { w: logoPercent.w, h: logoPercent.h }
  }

  const handleGlobalMouseMove = (e: MouseEvent) => {
    if (!previewContainerRef.current) return

    const rect = previewContainerRef.current.getBoundingClientRect()

    if (isDragging) {
      const deltaX = ((e.clientX - dragStart.current.x) / rect.width) * 100
      const deltaY = ((e.clientY - dragStart.current.y) / rect.height) * 100

      let newX = Math.max(0, Math.min(100 - logoPercent.w, initialPos.current.x + deltaX))
      let newY = Math.max(0, Math.min(100 - logoPercent.h, initialPos.current.y + deltaY))

      setLogoPercent((prev) => ({ ...prev, x: newX, y: newY }))
    }

    if (isResizing) {
      const deltaX = ((e.clientX - resizeStart.current.x) / rect.width) * 100
      const deltaY = ((e.clientY - resizeStart.current.y) / rect.height) * 100

      let newW = Math.max(5, Math.min(100 - logoPercent.x, initialSize.current.w + deltaX))
      let newH = Math.max(5, Math.min(100 - logoPercent.y, initialSize.current.h + deltaY))

      setLogoPercent((prev) => ({ ...prev, w: newW, h: newH }))
    }
  }

  const handleGlobalMouseUp = () => {
    setIsDragging(false)
    setIsResizing(false)
  }

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleGlobalMouseMove)
      window.addEventListener('mouseup', handleGlobalMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove)
      window.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isDragging, isResizing])

  // Convert files info and launch job
  const handleStartWatermarking = async () => {
    if (videoList.length === 0) {
      alert('Vui lòng thêm ít nhất một video!')
      return
    }
    if (!logoPath) {
      alert('Vui lòng chọn ảnh logo PNG đóng dấu!')
      return
    }
    if (!outputDir) {
      alert('Vui lòng chọn thư mục lưu kết quả!')
      return
    }

    setIsProcessing(true)
    setProgressInfo({
      current: 1,
      total: videoList.length,
      fileName: videoList[0].name
    })

    try {
      // Get first video absolute info to translate relative percentages
      const info = await window.api.watermarkGetVideoInfo(videoList[0].path)

      // Calculate absolute px values relative to original video size
      const job = {
        videoPaths: videoList.map((v) => v.path),
        logoPath,
        position: {
          x: (logoPercent.x / 100) * info.width,
          y: (logoPercent.y / 100) * info.height
        },
        size: {
          width: (logoPercent.w / 100) * info.width,
          height: (logoPercent.h / 100) * info.height
        },
        opacity: opacity / 100,
        outputDir
      }

      await window.api.watermarkStart(job)
    } catch (err: any) {
      setIsProcessing(false)
      setProgressInfo(null)
      alert(`Lỗi khởi chạy đóng dấu: ${err.message}`)
    }
  }

  const handleCancelWatermarking = async () => {
    await window.api.watermarkCancel()
  }

  const firstVideoUrl = videoList.length > 0 
    ? `safe-file://${videoList[0].path.replace(/\\/g, '/')}` 
    : ''

  const formatSize = (bytes: number) => {
    if (bytes === 0) return ''
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <div className="watermark-page-container" style={{ display: 'flex', gap: 20, height: '100%', padding: '10px 0' }}>
      {/* LEFT COLUMN: Video Selection */}
      <div
        className="glass-panel"
        style={{
          flex: 0.6,
          display: 'flex',
          flexDirection: 'column',
          padding: 20,
          borderRadius: 16,
          background: 'rgba(23, 23, 23, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px)'
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileVideo size={18} className="text-purple" />
          <span>Danh Sách Video ({videoList.length})</span>
        </h3>

        {/* Drag Drop Area */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleAddVideos}
          style={{
            border: '2px dashed rgba(168, 85, 247, 0.3)',
            borderRadius: 12,
            padding: '24px 16px',
            textAlign: 'center',
            cursor: 'pointer',
            background: 'rgba(168, 85, 247, 0.02)',
            transition: 'var(--transition)',
            marginBottom: 16
          }}
          className="drag-drop-zone-hover"
        >
          <UploadCloud size={32} style={{ margin: '0 auto 10px', color: 'var(--accent-purple)' }} />
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
            Kéo thả video vào đây hoặc Click để duyệt
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Hỗ trợ: .mp4, .mov, .avi, .mkv
          </div>
        </div>

        {/* Video List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            minHeight: 120,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            paddingRight: 4
          }}
          className="custom-scrollbar"
        >
          {videoList.length === 0 ? (
            <div style={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Chưa có video nào được thêm.
            </div>
          ) : (
            videoList.map((video, idx) => (
              <div
                key={video.path}
                className="glass-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.04)'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', marginRight: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-primary)', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    {video.name}
                  </span>
                  {video.size > 0 && (
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {formatSize(video.size)}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => removeVideo(idx)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: 'none',
                    color: 'var(--error)',
                    padding: 6,
                    borderRadius: 6,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'var(--transition)'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)')}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>

        {videoList.length > 0 && (
          <button
            onClick={clearAllVideos}
            className="btn"
            style={{
              marginTop: 12,
              padding: '8px 12px',
              fontSize: 12,
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--text-primary)',
              borderRadius: 8,
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            Xóa Tất Cả ({videoList.length})
          </button>
        )}
      </div>

      {/* MIDDLE COLUMN: Video Preview */}
      <div
        className="glass-panel"
        style={{
          flex: 1.5,
          display: 'flex',
          flexDirection: 'column',
          padding: 20,
          borderRadius: 16,
          background: 'rgba(23, 23, 23, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px)',
          height: '100%',
          overflow: 'hidden'
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ImageIcon size={18} className="text-purple" />
          <span>Khung Xem Trước</span>
        </h3>

        {/* Video preview with interactive overlay logo */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: 0 }}>
          <div
            ref={previewContainerRef}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              aspectRatio: `${videoAspect}`,
              background: '#0a0a0a',
              borderRadius: 12,
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {firstVideoUrl ? (
              <video
                ref={videoPlayerRef}
                src={firstVideoUrl}
                onLoadedMetadata={handleVideoMetadataLoaded}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                muted
                controls
              />
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                Thêm video để xem trước khung hình
              </div>
            )}

            {/* Interactive Logo overlay */}
            {logoPath && (
              <div
                style={{
                  position: 'absolute',
                  left: `${logoPercent.x}%`,
                  top: `${logoPercent.y}%`,
                  width: `${logoPercent.w}%`,
                  height: `${logoPercent.h}%`,
                  backgroundImage: `url("safe-file://${logoPath.replace(/\\/g, '/')}")`,
                  backgroundSize: 'contain',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  opacity: opacity / 100,
                  border: '1px dashed rgba(168, 85, 247, 0.8)',
                  cursor: isDragging ? 'grabbing' : 'grab',
                  zIndex: 10
                }}
                onMouseDown={handleLogoMouseDown}
              >
                {/* Corner Resize Handle */}
                <div
                  style={{
                    position: 'absolute',
                    right: -4,
                    bottom: -4,
                    width: 10,
                    height: 10,
                    background: 'var(--accent-purple)',
                    borderRadius: '50%',
                    cursor: 'se-resize',
                    border: '1px solid white'
                  }}
                  onMouseDown={handleResizeMouseDown}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Settings */}
      <div
        className="glass-panel"
        style={{
          flex: 1.2,
          display: 'flex',
          flexDirection: 'column',
          padding: 20,
          borderRadius: 16,
          background: 'rgba(23, 23, 23, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px)',
          height: '100%',
          overflow: 'hidden'
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>Cấu Hình Đóng Dấu</span>
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, overflowY: 'auto', paddingRight: 4 }} className="custom-scrollbar">
          {/* Logo Picker */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>Ảnh Logo đóng dấu:</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={handleSelectLogo}
                className="btn btn-secondary"
                style={{ flex: 1, padding: '10px 14px', borderRadius: 8, fontSize: 13, display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}
              >
                <ImageIcon size={14} />
                <span>{logoPath ? 'Thay đổi Logo' : 'Chọn Logo (PNG)'}</span>
              </button>
              {logoPath && (
                <button
                  onClick={() => setLogoPath('')}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    padding: 10,
                    borderRadius: 8,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {logoPath && (
              <div style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Đường dẫn: {logoPath}
              </div>
            )}
          </div>

          {/* Opacity Slider */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-primary)' }}>
              <span>Độ mờ Logo:</span>
              <span style={{ fontWeight: 600, color: 'var(--accent-purple)' }}>{opacity}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={opacity}
              onChange={(e) => setOpacity(parseInt(e.target.value))}
              style={{
                width: '100%',
                accentColor: 'var(--accent-purple)',
                cursor: 'pointer'
              }}
            />
          </div>

          {/* Position Debug Info */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 10,
              color: 'var(--text-muted)',
              background: 'rgba(0,0,0,0.2)',
              padding: '6px 10px',
              borderRadius: 6
            }}
          >
            <span>Tọa độ X/Y: {Math.round(logoPercent.x)}%, {Math.round(logoPercent.y)}%</span>
            <span>Kích thước W/H: {Math.round(logoPercent.w)}%, {Math.round(logoPercent.h)}%</span>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '4px 0' }} />

          {/* Output Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>Thư mục đầu ra:</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <div
                style={{
                  flex: 1,
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {outputDir || 'Chưa chọn thư mục'}
              </div>
              <button
                onClick={handleSelectOutputDir}
                className="btn btn-secondary"
                style={{ padding: '8px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <FolderIcon size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Start / Progress Bar */}
        <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {isProcessing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Current File Processing */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
                    Đang xử lý: {progressInfo?.fileName}
                  </span>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{progressInfo?.filePercent || 0}%</span>
                </div>
                <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.03)', borderRadius: 2, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${progressInfo?.filePercent || 0}%`,
                      height: '100%',
                      background: 'rgba(255, 255, 255, 0.3)',
                      transition: 'width 0.2s ease'
                    }}
                  />
                </div>
              </div>

              {/* Overall Progress */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-primary)' }}>
                  <span>Tổng số: {progressInfo?.current}/{progressInfo?.total} video</span>
                  <span style={{ fontWeight: 700, color: 'var(--accent-purple)' }}>{progressInfo?.percent || 0}%</span>
                </div>
                <div className="progress-bar" style={{ width: '100%', height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                  <div
                    className="progress-fill"
                    style={{
                      width: `${progressInfo?.percent || 0}%`,
                      height: '100%',
                      background: 'var(--accent-gradient)',
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>
              </div>

              <button
                onClick={handleCancelWatermarking}
                className="btn"
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: 'var(--error)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  marginTop: 4
                }}
              >
                Hủy Đóng Dấu
              </button>
            </div>
          ) : (
            <button
              onClick={handleStartWatermarking}
              className="btn btn-primary animate-hover"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                background: 'var(--accent-gradient)'
              }}
            >
              <Play size={16} />
              <span>Bắt đầu Đóng Dấu</span>
            </button>
          )}

          {progressInfo?.errorMsg && (
            <div style={{ marginTop: 8, color: 'var(--error)', fontSize: 11, textAlign: 'center' }}>
              {progressInfo.errorMsg}
            </div>
          )}
        </div>
      </div>
      {showResultModal && (
        <div
          className="result-modal-overlay"
          onClick={() => setShowResultModal(false)}
        >
          <style>{`
            .result-modal-overlay {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: rgba(8, 8, 12, 0.75);
              backdrop-filter: blur(20px) saturate(190%);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 1000;
              animation: modalOverlayFadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            .result-modal-content {
              position: relative;
              max-width: 440px;
              width: 90%;
              background: linear-gradient(135deg, rgba(28, 28, 40, 0.85) 0%, rgba(18, 18, 26, 0.95) 100%);
              border: 1px solid rgba(255, 255, 255, 0.08);
              border-top: 1px solid rgba(255, 255, 255, 0.15);
              border-radius: 24px;
              padding: 40px 32px 32px 32px;
              box-shadow: 
                0 25px 50px -12px rgba(0, 0, 0, 0.7),
                0 0 40px rgba(168, 85, 247, 0.05),
                inset 0 1px 0 rgba(255, 255, 255, 0.1);
              display: flex;
              flex-direction: column;
              align-items: center;
              text-align: center;
              gap: 20px;
              animation: modalContentSlideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
              overflow: hidden;
            }
            .result-modal-content::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 4px;
              background: ${resultModalType === 'success' 
                ? 'linear-gradient(90deg, #10b981, #34d399)' 
                : 'linear-gradient(90deg, #ef4444, #f87171)'};
            }
            .result-modal-glow {
              position: absolute;
              top: -50px;
              width: 150px;
              height: 150px;
              background: ${resultModalType === 'success' 
                ? 'rgba(16, 185, 129, 0.15)' 
                : 'rgba(239, 68, 68, 0.15)'};
              filter: blur(50px);
              border-radius: 50%;
              pointer-events: none;
              z-index: 0;
            }
            .result-modal-icon-wrapper {
              position: relative;
              width: 80px;
              height: 80px;
              border-radius: 50%;
              background: ${resultModalType === 'success' 
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.2) 100%)' 
                : 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.2) 100%)'};
              color: ${resultModalType === 'success' ? '#34d399' : '#f87171'};
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: ${resultModalType === 'success' 
                ? '0 0 30px rgba(16, 185, 129, 0.2), inset 0 0 15px rgba(16, 185, 129, 0.25)' 
                : '0 0 30px rgba(239, 68, 68, 0.2), inset 0 0 15px rgba(239, 68, 68, 0.25)'};
              border: 1px solid ${resultModalType === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'};
              margin-bottom: 8px;
              z-index: 1;
              animation: iconScaleIn 0.5s cubic-bezier(0.34, 1.7, 0.64, 1) forwards;
            }
            .result-modal-icon-wrapper svg {
              width: 36px;
              height: 36px;
              stroke-width: 2.5;
            }
            .result-modal-title {
              font-size: 22px;
              font-weight: 700;
              margin: 0;
              background: linear-gradient(120deg, #ffffff 0%, #a3a3c2 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              letter-spacing: -0.5px;
              z-index: 1;
            }
            .result-modal-message {
              font-size: 14px;
              color: #a3a3b3;
              line-height: 1.6;
              margin: 0;
              z-index: 1;
            }
            .result-btn-primary {
              flex: 1.3;
              padding: 14px 20px;
              border-radius: 12px;
              font-size: 13.5px;
              font-weight: 600;
              color: #ffffff;
              background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
              border: 1px solid rgba(255, 255, 255, 0.1);
              cursor: pointer;
              transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
              box-shadow: 0 4px 20px rgba(168, 85, 247, 0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
            }
            .result-btn-primary:hover {
              transform: translateY(-2px);
              box-shadow: 0 8px 25px rgba(168, 85, 247, 0.45);
              background: linear-gradient(135deg, #b566ff 0%, #8b4eff 100%);
            }
            .result-btn-primary:active {
              transform: translateY(0);
            }
            .result-btn-secondary {
              flex: 1;
              padding: 14px 20px;
              border-radius: 12px;
              font-size: 13.5px;
              font-weight: 600;
              color: #ffffff;
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid rgba(255, 255, 255, 0.08);
              cursor: pointer;
              transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
            }
            .result-btn-secondary:hover {
              background: rgba(255, 255, 255, 0.1);
              border-color: rgba(255, 255, 255, 0.15);
              transform: translateY(-2px);
            }
            .result-btn-secondary:active {
              transform: translateY(0);
            }
            @keyframes modalOverlayFadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes modalContentSlideUp {
              from { transform: translateY(30px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
            @keyframes iconScaleIn {
              0% { transform: scale(0.6); opacity: 0; }
              100% { transform: scale(1); opacity: 1; }
            }
          `}</style>
          <div
            className="result-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="result-modal-glow" />

            <div className="result-modal-icon-wrapper">
              {resultModalType === 'success' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              )}
            </div>

            <h3 className="result-modal-title">
              {resultModalType === 'success' ? 'Đóng Dấu Hoàn Tất!' : 'Đã Xảy Ra Lỗi!'}
            </h3>

            <p className="result-modal-message">
              {resultModalMessage}
            </p>

            <div style={{ display: 'flex', gap: 12, width: '100%', marginTop: 8, zIndex: 1 }}>
              {resultModalType === 'success' && outputDir && (
                <button
                  onClick={async () => {
                    await window.api.openPath(outputDir)
                    setShowResultModal(false)
                  }}
                  className="result-btn-primary"
                >
                  <FolderIcon size={16} />
                  <span>Mở thư mục</span>
                </button>
              )}
              <button
                onClick={() => setShowResultModal(false)}
                className="result-btn-secondary"
              >
                <span>Đóng</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
