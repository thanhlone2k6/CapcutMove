import { useState, useEffect, useRef } from 'react'
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
  Trash,
  Settings,
  Power,
  PowerOff
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

const getDisplayLabel = (item: QuickLinkItem): string => {
  if (item.label && item.label.trim() !== '' && item.label !== item.path) {
    return item.label
  }
  if (item.type === 'text') {
    return item.label || item.path
  }
  return formatDisplayPath(item)
}

const GoogleDocsIcon = ({ size = 14 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" style={{ flexShrink: 0 }}>
    <rect x="3" y="2" width="18" height="20" rx="2" fill="#4285F4" />
    <path d="M7 7h10M7 11h10M7 15h6" stroke="white" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

const GoogleSheetsIcon = ({ size = 14 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" style={{ flexShrink: 0 }}>
    <rect x="3" y="2" width="18" height="20" rx="2" fill="#0F9D58" />
    <path d="M8 6h8v12H8z" fill="white" opacity="0.2" />
    <path d="M8 6v12M12 6v12M16 6v12M8 6h8M8 10h8M8 14h8M8 18h8" stroke="white" strokeWidth="1.5" />
  </svg>
)

const GoogleSlidesIcon = ({ size = 14 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" style={{ flexShrink: 0 }}>
    <rect x="3" y="2" width="18" height="20" rx="2" fill="#F4B400" />
    <rect x="7" y="6" width="10" height="8" rx="1" fill="white" opacity="0.3" />
    <path d="M9 10l3-2 3 2v4H9v-4z" fill="white" />
  </svg>
)

const GoogleFormsIcon = ({ size = 14 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" style={{ flexShrink: 0 }}>
    <rect x="3" y="2" width="18" height="20" rx="2" fill="#7248B9" />
    <circle cx="7" cy="7" r="1.5" fill="white" />
    <line x1="11" y1="7" x2="17" y2="7" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <circle cx="7" cy="12" r="1.5" fill="white" />
    <line x1="11" y1="12" x2="17" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <circle cx="7" cy="17" r="1.5" fill="white" />
    <line x1="11" y1="17" x2="17" y2="17" stroke="white" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

const GoogleDriveIcon = ({ size = 14 }: { size?: number }) => (
  <svg viewBox="0 0 100 100" width={size} height={size} style={{ flexShrink: 0 }}>
    <path d="M33.3 16.7L66.7 16.7L95.5 66.7L62.2 66.7Z" fill="#4285F4"/>
    <path d="M33.3 16.7L4.5 66.7L33.3 66.7L62.2 66.7Z" fill="#34A853"/>
    <path d="M4.5 66.7L18.8 91.7L81.2 91.7L95.5 66.7Z" fill="#FBBC05"/>
  </svg>
)

const getItemIcon = (item: QuickLinkItem, size = 14) => {
  if (item.type === 'folder') {
    return <Folder size={size} />
  }
  if (item.type === 'text') {
    return <FileText size={size} />
  }

  const path = item.path.toLowerCase()
  if (path.includes('docs.google.com/document')) {
    return <GoogleDocsIcon size={size} />
  }
  if (path.includes('docs.google.com/spreadsheets') || path.includes('docs.google.com/spreadshe')) {
    return <GoogleSheetsIcon size={size} />
  }
  if (path.includes('docs.google.com/presentation')) {
    return <GoogleSlidesIcon size={size} />
  }
  if (path.includes('docs.google.com/forms')) {
    return <GoogleFormsIcon size={size} />
  }
  if (path.includes('drive.google.com')) {
    return <GoogleDriveIcon size={size} />
  }
  if (path.includes('youtube.com') || path.includes('youtu.be')) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" style={{ flexShrink: 0 }}>
        <path d="M23 12s0-4.18-.39-5.74a3 3 0 0 0-2.11-2.11C18.94 3.75 12 3.75 12 3.75s-6.94 0-8.5.41a3 3 0 0 0-2.11 2.11C1 7.82 1 12 1 12s0 4.18.39 5.74a3 3 0 0 0 2.11 2.11C5.06 20.25 12 20.25 12 20.25s6.94 0 8.5-.41a3 3 0 0 0 2.11-2.11C23 16.18 23 12 23 12z" fill="#FF0000" />
        <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white" />
      </svg>
    )
  }
  if (path.includes('github.com')) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
      </svg>
    )
  }
  if (path.includes('facebook.com') || path.includes('fb.com')) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="#1877F2" style={{ flexShrink: 0 }}>
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    )
  }

  return <LinkIcon size={size} />
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

const escapeCsvField = (val: string): string => {
  if (val === undefined || val === null) return ''
  const needsQuotes = val.includes(',') || val.includes('"') || val.includes('\n') || val.includes('\r')
  let escaped = val
  if (val.includes('"')) {
    escaped = val.replace(/"/g, '""')
  }
  return needsQuotes ? `"${escaped}"` : escaped
}

const exportToCsv = (groups: QuickLinkGroup[]): string => {
  const header = 'groupId,groupName,itemId,itemType,itemLabel,itemPath'
  const rows = groups.flatMap(group => {
    const escapedGroupName = escapeCsvField(group.name)
    if (group.items.length === 0) {
      return [`${group.id},${escapedGroupName},,,,`]
    }
    return group.items.map(item => {
      const escapedLabel = escapeCsvField(item.label)
      const escapedPath = escapeCsvField(item.path)
      return `${group.id},${escapedGroupName},${item.id},${item.type},${escapedLabel},${escapedPath}`
    })
  })
  return [header, ...rows].join('\n')
}

const parseCsvLine = (line: string): string[] => {
  const result: string[] = []
  let currentField = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        currentField += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(currentField)
      currentField = ''
    } else {
      currentField += char
    }
  }
  result.push(currentField)
  return result
}

