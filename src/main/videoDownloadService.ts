import { app, BrowserWindow } from 'electron'
import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import fs from 'fs-extra'
import crypto from 'crypto'
import https from 'https'
import http from 'http'

export interface DownloadTask {
  id: string
  url: string
  status: 'queued' | 'downloading' | 'done' | 'error' | 'cancelled'
  title?: string
  progress: number
  downloadedBytes: number
  totalBytes: number
  speed?: string
  filePath?: string
  error?: string
  mode: 'video' | 'audio'
}

const tasks: Map<string, DownloadTask> = new Map()
const processes: Map<string, ChildProcess> = new Map()

function getBinariesDir(): string {
  return path.join(app.getPath('userData'), 'binaries')
}

function getYtDlpPath(): string {
  const binDir = getBinariesDir()
  if (process.platform === 'win32') return path.join(binDir, 'yt-dlp.exe')
  if (process.platform === 'darwin') return path.join(binDir, 'yt-dlp_macos')
  return path.join(binDir, 'yt-dlp')
}

function getYtDlpDownloadUrl(): string {
  const base = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download'
  if (process.platform === 'win32') return `${base}/yt-dlp.exe`
  if (process.platform === 'darwin') return `${base}/yt-dlp_macos`
  return `${base}/yt-dlp`
}

function getFfmpegPath(): string {
  const binDir = getBinariesDir()
  if (process.platform === 'win32') return path.join(binDir, 'ffmpeg.exe')
  return path.join(binDir, 'ffmpeg')
}

function getFfmpegDownloadUrl(): string {
  const base = 'https://github.com/ffbinaries/ffbinaries-prebuilt/releases/download/v4.4.1'
  if (process.platform === 'win32') return `${base}/ffmpeg-4.4.1-win-64.zip`
  if (process.platform === 'darwin') return `${base}/ffmpeg-4.4.1-osx-64.zip`
  return `${base}/ffmpeg-4.4.1-linux-64.zip`
}

function followRedirects(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http
    protocol.get(url, { headers: { 'User-Agent': 'CapCutMove' } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        followRedirects(res.headers.location, destPath).then(resolve).catch(reject)
        return
      }
      if (res.statusCode !== 200) {
        reject(new Error(`Download failed with status ${res.statusCode}`))
        return
      }
      const fileStream = fs.createWriteStream(destPath)
      res.pipe(fileStream)
      fileStream.on('finish', () => {
        fileStream.close()
        resolve()
      })
      fileStream.on('error', reject)
    }).on('error', reject)
  })
}

export async function ensureFfmpeg(): Promise<string> {
  const ffmpegPath = getFfmpegPath()
  if (await fs.pathExists(ffmpegPath)) {
    return ffmpegPath
  }

  const binDir = getBinariesDir()
  await fs.ensureDir(binDir)

  const downloadUrl = getFfmpegDownloadUrl()
  const zipPath = path.join(binDir, 'ffmpeg.zip')

  console.log(`Downloading ffmpeg from: ${downloadUrl}`)
  await followRedirects(downloadUrl, zipPath)

  console.log(`Extracting ffmpeg...`)
  const { execSync } = require('child_process')
  if (process.platform === 'win32') {
    // PowerShell Expand-Archive is 100% standard on Windows
    execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${binDir}' -Force"`, { windowsHide: true })
  } else {
    execSync(`unzip -o "${zipPath}" -d "${binDir}"`, { windowsHide: true })
    await fs.chmod(ffmpegPath, 0o755)
  }

  // Clean up downloaded zip file
  await fs.remove(zipPath)

  console.log(`ffmpeg successfully extracted to: ${ffmpegPath}`)
  return ffmpegPath
}

export async function ensureYtDlp(): Promise<string> {
  const ytDlpPath = getYtDlpPath()

  // Pre-fetch ffmpeg silently in the background so that high quality downloads are immediately ready
  try {
    await ensureFfmpeg()
  } catch (err) {
    console.error('Failed to pre-fetch ffmpeg in ensureYtDlp:', err)
  }

  if (await fs.pathExists(ytDlpPath)) {
    return ytDlpPath
  }

  const binDir = getBinariesDir()
  await fs.ensureDir(binDir)

  const downloadUrl = getYtDlpDownloadUrl()
  console.log(`Downloading yt-dlp from: ${downloadUrl}`)

  await followRedirects(downloadUrl, ytDlpPath)

  // Make executable on Unix
  if (process.platform !== 'win32') {
    await fs.chmod(ytDlpPath, 0o755)
  }

  console.log(`yt-dlp downloaded to: ${ytDlpPath}`)
  return ytDlpPath
}

export async function checkYtDlpReady(): Promise<boolean> {
  const ytDlpPath = getYtDlpPath()
  return await fs.pathExists(ytDlpPath)
}

