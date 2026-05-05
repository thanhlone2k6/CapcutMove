import fs from 'fs-extra'
import path from 'path'
import os from 'os'

export async function autoDetectFolder(): Promise<string | null> {
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
  const userProfile = process.env.USERPROFILE || os.homedir()

  const possiblePaths = [
    path.join(localAppData, 'CapCut', 'User Data', 'Projects', 'com.lveditor.draft'),
    path.join(localAppData, 'CapCutPro', 'User Data', 'Projects', 'com.lveditor.draft'),
    path.join(userProfile, 'Documents', 'CapCut', 'Projects') // Fallback if user moved it manually sometimes
  ]

  for (const p of possiblePaths) {
    try {
      if (await fs.pathExists(p)) {
        return p
      }
    } catch (e) {
      // ignore
    }
  }

  return null
}
