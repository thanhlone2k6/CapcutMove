import { app, BrowserWindow } from 'electron'
import { spawn, ChildProcess, execSync } from 'child_process'
import path from 'path'
import fs from 'fs-extra'
import crypto from 'crypto'
import https from 'https'
import http from 'http'
import unzipper from 'unzipper'
import { saveSettings, getSettings } from './settingsService'
import { ensureFfmpeg } from './videoDownloadService'

export interface Segment {
  start: number // in seconds
  end: number // in seconds
  text: string
}

let activeDownloadCancel: (() => void) | null = null
let activeTranscribeProcess: ChildProcess | null = null

export function getWhisperDefaultPath(): string {
  if (process.platform === 'win32') {
    return path.join(
      app.getPath('appData'),
      'Subtitle Edit',
      'Whisper',
      'Purfview-Faster-Whisper-XXL'
    )
  } else {
    return path.join(app.getPath('userData'), 'whisper.cpp')
  }
}

export function getExecPathForFolder(folder: string): string {
  if (process.platform === 'win32') {
    return path.join(folder, 'faster-whisper-xxl.exe')
  } else {
    const cliPath = path.join(folder, 'whisper-cli')
    if (fs.existsSync(cliPath)) return cliPath
    return path.join(folder, 'main')
  }
}

export async function getSavedOrDetectedWhisperPath(): Promise<string | null> {
  const settings = await getSettings()
  if (settings.vip?.whisperPath && (await fs.pathExists(settings.vip.whisperPath))) {
    const execPath = getExecPathForFolder(settings.vip.whisperPath)
    if (await fs.pathExists(execPath)) {
      return settings.vip.whisperPath
    }
  }

  const defaultPath = getWhisperDefaultPath()
  if (await fs.pathExists(defaultPath)) {
    const execPath = getExecPathForFolder(defaultPath)
    if (await fs.pathExists(execPath)) {
      await saveSettings({
        vip: {
          ...settings.vip,
          whisperPath: defaultPath
        }
      })
      return defaultPath
    }
  }

  return null
}


async function getMediaDuration(mediaPath: string, ffmpegPath: string): Promise<number> {
  return new Promise((resolve) => {
    const proc = spawn(ffmpegPath, ['-i', mediaPath], { windowsHide: true })
    let stderr = ''
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    proc.on('close', () => {
      const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/)
      if (match) {
        const hh = parseInt(match[1], 10)
        const mm = parseInt(match[2], 10)
        const ss = parseFloat(match[3])
        resolve(hh * 3600 + mm * 60 + ss)
      } else {
        resolve(0)
      }
    })
  })
}

async function convertToWhisperWav(
  mediaPath: string,
  outputPath: string,
  ffmpegPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-i',
      mediaPath,
      '-ar',
      '16000',
      '-ac',
      '1',
      '-c:a',
      'pcm_s16le',
      outputPath
    ]
    const proc = spawn(ffmpegPath, args, { windowsHide: true })
    let stderr = ''
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    proc.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        if (stderr.includes('does not contain any stream')) {
          reject(new Error('Tệp video/âm thanh này không chứa luồng âm thanh nào để nhận diện.'))
        } else {
          reject(new Error(`Chuyển đổi âm thanh thất bại (code ${code}): ${stderr}`))
        }
      }
    })
  })
}

