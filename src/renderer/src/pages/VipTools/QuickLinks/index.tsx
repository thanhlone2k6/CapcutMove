import { useState, useEffect } from 'react'
import {
  Folder,
  Link as LinkIcon,
  Plus,
  Trash2,
  X,
  AlertCircle,
  ExternalLink,
  FolderOpen,
  FileText,
  Copy
} from 'lucide-react'
import { QuickLinkItem, QuickLinkGroup } from '../../../../../preload/index.d'

const formatDisplayPath = (item: QuickLinkItem): string => {
  const path = item.path
  if (item.type === 'link') {
    try {
      if (/^https?:\/\//i.test(path)) {
        const url = new URL(path)
        let display = url.hostname
        if (url.pathname && url.pathname !== '/') {
          const maxPathLength = 20
          const pathname = url.pathname
          if (pathname.length > maxPathLength) {
            display += pathname.substring(0, 10) + '...' + pathname.substring(pathname.length - 8)
          } else {
            display += pathname
          }
        }
        if (url.search) {
          display += '?...'
        }
        return display
      }
    } catch (e) {
      // Fallback
    }
  }

  // General truncation for both if they exceed 55 chars
  if (path.length > 55) {
    if (item.type === 'folder') {
      return path.substring(0, 15) + '...' + path.substring(path.length - 25)
    } else {
      return path.substring(0, 45) + '...'
    }
  }
  return path
}

const CARD_COLORS = [
  { border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.04)', glow: 'rgba(139, 92, 246, 0.15)', text: '#c084fc' }, // Purple
  { border: '#3b82f6', bg: 'rgba(59, 130, 246, 0.04)', glow: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa' }, // Blue
  { border: '#10b981', bg: 'rgba(16, 185, 129, 0.04)', glow: 'rgba(16, 185, 129, 0.15)', text: '#34d399' }, // Emerald
  { border: '#ec4899', bg: 'rgba(236, 72, 153, 0.04)', glow: 'rgba(236, 72, 153, 0.15)', text: '#f472b6' }, // Pink
  { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.04)', glow: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24' }, // Amber
  { border: '#06b6d4', bg: 'rgba(6, 182, 212, 0.04)', glow: 'rgba(6, 182, 212, 0.15)', text: '#22d3ee' }, // Cyan
  { border: '#a855f7', bg: 'rgba(168, 85, 247, 0.04)', glow: 'rgba(168, 85, 247, 0.15)', text: '#c084fc' }, // Violet
  { border: '#f43f5e', bg: 'rgba(244, 63, 94, 0.04)', glow: 'rgba(244, 63, 94, 0.15)', text: '#fb7185' }, // Rose
  { border: '#14b8a6', bg: 'rgba(20, 184, 166, 0.04)', glow: 'rgba(20, 184, 166, 0.15)', text: '#2dd4bf' }, // Teal
  { border: '#84cc16', bg: 'rgba(132, 204, 22, 0.04)', glow: 'rgba(132, 204, 22, 0.15)', text: '#a3e635' }  // Lime
]

const getCardColor = (id: string) => {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % CARD_COLORS.length
  return CARD_COLORS[index]
}

