import fs from 'fs-extra'
import path from 'path'

export interface PatchParams {
  projectPath: string
  assetsFolder: string
  pathMap: any[]
}

function getPathVariants(p: string): string[] {
  const forward = p.replace(/\\/g, '/')
  const backslash = p.replace(/\//g, '\\')
  const escaped = backslash.replace(/\\/g, '\\\\')
  const jsonEscapedForward = forward.replace(/\//g, '\\/')
  const variants = [forward, backslash, escaped, jsonEscapedForward]
  return Array.from(new Set(variants))
}

async function getJsonFilesToPatch(projectPath: string): Promise<string[]> {
  const filesToPatch: string[] = []

  // 1. Files at root
  const rootFiles = ['draft_content.json', 'draft_meta_info.json']
  for (const f of rootFiles) {
    const fp = path.join(projectPath, f)
    if (await fs.pathExists(fp)) filesToPatch.push(fp)
  }

  // 2. Files in Timelines/[UUID]/
  const timelinesDir = path.join(projectPath, 'Timelines')
  console.log('[PATCH-DEBUG] projectPath:', projectPath)
  console.log('[PATCH-DEBUG] timelinesDir:', timelinesDir)
  console.log('[PATCH-DEBUG] timelinesDir exists:', await fs.pathExists(timelinesDir))

  if (await fs.pathExists(timelinesDir)) {
    const stat = await fs.stat(timelinesDir)
    console.log('[PATCH-DEBUG] timelinesDir isDirectory:', stat.isDirectory())

    if (stat.isDirectory()) {
      const items = await fs.readdir(timelinesDir)
      console.log('[PATCH-DEBUG] items in Timelines:', items)

      for (const item of items) {
        const itemPath = path.join(timelinesDir, item)
        const itemStat = await fs.stat(itemPath)
        console.log('[PATCH-DEBUG] item:', item, '| isDirectory:', itemStat.isDirectory())

        if (itemStat.isDirectory()) {
          const timelineFiles = ['draft_content.json', 'template.json']
          for (const f of timelineFiles) {
            const fp = path.join(itemPath, f)
            const exists = await fs.pathExists(fp)
            console.log('[PATCH-DEBUG]   checking:', fp, '| exists:', exists)
            if (exists) filesToPatch.push(fp)
          }
        }
      }
    }
  }

  console.log('[PATCH-DEBUG] FINAL filesToPatch:', filesToPatch)
  return filesToPatch
}

export async function patchPaths(params: PatchParams, sendProgress: (info: any) => void) {
  const { projectPath, assetsFolder, pathMap } = params

  const filesToPatch = await getJsonFilesToPatch(projectPath)

  sendProgress({ step: 'patching_paths', message: 'Creating backup before patch...' })
  for (const fp of filesToPatch) {
    await fs.copy(fp, fp + '.backup')
  }

  const jsonContents = new Map<string, string>()
  for (const fp of filesToPatch) {
    jsonContents.set(fp, await fs.readFile(fp, 'utf-8'))
  }

  const basenameMap = new Map<string, any[]>()
  for (const item of pathMap) {
    if (item.normalizedBasename) {
      const arr = basenameMap.get(item.normalizedBasename) || []
      arr.push(item)
      basenameMap.set(item.normalizedBasename, arr)
    }
  }

  const exactReplacements = new Map<string, string>()
  const fallbackReplacements = new Map<string, string>()
  const missingNewPaths = new Set<string>()

  let totalMappings = pathMap.length

  // Backward compatibility for old ZIP packages
  for (const item of pathMap) {
    if (!item.rawJsonPaths && item.originalPath) {
      item.rawJsonPaths = [item.originalPath]
    }
    if (!item.resolvedDiskPaths) {
      item.resolvedDiskPaths = item.absolutePath ? [item.absolutePath] : []
    }

    if (!item.normalizedBasename && item.collectedRelativePath) {
      const ext = path.extname(item.collectedRelativePath)
      const base = path.basename(item.collectedRelativePath, ext)
      let origBaseNoExt = base
      const match = base.match(/(.*)_([a-z0-9]{6})$/)
      if (match) origBaseNoExt = match[1]
      item.originalBasename = origBaseNoExt + ext
      item.normalizedBasename = (origBaseNoExt + ext).toLowerCase()
    } else if (!item.normalizedBasename && item.originalPath) {
      const ext = path.extname(item.originalPath)
      const base = path.basename(item.originalPath, ext)
      item.originalBasename = base + ext
      item.normalizedBasename = (base + ext).toLowerCase()
    }

    if (item.normalizedBasename) {
      const arr = basenameMap.get(item.normalizedBasename) || []
      if (!arr.includes(item)) {
        arr.push(item)
        basenameMap.set(item.normalizedBasename, arr)
      }
    }
  }

  for (const item of pathMap) {
    if (!item.collectedRelativePath) continue
    const newAbsPath = path.join(
      assetsFolder,
      item.collectedRelativePath.replace('assets_collected/', '')
    )

    if (!(await fs.pathExists(newAbsPath))) {
      missingNewPaths.add(newAbsPath)
      continue
    }

    const newForward = newAbsPath.replace(/\\/g, '/')

    // Priority 1 & 2: rawJsonPaths exact match
    for (const raw of item.rawJsonPaths || []) {
      for (const v of getPathVariants(raw)) exactReplacements.set(v, newForward)
    }
    // Priority 3: originalPath
    if (item.originalPath) {
      for (const v of getPathVariants(item.originalPath)) exactReplacements.set(v, newForward)
    }
    // Priority 4: resolvedDiskPaths
    for (const dp of item.resolvedDiskPaths || []) {
      for (const v of getPathVariants(dp)) exactReplacements.set(v, newForward)
    }
  }

  // Priority 5: Basename fallback có kiểm soát
  const pathRegex =
    /((?:[A-Za-z]:[\\/]|\/Users\/|\\\/Users\\\/|\/private\/|\\\/private\\\/|\/Volumes\/|\\\/Volumes\\\/|(?:\.\/)?assets_collected[\\/])[^"*,?<>|\n]+?\.(?:mp4|mov|avi|mkv|m4v|webm|mp3|wav|m4a|aac|flac|ogg|png|jpg|jpeg|webp|gif|bmp|heic|tiff|srt|ass|vtt|ttf|otf|ttc|woff|woff2|json|cube|lut|txt))/gi

  const allFoundPaths = new Set<string>()
  for (const content of jsonContents.values()) {
    let match
    while ((match = pathRegex.exec(content)) !== null) {
      allFoundPaths.add(match[1])
    }
    const escapedRegex =
      /([A-Za-z]:\\\\(?:[^"*,?<>|\n])+?\.(?:mp4|mov|avi|mkv|m4v|webm|mp3|wav|m4a|aac|flac|ogg|png|jpg|jpeg|webp|gif|bmp|heic|tiff|srt|ass|vtt|ttf|otf|ttc|woff|woff2|json|cube|lut|txt))/gi
    while ((match = escapedRegex.exec(content)) !== null) {
      let unescaped = match[1].replace(/\\\\/g, '\\')
      allFoundPaths.add(unescaped)
      allFoundPaths.add(match[1])
    }
  }

  for (const p of allFoundPaths) {
    let alreadyMatched = false
    for (const v of getPathVariants(p)) {
      if (exactReplacements.has(v)) alreadyMatched = true
    }
    if (alreadyMatched) continue

    const ext = path.extname(p)
    const baseNameNoExt = path.basename(p, ext)

    let originalBasenameNoExt = baseNameNoExt
    const hashMatch = baseNameNoExt.match(/(.*)_([a-z0-9]{6})$/)
    if (hashMatch) originalBasenameNoExt = hashMatch[1]

    const normBase = (originalBasenameNoExt + ext).toLowerCase()
    const potentialItems = basenameMap.get(normBase) || []

    if (potentialItems.length === 1) {
      const item = potentialItems[0]
      if (!item.collectedRelativePath) continue
      const newAbsPath = path.join(
        assetsFolder,
        item.collectedRelativePath.replace('assets_collected/', '')
      )
      if (await fs.pathExists(newAbsPath)) {
        const newForward = newAbsPath.replace(/\\/g, '/')
        for (const v of getPathVariants(p)) {
          fallbackReplacements.set(v, newForward)
        }
      }
    }
  }

  for (const key of exactReplacements.keys()) fallbackReplacements.delete(key)

  let exactReplacementsCount = 0
  let fallbackReplacementsCount = 0
  const patchedFilesInfo: any[] = []

  for (const fp of filesToPatch) {
    let content = jsonContents.get(fp)!
    let fileExactCount = 0
    let fileFallbackCount = 0

    const exactKeys = Array.from(exactReplacements.keys()).sort((a, b) => b.length - a.length)
    for (const search of exactKeys) {
      if (content.includes(search)) {
        const count = content.split(search).length - 1
        content = content.split(search).join(exactReplacements.get(search)!)
        fileExactCount += count
      }
    }

    const fallbackKeys = Array.from(fallbackReplacements.keys()).sort((a, b) => b.length - a.length)
    for (const search of fallbackKeys) {
      if (content.includes(search)) {
        const count = content.split(search).length - 1
        content = content.split(search).join(fallbackReplacements.get(search)!)
        fileFallbackCount += count
      }
    }

    await fs.writeFile(fp, content, 'utf-8')
    exactReplacementsCount += fileExactCount
    fallbackReplacementsCount += fileFallbackCount

    patchedFilesInfo.push({
      file: path.relative(projectPath, fp),
      replacements: fileExactCount + fileFallbackCount,
      exactReplacements: fileExactCount,
      fallbackReplacements: fileFallbackCount
    })
    jsonContents.set(fp, content)
  }

  const unresolvedOldPaths = new Set<string>()
  for (const fp of filesToPatch) {
    const content = jsonContents.get(fp)!
    let match
    while ((match = pathRegex.exec(content)) !== null) {
      const p = match[1]
      const pForward = p.replace(/\\/g, '/')
      const assetsForward = assetsFolder.replace(/\\/g, '/')
      const isAbsolute =
        pForward.match(/^[A-Za-z]:\//) || pForward.startsWith('/') || pForward.startsWith('\\/')
      if (isAbsolute && !pForward.startsWith(assetsForward)) {
        unresolvedOldPaths.add(p)
      }
    }
  }

  const report = {
    totalMappings,
    totalReplacements: exactReplacementsCount + fallbackReplacementsCount,
    exactPathReplacements: exactReplacementsCount,
    basenameFallbackReplacements: fallbackReplacementsCount,
    unresolvedOldPaths: Array.from(unresolvedOldPaths),
    missingNewPaths: Array.from(missingNewPaths),
    patchedFiles: patchedFilesInfo
  }

  const patchedReportPath = path.join(projectPath, 'patched_files.json')
  await fs.writeJson(patchedReportPath, report, { spaces: 2 })

  console.log(
    `[pathPatcher] Done. Exact: ${exactReplacementsCount}, Fallback: ${fallbackReplacementsCount}`
  )
  return report
}
