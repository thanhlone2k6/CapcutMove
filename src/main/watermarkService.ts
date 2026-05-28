import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import fs from 'fs-extra'
import { BrowserWindow } from 'electron'
import { ensureFfmpeg } from './videoDownloadService'

export interface WatermarkJob {
  videoPaths: string[]
  logoPath: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  opacity: number
  outputDir: string
}

let activeProcess: ChildProcess | null = null
let isCancelled = false

/**
 * Gets video dimensions (width and height) by running ffmpeg -i and parsing stderr.
 */
export async function getVideoInfo(videoPath: string): Promise<{ width: number; height: number; duration: number }> {
  const ffmpegPath = await ensureFfmpeg()
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, ['-i', videoPath], { windowsHide: true })
    let stderr = ''
    child.stderr.on('data', (data) => {
      stderr += data.toString()
    })
    child.on('close', () => {
      // Look for patterns like "1920x1080" in the video stream description line.
      // Typically: "Stream #0:0: Video: h264 (High), yuv420p, 1920x1080 [SAR 1:1 DAR 16:9]..."
      const match = stderr.match(/Video:.*?\b(\d{2,5})x(\d{2,5})\b/)
      const durationMatch = stderr.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2})\.(\d{2})/)
      
      let duration = 0
      if (durationMatch) {
        const h = parseInt(durationMatch[1], 10)
        const m = parseInt(durationMatch[2], 10)
        const s = parseInt(durationMatch[3], 10)
        const ms = parseInt(durationMatch[4], 10)
        duration = h * 3600 + m * 60 + s + ms / 100
      }

      if (match) {
        resolve({
          width: parseInt(match[1], 10),
          height: parseInt(match[2], 10),
          duration: duration
        })
      } else {
        // Fallback or reject
        reject(new Error('Không thể phân tích độ phân giải của video. Hãy chắc chắn tệp video hợp lệ.'))
      }
    })
    child.on('error', (err) => {
      reject(err)
    })
  })
}

/**
 * Cancels the current watermark processing job.
 */
export function cancelJob(): void {
  isCancelled = true
  if (activeProcess) {
    activeProcess.kill('SIGKILL')
    activeProcess = null
  }
}

/**
 * Starts watermark batch processing sequentially.
 */
export async function startJob(mainWindow: BrowserWindow, job: WatermarkJob): Promise<void> {
  isCancelled = false
  const ffmpegPath = await ensureFfmpeg()
  await fs.ensureDir(job.outputDir)

  const sendProgress = (current: number, total: number, fileName: string, percent?: number, filePercent?: number) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('watermark:progress', { current, total, fileName, percent, filePercent })
    }
  }

  const sendDone = () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('watermark:done')
    }
  }

  const sendError = (msg: string) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('watermark:error', msg)
    }
  }

  const total = job.videoPaths.length

  for (let i = 0; i < total; i++) {
    if (isCancelled) {
      sendError('Đã hủy quá trình đóng dấu.')
      return
    }

    const inputPath = job.videoPaths[i]
    const baseName = path.basename(inputPath)
    const ext = path.extname(inputPath)
    const nameWithoutExt = path.basename(inputPath, ext)

    // Output pattern: name_watermarked.mp4 (always mp4 to match target format or retain original extension)
    // To be safe and compatible with mp4 overlay, we output mp4
    const cleanName = `${nameWithoutExt}_watermarked.mp4`
    let outputPath = path.join(job.outputDir, cleanName)

    // Auto increment suffix if exists
    let counter = 1
    while (await fs.pathExists(outputPath)) {
      outputPath = path.join(job.outputDir, `${nameWithoutExt}_watermarked (${counter}).mp4`)
      counter++
    }

    const info = await getVideoInfo(inputPath).catch(() => ({ width: 0, height: 0, duration: 0 }))
    const duration = info.duration

    sendProgress(i + 1, total, baseName, Math.round((i / total) * 100), 0)

    try {
      await new Promise<void>((resolve, reject) => {
        if (isCancelled) {
          reject(new Error('Cancelled'))
          return
        }

        // ffmpeg overlay filter string with scaling and opacity adjustments
        // [1:v]scale=WIDTH:HEIGHT,format=rgba,colorchannelmixer=aa=OPACITY[logo];[0:v][logo]overlay=X:Y
        const filterStr = `[1:v]scale=${Math.round(job.size.width)}:${Math.round(job.size.height)},format=rgba,colorchannelmixer=aa=${job.opacity}[logo];[0:v][logo]overlay=${Math.round(job.position.x)}:${Math.round(job.position.y)}[outv]`

        const args = [
          '-y',
          '-i', inputPath,
          '-i', job.logoPath,
          '-filter_complex', filterStr,
          '-map', '[outv]',
          '-map', '0:a?',
          '-codec:v', 'libx264',
          '-pix_fmt', 'yuv420p',
          '-codec:a', 'aac',
          outputPath
        ]

        activeProcess = spawn(ffmpegPath, args, { windowsHide: true })

        if (activeProcess.stderr) {
          let stderrBuffer = ''
          activeProcess.stderr.on('data', (data) => {
            const chunk = data.toString()
            stderrBuffer += chunk
            const lines = stderrBuffer.split(/[\r\n]+/)
            stderrBuffer = lines.pop() || ''

            for (const line of lines) {
              const timeMatch = line.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/)
              if (timeMatch && duration > 0) {
                const h = parseInt(timeMatch[1], 10)
                const m = parseInt(timeMatch[2], 10)
                const s = parseInt(timeMatch[3], 10)
                const ms = parseInt(timeMatch[4], 10)
                const currentTime = h * 3600 + m * 60 + s + ms / 100
                const filePercent = Math.min(99, Math.round((currentTime / duration) * 100))
                const overallPercent = Math.min(99, Math.round(((i + filePercent / 100) / total) * 100))
                sendProgress(i + 1, total, baseName, overallPercent, filePercent)
              }
            }
          })
        }

        activeProcess.on('close', (code) => {
          activeProcess = null
          if (code === 0) {
            resolve()
          } else {
            if (isCancelled) {
              reject(new Error('Cancelled'))
            } else {
              reject(new Error(`ffmpeg kết thúc với mã lỗi ${code}`))
            }
          }
        })

        activeProcess.on('error', (err) => {
          activeProcess = null
          reject(err)
        })
      })
    } catch (err: any) {
      if (isCancelled) {
        sendError('Đã hủy quá trình đóng dấu.')
        return
      }
      sendError(`Lỗi khi xử lý file "${baseName}": ${err.message}`)
      return
    }
  }

  sendDone()
}
