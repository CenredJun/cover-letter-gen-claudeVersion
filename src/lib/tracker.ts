// Saves each generated application to Google Drive and logs it in the
// "Applications" tab of the tracker sheet, like the ACCA job finder:
// one row per job (no duplicates), files in one Drive folder, links in the row.
// Runs through the viewer's own Google connectors via the artifact runtime.

import type { JobInput, OutputMode, ToneOption } from '../types'
import { useCapability } from './claudeRuntime'
import { buildCvPdf } from './cvPdf'
import { buildLetterDocx } from './docxExport'

export const TRACKER = {
  sheetId: '1GlATTnK2SNrzSdKyBQFsRFf5dj6iArcKfVHgUx8uwBI',
  tab: 'Applications',
  folderId: '12ni5N33lA-s9mASYwsSq_v8i0ecG9Zrm',
  sheetUrl:
    'https://docs.google.com/spreadsheets/d/1GlATTnK2SNrzSdKyBQFsRFf5dj6iArcKfVHgUx8uwBI/edit',
  folderUrl: 'https://drive.google.com/drive/folders/12ni5N33lA-s9mASYwsSq_v8i0ecG9Zrm',
}

// Columns A-P of the Applications tab.
//  A Date Generated  B Job Title  C Company  D Platform  E Job Link  F Output
//  G Profile  H Tone  I Match Score  J Why It Fits  K Gaps/Blockers
//  L Status  M Applied Date  N CV (PDF)  O Cover Letter  P Notes
// L, M and P are yours: the app sets Status to "New" on a new row and never
// changes those three columns afterwards.

const DRIVE = 'Google Drive'
const SHEETS = 'Google Sheets'

export interface SaveArgs {
  job: JobInput
  profileName: string
  tone: ToneOption
  outputMode: OutputMode
  letter: string
  cv?: string
  score?: number | null
  why?: string
  gapList?: string
}

export interface SaveResult {
  ok: boolean
  message: string
  cvUrl?: string
  letterUrl?: string
  row?: number
}

const OUTPUT_LABEL: Record<OutputMode, string> = {
  cover_letter: 'Cover Letter',
  pitch: 'Pitch',
  cv_and_letter: 'CV + Cover Letter',
}

