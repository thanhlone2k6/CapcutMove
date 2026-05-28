import React, { useState, useEffect, useRef } from 'react'
import {
  Music,
  Trash2,
  Package,
  FolderOpen,
  Plus,
  MoreVertical,
  Edit2,
  Folder,
  Volume2
} from 'lucide-react'

import SfxEditModal from './SfxEditModal'

interface SfxFile {
  id: string
  name: string
  filePath: string
  addedAt: number
}

interface SfxGroup {
  id: string
  name: string
  color: string
  files: SfxFile[]
}

const PRESET_COLORS = [
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#3b82f6'  // Blue
]

export default function SfxVault(): React.JSX.Element {
  const [library, setLibrary] = useState<SfxGroup[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all')

  // Group creation & editing states
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupColor, setNewGroupColor] = useState(PRESET_COLORS[0])
  const [editingGroup, setEditingGroup] = useState<SfxGroup | null>(null)
  const [activeGroupMenu, setActiveGroupMenu] = useState<string | null>(null)

  // Current playing state
  const [playingFileId, setPlayingFileId] = useState<string | null>(null)
  const [audioProgress, setAudioProgress] = useState<number>(0)
  const [masterVolume, setMasterVolume] = useState<number>(100)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  const audioCtxRef = useRef<any>(null)
  const gainNodeRef = useRef<any>(null)
  const progressIntervalRef = useRef<any>(null)

  // Context Menu and Edit Modal states
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: SfxFile & { groupId: string } } | null>(null)
  const [editingSfx, setEditingSfx] = useState<(SfxFile & { groupId: string }) | null>(null)

  useEffect(() => {
    loadLibraryData()
    return () => {
      stopCurrentAudio()
    }
  }, [])

  const loadLibraryData = async () => {
    const data = await window.api.sfxLoadLibrary()
    setLibrary(data)
  }

  const saveLibraryData = async (newLib: SfxGroup[]) => {
    setLibrary(newLib)
    await window.api.sfxSaveLibrary(newLib)
  }

  // Audio actions
  const playAudio = (fileId: string, filePath: string) => {
    stopCurrentAudio()

    const url = `safe-file://${filePath.replace(/\\/g, '/')}`
    const audio = new Audio(url)
    
    // Set up Web Audio API for >100% volume
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      gainNodeRef.current = audioCtxRef.current.createGain()
      gainNodeRef.current.connect(audioCtxRef.current.destination)
    }
    
    // Create MediaElementSource if not already created for this audio element
    // Actually, creating a new source per audio instance is fine
    const source = audioCtxRef.current.createMediaElementSource(audio)
    source.connect(gainNodeRef.current)
    gainNodeRef.current.gain.value = masterVolume / 100

    currentAudioRef.current = audio
    setPlayingFileId(fileId)
    setAudioProgress(0)

    audio.play().catch((err) => {
      console.error('Failed to play SFX:', err)
      stopCurrentAudio()
    })

    audio.onended = () => {
      stopCurrentAudio()
    }

    progressIntervalRef.current = setInterval(() => {
      if (audio.duration) {
        setAudioProgress(audio.currentTime / audio.duration)
      }
    }, 50)
  }

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = masterVolume / 100
    }
  }, [masterVolume])

  const stopCurrentAudio = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current = null
    }
    setPlayingFileId(null)
    setAudioProgress(0)
  }



  // Group CRUD
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return

    const newGroup: SfxGroup = {
      id: typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID 
        ? window.crypto.randomUUID() 
        : Math.random().toString(36).substring(2, 15),
      name: newGroupName.trim(),
      color: newGroupColor,
      files: []
    }

    const updated = [...library, newGroup]
    await saveLibraryData(updated)
    setNewGroupName('')
    setShowCreateGroup(false)
    setSelectedGroupId(newGroup.id)
  }

  const handleUpdateGroup = async () => {
    if (!editingGroup || !editingGroup.name.trim()) return
    const updated = library.map((g) => (g.id === editingGroup.id ? editingGroup : g))
    await saveLibraryData(updated)
    setEditingGroup(null)
  }

  const handleDeleteGroup = async (groupId: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa nhóm này cùng toàn bộ file âm thanh bên trong?')) {
      const group = library.find((g) => g.id === groupId)
      if (group) {
        // Delete all files inside group
        for (const file of group.files) {
          await window.api.sfxDeleteFile(groupId, file.id)
        }
      }
      const updated = library.filter((g) => g.id !== groupId)
      await saveLibraryData(updated)
      if (selectedGroupId === groupId) {
        setSelectedGroupId('all')
      }
    }
  }

  // File management
  const handleAddFiles = async () => {
    if (selectedGroupId === 'all') {
      alert('Vui lòng chọn một nhóm cụ thể trước khi thêm file âm thanh!')
      return
    }

    // select file dialog (audio files)
    const file = await window.api.selectMissingFile('')
    if (file) {
      await window.api.sfxAddFiles(selectedGroupId, [file])
      await loadLibraryData()
    }
  }

  const handleDeleteFile = async (groupId: string, fileId: string) => {
    if (confirm('Xóa âm thanh này khỏi thư viện?')) {
      const updated = await window.api.sfxDeleteFile(groupId, fileId)
      setLibrary(updated)
    }
  }

  // Backup & Restore
  const handleExportBackup = async () => {
    try {
      const savePath = await window.api.sfxExportLibrary()
      if (savePath) {
        alert(`Xuất lưu trữ thành công tại:\n${savePath}`)
      }
    } catch (err: any) {
      alert(`Lỗi khi xuất thư viện: ${err.message}`)
    }
  }

  const handleImportBackup = async () => {
    const zipFile = await window.api.selectZipFile()
    if (!zipFile) return

    const mode = confirm(
      'Chọn "OK" để GHÉP (Merge) thư viện backup vào thư viện hiện tại.\nChọn "Cancel" để GHI ĐÈ (Replace) toàn bộ thư viện hiện có.'
    )
      ? 'merge'
      : 'replace'

    try {
      const newLib = await window.api.sfxImportLibrary(zipFile, mode)
      setLibrary(newLib)
      alert('Nhập thư viện backup hoàn tất!')
    } catch (err: any) {
      alert(`Lỗi import: ${err.message}`)
    }
  }

  // Drag and Drop files into Grid
  const handleGridDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleGridDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    
    let targetGroupId = selectedGroupId
    if (selectedGroupId === 'all') {
      // Find the first group to put it in, or create one if none exist. We'll use 'Tất cả' conceptually, but files must belong to a group.
      // Wait, SFX files must belong to a group according to the DB schema.
      if (library.length === 0) {
        const newGroup = {
          id: typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID 
            ? window.crypto.randomUUID() 
            : Math.random().toString(36).substring(2, 15),
          name: 'General',
          color: PRESET_COLORS[0],
          files: []
        }
        await saveLibraryData([newGroup])
        targetGroupId = newGroup.id
      } else {
        targetGroupId = library[0].id
      }
    }

    const files = Array.from(e.dataTransfer.files)
    const validExtensions = ['.mp3', '.wav', '.ogg', '.flac', '.m4a']
    const paths: string[] = []

    files.forEach((f) => {
      const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase()
      if (validExtensions.includes(ext)) {
        const filePath = (f as any).path || '';
        paths.push(filePath)
      }
    })

    if (paths.length > 0) {
      await window.api.sfxAddFiles(targetGroupId, paths)
      await loadLibraryData()
    }
  }

  // Filter files
  const activeGroup = library.find((g) => g.id === selectedGroupId)
  const filesToDisplay =
    selectedGroupId === 'all'
      ? library.reduce((acc, g) => [...acc, ...g.files.map((f) => ({ ...f, groupId: g.id }))], [] as (SfxFile & { groupId: string })[])
      : activeGroup
        ? activeGroup.files.map((f) => ({ ...f, groupId: activeGroup.id }))
        : []

  return (
    <div className="sfx-vault-container" style={{ display: 'flex', gap: 20, height: '100%', padding: '10px 0' }}>
      {/* SIDEBAR: Group Management */}
      <div
        className="glass-panel"
        style={{
          width: 260,
          display: 'flex',
          flexDirection: 'column',
          padding: 16,
          borderRadius: 16,
          background: 'rgba(23, 23, 23, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Folder size={16} style={{ color: 'var(--accent-purple)' }} />
            <span>Nhóm Âm Thanh</span>
          </h3>
          <button
            onClick={() => setShowCreateGroup(true)}
            style={{
              background: 'rgba(168, 85, 247, 0.1)',
              border: 'none',
              color: 'var(--accent-purple)',
              padding: 4,
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Create Group Inline Form */}
        {showCreateGroup && (
          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 8,
              padding: 10,
              marginBottom: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}
          >
            <input
              type="text"
              placeholder="Tên nhóm mới..."
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 6,
                padding: '6px 8px',
                color: '#fff',
                fontSize: 12
              }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewGroupColor(color)}
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    backgroundColor: color,
                    border: newGroupColor === color ? '2px solid #fff' : 'none',
                    cursor: 'pointer'
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <button
                onClick={handleCreateGroup}
                className="btn btn-primary"
                style={{ flex: 1, padding: '4px 8px', fontSize: 11, borderRadius: 4 }}
              >
                Tạo
              </button>
              <button
                onClick={() => setShowCreateGroup(false)}
                className="btn"
                style={{ flex: 1, padding: '4px 8px', fontSize: 11, borderRadius: 4, background: 'rgba(255,255,255,0.05)' }}
              >
                Hủy
              </button>
            </div>
          </div>
        )}

        {/* Group Edit Form */}
        {editingGroup && (
          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 8,
              padding: 10,
              marginBottom: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}
          >
            <input
              type="text"
              value={editingGroup.name}
              onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
              style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 6,
                padding: '6px 8px',
                color: '#fff',
                fontSize: 12
              }}
            />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setEditingGroup({ ...editingGroup, color })}
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    backgroundColor: color,
                    border: editingGroup.color === color ? '2px solid #fff' : 'none',
                    cursor: 'pointer'
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <button
                onClick={handleUpdateGroup}
                className="btn btn-primary"
                style={{ flex: 1, padding: '4px 8px', fontSize: 11, borderRadius: 4 }}
              >
                Lưu
              </button>
              <button
                onClick={() => setEditingGroup(null)}
                className="btn"
                style={{ flex: 1, padding: '4px 8px', fontSize: 11, borderRadius: 4, background: 'rgba(255,255,255,0.05)' }}
              >
                Hủy
              </button>
            </div>
          </div>
        )}

        {/* Groups List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }} className="custom-scrollbar">
          {/* All tab */}
          <button
            onClick={() => setSelectedGroupId('all')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderRadius: 8,
              border: 'none',
              background: selectedGroupId === 'all' ? 'rgba(255,255,255,0.06)' : 'transparent',
              color: selectedGroupId === 'all' ? '#fff' : 'var(--text-secondary)',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              fontSize: 13,
              fontWeight: selectedGroupId === 'all' ? 600 : 400
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--accent-purple)' }} />
              <span>Tất cả</span>
            </div>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {library.reduce((acc, g) => acc + g.files.length, 0)}
            </span>
          </button>

          {library.map((g) => (
            <div key={g.id} style={{ position: 'relative' }}>
              <button
                onClick={() => setSelectedGroupId(g.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 30px 8px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: selectedGroupId === g.id ? 'rgba(255,255,255,0.06)' : 'transparent',
                  color: selectedGroupId === g.id ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  fontSize: 13,
                  fontWeight: selectedGroupId === g.id ? 600 : 400,
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: g.color, flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</span>
                </div>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{g.files.length}</span>
              </button>

              {/* Edit/Delete Options dropdown toggle */}
              <button
                onClick={() => setActiveGroupMenu(activeGroupMenu === g.id ? null : g.id)}
                style={{
                  position: 'absolute',
                  right: 4,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <MoreVertical size={12} />
              </button>

              {activeGroupMenu === g.id && (
                <div
                  style={{
                    position: 'absolute',
                    right: 4,
                    top: 28,
                    background: 'var(--bg-card)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8,
                    padding: 4,
                    zIndex: 20,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2
                  }}
                >
                  <button
                    onClick={() => {
                      setEditingGroup(g)
                      setActiveGroupMenu(null)
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-primary)',
                      padding: '6px 10px',
                      borderRadius: 4,
                      fontSize: 11,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Edit2 size={10} /> Đổi tên / màu
                  </button>
                  <button
                    onClick={() => {
                      handleDeleteGroup(g.id)
                      setActiveGroupMenu(null)
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--error)',
                      padding: '6px 10px',
                      borderRadius: 4,
                      fontSize: 11,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Trash2 size={10} /> Xóa Nhóm
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Library Backup options at bottom */}
        <div style={{ marginTop: 'auto', display: 'flex', gap: 6, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <button
            onClick={handleExportBackup}
            title="Xuất thư viện backup"
            className="btn"
            style={{
              flex: 1,
              padding: '8px',
              fontSize: 11,
              borderRadius: 6,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4
            }}
          >
            <Package size={12} />
            <span>Backup</span>
          </button>
          <button
            onClick={handleImportBackup}
            title="Nhập thư viện backup"
            className="btn"
            style={{
              flex: 1,
              padding: '8px',
              fontSize: 11,
              borderRadius: 6,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4
            }}
          >
            <FolderOpen size={12} />
            <span>Restore</span>
          </button>
        </div>
      </div>

      {/* MAIN CONTAINER: Files Grid */}
      <div
        className="glass-panel"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: 20,
          borderRadius: 16,
          background: 'rgba(23, 23, 23, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px)',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>
              {selectedGroupId === 'all' ? 'Tất Cả Hiệu Ứng' : activeGroup?.name}
            </h2>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              Thả các tệp .mp3/.wav/.ogg/.flac vào đây để thêm
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {selectedGroupId !== 'all' && (
              <button
                onClick={handleAddFiles}
                className="btn btn-primary animate-hover"
                style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, display: 'flex', gap: 6, alignItems: 'center', background: 'var(--accent-gradient)' }}
              >
                <Music size={14} />
                <span>Thêm File Âm Thanh</span>
              </button>
            )}
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
              <Volume2 size={14} color="var(--accent-purple)" />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 40 }}>{masterVolume}%</span>
              <input
                type="range"
                min="0"
                max="150"
                value={masterVolume}
                onChange={(e) => setMasterVolume(parseInt(e.target.value))}
                style={{ width: 80, accentColor: 'var(--accent-purple)' }}
              />
            </div>
          </div>
        </div>

        {/* Sound Cards Grid */}
        <div
          onDragOver={handleGridDragOver}
          onDrop={handleGridDrop}
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 12,
            alignContent: 'start',
            paddingRight: 4
          }}
          className="custom-scrollbar"
        >
          {filesToDisplay.length === 0 ? (
            <div
              style={{
                gridColumn: '1 / -1',
                height: 200,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                color: 'var(--text-muted)',
                fontSize: 13,
                border: '2px dashed rgba(255,255,255,0.03)',
                borderRadius: 12,
                margin: 20
              }}
            >
              <Music size={28} style={{ marginBottom: 8, opacity: 0.5 }} />
              Nhóm này chưa có âm thanh nào. Hãy thả file audio vào đây!
            </div>
          ) : (
            filesToDisplay.map((file) => (
              <SfxCard
                key={file.id}
                file={file}
                isPlaying={playingFileId === file.id}
                playProgress={playingFileId === file.id ? audioProgress : 0}
                onPlay={() => playAudio(file.id, file.filePath)}
                onStop={stopCurrentAudio}
                onContextMenu={(e) => {
                  e.preventDefault()
                  setContextMenu({ x: e.clientX, y: e.clientY, file: file as SfxFile & { groupId: string } })
                }}
              />
            ))
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 40 }}
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault()
              setContextMenu(null)
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: contextMenu.y,
              left: contextMenu.x,
              background: 'var(--bg-panel)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              padding: 4,
              zIndex: 50,
              boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
              display: 'flex',
              flexDirection: 'column',
              minWidth: 160
            }}
          >
            <button
              className="menu-item"
              onClick={() => {
                setEditingSfx(contextMenu.file)
                setContextMenu(null)
              }}
              style={{ padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 12, borderRadius: 4, display: 'flex', alignItems: 'center', gap: 8 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              <Edit2 size={12} /> Tinh chỉnh SFX
            </button>

            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}
                 onMouseEnter={(e) => {
                   const submenu = e.currentTarget.querySelector('.submenu') as HTMLElement
                   if (submenu) submenu.style.display = 'flex'
                 }}
                 onMouseLeave={(e) => {
                   const submenu = e.currentTarget.querySelector('.submenu') as HTMLElement
                   if (submenu) submenu.style.display = 'none'
                 }}
            >
              <button
                className="menu-item"
                style={{ padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 12, borderRadius: 4, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Folder size={12} /> Chọn Nhóm</div>
                <span>▶</span>
              </button>
              <div
                className="submenu"
                style={{
                  display: 'none',
                  position: 'absolute',
                  top: 0,
                  left: '100%',
                  background: 'var(--bg-panel)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  padding: 4,
                  flexDirection: 'column',
                  minWidth: 140,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.8)'
                }}
              >
                {library.map(g => (
                  <button
                    key={g.id}
                    onClick={async () => {
                      if (contextMenu.file.groupId !== g.id) {
                        await window.api.sfxMoveToGroup(contextMenu.file.id, contextMenu.file.groupId, g.id)
                        await loadLibraryData()
                      }
                      setContextMenu(null)
                    }}
                    style={{ padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 12, borderRadius: 4, display: 'flex', alignItems: 'center', gap: 8 }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: g.color }} />
                    {g.name}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
            
            <button
              className="menu-item"
              onClick={() => {
                handleDeleteFile(contextMenu.file.groupId, contextMenu.file.id)
                setContextMenu(null)
              }}
              style={{ padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: 12, borderRadius: 4, display: 'flex', alignItems: 'center', gap: 8 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              <Trash2 size={12} /> Xóa
            </button>
          </div>
        </>
      )}

      {/* Edit Modal */}
      {editingSfx && (
        <SfxEditModal
          file={editingSfx}
          onClose={() => setEditingSfx(null)}
          onSave={async (trimStart, trimEnd, volume) => {
            try {
              // If trimEnd is 0 or full duration, we can pass a large number. 
              // SfxEditModal returns actual duration in trimEnd via regions, so it won't be 0.
              await window.api.sfxEditFile(editingSfx.groupId, editingSfx.id, trimStart, trimEnd || 999999, volume)
              await loadLibraryData()
              setEditingSfx(null)
            } catch(e: any) {
              alert('Lỗi khi chỉnh sửa SFX: ' + e.message)
            }
          }}
        />
      )}
    </div>
  )
}

// ─── Sub Component: SfxCard with Web Audio Waveform Renderer ───
interface SfxCardProps {
  file: SfxFile
  isPlaying: boolean
  playProgress: number
  onPlay: () => void
  onStop: () => void
  onContextMenu: (e: React.MouseEvent, file: SfxFile) => void
}

function SfxCard({ file, isPlaying, playProgress, onPlay, onStop, onContextMenu }: SfxCardProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [duration, setDuration] = useState<string>('0:00')
  const [peaks, setPeaks] = useState<number[]>([])

  // Load and decode file peaks to render waveform
  useEffect(() => {
    let active = true
    const decodeAudio = async () => {
      try {
        const url = `safe-file://${file.filePath.replace(/\\/g, '/')}`
        const response = await fetch(url)
        const arrayBuffer = await response.arrayBuffer()
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()

        audioCtx.decodeAudioData(
          arrayBuffer,
          (audioBuffer) => {
            if (!active) {
              audioCtx.close()
              return
            }

            // Format duration
            const totalSecs = Math.round(audioBuffer.duration)
            const mins = Math.floor(totalSecs / 60)
            const secs = totalSecs % 60
            setDuration(`${mins}:${secs < 10 ? '0' : ''}${secs}`)

            // Extract peaks
            const rawData = audioBuffer.getChannelData(0)
            const samples = 45 // Number of bars to render
            const blockSize = Math.floor(rawData.length / samples)
            const peakVals: number[] = []

            for (let i = 0; i < samples; i++) {
              let max = 0
              for (let j = 0; j < blockSize; j++) {
                const val = Math.abs(rawData[i * blockSize + j])
                if (val > max) max = val
              }
              peakVals.push(max)
            }

            // Normalize peak values
            const maxVal = Math.max(...peakVals)
            const normalized = peakVals.map((p) => (maxVal > 0 ? p / maxVal : 0.05))
            setPeaks(normalized)
            audioCtx.close()
          },
          (err) => {
            console.error('Audio decode error:', err)
            audioCtx.close()
          }
        )
      } catch (e) {
        console.error('Waveform render fetch error:', e)
      }
    }

    decodeAudio()
    return () => {
      active = false
    }
  }, [file.filePath])

  // Redraw canvas peaks whenever progress or peaks state updates
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = canvas.clientWidth * dpr
    canvas.height = canvas.clientHeight * dpr
    ctx.scale(dpr, dpr)

    const w = canvas.clientWidth
    const h = canvas.clientHeight

    ctx.clearRect(0, 0, w, h)

    const barWidth = 3
    const barSpacing = 2
    const totalBars = peaks.length

    for (let i = 0; i < totalBars; i++) {
      const barHeight = peaks[i] * h * 0.8
      const x = i * (barWidth + barSpacing)
      const y = (h - barHeight) / 2

      // Check if bar is processed by playProgress
      const isPast = i / totalBars < playProgress

      if (isPast) {
        ctx.fillStyle = '#fff'
      } else {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.8)' // Blue waveform
      }

      ctx.beginPath()
      ctx.roundRect(x, y, barWidth, barHeight, 1.5)
      ctx.fill()
    }
  }, [peaks, playProgress])

  // Canvas click toggles play
  const handleCanvasClick = () => {
    if (isPlaying) {
      onStop()
    } else {
      onPlay()
    }
  }

  // Electron startDrag trigger
  const handleDragStart = (e: React.DragEvent) => {
    e.preventDefault()
    window.api.sfxStartDrag(file.filePath)
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onContextMenu={(e) => onContextMenu(e, file)}
      className="glass-card sfx-vault-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 12,
        background: 'rgba(10, 10, 12, 0.7)',
        border: isPlaying ? '1px solid var(--accent-purple)' : '1px solid rgba(255, 255, 255, 0.05)',
        cursor: 'grab',
        transition: 'transform 0.2s, box-shadow 0.2s',
        position: 'relative',
        overflow: 'hidden',
        height: 100
      }}
    >
      {/* Canvas Waveform - fills top area */}
      <div 
        style={{ flex: 1, margin: 0, padding: 0, display: 'flex', alignItems: 'center', background: 'rgba(59, 130, 246, 0.1)' }}
        onClick={handleCanvasClick}
      >
        {peaks.length === 0 ? (
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', width: '100%' }}>
            Đang giải mã...
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', cursor: 'pointer' }}
          />
        )}
      </div>

      {/* File Info - At bottom */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '8px 12px',
        background: 'rgba(0, 0, 0, 0.5)',
        borderTop: '1px solid rgba(255,255,255,0.05)'
      }}>
        <h4
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#fff',
            margin: 0,
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            overflow: 'hidden'
          }}
          title={file.name}
        >
          {file.name}
        </h4>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, marginLeft: 8 }}>{duration}</span>
      </div>
    </div>
  )
}
