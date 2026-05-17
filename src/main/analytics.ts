import { app } from 'electron'
import { PostHog } from 'posthog-node'
import fs from 'fs-extra'
import path from 'path'
import crypto from 'crypto'

let posthog: PostHog | null = null
let anonymousId: string | null = null

async function getAnonymousId(): Promise<string> {
  if (anonymousId) return anonymousId

  try {
    const dir = app.getPath('userData')
    const file = path.join(dir, 'analytics_id.json')
    
    if (await fs.pathExists(file)) {
      const data = await fs.readJson(file)
      if (data && data.anonymousId) {
        anonymousId = data.anonymousId
        return anonymousId!
      }
    }

    // Generate new UUID if not found or invalid
    anonymousId = crypto.randomUUID()
    await fs.ensureDir(dir)
    await fs.writeJson(file, { anonymousId }, { spaces: 2 })
  } catch (e) {
    console.error('Failed to manage analytics_id.json:', e)
    // Fallback to memory ID if file system fails
    if (!anonymousId) {
      anonymousId = crypto.randomUUID()
    }
  }
  return anonymousId!
}

function getPostHogClient(): PostHog | null {
  if (posthog) return posthog
  try {
    posthog = new PostHog('phc_nCwi6YBVsNN5SS6Ne3meWbuptocNH4fPH7F8fXewdVk6', {
      host: 'https://us.i.posthog.com'
    })
  } catch (e) {
    console.error('Failed to initialize PostHog client:', e)
  }
  return posthog
}

export async function trackAppOpened(): Promise<void> {
  try {
    const client = getPostHogClient()
    if (!client) return
    const distinctId = await getAnonymousId()
    client.capture({
      distinctId,
      event: 'app_opened',
      properties: {
        platform: process.platform,
        appVersion: app.getVersion()
      }
    })
  } catch (err) {
    console.error('PostHog tracking failed in trackAppOpened:', err)
  }
}

export async function trackImportCompleted(fileCount: number, didPatchPaths: boolean): Promise<void> {
  try {
    const client = getPostHogClient()
    if (!client) return
    const distinctId = await getAnonymousId()
    client.capture({
      distinctId,
      event: 'import_completed',
      properties: {
        fileCount,
        didPatchPaths
      }
    })
  } catch (err) {
    console.error('PostHog tracking failed in trackImportCompleted:', err)
  }
}

export async function trackImportFailed(errorMessage: string): Promise<void> {
  try {
    const client = getPostHogClient()
    if (!client) return
    const distinctId = await getAnonymousId()
    client.capture({
      distinctId,
      event: 'import_failed',
      properties: {
        errorMessage
      }
    })
  } catch (err) {
    console.error('PostHog tracking failed in trackImportFailed:', err)
  }
}

export async function shutdownAnalytics(): Promise<void> {
  try {
    if (posthog) {
      await posthog.shutdown()
    }
  } catch (err) {
    console.error('PostHog shutdown failed:', err)
  }
}
