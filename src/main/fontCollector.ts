import fs from 'fs-extra'
import path from 'path'

export interface FontReportItem {
  fontName: string
  fontPath: string
  status: 'found' | 'missing' | 'name_only'
  sourceFile: string
  error?: string
}

export async function processFont(fontNameOrPath: string, sourceFile: string): Promise<FontReportItem> {
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

  // Fallback: Check if it exists in Windows Fonts dir
  const winFontsDir = path.join('C:', 'Windows', 'Fonts')
  const possibleWinFontPath = path.join(winFontsDir, fontName)
  try {
    if (await fs.pathExists(possibleWinFontPath)) {
      return {
        fontName,
        fontPath: possibleWinFontPath,
        status: 'found',
        sourceFile
      }
    }
  } catch (err) {
    // Permission errors checking Windows Fonts
  }

  return {
    fontName,
    fontPath: fontNameOrPath,
    status: 'missing',
    sourceFile
  }
}
