import fs from 'fs-extra'
import path from 'path'

export interface FontReportItem {
  fontName: string
  fontPath: string
  status: 'found' | 'missing' | 'name_only'
  sourceFile: string
  error?: string
}

export async function processFont(
  fontNameOrPath: string,
  sourceFile: string
): Promise<FontReportItem> {
  const isPath = fontNameOrPath.includes('/') || fontNameOrPath.includes('\\')

  if (!isPath) {
    return {
      fontName: fontNameOrPath,
      fontPath: '',
      status: 'name_only',
      sourceFile
    }
  }

  const fontName = path.basename(fontNameOrPath)

  try {
    if (await fs.pathExists(fontNameOrPath)) {
      return {
        fontName,
        fontPath: fontNameOrPath,
        status: 'found',
        sourceFile
      }
    }
  } catch (err: any) {
    return {
      fontName,
      fontPath: fontNameOrPath,
      status: 'missing',
      sourceFile,
      error: err.message
    }
  }

  // Fallback: Check system Fonts directory
  let possibleSystemFontPaths: string[] = []
  if (process.platform === 'win32') {
    const winFontsDir = path.join('C:', 'Windows', 'Fonts')
    possibleSystemFontPaths.push(path.join(winFontsDir, fontName))
  } else if (process.platform === 'darwin') {
    const os = require('os')
    possibleSystemFontPaths.push(
      path.join(os.homedir(), 'Library', 'Fonts', fontName),
      path.join('/', 'Library', 'Fonts', fontName),
      path.join('/', 'System', 'Library', 'Fonts', fontName)
    )
  }

  for (const possiblePath of possibleSystemFontPaths) {
    try {
      if (await fs.pathExists(possiblePath)) {
        return {
          fontName,
          fontPath: possiblePath,
          status: 'found',
          sourceFile
        }
      }
    } catch (err) {
      // ignore check errors
    }
  }

  return {
    fontName,
    fontPath: fontNameOrPath,
    status: 'missing',
    sourceFile
  }
}
