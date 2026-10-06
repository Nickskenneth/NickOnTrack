// Regenerates the app icons from one SVG: `npm run icons`.
// Artwork stays inside the central ~65% so the same file works as a maskable icon.
import { mkdir, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const BG = '#0a0a0a'
const FG = '#10b981'

const svg = (rounded) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" ${rounded ? 'rx="112"' : ''} fill="${BG}"/>
  <g fill="${FG}">
    <rect x="156" y="242" width="200" height="28" rx="6"/>
    <rect x="124" y="172" width="40" height="168" rx="12"/>
    <rect x="348" y="172" width="40" height="168" rx="12"/>
    <rect x="88" y="204" width="36" height="104" rx="10"/>
    <rect x="388" y="204" width="36" height="104" rx="10"/>
  </g>
</svg>`

await mkdir('public/icons', { recursive: true })

const fullBleed = Buffer.from(svg(false))
const outputs = [
  ['public/icons/icon-192.png', 192],
  ['public/icons/icon-512.png', 512],
  ['public/icons/icon-512-maskable.png', 512],
  ['public/icons/apple-touch-icon.png', 180], // iOS rounds the corners itself, so no transparency
]
for (const [path, size] of outputs) {
  await sharp(fullBleed).resize(size, size).png().toFile(path)
  console.log('wrote', path)
}

await writeFile('public/favicon.svg', svg(true))
console.log('wrote public/favicon.svg')
