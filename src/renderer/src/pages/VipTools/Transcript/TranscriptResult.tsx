import { useState } from 'react'
import { Copy, Download, RefreshCw, Check } from 'lucide-react'

export interface Segment {
  start: number
  end: number
  text: string
}

interface TranscriptResultProps {
  segments: Segment[]
  mediaName: string
  outputFormat: 'text' | 'srt'
  onReset: () => void
}

export default function TranscriptResult({
  segments,
  mediaName,
  outputFormat,
  onReset
}: TranscriptResultProps): React.JSX.Element {
  const [copiedAll, setCopiedAll] = useState(false)

  const formatSrtTime = (seconds: number): string => {
    const ms = Math.floor((seconds % 1) * 1000)
    let s = Math.floor(seconds)
    const m = Math.floor(s / 60)
    s = s % 60
    const h = Math.floor(m / 60)
    const mm = m % 60
    const pad = (num: number, size: number): string => num.toString().padStart(size, '0')
    return `${pad(h, 2)}:${pad(mm, 2)}:${pad(s, 2)},${pad(ms, 3)}`
  }

  const handleCopyAll = async (): Promise<void> => {
    const allText = segments.map((s) => s.text).join(' ')
    await window.api.copyToClipboard(allText)
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 2000)
  }

  const handleExportTxt = async (): Promise<void> => {
    const defaultName = mediaName.replace(/\.[^.]+$/, '') + '_transcript.txt'
    const txtContent = segments.map((s) => s.text).join(' ')
    await window.api.saveFileDialog({
      content: txtContent,
      defaultName,
      filters: [{ name: 'Text Files', extensions: ['txt'] }]
    })
  }

  const handleExportSrt = async (): Promise<void> => {
    const defaultName = mediaName.replace(/\.[^.]+$/, '') + '.srt'
    const srtContent = segments
      .map((s, index) => `${index + 1}\n${formatSrtTime(s.start)} --> ${formatSrtTime(s.end)}\n${s.text}\n`)
      .join('\n')
    await window.api.saveFileDialog({
      content: srtContent,
      defaultName,
      filters: [{ name: 'Subtitle Files', extensions: ['srt'] }]
    })
  }

  return (
    <div className="trs-result-card" style={{ padding: 16 }}>
      {/* Action bar */}
      <div className="trs-result-actions">
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {outputFormat === 'text' ? 'Văn bản thô' : 'Phụ đề (.srt)'}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {outputFormat === 'text' ? (
            <>
              <button className="trs-result-btn primary" onClick={handleCopyAll}>
                {copiedAll ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedAll ? 'Đã copy! ✓' : 'Copy'}</span>
              </button>
              <button className="trs-result-btn" onClick={handleExportTxt}>
                <Download size={13} />
                <span>Tải .txt</span>
              </button>
            </>
          ) : (
            <button className="trs-result-btn primary" onClick={handleExportSrt}>
              <Download size={13} />
              <span>Tải .srt</span>
            </button>
          )}
          <button className="trs-result-btn" onClick={onReset}>
            <RefreshCw size={13} />
            <span>Transcript lại</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {outputFormat === 'text' ? (
        <div
          className="trs-result-body"
          style={{
            fontSize: 14,
            lineHeight: '24px',
            color: 'var(--text-primary)',
            whiteSpace: 'pre-wrap',
            textAlign: 'justify'
          }}
        >
          {segments.map((s) => s.text).join(' ')}
        </div>
      ) : (
        <div
          className="trs-result-body"
          style={{
            fontFamily: "'Courier New', monospace",
            fontSize: 13,
            lineHeight: '20px',
            color: 'var(--text-secondary)',
            whiteSpace: 'pre-wrap'
          }}
        >
          {segments.map((s, index) => (
            <div key={index} style={{ marginBottom: 16 }}>
              <div style={{ color: 'var(--accent-purple)', fontWeight: 600 }}>{index + 1}</div>
              <div style={{ color: 'var(--text-muted)' }}>
                {formatSrtTime(s.start)} --&gt; {formatSrtTime(s.end)}
              </div>
              <div style={{ color: 'var(--text-primary)' }}>{s.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