export default function QuickLinks(): React.JSX.Element {
  const [groups, setGroups] = useState<QuickLinkGroup[]>([])
  const [activeGroup, setActiveGroup] = useState<QuickLinkGroup | null>(null)
  const [showAddGroupForm, setShowAddGroupForm] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')

  // Form state for adding link to group
  const [newItemPath, setNewItemPath] = useState('')
  const [newItemLabel, setNewItemLabel] = useState('')
  const [newItemType, setNewItemType] = useState<'folder' | 'link' | 'text'>('folder')
  const [showAddItemForm, setShowAddItemForm] = useState(false)

  // Success indicator for copy text
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null)

  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Load quick links on mount
  useEffect(() => {
    window.api.quickLinksGet()
      .then((data) => {
        setGroups(data || [])
      })
      .catch((err) => {
        console.error('Failed to load quick links:', err)
      })
  }, [])

  const handleOpenItem = async (item: QuickLinkItem) => {
    if (item.type === 'text') {
      try {
        await navigator.clipboard.writeText(item.path)
        setCopiedItemId(item.id)
        setTimeout(() => setCopiedItemId(null), 1500)
      } catch (err: any) {
        setErrorMsg('Không thể copy vào clipboard: ' + err.message)
        setTimeout(() => setErrorMsg(null), 3000)
      }
      return
    }

    try {
      const res = await window.api.quickLinksOpen({ type: item.type as 'folder' | 'link', path: item.path })
      if (res && !res.success) {
        setErrorMsg(res.error || 'Không thể mở đường dẫn này. Vui lòng kiểm tra lại.')
        setTimeout(() => setErrorMsg(null), 4000)
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi không xác định khi mở liên kết.')
      setTimeout(() => setErrorMsg(null), 4000)
    }
  }

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    const trimmedName = newGroupName.trim()
    if (!trimmedName) {
      setErrorMsg('Vui lòng nhập tên nhóm.')
      return
    }

    if (groups.length >= 10) {
      setErrorMsg('Bạn chỉ có thể tạo tối đa 10 nhóm.')
      return
    }

    const nameExists = groups.some(
      (g) => g.name.toLowerCase() === trimmedName.toLowerCase()
    )
    if (nameExists) {
      setErrorMsg('Tên nhóm đã tồn tại.')
      return
    }

    const newGroup: QuickLinkGroup = {
      id: crypto.randomUUID(),
      name: trimmedName,
      items: []
    }

    const updated = [newGroup, ...groups]

    try {
      await window.api.quickLinksSave(updated)
      setGroups(updated)
      setNewGroupName('')
      setShowAddGroupForm(false)
      setActiveGroup(newGroup) // Automatically open the newly created group in modal
      setSuccessMsg('Đã tạo nhóm thành công!')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể lưu nhóm mới.')
    }
  }

  const handleDeleteGroup = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent modal from opening
    setErrorMsg(null)
    setSuccessMsg(null)

    const group = groups.find((g) => g.id === id)
    if (!group) return

    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa nhóm "${group.name}" cùng tất cả các liên kết bên trong?`
    )
    if (!confirmed) return

    const updated = groups.filter((g) => g.id !== id)

    try {
      await window.api.quickLinksSave(updated)
      setGroups(updated)
      if (activeGroup?.id === id) {
        setActiveGroup(null)
      }
      setSuccessMsg('Đã xóa nhóm liên kết.')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể xóa nhóm.')
    }
  }

  const handleAddItem = async (groupId: string, e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    const trimmedPath = newItemPath.trim()

    if (!trimmedPath) {
      setErrorMsg(newItemType === 'text' ? 'Vui lòng nhập nội dung văn bản.' : 'Vui lòng nhập đường dẫn thư mục hoặc URL.')
      return
    }

    let detectedType: 'folder' | 'link' | 'text' = newItemType
    let normalizedPath = trimmedPath
    let finalLabel = newItemLabel.trim()

    if (newItemType !== 'text') {
      // Auto detect type & normalize path
      detectedType = 'folder'
      if (/^https?:\/\//i.test(trimmedPath)) {
        detectedType = 'link'
      } else if (/^www\./i.test(trimmedPath)) {
        detectedType = 'link'
        normalizedPath = `https://${trimmedPath}`
      } else {
        const isWebUrl = trimmedPath.includes('.') && 
                          !trimmedPath.includes('\\') && 
                          !/^[a-zA-Z]:\\/i.test(trimmedPath) && 
                          !/\s/.test(trimmedPath);
        if (isWebUrl) {
          detectedType = 'link'
          normalizedPath = `https://${trimmedPath}`
        }
      }
      finalLabel = normalizedPath
    } else {
      if (!finalLabel) {
        finalLabel = normalizedPath
      }
    }

    const newItem: QuickLinkItem = {
      id: crypto.randomUUID(),
      type: detectedType,
      label: finalLabel,
      path: normalizedPath
    }

    const updated = groups.map((g) => {
      if (g.id === groupId) {
        const updatedGroup = {
          ...g,
          items: [newItem, ...g.items]
        }
        setActiveGroup(updatedGroup)
        return updatedGroup
      }
      return g
    })

    try {
      await window.api.quickLinksSave(updated)
      setGroups(updated)
      setNewItemPath('')
      setNewItemLabel('')
      setShowAddItemForm(false)
      setSuccessMsg('Đã thêm liên kết vào nhóm!')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể thêm liên kết.')
    }
  }

  const handleDeleteItem = async (groupId: string, itemId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setErrorMsg(null)
    setSuccessMsg(null)

    const updated = groups.map((g) => {
      if (g.id === groupId) {
        const updatedGroup = {
          ...g,
          items: g.items.filter((item) => item.id !== itemId)
        }
        setActiveGroup(updatedGroup)
        return updatedGroup
      }
      return g
    })

    try {
      await window.api.quickLinksSave(updated)
      setGroups(updated)
      setSuccessMsg('Đã xóa liên kết.')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể xóa liên kết.')
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '16px',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexShrink: 0 }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Quản lý Lưu nhanh (Quick Links)
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Tổ chức thư mục làm việc và liên kết trang web theo từng nhóm dự án dễ dàng.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowAddGroupForm(!showAddGroupForm)}
          disabled={groups.length >= 10}
          style={{
            padding: '8px 16px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Plus size={15} />
          <span>Thêm nhóm mới</span>
        </button>
      </div>

      {/* Message feedback */}
      {errorMsg && (
        <div className="alert alert-error" style={{ marginBottom: '16px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={14} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: '16px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={14} style={{ flexShrink: 0 }} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Collapsible Add Group Form */}
      {showAddGroupForm && (
        <div
          className="card"
          style={{
            marginBottom: '20px',
            padding: '20px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            flexShrink: 0
          }}
        >
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Tạo nhóm mới ({groups.length}/10)
          </h3>
          <form onSubmit={handleAddGroup} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label className="input-label" style={{ margin: 0 }}>Tên nhóm</label>
              <input
                type="text"
                className="text-input"
                placeholder="Ví dụ: CapCut TikTok Ads"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                style={{ padding: '10px 12px', borderRadius: '10px', width: '100%' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowAddGroupForm(false)
                  setNewGroupName('')
                }}
                style={{ padding: '10px 16px', borderRadius: '10px' }}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>Tạo</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Group Grid list */}
      <div
        className="quicklinks-scroll-container"
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingRight: '6px',
          maxHeight: '100%',
          columns: '3 280px',
          columnGap: '16px'
        }}
      >
        {groups.length === 0 ? (
          <div
            style={{
              columnSpan: 'all',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              color: 'var(--text-muted)',
              textAlign: 'center',
              background: 'rgba(28, 28, 33, 0.2)',
              border: '1px dashed var(--border)',
              borderRadius: '16px',
              padding: '40px 20px'
            }}
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: 'var(--accent-purple-light)',
                color: 'var(--accent-purple)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '6px'
              }}
            >
              <FolderOpen size={24} />
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Chưa có nhóm lưu nhanh nào
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '320px', margin: 0, lineHeight: '18px' }}>
              Tạo nhóm mới bằng nút ở góc trên bên phải, sau đó thêm các liên kết thư mục hoặc trang web.
            </p>
          </div>
        ) : (
          groups.map((group) => {
            const colorInfo = getCardColor(group.id)
            return (
              <div
                key={group.id}
                onClick={() => {
                  setActiveGroup(group)
                  setErrorMsg(null)
                  setSuccessMsg(null)
                }}
                style={{
                  background: colorInfo.bg,
                  border: `1px solid ${colorInfo.border}`,
                  borderRadius: '12px',
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  width: '100%',
                  boxSizing: 'border-box',
                  breakInside: 'avoid',
                  display: 'inline-block',
                  marginBottom: '16px'
                }}
                className="quicklink-card"
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: colorInfo.text }}>
                      {group.name}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      {group.items.length} liên kết
                    </span>
                  </div>

                  <button
                    onClick={(e) => handleDeleteGroup(group.id, e)}
                    className="quicklink-delete-btn"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '6px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'var(--transition)'
                    }}
                    title="Xóa nhóm"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal Popup overlay */}
      {activeGroup && (
        <div
          className="ql-modal-overlay"
          onClick={() => {
            setActiveGroup(null)
            setShowAddItemForm(false)
            setNewItemPath('')
            setNewItemLabel('')
          }}
        >
          <div className="ql-modal" onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--border)',
                padding: '16px 20px',
                background: 'rgba(255, 255, 255, 0.01)'
              }}
            >
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {activeGroup.name}
              </span>
              <button
                onClick={() => {
                  setActiveGroup(null)
                  setShowAddItemForm(false)
                  setNewItemPath('')
                  setNewItemLabel('')
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px',
                  borderRadius: '6px',
                  transition: 'var(--transition)'
                }}
                className="close-modal-btn"
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px', overflowY: 'auto', flex: 1 }} className="quicklinks-scroll-container">
              {/* Items List */}
              {activeGroup.items.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '20px 0', textAlign: 'center' }}>
                  Chưa có liên kết con nào trong nhóm này.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {activeGroup.items.map((item) => {
                    const isCopied = copiedItemId === item.id
                    return (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'rgba(255, 255, 255, 0.01)',
                          border: '1px solid var(--border)',
                          borderRadius: '10px',
                          padding: '10px 14px',
                          transition: 'all 0.2s ease'
                        }}
                        className="quicklink-item-row"
                      >
                        <div
                          onClick={() => handleOpenItem(item)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            flex: 1,
                            minWidth: 0,
                            cursor: 'pointer'
                          }}
                        >
                          <span
                            style={{
                              display: 'flex',
                              color: item.type === 'folder' ? 'var(--accent-purple-hover)' : item.type === 'link' ? '#60a5fa' : '#34d399'
                            }}
                          >
                            {item.type === 'folder' ? <Folder size={14} /> : item.type === 'link' ? <LinkIcon size={14} /> : <FileText size={14} />}
                          </span>
                          <span
                            style={{
                              fontSize: '13px',
                              fontWeight: 500,
                              color: 'var(--text-primary)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              direction: item.type === 'folder' ? 'rtl' : 'ltr',
                              textAlign: 'left'
                            }}
                            title={item.path}
                          >
                            {item.type === 'text' ? item.label : formatDisplayPath(item)}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}>
                          <button
                            onClick={() => handleOpenItem(item)}
                            style={{
                              background: item.type === 'text' ? (isCopied ? 'rgba(52, 211, 153, 0.1)' : 'none') : 'none',
                              border: item.type === 'text' ? (isCopied ? '1px solid #34d399' : '1px solid var(--border)') : 'none',
                              color: item.type === 'text' ? (isCopied ? '#34d399' : 'var(--text-secondary)') : 'var(--accent-purple)',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              transition: 'var(--transition)'
                            }}
                            className="quicklink-open-item-btn"
                          >
                            {item.type === 'text' ? (
                              <>
                                <span>{isCopied ? 'Đã copy' : 'Copy'}</span>
                                {isCopied ? <span style={{ fontSize: '10px' }}>✓</span> : <Copy size={10} />}
                              </>
                            ) : (
                              <>
                                <span>Mở</span>
                                <ExternalLink size={10} />
                              </>
                            )}
                          </button>
                          <button
                            onClick={(e) => handleDeleteItem(activeGroup.id, item.id, e)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'var(--transition)'
                            }}
                            className="quicklink-delete-item-btn"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Inline Form to add item */}
              {!showAddItemForm ? (
                <button
                  onClick={() => {
                    setShowAddItemForm(true)
                    setErrorMsg(null)
                  }}
                  style={{
                    alignSelf: 'flex-start',
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-purple)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 0',
                    marginTop: '8px'
                  }}
                >
                  <Plus size={12} />
                  <span>Thêm liên kết vào nhóm</span>
                </button>
              ) : (
                <form
                  onSubmit={(e) => handleAddItem(activeGroup.id, e)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    padding: '14px',
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px dashed var(--border)',
                    borderRadius: '10px',
                    marginTop: '8px'
                  }}
                >
                  {/* Type Select */}
                  <div
                    style={{
                      display: 'flex',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      height: '28px',
                      background: 'var(--bg-main)'
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setNewItemType('folder')
                        setErrorMsg(null)
                      }}
                      style={{
                        flex: 1,
                        background: newItemType === 'folder' ? 'var(--accent-purple-light)' : 'none',
                        border: 'none',
                        color: newItemType === 'folder' ? 'var(--accent-purple-hover)' : 'var(--text-secondary)',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'var(--transition)'
                      }}
                    >
                      📁 Thư mục
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewItemType('link')
                        setErrorMsg(null)
                      }}
                      style={{
                        flex: 1,
                        background: newItemType === 'link' ? 'var(--accent-purple-light)' : 'none',
                        border: 'none',
                        color: newItemType === 'link' ? 'var(--accent-purple-hover)' : 'var(--text-secondary)',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'var(--transition)',
                        borderLeft: '1px solid var(--border)',
                        borderRight: '1px solid var(--border)'
                      }}
                    >
                      🔗 Trang web
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewItemType('text')
                        setErrorMsg(null)
                      }}
                      style={{
                        flex: 1,
                        background: newItemType === 'text' ? 'var(--accent-purple-light)' : 'none',
                        border: 'none',
                        color: newItemType === 'text' ? 'var(--accent-purple-hover)' : 'var(--text-secondary)',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'var(--transition)'
                      }}
                    >
                      📋 Văn bản
                    </button>
                  </div>

                  {/* Custom Label Input only when type is 'text' */}
                  {newItemType === 'text' && (
                    <input
                      type="text"
                      placeholder="Tên hiển thị (ví dụ: Mật khẩu server, Ghi chú...)"
                      value={newItemLabel}
                      onChange={(e) => setNewItemLabel(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'var(--bg-main)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                        borderRadius: '6px',
                        padding: '6px 8px',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  )}

                  {/* Path / Content Input */}
                  <input
                    type="text"
                    placeholder={newItemType === 'text' ? 'Nội dung cần copy (mật khẩu, link, ghi chú...)' : 'Đường dẫn thư mục hoặc URL trang web (ví dụ: D:\\Projects hoặc google.com)'}
                    value={newItemPath}
                    onChange={(e) => setNewItemPath(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      borderRadius: '6px',
                      padding: '6px 8px',
                      fontSize: '12px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />

                  {/* Form Actions */}
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '2px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddItemForm(false)
                        setErrorMsg(null)
                        setNewItemPath('')
                        setNewItemLabel('')
                      }}
                      style={{
                        background: 'none',
                        border: '1px solid var(--border)',
                        color: 'var(--text-secondary)',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        transition: 'var(--transition)'
                      }}
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      style={{
                        background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-purple-hover))',
                        border: 'none',
                        color: 'white',
                        borderRadius: '6px',
                        padding: '4px 12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'var(--transition)'
                      }}
                    >
                      Lưu
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
