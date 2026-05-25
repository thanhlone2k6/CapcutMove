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
  Copy,
  Edit2,
  Check,
  RotateCcw,
  CheckSquare,
  Square,
  Trash
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
  // Quick Input states
  const [quickInputText, setQuickInputText] = useState('')
  const [quickInputGroupName, setQuickInputGroupName] = useState('')
  const [showQuickAddPanel, setShowQuickAddPanel] = useState(false)

  // Form state for adding link to group
  const [newItemPath, setNewItemPath] = useState('')
  const [showAddItemForm, setShowAddItemForm] = useState(false)

  // Edit group name state
  const [isEditingName, setIsEditingName] = useState(false)
  const [tempGroupName, setTempGroupName] = useState('')

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; groupId: string } | null>(null)

  // Selection Mode state
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])

  // Drag select state
  const [dragBox, setDragBox] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Recycle Bin state
  const [deletedGroups, setDeletedGroups] = useState<any[]>([])
  const [showBinModal, setShowBinModal] = useState(false)

  // Success indicator for copy text
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null)

  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Custom Confirm Dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string
    message: string
    confirmText?: string
    onConfirm: () => void
  } | null>(null)

  // Load quick links on mount
  useEffect(() => {
    window.api.quickLinksGet()
      .then((data) => {
        setGroups(data || [])
      })
      .catch((err) => {
        console.error('Failed to load quick links:', err)
      })

    // Load and filter deleted groups (auto clean > 30 days)
    window.api.getSettings()
      .then((settings) => {
        const delGroups = settings.deletedQuickLinks || []
        const now = Date.now()
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
        const activeDeleted = delGroups.filter((g: any) => {
          const deletedAt = g.deletedAt || now
          return now - deletedAt <= thirtyDaysMs
        })

        if (activeDeleted.length !== delGroups.length) {
          window.api.saveSettings({ deletedQuickLinks: activeDeleted })
        }
        setDeletedGroups(activeDeleted)
      })
      .catch((err) => {
        console.error('Failed to load deleted groups:', err)
      })

    // Listen for click to close context menu and quick add panel
    const handleClickOutside = (e: MouseEvent) => {
      setContextMenu(null)
      const target = e.target as HTMLElement
      if (!target.closest('.quick-add-panel') && !target.closest('.quick-input-wrapper')) {
        setShowQuickAddPanel(false)
      }
    }
    window.addEventListener('click', handleClickOutside)
    return () => {
      window.removeEventListener('click', handleClickOutside)
    }
  }, [])

  // Global mousemove and mouseup listeners during dragging
  useEffect(() => {
    if (!isDragging) return

    const handleWindowMouseMove = (e: MouseEvent) => {
      setDragBox((prev) => {
        if (!prev) return null
        const newDragBox = {
          ...prev,
          currentX: e.clientX,
          currentY: e.clientY
        }

        const x1 = Math.min(newDragBox.startX, newDragBox.currentX)
        const y1 = Math.min(newDragBox.startY, newDragBox.currentY)
        const x2 = Math.max(newDragBox.startX, newDragBox.currentX)
        const y2 = Math.max(newDragBox.startY, newDragBox.currentY)

        const dragDistance = Math.sqrt(
          Math.pow(newDragBox.currentX - newDragBox.startX, 2) +
          Math.pow(newDragBox.currentY - newDragBox.startY, 2)
        )

        if (dragDistance > 5) {
          setIsSelectionMode(true)

          const cardElements = document.querySelectorAll('.quicklink-card')
          const newSelectedIds: string[] = []
          cardElements.forEach((el) => {
            const rect = el.getBoundingClientRect()
            const overlaps = !(
              rect.right < x1 ||
              rect.left > x2 ||
              rect.bottom < y1 ||
              rect.top > y2
            )
            if (overlaps) {
              const groupId = el.getAttribute('data-group-id')
              if (groupId) newSelectedIds.push(groupId)
            }
          })
          setSelectedGroupIds(newSelectedIds)
        }

        return newDragBox
      })
    }

    const handleWindowMouseUp = (e: MouseEvent) => {
      setIsDragging(false)
      setDragBox((prev) => {
        if (prev) {
          const dragDistance = Math.sqrt(
            Math.pow(e.clientX - prev.startX, 2) +
            Math.pow(e.clientY - prev.startY, 2)
          )
          if (dragDistance <= 5) {
            setSelectedGroupIds([])
            setIsSelectionMode(false)
          }
        }
        return null
      })
    }

    window.addEventListener('mousemove', handleWindowMouseMove)
    window.addEventListener('mouseup', handleWindowMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove)
      window.removeEventListener('mouseup', handleWindowMouseUp)
    }
  }, [isDragging])

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only left click
    if (e.button !== 0) return

    // Don't start drag if clicking interactive elements or context menu
    const target = e.target as HTMLElement
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('a') ||
      target.closest('.ql-modal') ||
      target.closest('.context-menu-item')
    ) {
      return
    }

    // Don't start drag if clicking a group card
    if (target.closest('.quicklink-card')) {
      return
    }

    setDragBox({
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY
    })
    setIsDragging(true)
  }

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

  const handleQuickAddSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    const input = quickInputText.trim()
    if (!input) {
      setErrorMsg('Vui lòng nhập nội dung.')
      return
    }

    // 1. Detect type & normalize path
    let detectedType: 'folder' | 'link' | 'text' = 'text'
    let normalizedPath = input

    if (/^https?:\/\//i.test(input)) {
      detectedType = 'link'
    } else if (/^www\./i.test(input)) {
      detectedType = 'link'
      normalizedPath = `https://${input}`
    } else {
      const isWebUrl = input.includes('.') && 
                        !input.includes('\\') && 
                        !/^[a-zA-Z]:\\/i.test(input) && 
                        !/\s/.test(input);
      if (isWebUrl) {
        detectedType = 'link'
        normalizedPath = `https://${input}`
      } else if (/^[a-zA-Z]:\\/i.test(input) || input.includes('\\') || input.includes('/')) {
        detectedType = 'folder'
      }
    }

    // 2. Decide group name
    let targetGroupName = quickInputGroupName.trim()
    if (!targetGroupName) {
      if (detectedType === 'link') {
        try {
          const url = new URL(normalizedPath)
          targetGroupName = url.hostname.replace('www.', '')
        } catch (e) {
          targetGroupName = 'Liên kết mới'
        }
      } else if (detectedType === 'folder') {
        const parts = normalizedPath.split(/[\\/]/).filter(Boolean)
        targetGroupName = parts[parts.length - 1] || 'Thư mục mới'
      } else {
        targetGroupName = input.substring(0, 20) || 'Nhóm mới'
      }
    }

    const existingGroup = groups.find(
      (g) => g.name.toLowerCase() === targetGroupName.toLowerCase()
    )

    let updatedGroups = [...groups]
    let activeGp: QuickLinkGroup | null = null

    if (existingGroup) {
      const itemIsGroupName = input.toLowerCase() === targetGroupName.toLowerCase()
      if (itemIsGroupName) {
        setActiveGroup(existingGroup)
        setQuickInputText('')
        setQuickInputGroupName('')
        setShowQuickAddPanel(false)
        return
      }

      const newItem: QuickLinkItem = {
        id: crypto.randomUUID(),
        type: detectedType,
        label: normalizedPath,
        path: normalizedPath
      }

      updatedGroups = groups.map((g) => {
        if (g.id === existingGroup.id) {
          const updated = {
            ...g,
            items: [newItem, ...g.items]
          }
          activeGp = updated
          return updated
        }
        return g
      })
    } else {
      if (groups.length >= 10) {
        setErrorMsg('Bạn chỉ có thể tạo tối đa 10 nhóm.')
        return
      }

      const newGroup: QuickLinkGroup = {
        id: crypto.randomUUID(),
        name: targetGroupName,
        items: []
      }

      const inputIsDifferent = input.toLowerCase() !== targetGroupName.toLowerCase()
      if (inputIsDifferent) {
        const newItem: QuickLinkItem = {
          id: crypto.randomUUID(),
          type: detectedType,
          label: normalizedPath,
          path: normalizedPath
        }
        newGroup.items.push(newItem)
      }

      updatedGroups = [newGroup, ...groups]
      activeGp = newGroup
    }

    try {
      await window.api.quickLinksSave(updatedGroups)
      setGroups(updatedGroups)
      if (activeGp) {
        setActiveGroup(activeGp)
      }
      setQuickInputText('')
      setQuickInputGroupName('')
      setShowQuickAddPanel(false)
      setSuccessMsg('Đã thêm thành công!')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể lưu.')
    }
  }

  const handleDeleteGroup = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation() // Prevent modal from opening
    await handleDeleteGroups([id])
  }

  const handleDeleteGroups = (ids: string[]) => {
    setErrorMsg(null)
    setSuccessMsg(null)

    const groupsToDelete = groups.filter((g) => ids.includes(g.id))
    if (groupsToDelete.length === 0) return

    setConfirmDialog({
      title: ids.length === 1 ? `Xóa nhóm "${groupsToDelete[0].name}"?` : `Xóa ${ids.length} nhóm đã chọn?`,
      message: 'Các nhóm sẽ được chuyển vào thùng rác.',
      confirmText: 'Xóa',
      onConfirm: async () => {
        setConfirmDialog(null)
        const now = Date.now()
        const newDeleted = groupsToDelete.map((g) => ({
          ...g,
          deletedAt: now
        }))

        const updatedDeleted = [...newDeleted, ...deletedGroups]
        const updatedGroups = groups.filter((g) => !ids.includes(g.id))

        try {
          await window.api.quickLinksSave(updatedGroups)
          await window.api.saveSettings({ deletedQuickLinks: updatedDeleted })

          setGroups(updatedGroups)
          setDeletedGroups(updatedDeleted)
          setSelectedGroupIds([])
          setIsSelectionMode(false)

          if (activeGroup && ids.includes(activeGroup.id)) {
            setActiveGroup(null)
          }

          setSuccessMsg(`Đã di chuyển ${ids.length} nhóm vào thùng rác.`)
          setTimeout(() => setSuccessMsg(null), 3000)
        } catch (err: any) {
          setErrorMsg(err.message || 'Không thể xóa các nhóm.')
        }
      }
    })
  }

  const handleRestoreGroup = async (groupId: string) => {
    setErrorMsg(null)
    setSuccessMsg(null)

    const groupToRestore = deletedGroups.find((g) => g.id === groupId)
    if (!groupToRestore) return

    if (groups.length >= 10) {
      setErrorMsg('Không thể khôi phục vì danh sách đã đạt tối đa 10 nhóm hoạt động.')
      setTimeout(() => setErrorMsg(null), 4000)
      return
    }

    const nameExists = groups.some(
      (g) => g.name.toLowerCase() === groupToRestore.name.toLowerCase()
    )
    let restoredName = groupToRestore.name
    if (nameExists) {
      restoredName = `${groupToRestore.name} (Khôi phục)`
    }

    const { deletedAt, ...restoredGroup } = groupToRestore
    restoredGroup.name = restoredName

    const updatedGroups = [restoredGroup, ...groups]
    const updatedDeleted = deletedGroups.filter((g) => g.id !== groupId)

    try {
      await window.api.quickLinksSave(updatedGroups)
      await window.api.saveSettings({ deletedQuickLinks: updatedDeleted })

      setGroups(updatedGroups)
      setDeletedGroups(updatedDeleted)
      setSuccessMsg(`Đã khôi phục nhóm "${restoredName}".`)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể khôi phục nhóm.')
    }
  }

  const handlePermanentDeleteGroup = (groupId: string) => {
    setErrorMsg(null)
    setSuccessMsg(null)

    setConfirmDialog({
      title: 'Xóa vĩnh viễn nhóm này?',
      message: 'Thao tác này không thể hoàn tác.',
      confirmText: 'Xóa vĩnh viễn',
      onConfirm: async () => {
        setConfirmDialog(null)
        const updatedDeleted = deletedGroups.filter((g) => g.id !== groupId)

        try {
          await window.api.saveSettings({ deletedQuickLinks: updatedDeleted })
          setDeletedGroups(updatedDeleted)
          setSuccessMsg('Đã xóa vĩnh viễn nhóm.')
          setTimeout(() => setSuccessMsg(null), 3000)
        } catch (err: any) {
          setErrorMsg(err.message || 'Không thể xóa vĩnh viễn nhóm.')
        }
      }
    })
  }

  const handleEmptyBin = () => {
    setErrorMsg(null)
    setSuccessMsg(null)

    setConfirmDialog({
      title: 'Dọn sạch thùng rác?',
      message: 'Tất cả các nhóm sẽ bị xóa vĩnh viễn.',
      confirmText: 'Dọn sạch',
      onConfirm: async () => {
        setConfirmDialog(null)
        try {
          await window.api.saveSettings({ deletedQuickLinks: [] })
          setDeletedGroups([])
          setSuccessMsg('Đã dọn sạch thùng rác.')
          setTimeout(() => setSuccessMsg(null), 3000)
        } catch (err: any) {
          setErrorMsg(err.message || 'Không thể dọn sạch thùng rác.')
        }
      }
    })
  }

  const handleRenameGroup = async (groupId: string, newName: string) => {
    setErrorMsg(null)
    setSuccessMsg(null)

    const trimmed = newName.trim()
    if (!trimmed) {
      setErrorMsg('Tên nhóm không được để trống.')
      return
    }

    const nameExists = groups.some(
      (g) => g.id !== groupId && g.name.toLowerCase() === trimmed.toLowerCase()
    )
    if (nameExists) {
      setErrorMsg('Tên nhóm đã tồn tại.')
      return
    }

    const updated = groups.map((g) => {
      if (g.id === groupId) {
        const updatedGroup = { ...g, name: trimmed }
        setActiveGroup(updatedGroup)
        return updatedGroup
      }
      return g
    })

    try {
      await window.api.quickLinksSave(updated)
      setGroups(updated)
      setIsEditingName(false)
      setSuccessMsg('Đã đổi tên nhóm thành công!')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể đổi tên nhóm.')
    }
  }

  const handleDeleteAllItems = (groupId: string) => {
    setErrorMsg(null)
    setSuccessMsg(null)

    setConfirmDialog({
      title: 'Xóa tất cả liên kết?',
      message: 'Toàn bộ liên kết trong nhóm này sẽ bị xóa.',
      confirmText: 'Xóa tất cả',
      onConfirm: async () => {
        setConfirmDialog(null)
        const updated = groups.map((g) => {
          if (g.id === groupId) {
            const updatedGroup = { ...g, items: [] }
            setActiveGroup(updatedGroup)
            return updatedGroup
          }
          return g
        })

        try {
          await window.api.quickLinksSave(updated)
          setGroups(updated)
          setSuccessMsg('Đã xóa tất cả liên kết.')
          setTimeout(() => setSuccessMsg(null), 3000)
        } catch (err: any) {
          setErrorMsg(err.message || 'Không thể xóa các liên kết.')
        }
      }
    })
  }

  const handleAddItem = async (groupId: string, e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    const trimmedPath = newItemPath.trim()

    if (!trimmedPath) {
      setErrorMsg('Vui lòng nhập đường dẫn thư mục, URL trang web hoặc văn bản.')
      return
    }

    // Auto detect type & normalize path
    let detectedType: 'folder' | 'link' | 'text' = 'text'
    let normalizedPath = trimmedPath

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
      } else if (/^[a-zA-Z]:\\/i.test(trimmedPath) || trimmedPath.includes('\\') || trimmedPath.includes('/')) {
        detectedType = 'folder'
      }
    }

    const newItem: QuickLinkItem = {
      id: crypto.randomUUID(),
      type: detectedType,
      label: normalizedPath,
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Quản lý Lưu nhanh (Quick Links)
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Tổ chức thư mục làm việc và liên kết trang web theo từng nhóm dự án dễ dàng.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Recycle Bin Button */}
          <button
            onClick={() => setShowBinModal(true)}
            style={{
              background: 'none',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              transition: 'var(--transition)',
              width: '40px',
              height: '40px'
            }}
            title="Thùng rác"
            className="ql-bin-btn"
          >
            <Trash2 size={16} />
            {deletedGroups.length > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: 'var(--accent-purple)',
                  color: 'white',
                  fontSize: '9px',
                  fontWeight: 700,
                  width: '15px',
                  height: '15px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {deletedGroups.length}
              </span>
            )}
          </button>

          {/* Selection Actions (shown only if selection mode is active) */}
          {isSelectionMode && (
            <>
              {selectedGroupIds.length > 0 && (
                <button
                  className="btn"
                  onClick={() => handleDeleteGroups(selectedGroupIds)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: '#f87171',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Trash size={14} />
                  <span>Xóa đã chọn ({selectedGroupIds.length})</span>
                </button>
              )}
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setIsSelectionMode(false)
                  setSelectedGroupIds([])
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px'
                }}
              >
                Hủy chọn
              </button>
            </>
          )}
        </div>
      </div>

      {/* Quick Input Row - Full Width */}
      {!isSelectionMode && (
        <div style={{ position: 'relative', width: '100%', marginBottom: '20px', flexShrink: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '6px 14px',
              width: '100%',
              boxSizing: 'border-box',
              height: '42px',
              transition: 'var(--transition)'
            }}
            className="quick-input-wrapper"
          >
            <Plus size={16} style={{ color: 'var(--text-secondary)', marginRight: '8px', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Thêm nhanh liên kết hoặc nhóm mới..."
              value={quickInputText}
              onChange={(e) => {
                setQuickInputText(e.target.value)
                if (e.target.value.trim() && !showQuickAddPanel) {
                  setShowQuickAddPanel(true)
                }
              }}
              onFocus={() => {
                if (quickInputText.trim()) {
                  setShowQuickAddPanel(true)
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleQuickAddSubmit()
                }
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none',
                width: '100%',
                padding: 0
              }}
            />
            {quickInputText && (
              <button
                onClick={() => {
                  setQuickInputText('')
                  setQuickInputGroupName('')
                  setShowQuickAddPanel(false)
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Expanded Dropdown Panel */}
          {showQuickAddPanel && (
            <div
              style={{
                position: 'absolute',
                top: '48px',
                right: 0,
                width: '100%',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
                padding: '16px',
                zIndex: 999,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxSizing: 'border-box'
              }}
              className="quick-add-panel"
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Tên nhóm lưu trữ
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: CapCut Ads (Để trống tự đặt)"
                  value={quickInputGroupName}
                  onChange={(e) => setQuickInputGroupName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleQuickAddSubmit()
                    }
                  }}
                  style={{
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    borderRadius: '6px',
                    padding: '6px 8px',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setQuickInputText('')
                    setQuickInputGroupName('')
                    setShowQuickAddPanel(false)
                  }}
                  style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '11px' }}
                >
                  Hủy
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => handleQuickAddSubmit()}
                  style={{ padding: '6px 16px', borderRadius: '8px', fontSize: '11px' }}
                >
                  Lưu nhanh
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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



      {/* Group Grid list */}
      <div
        className="quicklinks-scroll-container"
        onMouseDown={handleMouseDown}
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingRight: '6px',
          maxHeight: '100%',
          columns: '3 280px',
          columnGap: '16px',
          userSelect: 'none'
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
            const isSelected = selectedGroupIds.includes(group.id)
            return (
              <div
                key={group.id}
                data-group-id={group.id}
                onClick={() => {
                  if (isSelectionMode) {
                    setSelectedGroupIds(prev =>
                      prev.includes(group.id)
                        ? prev.filter((id) => id !== group.id)
                        : [...prev, group.id]
                    )
                  } else {
                    setActiveGroup(group)
                    setErrorMsg(null)
                    setSuccessMsg(null)
                  }
                }}
                onContextMenu={(e) => {
                  if (isSelectionMode) return
                  e.preventDefault()
                  e.stopPropagation()
                  setContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    groupId: group.id
                  })
                }}
                style={{
                  background: colorInfo.bg,
                  border: isSelectionMode && isSelected 
                    ? `2px solid ${colorInfo.border}` 
                    : `1px solid ${colorInfo.border}`,
                  borderRadius: '12px',
                  padding: isSelectionMode && isSelected ? '15px' : '16px', // adjust for border width difference
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
                    {isSelectionMode && (
                      <span
                        style={{
                          color: isSelected ? colorInfo.text : 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                      </span>
                    )}
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
            setIsEditingName(false)
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
              {isEditingName ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="text"
                    value={tempGroupName}
                    onChange={(e) => setTempGroupName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameGroup(activeGroup.id, tempGroupName)
                      if (e.key === 'Escape') setIsEditingName(false)
                    }}
                    style={{
                      background: 'var(--bg-main)',
                      border: '1px solid var(--accent-purple)',
                      color: 'var(--text-primary)',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      outline: 'none',
                      height: '28px',
                      boxSizing: 'border-box'
                    }}
                    autoFocus
                  />
                  <button
                    onClick={() => handleRenameGroup(activeGroup.id, tempGroupName)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#34d399',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Lưu"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => setIsEditingName(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Hủy"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {activeGroup.name}
                  </span>
                  <button
                    onClick={() => {
                      setTempGroupName(activeGroup.name)
                      setIsEditingName(true)
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: '4px',
                      transition: 'var(--transition)'
                    }}
                    title="Đổi tên nhóm"
                    className="rename-group-btn"
                  >
                    <Edit2 size={13} />
                  </button>
                </div>
              )}
              <button
                onClick={() => {
                  setActiveGroup(null)
                  setShowAddItemForm(false)
                  setNewItemPath('')
                  setIsEditingName(false)
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
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
                    <button
                      onClick={() => handleDeleteAllItems(activeGroup.id)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        color: '#f87171',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        transition: 'all 0.2s ease'
                      }}
                      className="delete-all-items-btn"
                    >
                      <Trash2 size={11} />
                      <span>Xóa tất cả</span>
                    </button>
                  </div>
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
                  {/* Path / Content Input */}
                  <input
                    type="text"
                    placeholder="Đường dẫn thư mục, URL trang web hoặc văn bản..."
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

      {/* Selection drag marquee box */}
      {dragBox && (
        <div
          style={{
            position: 'fixed',
            left: `${Math.min(dragBox.startX, dragBox.currentX)}px`,
            top: `${Math.min(dragBox.startY, dragBox.currentY)}px`,
            width: `${Math.abs(dragBox.currentX - dragBox.startX)}px`,
            height: `${Math.abs(dragBox.currentY - dragBox.startY)}px`,
            border: '1.5px solid var(--accent-purple)',
            background: 'rgba(168, 85, 247, 0.15)',
            pointerEvents: 'none',
            zIndex: 99999,
            borderRadius: '4px'
          }}
        />
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4)',
            padding: '4px 0',
            zIndex: 9999,
            minWidth: '120px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              const group = groups.find((g) => g.id === contextMenu.groupId)
              if (group) {
                setActiveGroup(group)
                setErrorMsg(null)
                setSuccessMsg(null)
              }
              setContextMenu(null)
            }}
            style={{
              width: '100%',
              textAlign: 'left',
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              padding: '8px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'var(--transition)'
            }}
            className="context-menu-item"
          >
            <FolderOpen size={12} />
            <span>Mở nhóm</span>
          </button>
          <button
            onClick={() => {
              const group = groups.find((g) => g.id === contextMenu.groupId)
              if (group) {
                setTempGroupName(group.name)
                setActiveGroup(group)
                setIsEditingName(true)
              }
              setContextMenu(null)
            }}
            style={{
              width: '100%',
              textAlign: 'left',
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              padding: '8px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'var(--transition)'
            }}
            className="context-menu-item"
          >
            <Edit2 size={12} />
            <span>Đổi tên nhóm</span>
          </button>
          <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
          <button
            onClick={async () => {
              await handleDeleteGroup(contextMenu.groupId)
              setContextMenu(null)
            }}
            style={{
              width: '100%',
              textAlign: 'left',
              background: 'none',
              border: 'none',
              color: '#f87171',
              padding: '8px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'var(--transition)'
            }}
            className="context-menu-item danger"
          >
            <Trash2 size={12} />
            <span>Xóa nhóm</span>
          </button>
        </div>
      )}

      {/* Recycle Bin Modal Popup overlay */}
      {showBinModal && (
        <div
          className="ql-modal-overlay"
          onClick={() => setShowBinModal(false)}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trash2 size={16} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Thùng rác nhóm lưu nhanh
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
                  {deletedGroups.length} nhóm
                </span>
              </div>
              <button
                onClick={() => setShowBinModal(false)}
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
              {/* Info text */}
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, fontStyle: 'italic' }}>
                Các nhóm trong thùng rác sẽ tự động bị xóa vĩnh viễn sau 30 ngày kể từ ngày xóa.
              </p>

              {deletedGroups.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={handleEmptyBin}
                    style={{
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      color: '#f87171',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      transition: 'all 0.2s ease'
                    }}
                    className="empty-bin-btn"
                  >
                    <Trash size={12} />
                    <span>Dọn sạch thùng rác</span>
                  </button>
                </div>
              )}

              {/* Items List */}
              {deletedGroups.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '40px 0', textAlign: 'center' }}>
                  Thùng rác trống.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {deletedGroups.map((group) => {
                    const daysRemaining = Math.max(0, 30 - Math.ceil((Date.now() - (group.deletedAt || Date.now())) / (24 * 3600 * 1000)))
                    return (
                      <div
                        key={group.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'rgba(255, 255, 255, 0.01)',
                          border: '1px solid var(--border)',
                          borderRadius: '10px',
                          padding: '12px 14px',
                          transition: 'all 0.2s ease'
                        }}
                        className="quicklink-item-row"
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0, flex: 1 }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {group.name}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {group.items.length} liên kết
                            </span>
                            <span style={{ fontSize: '10px', color: '#f87171', background: 'rgba(239, 68, 68, 0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                              Tự xóa sau {daysRemaining} ngày
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            onClick={() => handleRestoreGroup(group.id)}
                            style={{
                              background: 'none',
                              border: '1px solid var(--border)',
                              color: 'var(--accent-purple)',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 10px',
                              borderRadius: '8px',
                              transition: 'var(--transition)'
                            }}
                            className="quicklink-restore-btn"
                          >
                            <RotateCcw size={12} />
                            <span>Khôi phục</span>
                          </button>
                          <button
                            onClick={() => handlePermanentDeleteGroup(group.id)}
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
                            className="quicklink-delete-item-btn"
                            title="Xóa vĩnh viễn"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirm Dialog Modal Popup overlay */}
      {confirmDialog && (
        <div
          className="ql-modal-overlay"
          style={{ zIndex: 100000 }}
          onClick={() => setConfirmDialog(null)}
        >
          <div
            className="ql-modal"
            style={{
              width: '360px',
              padding: '20px',
              gap: '16px',
              alignItems: 'center',
              textAlign: 'center',
              boxSizing: 'border-box'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {confirmDialog.title}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {confirmDialog.message}
              </span>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '4px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setConfirmDialog(null)}
                style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px' }}
              >
                Hủy
              </button>
              <button
                className="btn"
                onClick={confirmDialog.onConfirm}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#f87171',
                  fontWeight: 600,
                  fontSize: '13px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.18)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
                }}
              >
                {confirmDialog.confirmText || 'Đồng ý'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
