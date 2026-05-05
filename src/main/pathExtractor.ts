// pathExtractor.ts
export function extractPathsFromObj(obj: any): string[] {
  let paths: string[] = []

  if (typeof obj === 'string') {
    // Regex fallback to find any absolute Windows paths hidden in strings
    // matches things like C:/... or D:\\...
    const regex = /([A-Za-z]:[\\/][^"*,?<>|\n]+?\.(mp4|mov|avi|mkv|m4v|webm|mp3|wav|m4a|aac|flac|ogg|png|jpg|jpeg|webp|gif|bmp|heic|tiff|srt|ass|vtt|ttf|otf|ttc|woff|woff2|json|cube|lut|txt))/gi
    let match
    while ((match = regex.exec(obj)) !== null) {
      paths.push(match[1])
    }
    return paths
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      paths = paths.concat(extractPathsFromObj(item))
    }
  } else if (obj !== null && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      const val = obj[key]
      
      const targetKeys = [
        'path', 'file_Path', 'file_path', 'source_path', 
        'material_path', 'font_path', 'font_file', 'font', 
        'intensifies_path', 'reverse_path', 'cartoon_path'
      ]
      
      if (targetKeys.includes(key) && typeof val === 'string') {
        // Basic filter to ensure it looks somewhat like a valid path and not an empty string
        if (val.trim() !== '') {
          paths.push(val)
        }
      }
      
      // Also recursively search
      paths = paths.concat(extractPathsFromObj(val))
    }
  }

  // Deduplicate and normalize slightly here? We will do deduplication in the collector.
  return paths
}
