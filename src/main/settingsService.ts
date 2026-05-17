import fs from 'fs-extra'
import path from 'path'
import { app } from 'electron'

const settingsPath = path.join(app.getPath('userData'), 'app-settings.json')

export interface AppSettings {
  lastCapCutProjectsFolder: string
  lastOutputFolder: string
  lastAssetsOutputFolder: string
  lastSelectedProject: string
  lastSortMode: string
  lastVideoOutputDir: string
  videoDownloadMode: 'video' | 'audio'
}

const defaultSettings: AppSettings = {
  lastCapCutProjectsFolder: '',
  lastOutputFolder: '',
  lastAssetsOutputFolder: '',
  lastSelectedProject: '',
  lastSortMode: 'Newest First',
  lastVideoOutputDir: '',
  videoDownloadMode: 'video'
}

export async function getSettings(): Promise<AppSettings> {
  try {
    if (await fs.pathExists(settingsPath)) {
      const data = await fs.readJson(settingsPath)
      return { ...defaultSettings, ...data }
    }
  } catch (err) {
    console.error('Failed to read settings', err)
  }
  return defaultSettings
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<void> {
  try {
    const current = await getSettings()
    const updated = { ...current, ...settings }
    await fs.writeJson(settingsPath, updated, { spaces: 2 })
  } catch (err) {
    console.error('Failed to save settings', err)
  }
}
