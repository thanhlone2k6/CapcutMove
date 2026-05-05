import fs from 'fs-extra'
import path from 'path'

export interface ProjectInfo {
  name: string
  fullPath: string
  lastModified: number
  sizeBytes: number
  status: 'Valid' | 'Partial' | 'Invalid'
  hasCover: boolean
  coverDataUrl: string | null
}

async function getCoverDataUrl(projectPath: string): Promise<string | null> {
  const coverPath = path.join(projectPath, 'draft_cover.jpg')
  try {
    const exists = await fs.pathExists(coverPath)
    if (!exists) {
      console.log(`[projectResolver] No cover for: ${projectPath}`)
      return null
    }
    const buffer = await fs.readFile(coverPath)
    const dataUrl = `data:image/jpeg;base64,${buffer.toString('base64')}`
    console.log(`[projectResolver] Loaded cover: ${projectPath} (Length: ${dataUrl.length})`)
    return dataUrl
  } catch (error) {
    console.warn(`[projectResolver] Failed to load cover: ${coverPath}`, error)
    return null
  }
}

async function getDirSize(dirPath: string): Promise<number> {
  let totalSize = 0
  try {
    const files = await fs.readdir(dirPath)
    for (const file of files) {
      const filePath = path.join(dirPath, file)
      const stats = await fs.stat(filePath)
      if (stats.isDirectory()) {
        totalSize += await getDirSize(filePath)
      } else {
        totalSize += stats.size
      }
    }
  } catch (e) {
    // ignore errors for inaccessible files
  }
  return totalSize
}

export async function listProjects(folderPath: string): Promise<ProjectInfo[]> {
  const projects: ProjectInfo[] = []
  try {
    if (!(await fs.pathExists(folderPath))) return []

    const items = await fs.readdir(folderPath)
    for (const item of items) {
      const fullPath = path.join(folderPath, item)
      const stat = await fs.stat(fullPath)
      
      if (stat.isDirectory()) {
        const hasMeta = await fs.pathExists(path.join(fullPath, 'draft_meta_info.json'))
        const hasContent = await fs.pathExists(path.join(fullPath, 'draft_content.json'))
        
        let status: 'Valid' | 'Partial' | 'Invalid' = 'Invalid'
        if (hasMeta && hasContent) status = 'Valid'
        else if (hasMeta || hasContent) status = 'Partial'

        if (status !== 'Invalid') {
          const sizeBytes = await getDirSize(fullPath)
          const coverDataUrl = await getCoverDataUrl(fullPath)
          const hasCover = !!coverDataUrl

          projects.push({
            name: item,
            fullPath,
            lastModified: stat.mtimeMs,
            sizeBytes,
            status,
            hasCover,
            coverDataUrl
          })
        }
      }
    }
  } catch (err) {
    console.error('Error listing projects', err)
  }
  return projects
}

export async function checkProject(projectPath: string) {
  try {
    if (!(await fs.pathExists(projectPath))) {
      return { valid: false, error: 'Project folder not found.' }
    }
    const hasMeta = await fs.pathExists(path.join(projectPath, 'draft_meta_info.json'))
    const hasContent = await fs.pathExists(path.join(projectPath, 'draft_content.json'))
    
    if (hasMeta && hasContent) {
      return { valid: true, error: null }
    } else {
      const missing: string[] = []
      if (!hasMeta) missing.push('draft_meta_info.json')
      if (!hasContent) missing.push('draft_content.json')
      return { valid: false, error: `Missing files: ${missing.join(', ')}` }
    }
  } catch (err: any) {
    return { valid: false, error: err.message }
  }
}
