import crypto from 'crypto'

// Chạy: node scripts/generate-key.mjs
const key = `VIP-${rand()}-${rand()}-${rand()}`
const hash = crypto.createHash('sha256').update(key).digest('hex')

console.log('═══════════════════════════════════════')
console.log('  CapCutMove VIP Key Generator')
console.log('═══════════════════════════════════════')
console.log('')
console.log('Key gửi cho user:', key)
console.log('')
console.log('Hash thêm vào VALID_KEY_HASHES:')
console.log(`  '${hash}'`)
console.log('')
console.log('═══════════════════════════════════════')

function rand() {
  return Math.random().toString(36).substring(2, 6).toUpperCase()
}
