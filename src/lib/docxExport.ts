// Builds formatted Word documents for the tailored CV and the cover letter,
// following the same layout rules as the "ACCA job finder" project:
// Arial 11pt, 1.15 line spacing, A4 with ~2 cm margins, real headings and
// real list bullets, explicit paragraph spacing.

import type { Paragraph as ParagraphType } from 'docx'

// Word measures spacing in twentieths of a point, sizes in half-points.
const pt = (n: number) => n * 20
const LINE_115 = 276 // 1.15 line spacing (240 = single)
const CM2 = 1134 // 2 cm in twips

async function lib() {
  return import('docx')
}

// Turns "**bold** text" into runs.
function runs(d: typeof import('docx'), text: string, base: object = {}) {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part) =>
      part.startsWith('**') && part.endsWith('**')
        ? new d.TextRun({ text: part.slice(2, -2), bold: true, ...base })
        : new d.TextRun({ text: part, ...base })
    )
}

function makeDoc(d: typeof import('docx'), children: ParagraphType[]) {
  return new d.Document({
    styles: {
      default: {
        document: {
          run: { font: 'Arial', size: 22 },
          paragraph: { spacing: { line: LINE_115 } },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: 'cv-bullets',
          levels: [
            {
              level: 0,
              format: d.LevelFormat.BULLET,
              text: '•',
              alignment: d.AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 360, hanging: 240 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4
            margin: { top: CM2, bottom: CM2, left: CM2, right: CM2 },
          },
        },
        children,
      },
    ],
  })
}

/** Tailored CV from the Markdown the CV prompt produces. */
export async function buildCvDocx(markdown: string): Promise<Blob> {
  const d = await lib()
  const out: ParagraphType[] = []
  let sawName = false
  let sawContact = false

  for (const raw of markdown.split('\n')) {
    const line = raw.trim()
    if (!line) continue

    if (line.startsWith('# ')) {
      sawName = true
      out.push(
        new d.Paragraph({
          children: [new d.TextRun({ text: line.slice(2), bold: true, size: 30 })],
          spacing: { after: pt(2) },
        })
      )
    } else if (sawName && !sawContact && !line.startsWith('#')) {
      sawContact = true
      out.push(
        new d.Paragraph({
          children: runs(d, line, { color: '444444' }),
          border: {
            bottom: { style: d.BorderStyle.SINGLE, size: 4, color: 'AAAAAA', space: 4 },
          },
          spacing: { after: pt(12) },
        })
      )
    } else if (line.startsWith('## ')) {
      out.push(
        new d.Paragraph({
          heading: d.HeadingLevel.HEADING_2,
          children: [
            new d.TextRun({ text: line.slice(3).toUpperCase(), bold: true, size: 24, color: '1F2937', font: 'Arial' }),
          ],
          spacing: { before: pt(12), after: pt(4) },
        })
      )
    } else if (line.startsWith('### ')) {
      out.push(
        new d.Paragraph({
          children: runs(d, line.slice(4), { bold: true }),
          spacing: { before: pt(6), after: pt(0) },
          keepNext: true,
        })
      )
    } else if (/^[-*•]\s+/.test(line)) {
      out.push(
        new d.Paragraph({
          children: runs(d, line.replace(/^[-*•]\s+/, '')),
          numbering: { reference: 'cv-bullets', level: 0 },
          spacing: { after: pt(6) },
        })
      )
    } else {
      out.push(
        new d.Paragraph({
          children: runs(d, line.replace(/^\*(.+)\*$/, '$1')),
          spacing: { after: pt(4) },
        })
      )
    }
  }
  return d.Packer.toBlob(makeDoc(d, out))
}

/** Cover letter: blank lines separate paragraphs; short consecutive lines
 * (address, contact block) stay together without extra spacing. */
export async function buildLetterDocx(text: string): Promise<Blob> {
  const d = await lib()
  const out: ParagraphType[] = []
  const blocks = text.replace(/\r/g, '').split(/\n\s*\n/)

  blocks.forEach((block) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
    if (!lines.length) return
    const isSignOff = /^(yours (sincerely|faithfully)|sincerely|kind regards|best regards|regards)[,.]?$/i.test(lines[0])
    lines.forEach((line, i) => {
      const last = i === lines.length - 1
      out.push(
        new d.Paragraph({
          children: runs(d, line.replace(/^#+\s*/, '')),
          spacing: {
            after: last ? pt(10) : isSignOff && i === 0 ? pt(28) : 0,
          },
        })
      )
    })
  })
  return d.Packer.toBlob(makeDoc(d, out))
}