function downloadFileWithProgress(
  url: string,
  destPath: string,
  onProgress: (percent: number, downloadedBytes: number, totalBytes: number, speed: string) => void,
  cancelRef: { cancel: () => void }
): Promise<void> {
  return new Promise((resolve, reject) => {
    let fileStream: fs.WriteStream | null = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let request: any = null
    let isCancelled = false

    cancelRef.cancel = () => {
      isCancelled = true
      if (request) request.destroy()
      if (fileStream) {
        fileStream.close()
        fs.remove(destPath).catch(() => {})
      }
      reject(new Error('Download cancelled'))
    }

    const startDownload = (downloadUrl: string): void => {
      const protocol = downloadUrl.startsWith('https') ? https : http
      request = protocol.get(downloadUrl, { headers: { 'User-Agent': 'CapCutMove' } }, (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          startDownload(res.headers.location)
          return
        }
        if (res.statusCode !== 200) {
          reject(new Error(`Download failed with status ${res.statusCode}`))
          return
        }

        const totalBytes = parseInt(res.headers['content-length'] || '0', 10)
        let downloadedBytes = 0
        const startTime = Date.now()
        let lastReportTime = Date.now()

        fileStream = fs.createWriteStream(destPath)
        res.pipe(fileStream)

        res.on('data', (chunk) => {
          if (isCancelled) return
          downloadedBytes += chunk.length
          const now = Date.now()
          if (now - lastReportTime > 200 || downloadedBytes === totalBytes) {
            lastReportTime = now
            const elapsed = (now - startTime) / 1000
            const speed = elapsed > 0 ? downloadedBytes / elapsed : 0
            const percent = totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0

            let speedStr = '0 B/s'
            if (speed > 1024 * 1024 * 1024) {
              speedStr = `${(speed / (1024 * 1024 * 1024)).toFixed(2)} GB/s`
            } else if (speed > 1024 * 1024) {
              speedStr = `${(speed / (1024 * 1024)).toFixed(2)} MB/s`
            } else if (speed > 1024) {
              speedStr = `${(speed / 1024).toFixed(2)} KB/s`
            } else {
              speedStr = `${speed.toFixed(0)} B/s`
            }

            onProgress(percent, downloadedBytes, totalBytes, speedStr)
          }
        })

        fileStream.on('finish', () => {
          if (isCancelled) return
          fileStream?.close()
          resolve()
        })

        fileStream.on('error', (err) => {
          fs.remove(destPath).catch(() => {})
          reject(err)
        })
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      request.on('error', (err: any) => {
        fs.remove(destPath).catch(() => {})
        reject(err)
      })
    }

    startDownload(url)
  })
}

export async function downloadWhisper(mainWindow: BrowserWindow, url?: string): Promise<string> {
  const targetDir = getWhisperDefaultPath()
  await fs.ensureDir(targetDir)

  const defaultUrl =
    process.platform === 'win32'
      ? 'https://github.com/Purfview/whisper-standalone-win/releases/download/Faster-Whisper-XXL/Faster-Whisper-XXL.zip'
      : 'https://github.com/ggerganov/whisper.cpp/releases/download/v1.5.4/whisper-cpp-macos.zip'

  const downloadUrl = url || defaultUrl
  const zipPath = path.join(targetDir, 'whisper_temp.zip')

  const sendProgress = (stage: string, percent: number, speed?: string, message?: string): void => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('whisper:download-progress', { stage, percent, speed, message })
    }
  }

  try {
    sendProgress('downloading', 0, '0 B/s', 'Bắt đầu tải xuống...')

    const cancelRef = { cancel: () => {} }
    activeDownloadCancel = cancelRef.cancel

    await downloadFileWithProgress(
      downloadUrl,
      zipPath,
      (percent, downloaded, total, speed) => {
        const mbDownloaded = (downloaded / (1024 * 1024)).toFixed(1)
        const mbTotal = total > 0 ? (total / (1024 * 1024)).toFixed(1) + ' MB' : 'Đang tính...'
        sendProgress('downloading', percent, speed, `Đang tải: ${mbDownloaded} MB / ${mbTotal}`)
      },
      cancelRef
    )

    sendProgress('extracting', 0, undefined, 'Đang giải nén tài nguyên...')

    const directory = await unzipper.Open.file(zipPath)
    const files = directory.files.filter((f) => f.type === 'File')
    const totalFiles = files.length
    let extractedFiles = 0

    for (const entry of directory.files) {
      if (entry.type === 'File') {
        const outputPath = path.join(targetDir, entry.path)
        await fs.ensureDir(path.dirname(outputPath))
        await new Promise<void>((resolve, reject) => {
          entry
            .stream()
            .pipe(fs.createWriteStream(outputPath))
            .on('finish', resolve)
            .on('error', reject)
        })
      }
      extractedFiles++
      const percent = Math.min(99, Math.round((extractedFiles / totalFiles) * 100))
      sendProgress(
        'extracting',
        percent,
        undefined,
        `Đang giải nén: ${extractedFiles}/${totalFiles} tệp...`
      )
    }

    await fs.remove(zipPath)

    const execPath = getExecPathForFolder(targetDir)
    if (!(await fs.pathExists(execPath))) {
      throw new Error('Giải nén hoàn tất nhưng không tìm thấy tệp thực thi Whisper.')
    }

    if (process.platform !== 'win32') {
      await fs.chmod(execPath, 0o755)
      if (process.platform === 'darwin') {
        try {
          execSync(`xattr -d com.apple.quarantine "${execPath}"`)
        } catch (err) {
          console.warn('Failed to remove quarantine flag:', err)
        }
      }
    }

    const settings = await getSettings()
    await saveSettings({
      vip: {
        ...settings.vip,
        whisperPath: targetDir
      }
    })

    sendProgress('done', 100, undefined, 'Thiết lập hoàn tất!')
    return targetDir
  } catch (error: unknown) {
    sendProgress('error', 0, undefined, `Lỗi: ${(error as Error).message || String(error)}`)
    throw error
  } finally {
    activeDownloadCancel = null
    fs.remove(zipPath).catch(() => {})
  }
}

