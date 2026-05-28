import React, { useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js'
import { Play, Square, Save, X, Scissors } from 'lucide-react'

interface SfxFile {
  id: string
  name: string
  filePath: string
  addedAt: number
  groupId: string
}

interface SfxEditModalProps {
  file: SfxFile
  onClose: () => void
  onSave: (trimStart: number, trimEnd: number, volume: number) => void
}

export default function SfxEditModal({ file, onClose, onSave }: SfxEditModalProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const vuCanvasRef = useRef<HTMLCanvasElement>(null)
  const waveSurferRef = useRef<WaveSurfer | null>(null)
  const regionsRef = useRef<RegionsPlugin | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)

  const [volume, setVolume] = useState<number>(100) // 0 to 150
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  
  // Trimming states
  const [trimStart, setTrimStart] = useState<number>(0)
  const [trimEnd, setTrimEnd] = useState<number>(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Dragging volume line
  const [isDraggingVolume, setIsDraggingVolume] = useState<boolean>(false)
  const WAVE_HEIGHT = 200

  useEffect(() => {
    if (!containerRef.current) return

    // 1. Create AudioContext and Nodes
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    const audioCtx = new AudioContextClass()
    audioCtxRef.current = audioCtx

    const gainNode = audioCtx.createGain()
    gainNode.gain.value = 1.0 // Initial 100%
    gainNodeRef.current = gainNode

    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 512
    analyser.smoothingTimeConstant = 0.8
    analyserRef.current = analyser

    // 2. Setup Gradient for Waveform (Clipping Warning)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    let waveColor: any = 'rgba(59, 130, 246, 0.8)'
    let progressColor: any = 'rgba(168, 85, 247, 0.8)'
    if (ctx) {
      // Linear gradient mapped to WAVE_HEIGHT
      const gradient = ctx.createLinearGradient(0, 0, 0, WAVE_HEIGHT)
      gradient.addColorStop(0, '#ef4444') // Red top (clipping)
      gradient.addColorStop(0.15, '#3b82f6') // Blue
      gradient.addColorStop(0.85, '#3b82f6') // Blue
      gradient.addColorStop(1, '#ef4444') // Red bottom (clipping)
      waveColor = gradient

      const progGradient = ctx.createLinearGradient(0, 0, 0, WAVE_HEIGHT)
      progGradient.addColorStop(0, '#ef4444')
      progGradient.addColorStop(0.15, '#a855f7') // Purple progress
      progGradient.addColorStop(0.85, '#a855f7')
      progGradient.addColorStop(1, '#ef4444')
      progressColor = progGradient
    }

    // 3. Initialize Regions Plugin
    const wsRegions = RegionsPlugin.create()
    regionsRef.current = wsRegions

    // 4. Initialize WaveSurfer
    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: waveColor,
      progressColor: progressColor,
      cursorColor: 'rgba(255,255,255,0.8)',
      cursorWidth: 2,
      barWidth: 3,
      barGap: 3,
      barRadius: 3,
      height: WAVE_HEIGHT,
      normalize: true,
      plugins: [wsRegions],
    })

    waveSurferRef.current = ws

    // Hook Web Audio API
    const mediaElement = ws.getMediaElement()
    
    try {
      if (!sourceRef.current) {
        sourceRef.current = audioCtx.createMediaElementSource(mediaElement)
        sourceRef.current.connect(gainNode)
        gainNode.connect(analyser)
        analyser.connect(audioCtx.destination)
      }
    } catch(e) {
      console.error('Audio Routing Error:', e)
    }

    const loadAudio = async () => {
      try {
        // Use IPC to read file directly, bypassing `safe-file` fetch issues
        const buffer = await window.api.sfxReadFile(file.filePath)
        const blob = new Blob([buffer])
        const blobUrl = URL.createObjectURL(blob)
        
        ws.load(blobUrl)
      } catch (e: any) {
        console.error('IPC Load Error:', e)
        setErrorMsg(e.message || String(e))
        setIsLoading(false)
      }
    }
    loadAudio()

    ws.on('ready', () => {
      setIsLoading(false)
      const dur = ws.getDuration()
      setTrimEnd(dur)
      setTrimStart(0)

      // Add trim region
      wsRegions.addRegion({
        start: 0,
        end: dur,
        color: 'rgba(59, 130, 246, 0.15)', // Light blue overlay
        drag: true,
        resize: true
      })
    })

    ws.on('play', () => {
      setIsPlaying(true)
      if (audioCtx.state === 'suspended') {
        audioCtx.resume()
      }
    })
    ws.on('pause', () => setIsPlaying(false))

    // Lock playback within region
    ws.on('timeupdate', (currentTime) => {
      if (wsRegions.getRegions().length > 0) {
        const region = wsRegions.getRegions()[0]
        if (currentTime >= region.end) {
          ws.pause()
          ws.setTime(region.start)
        }
      }
    })

    // Update trim state when region changes
    wsRegions.on('region-updated', (region) => {
      setTrimStart(region.start)
      setTrimEnd(region.end)
    })

    // Handle load error
    ws.on('error', (err) => {
      console.error('WaveSurfer Error:', err)
      setErrorMsg(String(err))
      setIsLoading(false)
    })

    // Start Segmented VU Meter Loop
    const drawVU = () => {
      if (analyserRef.current && vuCanvasRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current.getByteTimeDomainData(dataArray)

        // calculate RMS
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) {
          const val = (dataArray[i] - 128) / 128
          sum += val * val
        }
        const rms = Math.sqrt(sum / dataArray.length)
        const peak = Math.min(1.0, rms * 4) // Visual scale factor

        const vCtx = vuCanvasRef.current.getContext('2d')
        if (vCtx) {
          const w = vuCanvasRef.current.width
          const h = vuCanvasRef.current.height
          vCtx.clearRect(0, 0, w, h)

          // Draw segmented LEDs
          const numSegments = 40
          const segmentHeight = h / numSegments
          const gap = 2
          
          for (let i = 0; i < numSegments; i++) {
            // Segments go from top (0) to bottom (numSegments - 1)
            // So segment 0 is the highest LED.
            const isLit = (numSegments - 1 - i) / numSegments < peak
            
            let color = '#22c55e' // Green
            if (i < 6) color = '#ef4444' // Top 6 segments Red
            else if (i < 14) color = '#eab308' // Next 8 Yellow
            
            vCtx.fillStyle = isLit ? color : 'rgba(255,255,255,0.05)'
            vCtx.fillRect(4, i * segmentHeight + gap / 2, w - 8, segmentHeight - gap)
          }
        }
      }
      animationFrameRef.current = requestAnimationFrame(drawVU)
    }
    drawVU()

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      ws.destroy()
      if (audioCtxRef.current?.state !== 'closed') {
        audioCtxRef.current?.close()
      }
    }
  }, [file.filePath])

  // Handle Volume Dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingVolume || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      // Y is from 0 (top) to WAVE_HEIGHT (bottom)
      const relativeY = Math.max(0, Math.min(e.clientY - rect.top, WAVE_HEIGHT))
      
      // Mapping: 
      // 0 (top) = 200%
      // WAVE_HEIGHT/2 (center) = 100%
      // WAVE_HEIGHT (bottom) = 0%
      let newVol = 200 - (relativeY / WAVE_HEIGHT) * 200
      newVol = Math.max(0, Math.min(newVol, 200))
      
      setVolume(Math.round(newVol))
    }

    const handleMouseUp = () => {
      setIsDraggingVolume(false)
    }

    if (isDraggingVolume) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingVolume])

  // Apply Volume visually and aurally
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume / 100
    }
    if (waveSurferRef.current) {
      // Visual scaling: barHeight multiplies the waveform height. Clamp to avoid 0.
      waveSurferRef.current.setOptions({
        barHeight: Math.max(0.01, volume / 100)
      })
    }
  }, [volume])

  const togglePlay = () => {
    if (!waveSurferRef.current) return
    if (isPlaying) {
      waveSurferRef.current.pause()
    } else {
      waveSurferRef.current.play()
    }
  }

  const handleSave = () => {
    setIsSaving(true)
    onSave(trimStart, trimEnd, volume)
  }

  // Calculate volume line Y position:
  const lineY = WAVE_HEIGHT - (volume / 200) * WAVE_HEIGHT

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(24px)', zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      
      {/* Modal Container */}
      <div style={{ width: 900, background: 'linear-gradient(180deg, rgba(23,23,23,0.95) 0%, rgba(15,15,15,0.98) 100%)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 32px 80px rgba(0,0,0,0.9)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 32px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(168, 85, 247, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-purple)' }}>
              <Scissors size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#fff' }}>Tinh chỉnh SFX</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: 13, color: 'var(--text-muted)' }}>{file.name}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.color='#fff'; e.currentTarget.style.background='rgba(255,255,255,0.1)' }} onMouseLeave={e => { e.currentTarget.style.color='var(--text-muted)'; e.currentTarget.style.background='rgba(255,255,255,0.05)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Editor Body */}
        <div style={{ padding: 32, display: 'flex', gap: 24 }}>
          
          {/* Segmented VU Meter */}
          <div style={{ width: 32, height: WAVE_HEIGHT, borderRadius: 12, overflow: 'hidden', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, position: 'relative', boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.5)' }}>
            <canvas ref={vuCanvasRef} width={32} height={WAVE_HEIGHT} style={{ display: 'block' }} />
          </div>

          {/* Waveform Container */}
          <div style={{ flex: 1, position: 'relative', height: WAVE_HEIGHT, background: 'rgba(5,5,8,0.6)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.5)' }}>
            
            {isLoading && !errorMsg && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', zIndex: 10 }}>
                Đang tải sóng âm...
              </div>
            )}
            
            {errorMsg && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', zIndex: 10, padding: 20, textAlign: 'center' }}>
                Lỗi tải âm thanh: {errorMsg}<br/>
                Vui lòng kiểm tra lại file.
              </div>
            )}

            <div ref={containerRef} style={{ width: '100%', height: '100%', opacity: (isLoading || errorMsg) ? 0 : 1, transition: 'opacity 0.3s' }} />
            
            {/* Draggable Volume Line */}
            <div
              style={{
                position: 'absolute',
                top: lineY,
                left: 0,
                right: 0,
                height: 2,
                background: 'rgba(255, 255, 255, 0.9)',
                boxShadow: '0 0 12px rgba(255,255,255,0.8), 0 0 4px rgba(168,85,247,0.5)',
                cursor: 'ns-resize',
                transform: 'translateY(-50%)',
                zIndex: 20
              }}
              onMouseDown={(e) => {
                e.preventDefault()
                setIsDraggingVolume(true)
              }}
            >
              {/* Handle thumb */}
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 48, height: 20, background: 'linear-gradient(135deg, #fff 0%, #e5e5e5 100%)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#171717', pointerEvents: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                {volume}%
              </div>
            </div>
            
            {/* 100% Guideline */}
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, borderTop: '1px dashed rgba(255,255,255,0.15)', pointerEvents: 'none', zIndex: 10 }}>
              <span style={{ position: 'absolute', right: 12, top: -20, fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>100% Khuyên dùng</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ padding: '20px 32px', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <button
              onClick={togglePlay}
              className="btn btn-primary"
              style={{ borderRadius: '50%', width: 52, height: 52, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isPlaying ? 'rgba(168,85,247,0.2)' : 'var(--accent-gradient)', border: isPlaying ? '1px solid var(--accent-purple)' : 'none', transition: 'all 0.2s', boxShadow: isPlaying ? 'none' : '0 8px 24px rgba(168,85,247,0.4)' }}
            >
              {isPlaying ? <Square size={20} fill="var(--accent-purple)" color="var(--accent-purple)" /> : <Play size={22} fill="#fff" style={{ marginLeft: 4 }} />}
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Khoảng Chọn Trích Xuất</div>
              <div style={{ fontSize: 14, color: '#fff', fontFamily: 'monospace' }}>
                {trimStart.toFixed(2)}s <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>→</span> {trimEnd.toFixed(2)}s
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              className="btn"
              onClick={onClose}
              style={{ padding: '10px 24px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}
              disabled={isSaving}
              onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'}
            >
              Hủy
            </button>
            <button
              className="btn btn-primary animate-hover"
              onClick={handleSave}
              style={{ padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 600, display: 'flex', gap: 8, alignItems: 'center', background: 'var(--accent-gradient)', boxShadow: '0 8px 24px rgba(168,85,247,0.4)' }}
              disabled={isSaving}
            >
              <Save size={16} />
              {isSaving ? 'Đang lưu...' : 'Lưu đè file'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
