// Converts dist/index.html into the body-only page the claude.ai Artifact
// publisher expects (it adds its own doctype, head and body).
import { readFileSync, writeFileSync } from 'node:fs'

const html = readFileSync('dist/index.html', 'utf8')
const pick = (re) => [...html.matchAll(re)].map((m) => m[0]).join('\n')
const title = pick(/<title>[\s\S]*?<\/title>/g)
const styles = pick(/<style[\s\S]*?<\/style>/g)
const scripts = pick(/<script[\s\S]*?<\/script>/g)
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1]
  .replace(/<script[\s\S]*?<\/script>/g, '')
  .trim()

// Libraries (pdf.js, mammoth) contain a literal U+FFFD; write it as a JS
// escape, which means the same thing, so the publisher accepts the file.
const page = `${title}\n${styles}\n${body}\n${scripts}\n`.replaceAll('\uFFFD', '\\uFFFD')
writeFileSync('dist/artifact.html', page)
console.log('wrote dist/artifact.html')
