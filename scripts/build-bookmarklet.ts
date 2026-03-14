import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { minify } from 'uglify-js'

// Load .env.local
const envContent = readFileSync('.env.local', 'utf-8')
const baseUrlMatch = envContent.match(/NEXT_PUBLIC_BASE_URL=(.+)/)
const baseUrl = baseUrlMatch ? baseUrlMatch[1].trim() : 'https://www.toptalentjobs.nl'

const source = readFileSync('./lib/bookmarklet/bookmarklet-source.js', 'utf-8')

// Vervang placeholders
const withValues = source
  .replace('__BASE_URL__', baseUrl)

// Minify - compress zonder aggressieve optimalisaties die code kunnen breken
const result = minify(withValues, {
  compress: { drop_console: false, dead_code: false, unused: false, conditionals: false, if_return: false },
  mangle: false,
  output: { comments: false },
})

if (result.error || !result.code) {
  console.error('Minification error:', result.error)
  process.exit(1)
}

const bookmarkletHref = `javascript:${encodeURIComponent(result.code)}`

try { mkdirSync('./lib/bookmarklet', { recursive: true }) } catch (_) {}

writeFileSync(
  './lib/bookmarklet/bookmarklet-built.json',
  JSON.stringify({
    href: bookmarkletHref,
    size: Math.round(bookmarkletHref.length / 1024 * 10) / 10,
    builtAt: new Date().toISOString(),
  }, null, 2)
)

// Copy to public folder
writeFileSync('./public/bookmarklet-built.json',
  JSON.stringify({
    href: bookmarkletHref,
    size: Math.round(bookmarkletHref.length / 1024 * 10) / 10,
    builtAt: new Date().toISOString(),
  }, null, 2)
)

console.log(`Bookmarklet gebouwd: ${Math.round(bookmarkletHref.length / 1024 * 10) / 10} KB`)
