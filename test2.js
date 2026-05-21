const fs = require('fs-extra')

async function run() {
  const content = await fs.readFile(
    'C:/Users/admin/AppData/Local/CapCut/User Data/Projects/com.lveditor.draft/0514/draft_content.json',
    'utf8'
  )
  const regex =
    /((?:[A-Za-z]:[\\/]|(?:\.\/)?assets_collected[\\/])[^"*,?<>|\n]+?\.(?:mp4|mov|avi|mkv|m4v|webm|mp3|wav|m4a|aac|flac|ogg|png|jpg|jpeg|webp|gif|bmp|heic|tiff|srt|ass|vtt|ttf|otf|ttc|woff|woff2|json|cube|lut|txt))/gi

  let match
  let count = 0
  while ((match = regex.exec(content)) !== null) {
    if (count < 10 && match[1].includes('assets_collected')) {
      console.log(match[1])
      count++
    }
  }
}
run()