function parseProgress(line: string): { percent: number; totalSize: string; speed: string } | null {
  // [download]  45.3% of  54.23MiB at  1.20MiB/s ETA 00:25
  // [download]  45.3% of ~  54.23MiB at  1.20MiB/s ETA 00:25
  const match = line.match(
    /\[download\]\s+([\d.]+)%\s+of\s+~?\s*([\d.]+\s*\w+)\s+at\s+([\d.]+\s*\w+\/s)/
  )
  if (match) {
    return {
      percent: parseFloat(match[1]),
      totalSize: match[2].trim(),
      speed: match[3].trim()
    }
  }
  return null
}

function parseSizeToBytes(sizeStr: string): number {
  const match = sizeStr.match(/([\d.]+)\s*(B|KiB|MiB|GiB|KB|MB|GB)/i)
  if (!match) return 0
  const val = parseFloat(match[1])
  const unit = match[2].toLowerCase()
  const multipliers: Record<string, number> = {
    'b': 1,
    'kib': 1024,
    'mib': 1024 * 1024,
    'gib': 1024 * 1024 * 1024,
    'kb': 1000,
    'mb': 1000000,
    'gb': 1000000000
  }
  return val * (multipliers[unit] || 1)
}

function parseTitle(line: string): string | null {
  // [download] Destination: /path/to/Title.mp4
  const destMatch = line.match(/\[download\]\s+Destination:\s+(.+)/)
  if (destMatch) {
    const filePath = destMatch[1].trim()
    const baseName = path.basename(filePath)
    // Remove extension
    return baseName.replace(/\.[^.]+$/, '')
  }
  return null
}

