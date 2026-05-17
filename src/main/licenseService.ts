import crypto from 'crypto'
import { app } from 'electron'
import path from 'path'
import fs from 'fs-extra'

// Danh sách hash SHA-256 của các key hợp lệ
// Để thêm key mới: chạy `node scripts/generate-key.mjs`
// → lấy hash output → thêm vào mảng này
const VALID_KEY_HASHES: string[] = [
  'e955234a14d2d3de4ae9045941bbaee5da6e23196b9ceea021fac77ea2032090',
  '6760490c34192a55fdcd707f0679e98d6b485e6a5ed6151d7009e57e1fcdcfb7',
  'e10224135dcc70fe9b7ff06e39fff1c0af4c8140990a3e2816a6c55f5ce6a907',
  'c5a2dc4ad5e5c7fd42b04cc3f85d3ddbd6a2ef3d8fbfc2f7d6b1aa6b6a733ef5',
  'e9b4877420aca7771a275a7a6250e8aa21f249e688c9f3b5aaa2da4ef6fd5d69'
]

interface LicenseData {
  key: string
  activatedAt: string
}

const LICENSE_FILE = path.join(app.getPath('userData'), 'license.json')

export function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key.trim().toUpperCase()).digest('hex')
}

export function isValidKey(key: string): boolean {
  return VALID_KEY_HASHES.includes(hashKey(key))
}

export function saveLicense(key: string): void {
  fs.writeJsonSync(LICENSE_FILE, {
    key: key.trim().toUpperCase(),
    activatedAt: new Date().toISOString()
  })
}

export function loadLicense(): LicenseData | null {
  try {
    return fs.readJsonSync(LICENSE_FILE)
  } catch {
    return null
  }
}

export function isLicenseActive(): boolean {
  const license = loadLicense()
  if (!license) return false
  return isValidKey(license.key)
}
