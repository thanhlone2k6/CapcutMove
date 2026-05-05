import { exec } from 'child_process'
import util from 'util'
import path from 'path'
import fs from 'fs-extra'

const execAsync = util.promisify(exec)

export async function isCapCutRunning(): Promise<boolean> {
  try {
    const { stdout } = await execAsync('tasklist')
    return stdout.toLowerCase().includes('capcut.exe') || stdout.toLowerCase().includes('capcutpro.exe')
  } catch (error) {
    console.error('Error checking CapCut process:', error)
    return false
  }
}

export async function killCapCut(): Promise<void> {
  try {
    if (process.platform === 'win32') {
      await execAsync('taskkill /F /IM CapCut.exe /T')
      await execAsync('taskkill /F /IM CapCutPro.exe /T').catch(() => {})
    }
  } catch (e) {
    // Ignore if not running or failed
  }
}

export async function openCapCut(): Promise<void> {
  try {
    if (process.platform === 'win32') {
      const capcutExe = path.join(process.env.LOCALAPPDATA || '', 'CapCut', 'Apps', 'CapCut.exe')
      if (await fs.pathExists(capcutExe)) {
        exec(`"${capcutExe}"`) // Launch and detach
      }
    }
  } catch (e) {
    console.error('Failed to open CapCut:', e)
  }
}
