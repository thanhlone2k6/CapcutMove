import { exec } from 'child_process'
import util from 'util'
import path from 'path'
import fs from 'fs-extra'

const execAsync = util.promisify(exec)

export async function isCapCutRunning(): Promise<boolean> {
  try {
    if (process.platform === 'win32') {
      const { stdout } = await execAsync('tasklist')
      return stdout.toLowerCase().includes('capcut.exe') || stdout.toLowerCase().includes('capcutpro.exe')
    } else if (process.platform === 'darwin') {
      const { stdout } = await execAsync('pgrep -x CapCut')
      return stdout.trim().length > 0
    }
    return false
  } catch (error) {
    // pgrep exits with 1 if no process found, which execAsync considers an error
    return false
  }
}

export async function killCapCut(): Promise<void> {
  try {
    if (process.platform === 'win32') {
      await execAsync('taskkill /F /IM CapCut.exe /T')
      await execAsync('taskkill /F /IM CapCutPro.exe /T').catch(() => {})
    } else if (process.platform === 'darwin') {
      await execAsync('pkill -x CapCut')
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
    } else if (process.platform === 'darwin') {
      exec('open -a CapCut')
    }
  } catch (e) {
    console.error('Failed to open CapCut:', e)
  }
}
