import fs from 'fs-extra'
import path from 'path'

export interface PatchParams {
  projectPath: string
  assetsFolder: string
  pathMap: any[]
}


export async function patchPaths(params: PatchParams, sendProgress: (info: any) => void) {
  const { projectPath, assetsFolder, pathMap } = params

  const metaPath = path.join(projectPath, 'draft_meta_info.json')
  const contentPath = path.join(projectPath, 'draft_content.json')

  // Backup first
  sendProgress({ step: 'patching_paths', message: 'Creating backup before patch...' })
  const backupMetaPath = metaPath + '.backup'
  const backupContentPath = contentPath + '.backup'

  if (await fs.pathExists(metaPath)) await fs.copy(metaPath, backupMetaPath)
  if (await fs.pathExists(contentPath)) await fs.copy(contentPath, backupContentPath)

  // Create a mapping from original normalized path to new absolute path
  const replaceMap = new Map<string, string>()
  for (const item of pathMap) {
    if (item.collectedRelativePath) {
      const newAbsPath = path.join(assetsFolder, item.collectedRelativePath.replace('assets_collected/', ''))
      // Create both forward and backslash versions for robust replacing
      replaceMap.set(item.originalPath, newAbsPath)
      replaceMap.set(item.originalPath.replace(/\\/g, '/'), newAbsPath.replace(/\\/g, '/'))
      replaceMap.set(item.originalPath.replace(/\//g, '\\'), newAbsPath.replace(/\//g, '\\'))
    }
  }

  // We will do a basic string replacement on the entire JSON string for now, as recursively updating
  // nested structures without losing schema is safer with string replace if we match exact strings.
  // We need to be careful with JSON escaping.

  async function patchFile(filePath: string) {
    if (!(await fs.pathExists(filePath))) return
    
    let content = await fs.readFile(filePath, 'utf-8')
    
    for (const [oldPath, newPath] of replaceMap.entries()) {
      // Handle JSON escaped backslashes (D:\\Folder\\File -> D:\\\\Folder\\\\File)
      const jsonEscapedOld = oldPath.replace(/\\/g, '\\\\')
      const jsonEscapedNew = newPath.replace(/\\/g, '\\\\')
      
      content = content.split(`"${jsonEscapedOld}"`).join(`"${jsonEscapedNew}"`)
      content = content.split(`"${oldPath}"`).join(`"${newPath}"`)
    }
    
    await fs.writeFile(filePath, content, 'utf-8')
  }

  await patchFile(metaPath)
  await patchFile(contentPath)

  // Write patched files report
  const patchedReportPath = path.join(projectPath, 'patched_files.json')
  await fs.writeJson(patchedReportPath, {
    timestamp: new Date().toISOString(),
    status: 'success'
  })
}