function isFfmpegAvailable(): boolean {
  // 1. Check local binaries folder first
  const localFfmpeg = getFfmpegPath()
  if (fs.existsSync(localFfmpeg)) {
    return true
  }
  // 2. Check system PATH
  try {
    const { execSync } = require('child_process')
    execSync('ffmpeg -version', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

export async function startDownload(
  mainWindow: BrowserWindow,
  url: string,
  outputDir: string,
  mode: 'video' | 'audio'
): Promise<string> {
  const ytDlpPath = await ensureYtDlp()

  const id = crypto.randomUUID()
  const task: DownloadTask = {
    id,
    url,
    status: 'downloading',
    progress: 0,
    downloadedBytes: 0,
    totalBytes: 0,
    mode
  }
  tasks.set(id, task)

  // Check if ffmpeg is available
  const ffmpegAvailable = isFfmpegAvailable()
  console.log(`[videoDownloadService] ffmpeg available: ${ffmpegAvailable}`)

  const outputTemplate = path.join(outputDir, '%(title)s_%(epoch)s.%(ext)s')
  const args: string[] = [url]

  // Add format selectors
  if (mode === 'audio') {
    if (ffmpegAvailable) {
      args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0')
    } else {
      // Fallback: download best direct audio format (usually m4a) when ffmpeg is missing
      args.push('-f', 'ba[ext=m4a]/ba')
    }
  } else {
    if (ffmpegAvailable) {
      args.push('-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best', '--merge-output-format', 'mp4')
    } else {
      // Fallback: download best pre-merged stream (usually 720p MP4) when ffmpeg is missing
      args.push('-f', 'best[ext=mp4]/best')
    }
  }

  // Add output and basic flags
  args.push(
    '-o', outputTemplate,
    '--no-playlist',
    '--progress',
    '--newline',
    '--no-colors',
    '--encoding', 'utf-8',
    '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  )

  // Pass ffmpeg location to yt-dlp if portable ffmpeg is present locally
  const localFfmpeg = getFfmpegPath()
  if (fs.existsSync(localFfmpeg)) {
    args.push('--ffmpeg-location', getBinariesDir())
  }

  // Dynamic referrer headers to bypass geo/bot-blocking on major social platforms
  if (url.includes('tiktok.com')) {
    args.push('--referer', 'https://www.tiktok.com/')
  } else if (url.includes('instagram.com')) {
    args.push('--referer', 'https://www.instagram.com/')
  } else if (url.includes('facebook.com')) {
    args.push('--referer', 'https://www.facebook.com/')
  }

  const child = spawn(ytDlpPath, args, {
    windowsHide: true,
    env: {
      ...process.env,
      PYTHONIOENCODING: 'utf-8',
      LANG: 'en_US.UTF-8'
    }
  })
  processes.set(id, child)

  const sendUpdate = (): void => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('download:progress', { ...task })
    }
  }

  let lastFilePath = ''

  child.stdout?.on('data', (data: Buffer) => {
    const lines = data.toString().split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      // Parse title from destination
      const title = parseTitle(trimmed)
      if (title && !task.title) {
        task.title = title.replace(/_\d+$/, '')
      }

      // Track destination file path
      const destMatch = trimmed.match(/\[download\]\s+Destination:\s+(.+)/)
      if (destMatch) {
        lastFilePath = destMatch[1].trim()
      }

      // Parse "already downloaded" message
      if (trimmed.includes('has already been downloaded')) {
        const alreadyMatch = trimmed.match(/\[download\]\s+(.+)\s+has already been downloaded/)
        if (alreadyMatch) {
          lastFilePath = alreadyMatch[1].trim()
        }
      }

      // Parse merge output
      const mergeMatch = trimmed.match(/Merging formats into "(.+)"/)
      if (mergeMatch) {
        lastFilePath = mergeMatch[1].trim()
      }

      // Parse progress
      const progress = parseProgress(trimmed)
      if (progress) {
        task.progress = progress.percent
        task.totalBytes = parseSizeToBytes(progress.totalSize)
        task.downloadedBytes = Math.round(task.totalBytes * (progress.percent / 100))
        task.speed = progress.speed
        sendUpdate()
      }
    }
  })

  let stderrBuffer = ''

  child.stderr?.on('data', (data: Buffer) => {
    const text = data.toString().trim()
    if (text) {
      console.error(`[yt-dlp stderr] ${text}`)
      stderrBuffer += text + '\n'
    }
  })

  child.on('close', (code) => {
    processes.delete(id)

    if (task.status === 'cancelled') {
      mainWindow.webContents.send('download:error', { ...task })
      return
    }

    if (code === 0) {
      task.status = 'done'
      task.progress = 100
      let finalFilePath = lastFilePath || undefined

      // Try to find the actual output file if we don't have the path
      if (!finalFilePath) {
        try {
          const files = fs.readdirSync(outputDir)
            .filter(f => {
              const ext = path.extname(f).toLowerCase()
              return mode === 'audio'
                ? ['.mp3', '.m4a', '.webm', '.aac', '.ogg', '.wav'].includes(ext)
                : ['.mp4', '.mkv', '.webm', '.flv', '.avi'].includes(ext)
            })
            .map(f => ({
              name: f,
              time: fs.statSync(path.join(outputDir, f)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time)

          if (files.length > 0) {
            finalFilePath = path.join(outputDir, files[0].name)
          }
        } catch {
          // ignore
        }
      }

      // Rename to remove the epoch suffix and handle duplicates with auto-increment counter
      if (finalFilePath && fs.existsSync(finalFilePath)) {
        try {
          const ext = path.extname(finalFilePath)
          const baseNameWithEpoch = path.basename(finalFilePath, ext)
          const cleanBaseName = baseNameWithEpoch.replace(/_\d+$/, '')

          let targetPath = path.join(outputDir, `${cleanBaseName}${ext}`)
          let counter = 1
          while (fs.existsSync(targetPath)) {
            targetPath = path.join(outputDir, `${cleanBaseName} (${counter})${ext}`)
            counter++
          }

          fs.renameSync(finalFilePath, targetPath)
          finalFilePath = targetPath

          // Set task title to clean name (or with (1), (2) suffix)
          task.title = path.basename(targetPath, ext)
        } catch (err) {
          console.error('[videoDownloadService] Duplicate renaming failed:', err)
        }
      }

      task.filePath = finalFilePath
      mainWindow.webContents.send('download:done', { ...task })
    } else {
      task.status = 'error'
      
      // Parse clean user-friendly Vietnamese error
      let cleanError = 'Lỗi tải xuống thất bại'
      const lowerStderr = stderrBuffer.toLowerCase()
      if (lowerStderr.includes('unsupported url') || lowerStderr.includes('generic') || lowerStderr.includes('is not a valid url')) {
        cleanError = 'Đường dẫn không hỗ trợ hoặc không tìm thấy video'
      } else if (lowerStderr.includes('unavailable') || lowerStderr.includes('not found') || lowerStderr.includes('404')) {
        cleanError = 'Video không tồn tại, đã bị xóa hoặc để riêng tư'
      } else if (lowerStderr.includes('sign in') || lowerStderr.includes('login') || lowerStderr.includes('confirm your age')) {
        cleanError = 'Video yêu cầu đăng nhập hoặc giới hạn độ tuổi'
      } else if (stderrBuffer.trim()) {
        const errorLines = stderrBuffer.split('\n')
          .map(l => l.trim())
          .filter(l => l.startsWith('ERROR:'))
        if (errorLines.length > 0) {
          cleanError = errorLines[errorLines.length - 1].replace('ERROR:', '').trim()
        } else {
          cleanError = stderrBuffer.trim().substring(0, 120)
        }
      }

      task.error = cleanError
      mainWindow.webContents.send('download:error', { ...task })
    }
  })

  child.on('error', (err) => {
    processes.delete(id)
    task.status = 'error'
    task.error = `Lỗi hệ thống: ${err.message}`
    mainWindow.webContents.send('download:error', { ...task })
  })

  // Send initial state
  sendUpdate()

  return id
}

export function cancelDownload(id: string): void {
  const task = tasks.get(id)
  if (task) {
    task.status = 'cancelled'
  }

  const child = processes.get(id)
  if (child) {
    child.kill('SIGTERM')
    processes.delete(id)
  }
}

export function getTask(id: string): DownloadTask | undefined {
  return tasks.get(id)
}

export function getAllTasks(): DownloadTask[] {
  return Array.from(tasks.values())
}