const parseCsv = (content: string): QuickLinkGroup[] => {
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0)
  if (lines.length <= 1) return []
  
  const firstLine = lines[0].toLowerCase()
  if (!firstLine.includes('groupid') || !firstLine.includes('groupname')) {
    throw new Error('Định dạng CSV không hợp lệ (thiếu cột groupId hoặc groupName).')
  }

  const dataLines = lines.slice(1)
  const groupMap = new Map<string, QuickLinkGroup>()

  for (const line of dataLines) {
    const fields = parseCsvLine(line)
    if (fields.length < 2) continue
    const [groupId, groupName, itemId, itemType, itemLabel, itemPath] = fields

    if (!groupId || !groupName) continue

    if (!groupMap.has(groupId)) {
      groupMap.set(groupId, { id: groupId, name: groupName, items: [] })
    }
    
    if (itemId) {
      const type = itemType as 'folder' | 'link' | 'text'
      if (type === 'folder' || type === 'link' || type === 'text') {
        groupMap.get(groupId)!.items.push({
          id: itemId,
          type,
          label: itemLabel || itemPath || '',
          path: itemPath || ''
        })
      }
    }
  }
  return Array.from(groupMap.values())
}

export default function QuickLinks(): React.JSX.Element {
  const [groups, setGroups] = useState<QuickLinkGroup[]>([])
  const [activeGroup, setActiveGroup] = useState<QuickLinkGroup | null>(null)
  // Quick Input states
  const [quickInputText, setQuickInputText] = useState('')
  const [quickInputGroupName, setQuickInputGroupName] = useState('')
  const [quickInputItemLabel, setQuickInputItemLabel] = useState('')
  const [showQuickAddPanel, setShowQuickAddPanel] = useState(false)

  // Form state for adding link to group
  const [newItemPath, setNewItemPath] = useState('')
  const [newItemLabel, setNewItemLabel] = useState('')
  const [showAddItemForm, setShowAddItemForm] = useState(false)

  // Item editing states
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [tempItemLabel, setTempItemLabel] = useState('')
  const [isProcessingEmbedAll, setIsProcessingEmbedAll] = useState(false)

  // Edit group name state
  const [isEditingName, setIsEditingName] = useState(false)
  const [tempGroupName, setTempGroupName] = useState('')

  // Windows autostart & Global Shortcut settings
  const [autostart, setAutostart] = useState(false)
  const [shortcut, setShortcut] = useState('Alt+Q')
  const [isRecording, setIsRecording] = useState(false)

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

  // Settings Menu state
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const settingsMenuRef = useRef<HTMLDivElement>(null)

  // CSV Import state
  const [importMergeDialog, setImportMergeDialog] = useState<{
    groups: QuickLinkGroup[]
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

    // Load autostart and shortcut settings
    window.api.autostartGet().then(setAutostart)
    window.api.shortcutGet().then(setShortcut)

    // Listen for shortcut conflicts
    const unsubConflict = window.api.onShortcutConflict((conflictedShortcut) => {
      setErrorMsg(`Phím tắt ${conflictedShortcut} bị xung đột, vui lòng chọn phím khác!`)
      setTimeout(() => setErrorMsg(null), 5000)
    })

    // Listen for click to close context menu, quick add panel and settings dropdown
    const handleClickOutside = (e: MouseEvent) => {
      setContextMenu(null)
      const target = e.target as HTMLElement
      if (!target.closest('.quick-add-panel') && !target.closest('.quick-input-wrapper')) {
        setShowQuickAddPanel(false)
      }
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(target) && !target.closest('.ql-settings-btn')) {
        setShowSettingsMenu(false)
      }
    }
    window.addEventListener('click', handleClickOutside)
    return () => {
      window.removeEventListener('click', handleClickOutside)
      unsubConflict()
    }
  }, [])

  // Keyboard shortcut recorder hook
  useEffect(() => {
    if (!isRecording) return

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const parts: string[] = []
      if (e.ctrlKey) parts.push('Ctrl')
      if (e.altKey) parts.push('Alt')
      if (e.shiftKey) parts.push('Shift')

      const keyName = e.key
      if (keyName !== 'Control' && keyName !== 'Alt' && keyName !== 'Shift') {
        let key = keyName.toUpperCase()
        if (key === 'ARROWUP') key = 'Up'
        if (key === 'ARROWDOWN') key = 'Down'
        if (key === 'ARROWLEFT') key = 'Left'
        if (key === 'ARROWRIGHT') key = 'Right'
        if (key === ' ') key = 'Space'
        parts.push(key)
      }

      if (parts.length >= 2 || (parts.length === 1 && /^F[1-9][0-2]?$/i.test(parts[0]))) {
        const combo = parts.join('+')
        setShortcut(combo)
        window.api.shortcutSet(combo)
        setIsRecording(false)
        setSuccessMsg(`Đã đổi phím tắt thành: ${combo}`)
        setTimeout(() => setSuccessMsg(null), 3000)
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [isRecording])

  const handleToggleAutostart = async () => {
    const newVal = !autostart
    await window.api.autostartSet(newVal)
    setAutostart(newVal)
    setSuccessMsg(newVal ? 'Đã bật khởi động cùng Windows!' : 'Đã tắt khởi động cùng Windows!')
    setTimeout(() => setSuccessMsg(null), 3000)
  }

  // Auto fetch title for newItemPath
  useEffect(() => {
    const trimmed = newItemPath.trim()
    if (!trimmed) return

    let urlToFetch = ''
    if (/^https?:\/\//i.test(trimmed)) {
      urlToFetch = trimmed
    } else if (/^www\./i.test(trimmed)) {
      urlToFetch = `https://${trimmed}`
    } else {
      const isWebUrl = trimmed.includes('.') && 
                       !trimmed.includes('\\') && 
                       !/^[a-zA-Z]:\\/i.test(trimmed) && 
                       !/\s/.test(trimmed);
      if (isWebUrl) {
        urlToFetch = `https://${trimmed}`
      }
    }

    if (!urlToFetch) return

    const timer = setTimeout(async () => {
      try {
        const title = await window.api.fetchUrlTitle(urlToFetch)
        if (title) {
          setNewItemLabel((prev) => prev.trim() === '' ? title : prev)
        }
      } catch (err) {
        console.error(err)
      }
    }, 600)

    return () => clearTimeout(timer)
  }, [newItemPath])

  // Auto fetch title for quickInputText
  useEffect(() => {
    const trimmed = quickInputText.trim()
    if (!trimmed) return

    let urlToFetch = ''
    if (/^https?:\/\//i.test(trimmed)) {
      urlToFetch = trimmed
    } else if (/^www\./i.test(trimmed)) {
      urlToFetch = `https://${trimmed}`
    } else {
      const isWebUrl = trimmed.includes('.') && 
                       !trimmed.includes('\\') && 
                       !/^[a-zA-Z]:\\/i.test(trimmed) && 
                       !/\s/.test(trimmed);
      if (isWebUrl) {
        urlToFetch = `https://${trimmed}`
      }
    }

    if (!urlToFetch) return

    const timer = setTimeout(async () => {
      try {
        const title = await window.api.fetchUrlTitle(urlToFetch)
        if (title) {
          setQuickInputItemLabel((prev) => prev.trim() === '' ? title : prev)
        }
      } catch (err) {
        console.error(err)
      }
    }, 600)

    return () => clearTimeout(timer)
  }, [quickInputText])

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

    const itemLabel = quickInputItemLabel.trim()
    let finalLabel = itemLabel

    if (detectedType === 'link' && !finalLabel) {
      try {
        const title = await window.api.fetchUrlTitle(normalizedPath)
        if (title) {
          finalLabel = title
        }
      } catch (e) {
        // ignore
      }
    }

    if (existingGroup) {
      const itemIsGroupName = input.toLowerCase() === targetGroupName.toLowerCase()
      if (itemIsGroupName) {
        setActiveGroup(existingGroup)
        setQuickInputText('')
        setQuickInputGroupName('')
        setQuickInputItemLabel('')
        setShowQuickAddPanel(false)
        return
      }

      const newItem: QuickLinkItem = {
        id: crypto.randomUUID(),
        type: detectedType,
        label: finalLabel || normalizedPath,
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
          label: finalLabel || normalizedPath,
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
      setQuickInputItemLabel('')
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
    const trimmedLabel = newItemLabel.trim()

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

    let finalLabel = trimmedLabel
    if (detectedType === 'link' && !finalLabel) {
      try {
        const title = await window.api.fetchUrlTitle(normalizedPath)
        if (title) {
          finalLabel = title
        }
      } catch (e) {
        // ignore
      }
    }

    const newItem: QuickLinkItem = {
      id: crypto.randomUUID(),
      type: detectedType,
      label: finalLabel || normalizedPath,
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

  const handleRenameItem = async (groupId: string, itemId: string, newLabel: string) => {
    setErrorMsg(null)
    setSuccessMsg(null)

    const trimmed = newLabel.trim()

    const updated = groups.map((g) => {
      if (g.id === groupId) {
        const updatedItems = g.items.map((item) => {
          if (item.id === itemId) {
            return {
              ...item,
              label: trimmed || item.path
            }
          }
          return item
        })
        const updatedGroup = { ...g, items: updatedItems }
        setActiveGroup(updatedGroup)
        return updatedGroup
      }
      return g
    })

    try {
      await window.api.quickLinksSave(updated)
      setGroups(updated)
      setEditingItemId(null)
      setSuccessMsg('Đã đổi tên liên kết!')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể đổi tên liên kết.')
    }
  }

  const handleExportCsv = async () => {
    setShowSettingsMenu(false)
    setErrorMsg(null)
    setSuccessMsg(null)

    if (groups.length === 0) {
      setErrorMsg('Không có dữ liệu Quick Links để xuất.')
      setTimeout(() => setErrorMsg(null), 3000)
      return
    }

    try {
      const csvContent = exportToCsv(groups)
      const res = await window.api.quickLinksExportCsv(csvContent)
      if (res.success) {
        setSuccessMsg('Xuất CSV thành công!')
        setTimeout(() => setSuccessMsg(null), 3000)
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi xuất file CSV.')
      setTimeout(() => setErrorMsg(null), 4000)
    }
  }

  const handleImportCsv = async () => {
    setShowSettingsMenu(false)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const res = await window.api.quickLinksImportCsv()
      if (!res.success || !res.content) {
        return
      }

      const importedGroups = parseCsv(res.content)
      if (importedGroups.length === 0) {
        setErrorMsg('Không tìm thấy dữ liệu hợp lệ trong file CSV.')
        setTimeout(() => setErrorMsg(null), 4000)
        return
      }

      setImportMergeDialog({ groups: importedGroups })
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi nhập file CSV.')
      setTimeout(() => setErrorMsg(null), 4000)
    }
  }

  const handleExecuteImport = async (importedGroups: QuickLinkGroup[], mode: 'overwrite' | 'merge') => {
    setImportMergeDialog(null)
    setErrorMsg(null)
    setSuccessMsg(null)

    let finalGroups: QuickLinkGroup[] = []

    if (mode === 'overwrite') {
      finalGroups = [...importedGroups]
    } else {
      const currentIds = new Set(groups.map(g => g.id))
      const newGroups = importedGroups.filter(g => !currentIds.has(g.id))
      finalGroups = [...groups, ...newGroups]
    }

    let warningMsg = ''
    if (finalGroups.length > 10) {
      finalGroups = finalGroups.slice(0, 10)
      warningMsg = ' Chỉ giữ lại 10 nhóm đầu tiên do giới hạn tối đa.'
    }

    try {
      await window.api.quickLinksSave(finalGroups)
      setGroups(finalGroups)
      setSuccessMsg(`Nhập CSV thành công!${warningMsg}`)
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể lưu dữ liệu nhập.')
      setTimeout(() => setErrorMsg(null), 4000)
    }
  }

  const handleAutoEmbedAll = async () => {
    setShowSettingsMenu(false)
    setErrorMsg(null)
    setSuccessMsg(null)

    const totalLinks = groups.flatMap(g => g.items).filter(item => item.type === 'link')
    if (totalLinks.length === 0) {
      setErrorMsg('Không tìm thấy liên kết nào trong các nhóm để auto embed.')
      setTimeout(() => setErrorMsg(null), 3000)
      return
    }

    setIsProcessingEmbedAll(true)
    setSuccessMsg(`Đang tiến hành tự động lấy tên cho ${totalLinks.length} liên kết...`)

    let updatedCount = 0
    const updatedGroups = await Promise.all(groups.map(async (group) => {
      const updatedItems = await Promise.all(group.items.map(async (item) => {
        if (item.type === 'link') {
          try {
            const title = await window.api.fetchUrlTitle(item.path)
            if (title && title !== item.label) {
              updatedCount++
              return { ...item, label: title }
            }
          } catch (e) {
            // ignore
          }
        }
        return item
      }))
      return { ...group, items: updatedItems }
    }))

    try {
      await window.api.quickLinksSave(updatedGroups)
      setGroups(updatedGroups)
      if (activeGroup) {
        const currentActive = updatedGroups.find(g => g.id === activeGroup.id)
        if (currentActive) {
          setActiveGroup(currentActive)
        }
      }
      setSuccessMsg(`Đã tự động lấy tên thành công cho ${updatedCount}/${totalLinks.length} liên kết!`)
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể lưu sau khi cập nhật tự động liên kết.')
    } finally {
      setIsProcessingEmbedAll(false)
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
          {/* Autostart Toggle Button */}
          <button
            onClick={handleToggleAutostart}
            style={{
              background: autostart ? 'rgba(16, 185, 129, 0.1)' : 'none',
              border: autostart ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border)',
              color: autostart ? '#34d399' : 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'var(--transition)',
              width: '40px',
              height: '40px'
            }}
            title={autostart ? 'Khởi động cùng Windows: BẬT' : 'Khởi động cùng Windows: TẮT'}
          >
            {autostart ? <Power size={16} /> : <PowerOff size={16} />}
          </button>

          {/* Shortcut Setup Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>Phím tắt:</span>
            <button
              onClick={() => setIsRecording(!isRecording)}
              style={{
                background: isRecording ? 'rgba(168, 85, 247, 0.1)' : 'var(--bg-surface)',
                border: isRecording ? '1px solid var(--accent-purple)' : '1px solid var(--border)',
                color: isRecording ? 'var(--accent-purple-hover)' : 'var(--text-primary)',
                cursor: 'pointer',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 600,
                transition: 'var(--transition)',
                outline: 'none',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isRecording ? '0 0 8px rgba(168, 85, 247, 0.2)' : 'none'
              }}
              title="Click để đổi phím tắt mở nhanh popup"
            >
              {isRecording ? 'Bấm tổ hợp phím...' : shortcut}
            </button>
          </div>

          {/* Settings Button */}
          <button
            className="ql-settings-btn"
            onClick={(e) => {
              e.stopPropagation()
              setShowSettingsMenu(!showSettingsMenu)
            }}
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
              transition: 'var(--transition)',
              width: '40px',
              height: '40px'
            }}
            title="Cài đặt"
          >
            <Settings size={16} />
          </button>

          {/* Settings Dropdown Menu */}
          {showSettingsMenu && (
            <div
              ref={settingsMenuRef}
              style={{
                position: 'absolute',
                top: '46px',
                right: '48px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
                zIndex: 1000,
                width: '160px',
                padding: '6px 0',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  padding: '6px 12px',
                  borderBottom: '1px solid var(--border)'
                }}
              >
                ⚙️ Cài đặt CSV
              </div>
              <button
                onClick={handleExportCsv}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-primary)',
                  padding: '8px 12px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  transition: 'all 0.2s ease'
                }}
                className="context-menu-item"
              >
                <span>📤</span> Xuất CSV
              </button>
              <button
                onClick={handleImportCsv}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-primary)',
                  padding: '8px 12px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  transition: 'all 0.2s ease'
                }}
                className="context-menu-item"
              >
                <span>📥</span> Nhập CSV
              </button>

              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  padding: '6px 12px',
                  borderBottom: '1px solid var(--border)',
                  borderTop: '1px solid var(--border)',
                  marginTop: '4px'
                }}
              >
                🔗 Công cụ liên kết
              </div>
              <button
                onClick={handleAutoEmbedAll}
                disabled={isProcessingEmbedAll}
                style={{
                  background: 'none',
                  border: 'none',
                  color: isProcessingEmbedAll ? 'var(--text-muted)' : 'var(--text-primary)',
                  padding: '8px 12px',
                  fontSize: '12px',
                  cursor: isProcessingEmbedAll ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  transition: 'all 0.2s ease'
                }}
                className="context-menu-item"
              >
                <span>🔄</span> {isProcessingEmbedAll ? 'Đang Auto Embed...' : 'Auto Embed toàn bộ'}
              </button>
            </div>
          )}

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
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '8px 16px',
              width: '100%',
              boxSizing: 'border-box',
              height: '48px',
              transition: 'all 0.3s ease',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
            }}
            className="quick-input-wrapper"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
            }}
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
                  setQuickInputItemLabel('')
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
                top: '56px',
                right: 0,
                width: '100%',
                background: 'rgba(28, 28, 33, 0.95)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '14px',
                boxShadow: '0 15px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.05)',
                padding: '20px',
                zIndex: 999,
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Tên hiển thị liên kết (Không bắt buộc)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Trang chủ Dự án (Để trống tự đặt dạng embed)"
                  value={quickInputItemLabel}
                  onChange={(e) => setQuickInputItemLabel(e.target.value)}
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
                    setQuickInputItemLabel('')
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
                  background: `linear-gradient(135deg, ${colorInfo.bg} 0%, rgba(20,20,25,0.4) 100%)`,
                  border: isSelectionMode && isSelected 
                    ? `2px solid ${colorInfo.border}` 
                    : `1px solid ${colorInfo.border}40`, /* Semi-transparent border */
                  borderRadius: '14px',
                  padding: isSelectionMode && isSelected ? '15px' : '16px',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  width: '100%',
                  boxSizing: 'border-box',
                  breakInside: 'avoid',
                  display: 'inline-block',
                  marginBottom: '16px',
                  boxShadow: `0 4px 20px ${colorInfo.glow}00`,
                  backdropFilter: 'blur(10px)'
                }}
                className="quicklink-card"
                onMouseEnter={(e) => {
                  if (!isSelectionMode) {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = `0 8px 25px ${colorInfo.glow}`;
                    e.currentTarget.style.borderColor = colorInfo.border;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelectionMode) {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = `0 4px 20px ${colorInfo.glow}00`;
                    e.currentTarget.style.borderColor = `${colorInfo.border}40`;
                  }
                }}
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
                    <span style={{ display: 'flex', color: colorInfo.text, padding: '6px', background: `${colorInfo.glow}`, borderRadius: '8px' }}>
                      <Folder size={16} />
                    </span>
                    <span style={{ fontSize: '15px', fontWeight: 600, color: '#f8f8f8' }}>
                      {group.name}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '12px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    {group.items.length} liên kết
                  </span>
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
          <div className="ql-modal" onClick={(e) => e.stopPropagation()} style={{
            background: 'var(--bg-surface-elevated)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(20px)',
            overflow: 'hidden'
          }}>
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
                    const isEditing = editingItemId === item.id
                    return (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          borderRadius: '12px',
                          padding: '12px 16px',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          flexShrink: 0
                        }}
                        className="quicklink-item-row"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                          e.currentTarget.style.transform = 'translateY(-1px)'
                          e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)'
                          e.currentTarget.style.transform = 'none'
                          e.currentTarget.style.boxShadow = 'none'
                        }}
                      >
                        {isEditing ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                            <span
                              style={{
                                display: 'flex',
                                color: item.type === 'folder' ? 'var(--accent-purple-hover)' : item.type === 'link' ? '#60a5fa' : '#34d399',
                                flexShrink: 0
                              }}
                            >
                              {getItemIcon(item, 18)}
                            </span>
                            <input
                              type="text"
                              value={tempItemLabel}
                              onChange={(e) => setTempItemLabel(e.target.value)}
                              placeholder={item.path}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameItem(activeGroup.id, item.id, tempItemLabel)
                                if (e.key === 'Escape') setEditingItemId(null)
                              }}
                              style={{
                                background: 'var(--bg-main)',
                                border: '1px solid var(--accent-purple)',
                                color: 'var(--text-primary)',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                fontSize: '12px',
                                fontWeight: 500,
                                outline: 'none',
                                height: '26px',
                                flex: 1,
                                minWidth: 0,
                                boxSizing: 'border-box'
                              }}
                              autoFocus
                            />
                            <button
                              onClick={() => handleRenameItem(activeGroup.id, item.id, tempItemLabel)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#34d399',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                flexShrink: 0
                              }}
                              title="Lưu"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => setEditingItemId(null)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                flexShrink: 0
                              }}
                              title="Hủy"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <>
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
                                {getItemIcon(item, 18)}
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
                                {getDisplayLabel(item)}
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
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setEditingItemId(item.id)
                                  setTempItemLabel(item.label === item.path ? '' : item.label)
                                }}
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
                                title="Sửa tên"
                                className="quicklink-edit-item-btn"
                              >
                                <Edit2 size={12} />
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
                          </>
                        )}
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

                  {/* Custom Name / Label Input */}
                  <input
                    type="text"
                    placeholder="Tên hiển thị gợi nhớ (Không bắt buộc)..."
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

      {/* Custom Import Merge Dialog Modal Popup overlay */}
      {importMergeDialog && (
        <div
          className="ql-modal-overlay"
          style={{ zIndex: 100000 }}
          onClick={() => setImportMergeDialog(null)}
        >
          <div
            className="ql-modal"
            style={{
              width: '380px',
              padding: '24px',
              gap: '20px',
              alignItems: 'center',
              textAlign: 'center',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
              <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Nhập danh sách Quick Links
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Bạn muốn xử lý dữ liệu nhập từ CSV như thế nào?
              </span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
              <button
                className="btn"
                onClick={() => handleExecuteImport(importMergeDialog.groups, 'overwrite')}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '10px',
                  background: 'rgba(139, 92, 246, 0.1)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  color: 'var(--accent-purple)',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(139, 92, 246, 0.18)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)'
                }}
              >
                Ghi đè toàn bộ danh sách hiện có
              </button>
              <button
                className="btn"
                onClick={() => handleExecuteImport(importMergeDialog.groups, 'merge')}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  color: '#34d399',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(16, 185, 129, 0.18)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'
                }}
              >
                Gộp vào danh sách hiện có (Merge)
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setImportMergeDialog(null)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  border: '1px solid var(--border)',
                  background: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
