import { useState, useEffect } from 'react'
import { Folder, Link as LinkIcon, FileText, ChevronDown, ChevronRight } from 'lucide-react'
import { QuickLinkGroup, QuickLinkItem } from '../../../preload/index.d'

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

export default function PopupApp(): React.JSX.Element {
  const [groups, setGroups] = useState<QuickLinkGroup[]>([])
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null)

  useEffect(() => {
    window.api.quickLinksGet().then((data) => {
      setGroups(data || [])
    })
  }, [])

  const handleOpen = (item: QuickLinkItem) => {
    window.api.quickLinksOpen({ type: item.type as 'folder' | 'link', path: item.path })
  }

  const toggleGroup = (groupId: string) => {
    setExpandedGroupId((prev) => (prev === groupId ? null : groupId))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f0f13', overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          background: 'rgba(255, 255, 255, 0.02)',
          flexShrink: 0
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8f8f8', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>🔗</span> Quick Links
        </span>
        <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.3)', fontWeight: 500 }}>
          Alt+Q
        </span>
      </div>

      {/* Group List Area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
        className="quicklinks-scroll-container"
      >
        {groups.length === 0 ? (
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255, 255, 255, 0.35)',
              fontSize: '12px',
              fontStyle: 'italic',
              textAlign: 'center',
              padding: '20px'
            }}
          >
            Chưa có nhóm lưu nhanh nào
          </div>
        ) : (
          groups.map((group) => {
            const isExpanded = expandedGroupId === group.id
            const colorInfo = getCardColor(group.id)
            return (
              <div
                key={group.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '10px',
                  flexShrink: 0,
                  transition: 'background 0.2s ease, border-color 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                }}
              >
                {/* Group Header Button */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    background: 'none',
                    border: 'none',
                    color: '#f8f8f8',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    outline: 'none',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none'
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ display: 'flex', color: colorInfo.text }}>
                      <Folder size={16} />
                    </span>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                      {group.name}
                    </span>
                  </span>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: 'rgba(255, 255, 255, 0.5)'
                      }}
                    >
                      {group.items.length} liên kết
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center' }}>
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                  </div>
                </button>

                {/* Expanded items list */}
                {isExpanded && (
                  <div
                    style={{
                      background: 'rgba(0, 0, 0, 0.25)',
                      padding: '6px 8px 8px 8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      borderTop: '1px solid rgba(255, 255, 255, 0.03)',
                      boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.2)',
                      borderBottomLeftRadius: '10px',
                      borderBottomRightRadius: '10px'
                    }}
                  >
                    {group.items.length === 0 ? (
                      <div
                        style={{
                          fontSize: '11px',
                          color: 'rgba(255, 255, 255, 0.3)',
                          fontStyle: 'italic',
                          padding: '6px 8px'
                        }}
                      >
                        Trống
                      </div>
                    ) : (
                      group.items.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleOpen(item)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 12px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.04)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            color: 'rgba(255, 255, 255, 0.9)',
                            textAlign: 'left',
                            width: '100%',
                            outline: 'none',
                            flexShrink: 0,
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'
                            e.currentTarget.style.transform = 'translateY(-1px)'
                            e.currentTarget.style.color = '#fff'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.04)'
                            e.currentTarget.style.transform = 'none'
                            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)'
                          }}
                        >
                          <span
                            style={{
                              display: 'flex',
                              color: item.type === 'folder' ? colorInfo.text : item.type === 'link' ? '#60a5fa' : '#34d399',
                              flexShrink: 0
                            }}
                          >
                            {getItemIcon(item, 14)}
                          </span>
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: 500,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              flex: 1
                            }}
                          >
                            {getDisplayLabel(item)}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