export function cancelDownloadWhisper(): void {
  if (activeDownloadCancel) {
    activeDownloadCancel()
    activeDownloadCancel = null
  }
}

export function cancelTranscribe(): void {
  if (activeTranscribeProcess) {
    activeTranscribeProcess.kill('SIGTERM')
    activeTranscribeProcess = null
  }
}

function parseTimestampToSeconds(ts: string): number {
  const parts = ts.replace(',', '.').split(':')
  if (parts.length === 3) {
    const hh = parseInt(parts[0], 10)
    const mm = parseInt(parts[1], 10)
    const ss = parseFloat(parts[2])
    return hh * 3600 + mm * 60 + ss
  } else if (parts.length === 2) {
    const mm = parseInt(parts[0], 10)
    const ss = parseFloat(parts[1])
    return mm * 60 + ss
  } else {
    return parseFloat(ts) || 0
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseWhisperJson(json: any): Segment[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rawSegments: any[] = []

  if (Array.isArray(json)) {
    rawSegments = json
  } else if (json && Array.isArray(json.segments)) {
    rawSegments = json.segments
  } else if (json && json.result && Array.isArray(json.result.segments)) {
    rawSegments = json.result.segments
  } else {
    return []
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return rawSegments.map((item: any) => {
    let start = 0
    let end = 0
    const text = item.text || ''

    if (typeof item.start === 'number') {
      start = item.start
    } else if (item.offsets && typeof item.offsets.from === 'number') {
      start = item.offsets.from / 1000
    } else if (typeof item.from === 'number') {
      start = item.from / 1000
    }

    if (typeof item.end === 'number') {
      end = item.end
    } else if (item.offsets && typeof item.offsets.to === 'number') {
      end = item.offsets.to / 1000
    } else if (typeof item.to === 'number') {
      end = item.to / 1000
    }

    return {
      start,
      end,
      text: text.trim()
    }
  })
}

export async function startTranscribe(
  mainWindow: BrowserWindow,
  mediaPath: string,
  options: { model?: string; language?: string } = {}
): Promise<{ segments: Segment[] }> {
  const whisperPath = await getSavedOrDetectedWhisperPath()
  if (!whisperPath) {
    throw new Error('Whisper chưa được thiết lập. Vui lòng cài đặt trước.')
  }

  const model = options.model || 'large-v2'
  const language = options.language || 'vi'

  const sendProgress = (percent: number, speed?: string, status: string = 'transcribing'): void => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('whisper:transcribe-progress', { percent, speed, status })
    }
  }

  sendProgress(0, undefined, 'initializing')

  const execPath = getExecPathForFolder(whisperPath)
  const ffmpegPath = await ensureFfmpeg()

  let workingFile = mediaPath
  let tempWavPath = ''
  let tempInputPath = '' // For Windows: ASCII-safe copy of input file

  // Luôn dùng ffmpeg convert sang WAV 16kHz cho tất cả các nền tảng:
  // 1. Tránh lỗi PyAV (IndexError: tuple index out of range) với các file MP4 lạ
  // 2. Fix triệt để lỗi path Unicode tiếng Việt trên Windows (do temp file dùng UUID ASCII)
  // 3. Giúp Whisper chạy nhanh hơn vì không phải tự xử lý giải mã video
  const tempDir = app.getPath('temp')
  tempWavPath = path.join(tempDir, `whisper_temp_${crypto.randomUUID()}.wav`)
  sendProgress(1, undefined, 'converting_audio')
  try {
    await convertToWhisperWav(mediaPath, tempWavPath, ffmpegPath)
    workingFile = tempWavPath
  } catch (err: unknown) {
    throw new Error(`Lỗi trích xuất âm thanh: ${(err as Error).message}`)
  }

  let totalDuration = 0
  try {
    totalDuration = await getMediaDuration(mediaPath, ffmpegPath)
  } catch (err) {
    console.error('Failed to probe duration:', err)
  }

  const outputDir = app.getPath('temp')
  const macJsonOutput = `${workingFile}.json`

  const args: string[] = []

  if (process.platform === 'win32') {
    // Faster-Whisper-XXL uses underscore args (--output_format, --output_dir)
    args.push(
      '--model',
      model,
      '--output_format',
      'json',
      '--output_dir',
      outputDir
    )
    if (language !== 'auto') {
      args.push('--language', language)
    }
    // workingFile must be at the end to prevent argparse issues
    args.push(workingFile)
    console.log('[whisper] exec:', execPath)
    console.log('[whisper] workingFile:', workingFile)
    console.log('[whisper] outputDir:', outputDir)
  } else {
    let modelPath = path.join(whisperPath, `ggml-${model}.bin`)
    if (!fs.existsSync(modelPath)) {
      modelPath = path.join(whisperPath, 'models', `ggml-${model}.bin`)
    }
    if (!fs.existsSync(modelPath)) {
      const files = fs.readdirSync(whisperPath)
      const binFile = files.find((f) => f.endsWith('.bin'))
      if (binFile) {
        modelPath = path.join(whisperPath, binFile)
      } else {
        const modelsDir = path.join(whisperPath, 'models')
        if (fs.existsSync(modelsDir)) {
          const mFiles = fs.readdirSync(modelsDir)
          const mBinFile = mFiles.find((f) => f.endsWith('.bin'))
          if (mBinFile) {
            modelPath = path.join(modelsDir, mBinFile)
          }
        }
      }
    }

    args.push(
      '-m',
      modelPath,
      '-f',
      workingFile,
      '-ojf',
      '-pp'
    )
    if (language !== 'auto') {
      args.push('-l', language)
    }
  }

  return new Promise((resolve, reject) => {
    const child = spawn(execPath, args, {
      cwd: whisperPath,
      windowsHide: true,
      env: {
        ...process.env
      }
    })
    activeTranscribeProcess = child

    const collectedLogs: string[] = []

    const handleLine = (data: Buffer): void => {
      const lines = data.toString().split(/\r?\n/)
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        collectedLogs.push(trimmed)

        // Send log line to renderer
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('whisper:transcribe-log', trimmed)
        }

        // Match progress percentage: progress = XX%
        const percentMatch = trimmed.match(/progress\s*=\s*(\d+)%/)
        if (percentMatch) {
          const pct = parseInt(percentMatch[1], 10)
          sendProgress(pct)
          continue
        }

        // Match timestamps: [00:00.000 --> 00:03.000] Hello  (supports both -> and -->)
        const tsMatch = trimmed.match(/\[([\d:.]+)\s*-+>\s*([\d:.]+)\](.*)/)
        if (tsMatch) {
          const start = parseTimestampToSeconds(tsMatch[1])
          const end = parseTimestampToSeconds(tsMatch[2])
          const text = tsMatch[3].trim()

          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('whisper:transcribe-segment', { start, end, text })
          }

          if (totalDuration > 0) {
            const pct = Math.min(99, Math.round((end / totalDuration) * 100))
            sendProgress(pct)
          }
        }
      }
    }

    child.stdout?.on('data', handleLine)
    child.stderr?.on('data', handleLine)

    child.on('close', async (code) => {
      activeTranscribeProcess = null

      if (tempWavPath) {
        fs.remove(tempWavPath).catch(() => {})
      }
      if (tempInputPath) {
        fs.remove(tempInputPath).catch(() => {})
      }

      if (code !== 0 && code !== null) {
        // Collect last relevant log lines for the error message
        const lastLogs = collectedLogs
          .filter((l) => /error|fail|cuda|gpu|abort|exception|critical/i.test(l))
          .slice(-3)
          .join(' | ')
        const detail = lastLogs ? ` (${lastLogs})` : ''
        reject(new Error(`Tiến trình Whisper kết thúc với mã lỗi ${code}${detail}`))
        return
      }

      let jsonPath = ''
      if (process.platform === 'win32') {
        const baseName = path.basename(workingFile, path.extname(workingFile))
        jsonPath = path.join(outputDir, `${baseName}.json`)
      } else {
        jsonPath = macJsonOutput
      }

      try {
        if (await fs.pathExists(jsonPath)) {
          const jsonContent = await fs.readJson(jsonPath)
          const segments = parseWhisperJson(jsonContent)

          await fs.remove(jsonPath).catch(() => {})

          sendProgress(100, undefined, 'done')
          resolve({ segments })
        } else {
          reject(new Error('Không tìm thấy tệp kết quả JSON từ Whisper.'))
        }
      } catch (err: unknown) {
        reject(new Error(`Lỗi đọc kết quả Whisper: ${(err as Error).message}`))
      }
    })

    child.on('error', (err) => {
      activeTranscribeProcess = null
      if (tempWavPath) fs.remove(tempWavPath).catch(() => {})
      if (tempInputPath) fs.remove(tempInputPath).catch(() => {})
      reject(err)
    })
  })
}
