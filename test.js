const fs = require('fs-extra')
const path = require('path')

async function run() {
  const content = await fs.readFile(
    'C:/Users/admin/AppData/Local/CapCut/User Data/Projects/com.lveditor.draft/0514/draft_content.json',
    'utf8'
  )
  const regex =
    /((?:[A-Za-z]:[\\/]|(?:\.\/)?assets_collected[\\/])[^"*,?<>|\n]+?\.(?:mp4|mov|avi|mkv|m4v|webm|mp3|wav|m4a|aac|flac|ogg|png|jpg|jpeg|webp|gif|bmp|heic|tiff|srt|ass|vtt|ttf|otf|ttc|woff|woff2|json|cube|lut|txt))/gi

  let match
  let paths = []
  while ((match = regex.exec(content)) !== null) {
    if (match[1].includes('hieu le')) {
      paths.push(match[1])
    }
  }

  const escapedRegex =
    /([A-Za-z]:\\\\(?:[^"*,?<>|\n])+?\.(?:mp4|mov|avi|mkv|m4v|webm|mp3|wav|m4a|aac|flac|ogg|png|jpg|jpeg|webp|gif|bmp|heic|tiff|srt|ass|vtt|ttf|otf|ttc|woff|woff2|json|cube|lut|txt))/gi
  while ((match = escapedRegex.exec(content)) !== null) {
    if (match[1].includes('hieu le')) {
      let unescaped = match[1].replace(/\\\\/g, '\\')
      paths.push(unescaped)
    }
  }

  console.log('Paths found:', paths)

  // also check assets_collected folder
  const assets = await fs.readdir(
    'C:/Users/admin/AppData/Local/CapCut/User Data/Projects/com.lveditor.draft/0514/assets_collected/videos'
  )
  console.log(
    'Assets:',
    assets.filter((a) => a.includes('hieu le'))
  )
}
run()
