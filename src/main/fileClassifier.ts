import path from 'path'

export type AssetType = 'video' | 'audio' | 'image' | 'subtitle' | 'font' | 'other'

export function classifyFile(filePath: string): AssetType {
  const ext = path.extname(filePath).toLowerCase()

  const types: Record<string, AssetType> = {
    // Video
    '.mp4': 'video',
    '.mov': 'video',
    '.avi': 'video',
    '.mkv': 'video',
    '.m4v': 'video',
    '.webm': 'video',
    // Audio
    '.mp3': 'audio',
    '.wav': 'audio',
    '.m4a': 'audio',
    '.aac': 'audio',
    '.flac': 'audio',
    '.ogg': 'audio',
    // Image
    '.png': 'image',
    '.jpg': 'image',
    '.jpeg': 'image',
    '.webp': 'image',
    '.gif': 'image',
    '.bmp': 'image',
    '.heic': 'image',
    '.tiff': 'image',
    // Subtitle
    '.srt': 'subtitle',
    '.ass': 'subtitle',
    '.vtt': 'subtitle',
    // Font
    '.ttf': 'font',
    '.otf': 'font',
    '.ttc': 'font',
    '.woff': 'font',
    '.woff2': 'font'
  }

  return types[ext] || 'other'
}
