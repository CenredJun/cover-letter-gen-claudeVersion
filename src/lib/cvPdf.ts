// Turns the tailored-CV Markdown into a polished A4 PDF.
//
// Markdown the CV prompt produces:
//   # Name
//   contact line (with [Label](url) links)
//   ## Section
//   ### Role, Employer        (or Qualification, Institution)
//   Dates | Location
//   - bullet
//   paragraph text

import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces'

const INK = '#1b1f24'
const MUTED = '#5b6472'
const ACCENT = '#1f3a5f'
const RULE = '#c9cfd8'

type Inline = { text: string; bold?: boolean; link?: string; color?: string }

/** Splits a line into runs: **bold**, [label](url) links, bare URLs. */
export function parseInline(line: string): Inline[] {
  const out: Inline[] = []
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|(https?:\/\/[^\s|)]+)/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(line))) {
    if (m.index > last) out.push({ text: line.slice(last, m.index) })
    if (m[1]) out.push({ text: m[1], bold: true })
    else if (m[2]) out.push({ text: m[2], link: m[3], color: ACCENT })
    else if (m[4]) {
      // Show bare links without the protocol, still clickable.
      out.push({ text: m[4].replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''), link: m[4], color: ACCENT })
    }
    last = re.lastIndex
  }
  if (last < line.length) out.push({ text: line.slice(last) })
  return out.filter((r) => r.text !== '')
}

const stripMarks = (s: string) => s.replace(/^\*(.+)\*$/, '$1').replace(/^_(.+)_$/, '$1')

function sectionHeading(title: string): Content {
  return {
    stack: [
      {
        text: title.toUpperCase(),
        fontSize: 9.5,
        bold: true,
        color: ACCENT,
        characterSpacing: 1.1,
      },
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 499, y2: 0, lineWidth: 0.6, lineColor: RULE }],
        margin: [0, 3, 0, 0],
      },
    ],
    margin: [0, 12, 0, 6],
    headlineLevel: 1,
  }
}

function bulletList(items: string[]): Content {
  return {
    ul: items.map((t) => ({ text: parseInline(t), margin: [0, 0, 0, 2.5] })),
    markerColor: ACCENT,
    margin: [2, 0, 0, 2],
  }
}

export function buildCvDocDefinition(markdown: string): TDocumentDefinitions {
  const lines = markdown.replace(/\r/g, '').split('\n').map((l) => l.trim())
  const body: Content[] = []
  let name = ''
  let contact = ''
  let section = ''
  let bullets: string[] = []

  const flushBullets = () => {
    if (!bullets.length) return
    const short = bullets.every((b) => b.length <= 55)
    if (/skill|competenc/i.test(section) && short && bullets.length >= 4) {
      // Short skill bullets read better in two columns.
      const half = Math.ceil(bullets.length / 2)
      body.push({
        columns: [bulletList(bullets.slice(0, half)), bulletList(bullets.slice(half))],
        columnGap: 14,
      })
    } else {
      body.push(bulletList(bullets))
    }
    bullets = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue

    if (line.startsWith('# ') && !name) {
      name = line.slice(2).trim()
      continue
    }
    if (name && !contact && !section && !line.startsWith('#')) {
      contact = line
      continue
    }
    if (line.startsWith('## ')) {
      flushBullets()
      section = line.slice(3).trim()
      body.push(sectionHeading(section))
      continue
    }
    if (line.startsWith('### ')) {
      flushBullets()
      const title = line.slice(4).trim()
      // The next plain line holds "Dates | Location".
      let dates = ''
      let place = ''
      const next = lines[i + 1] ?? ''
      if (next && !/^(#|[-*•]\s)/.test(next)) {
        const parts = stripMarks(next).split('|').map((p) => p.trim()).filter(Boolean)
        dates = parts[0] ?? ''
        place = parts.slice(1).join(' · ')
        i++
      }
      body.push({
        columns: [
          { text: parseInline(title), bold: true, fontSize: 10.5, color: INK, width: '*' },
          { text: dates, fontSize: 9, color: MUTED, alignment: 'right', width: 'auto', noWrap: true, margin: [8, 1.5, 0, 0] },
        ],
        margin: [0, 7, 0, 0],
        headlineLevel: 2,
      } as Content)
      if (place) body.push({ text: place, fontSize: 9, italics: true, color: MUTED, margin: [0, 1, 0, 3] })
      else body.push({ text: '', margin: [0, 0, 0, 3] })
      continue
    }
    if (/^[-*•]\s+/.test(line)) {
      bullets.push(line.replace(/^[-*•]\s+/, ''))
      continue
    }
    flushBullets()
    body.push({ text: parseInline(stripMarks(line)), margin: [0, 0, 0, 4] })
  }
  flushBullets()

  const header: Content[] = []
  if (name) header.push({ text: name, fontSize: 21, bold: true, color: INK, margin: [0, 0, 0, 3] })
  if (contact) {
    // Use a middle dot between contact items.
    const runs = parseInline(contact).map((r) => ({ ...r, text: r.text.replace(/\s*\|\s*/g, '  ·  ') }))
    header.push({ text: runs, fontSize: 9, color: MUTED, lineHeight: 1.35 })
  }
  header.push({
    canvas: [{ type: 'line', x1: 0, y1: 0, x2: 499, y2: 0, lineWidth: 1.2, lineColor: ACCENT }],
    margin: [0, 8, 0, 2],
  })

  return {
    pageSize: 'A4',
    pageMargins: [48, 44, 48, 44],
    info: { title: name ? `${name} - CV` : 'CV' },
    defaultStyle: { font: 'Roboto', fontSize: 9.8, lineHeight: 1.28, color: INK },
    content: [...header, ...body],
    // Never leave a section heading or role title alone at the bottom of a page.
    pageBreakBefore: (node: any, following: any) =>
      (node.headlineLevel === 1 && following.length < 3) ||
      (node.headlineLevel === 2 && following.length < 2),
  }
}

/** Browser: build the PDF as a Blob. */
export async function buildCvPdf(markdown: string): Promise<Blob> {
  const pdfMakeMod: any = await import('pdfmake/build/pdfmake')
  const fontsMod: any = await import('pdfmake/build/vfs_fonts')
  const pdfMake = pdfMakeMod.default ?? pdfMakeMod
  const fonts = fontsMod.default ?? fontsMod
  pdfMake.vfs = fonts?.pdfMake?.vfs ?? fonts?.vfs ?? fonts
  const doc = pdfMake.createPdf(buildCvDocDefinition(markdown))
  return new Promise((resolve) => doc.getBlob((b: Blob) => resolve(b)))
}
