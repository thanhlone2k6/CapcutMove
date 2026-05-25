import fs from 'fs-extra'
import path from 'path'
import { app } from 'electron'

const settingsPath = path.join(app.getPath('userData'), 'app-settings.json')

export interface QuickLinkItem {
  id: string
  type: 'folder' | 'link' | 'text'
  label: string
  path: string
}

export interface QuickLinkGroup {
  id: string
  name: string
  items: QuickLinkItem[]
}

export interface AppSettings {
  lastCapCutProjectsFolder: string
  lastOutputFolder: string
  lastAssetsOutputFolder: string
  lastSelectedProject: string
  lastSortMode: string
  lastVideoOutputDir: string
  videoDownloadMode: 'video' | 'audio'
  vip?: {
    whisperPath?: string
  }
  quickLinks?: QuickLinkGroup[]
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

export async function getQuickLinks(): Promise<QuickLinkGroup[]> {
  const settings = await getSettings()
  const links = settings.quickLinks || []

  // Check if there is legacy data to migrate
  if (Array.isArray(links) && links.length > 0) {
    const firstItem = links[0] as any
    if (firstItem && typeof firstItem === 'object' && 'type' in firstItem) {
      console.log('Detected legacy QuickLink format, migrating to QuickLinkGroup...')
      const migrated: QuickLinkGroup[] = (links as any[]).map((item, idx) => ({
        id: `migrated-${idx}-${item.id || Math.random().toString(36).substring(2, 11)}`,
        name: item.label || 'Nhóm di chuyển',
        items: [
          {
            id: item.id || Math.random().toString(36).substring(2, 11),
            type: item.type === 'folder' ? 'folder' : 'link',
            label: item.label || 'Liên kết',
            path: item.path || ''
          }
        ]
      }))
      await saveSettings({ quickLinks: migrated })
      return migrated
    }
  }

  return links
}

export async function saveQuickLinks(groups: QuickLinkGroup[]): Promise<void> {
  await saveSettings({ quickLinks: groups })
}
