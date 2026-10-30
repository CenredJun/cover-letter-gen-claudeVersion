// Reads an uploaded CV (PDF, Word .docx, or plain text) and returns its text,
// entirely in the browser. Nothing is uploaded anywhere.

export const CV_ACCEPT =
  '.pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain'

export async function extractCvText(file: File): Promise<string> {
  const name = file.name.toLowerCase()
  let text: string

  if (name.endsWith('.pdf') || file.type === 'application/pdf') {
    text = await extractPdf(await file.arrayBuffer())
  } else if (name.endsWith('.docx')) {
    const mammoth = (await import('mammoth/mammoth.browser.js')).default
    const result = await mammoth.extractRawText({
      arrayBuffer: await file.arrayBuffer(),
    })
    text = result.value
  } else if (name.endsWith('.doc')) {
    throw new Error(
      'Old .doc files are not supported. Save it as .docx or PDF and upload again.'
    )
  } else {
    text = await file.text()
  }

  text = text.replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  if (text.length < 50) {
    throw new Error(
      'No readable text found. If this PDF is a scanned image, upload a Word or text version instead.'
    )
  }
  return text
}

async function extractPdf(data: ArrayBuffer): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  const { default: PdfWorker } = await import(
    'pdfjs-dist/build/pdf.worker.min.mjs?worker&inline'
  )
  if (!pdfjs.GlobalWorkerOptions.workerPort) {
    pdfjs.GlobalWorkerOptions.workerPort = new PdfWorker()
  }
  const doc = await pdfjs.getDocument({ data }).promise
  const pages: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    let line = ''
    const lines: string[] = []
    for (const item of content.items as { str?: string; hasEOL?: boolean }[]) {
      if (typeof item.str !== 'string') continue
      line += item.str
      if (item.hasEOL) {
        lines.push(line)
        line = ''
      }
    }
    if (line) lines.push(line)
    pages.push(lines.join('\n'))
  }
  await doc.destroy()
  return pages.join('\n\n')
}