function connectorMessage(e: any, server: string): string {
  switch (e?.code) {
    case 'server_not_connected':
      return `Add ${server} in claude.ai Settings → Connectors, then try again.`
    case 'needs_reauth':
      return `Reconnect ${server} in claude.ai Settings → Connectors, then try again.`
    case 'selection_required':
      return `Choose which ${server} account this page should use, then try again.`
    case 'not_in_manifest':
    case 'approval_required':
      return `${server} access was not allowed for this page. Click Try again and choose Allow.`
    case 'blocked_by_policy':
      return `Your organization blocks ${server} for this page.`
    case 'tool_error':
      return `${server} reported an error: ${String(e?.message ?? '').slice(0, 160)}`
    case 'server_unavailable':
      return `${server} did not respond. Try again in a moment.`
    default:
      return `Could not reach ${server}. Try again.`
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(bin)
}

const clean = (s: string) => s.replace(/[\\/:*?"<>|\n\r]+/g, ' ').replace(/\s+/g, ' ').trim()
const norm = (s: string) => s.trim().toLowerCase().replace(/\/+$/, '').replace(/^https?:\/\/(www\.)?/, '')

function fileUrl(payload: any): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined
  if (payload.viewUrl) return payload.viewUrl
  if (payload.id) return `https://drive.google.com/file/d/${payload.id}/view`
  return undefined
}

export async function saveToTracker(args: SaveArgs): Promise<SaveResult> {
  const mcp = await useCapability<any>('mcp')
  if (!mcp) {
    return { ok: false, message: 'Saving to Drive and the tracker only works inside claude.ai.' }
  }
  const { job } = args
  const title = clean(job.jobTitle) || 'Untitled role'
  const company = clean(job.companyName) || 'Unknown company'
  const problems: string[] = []

  // 1. Files into the Drive folder.
  let cvUrl: string | undefined
  let letterUrl: string | undefined
  if (args.cv) {
    try {
      const pdf = await buildCvPdf(args.cv)
      const res = await mcp.callTool(DRIVE, 'create_file', {
        title: `${company} - CV - ${title}.pdf`,
        parentId: TRACKER.folderId,
        base64Content: await blobToBase64(pdf),
        contentMimeType: 'application/pdf',
        disableConversionToGoogleType: true,
      })
      cvUrl = fileUrl(res.payload)
    } catch (e) {
      problems.push(`CV not saved. ${connectorMessage(e, DRIVE)}`)
    }
  }
  if (args.letter) {
    const kind = args.outputMode === 'pitch' ? 'Pitch' : 'Cover Letter'
    try {
      const input: Record<string, unknown> = {
        title: `${company} - ${kind} - ${title}`,
        parentId: TRACKER.folderId,
      }
      if (args.outputMode === 'pitch') {
        input.textContent = args.letter
        input.contentMimeType = 'text/plain' // becomes a Google Doc
      } else {
        input.base64Content = await blobToBase64(await buildLetterDocx(args.letter))
        input.contentMimeType =
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // becomes a Google Doc
      }
      const res = await mcp.callTool(DRIVE, 'create_file', input)
      letterUrl = fileUrl(res.payload)
    } catch (e) {
      problems.push(`${kind} not saved. ${connectorMessage(e, DRIVE)}`)
    }
  }

  // 2. One row per job in the tracker.
  let row: number | undefined
  try {
    const read = await mcp.callTool(
      SHEETS,
      'get_values',
      { spreadsheetId: TRACKER.sheetId, range: `${TRACKER.tab}!A1:P2000` },
      { cache: false }
    )
    const rows: string[][] = (read.payload as any)?.values ?? []
    const link = norm(job.jobUrl ?? '')
    const idx = rows.findIndex((r, i) => {
      if (i === 0) return false // header
      if (link) return norm(r[4] ?? '') === link
      return (
        norm(r[1] ?? '') === norm(title) &&
        norm(r[2] ?? '') === norm(company) &&
        !norm(r[4] ?? '')
      )
    })

    const today = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD
    const generated = [
      today,
      title,
      company,
      clean(job.platform),
      (job.jobUrl ?? '').trim(),
      OUTPUT_LABEL[args.outputMode],
      args.profileName,
      args.tone,
      args.score ?? '',
      args.why ?? '',
      args.gapList ?? '',
    ]

    if (idx > 0) {
      // Update the existing row; keep Status, Applied Date and Notes.
      row = idx + 1
      const existing = rows[idx]
      await mcp.callTool(SHEETS, 'update_values', {
        spreadsheetId: TRACKER.sheetId,
        range: `${TRACKER.tab}!A${row}:K${row}`,
        values: [generated],
      })
      await mcp.callTool(SHEETS, 'update_values', {
        spreadsheetId: TRACKER.sheetId,
        range: `${TRACKER.tab}!N${row}:O${row}`,
        values: [[cvUrl ?? existing[13] ?? '', letterUrl ?? existing[14] ?? '']],
      })
    } else {
      row = Math.max(rows.length, 1) + 1
      await mcp.callTool(SHEETS, 'append_values', {
        spreadsheetId: TRACKER.sheetId,
        range: `${TRACKER.tab}!A1`,
        values: [[...generated, 'New', '', cvUrl ?? '', letterUrl ?? '', '']],
      })
    }
  } catch (e) {
    problems.push(`Tracker not updated. ${connectorMessage(e, SHEETS)}`)
    row = undefined
  }

  if (problems.length) {
    return { ok: false, message: problems.join(' '), cvUrl, letterUrl, row }
  }
  return {
    ok: true,
    message: row ? `Saved to Drive and logged in the tracker (row ${row}).` : 'Saved.',
    cvUrl,
    letterUrl,
    row,
  }
}
