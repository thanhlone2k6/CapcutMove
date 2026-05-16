import fs from 'fs-extra'
import path from 'path'
import crypto from 'crypto'
import { extractPathsFromObj } from './pathExtractor'
import { classifyFile, AssetType } from './fileClassifier'
import { processFont, FontReportItem } from './fontCollector'

const SKIP_PATH_PATTERNS = [
  /[/\\]AppData[/\\]Local[/\\]CapCut[/\\]/i,
  /[/\\]AppData[/\\]Roaming[/\\]CapCut[/\\]/i
]

export interface AssetMapItem {
  id: string
  rawJsonPaths: string[]
  resolvedDiskPaths: string[]
  originalPath: string
  collectedRelativePath: string
  type: AssetType
  fileName: string
  originalBasename: string
  normalizedBasename: string
  sourceFiles: string[]
  status: "found" | "missing" | "manual_resolved"
  exists: boolean
  sizeBytes: number
}

export interface ScanResult {
  assets: AssetMapItem[]
  fontReport: FontReportItem[]
  totalFound: number
  totalMissing: number
  totalSize: number
}

function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').toLowerCase()
}

export async function scanAssets(projectPath: string): Promise<ScanResult> {
  const metaPath = path.join(projectPath, 'draft_meta_info.json')
  const contentPath = path.join(projectPath, 'draft_content.json')

  let allPaths: { path: string; source: string }[] = []

  // Read meta info
  try {
    if (await fs.pathExists(metaPath)) {
      const meta = await fs.readJson(metaPath)
      const paths = extractPathsFromObj(meta)
      allPaths = allPaths.concat(paths.map(p => ({ path: p, source: 'draft_meta_info.json' })))
    }
  } catch (err) {
    console.error('Failed to read draft_meta_info.json', err)
  }

  // Read content
  try {
    if (await fs.pathExists(contentPath)) {
      const content = await fs.readJson(contentPath)
      const paths = extractPathsFromObj(content)
      allPaths = allPaths.concat(paths.map(p => ({ path: p, source: 'draft_content.json' })))
    }
  } catch (err) {
    console.error('Failed to read draft_content.json', err)
  }

  const assets: AssetMapItem[] = []
  const fontReport: FontReportItem[] = []
  const dedupeMap = new Map<string, AssetMapItem>()
  const fontDedupeMap = new Map<string, FontReportItem>()

  let totalFound = 0
  let totalMissing = 0
  let totalSize = 0

  let fileIdCounter = 0

  for (const { path: rawPath, source } of allPaths) {
    if (rawPath.startsWith('http://') || rawPath.startsWith('https://') || rawPath.startsWith('s://')) {
      continue
    }

    let shouldSkip = false
    for (const pattern of SKIP_PATH_PATTERNS) {
      if (pattern.test(rawPath)) {
        shouldSkip = true
        break
      }
    }
    if (shouldSkip) continue

    const type = classifyFile(rawPath)
    if (type === 'font' || (!rawPath.includes('/') && !rawPath.includes('\\') && classifyFile(rawPath) === 'other')) {
       // might be a font name
    }

    if (!rawPath.includes('/') && !rawPath.includes('\\') && !rawPath.includes('.')) {
      // Very likely just a font name without path
      const normName = rawPath.toLowerCase()
      if (!fontDedupeMap.has(normName)) {
        const result = await processFont(rawPath, source)
        fontReport.push(result)
        fontDedupeMap.set(normName, result)
      }
      continue
    }

    const normPath = normalizePath(rawPath)
    
    if (dedupeMap.has(normPath)) {
      const existing = dedupeMap.get(normPath)!
      if (!existing.sourceFiles.includes(source)) {
        existing.sourceFiles.push(source)
      }
      if (!existing.rawJsonPaths.includes(rawPath)) {
        existing.rawJsonPaths.push(rawPath)
      }
      continue
    }

    let absolutePath = rawPath
    if (!path.isAbsolute(rawPath)) {
      if (rawPath.startsWith('./')) {
        absolutePath = path.resolve(projectPath, rawPath.substring(2))
      } else {
        absolutePath = path.resolve(projectPath, rawPath)
      }
    }

    let exists = false
    let sizeBytes = 0
    let mtimeMs = 0

    try {
      if (await fs.pathExists(absolutePath)) {
        const stats = await fs.stat(absolutePath)
        if (stats.isFile()) {
          exists = true
          sizeBytes = stats.size
          mtimeMs = stats.mtimeMs
        }
      }
    } catch (e) {
      // file might be inaccessible
    }

    if (exists) {
      totalFound++
      totalSize += sizeBytes
    } else {
      totalMissing++
    }

    const ext = path.extname(rawPath)
    let baseName = path.basename(rawPath, ext)
    
    let originalBasenameNoExt = baseName;
    const hashMatch = baseName.match(/(.*)_([a-z0-9]{6})$/);
    if (hashMatch) {
      originalBasenameNoExt = hashMatch[1];
    }
    
    const originalBasename = originalBasenameNoExt + ext;

    let collectedRelativePath = ''
    let fileName = ''
    if (exists || type === 'font') {
      const hashStr = exists ? `${absolutePath}_${sizeBytes}_${mtimeMs}` : absolutePath;
      const shortHash = crypto.createHash('md5').update(hashStr).digest('hex').substring(0, 6);
      fileName = `${originalBasenameNoExt}_${shortHash}${ext}`
      collectedRelativePath = `assets_collected/${type}s/${fileName}`
    }

    const item: AssetMapItem = {
      id: `asset_${fileIdCounter++}`,
      rawJsonPaths: [rawPath],
      resolvedDiskPaths: [absolutePath],
      originalPath: rawPath,
      collectedRelativePath,
      type,
      fileName,
      originalBasename,
      normalizedBasename: originalBasename.toLowerCase(),
      sourceFiles: [source],
      status: exists ? "found" : "missing",
      exists,
      sizeBytes
    }

    assets.push(item)
    dedupeMap.set(normPath, item)

    if (type === 'font') {
      const fontRes = await processFont(rawPath, source)
      fontReport.push(fontRes)
      fontDedupeMap.set(normalizePath(rawPath), fontRes)
    }
  }

  return {
    assets,
    fontReport,
    totalFound,
    totalMissing,
    totalSize
  }
}

