import fs from 'fs-extra'
import path from 'path'

export async function getAvailableName(basePath: string): Promise<string> {
  if (!(await fs.pathExists(basePath))) return basePath

  const dir = path.dirname(basePath)
  const ext = path.extname(basePath)
  const baseName = path.basename(basePath, ext)

  let i = 1
  while (true) {
    const candidate = path.join(dir, `${baseName}(${i})${ext}`)
    if (!(await fs.pathExists(candidate))) return candidate
    i++
  }
}
