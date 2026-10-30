# Cover Letter Generator (Claude version)

A personal tool that writes tailored cover letters, Upwork pitches, and tailored CVs from your own CV. It runs as a private artifact in claude.ai and uses your Claude account, so there is no API key and no hosting.

## Features

- **Upload your CV** (PDF, Word .docx, or text). The text is read in your browser and saved with your profile as the master CV.
- **Auto-parse** a pasted job posting into title, company, responsibilities and qualifications.
- **Three output types:**
  - Cover Letter
  - Pitch (short, for Upwork and freelance platforms)
  - Tailored CV + Cover Letter: both written at once, plus a list of gaps between the job post and your CV
- **Tailored CV rules:** uses only facts from your master CV (never invents employers, dates, numbers or qualifications), mirrors the job post's keywords, most relevant experience first, max 2 A4 pages.
- **Tailored CV as PDF**: a clean A4 layout with clickable links, dates aligned with each role, and headings kept with their content. A Word version is also available.
- **Cover letter as Word (.docx)**: Arial 11pt, A4, 2 cm margins.
- **Application tracker (like the ACCA job finder)**: after each generation, the CV (PDF) and cover letter (Google Doc) are saved to a Google Drive folder and the job is logged in the "Applications" tab of a Google Sheet: date, job title, company, platform, job link, output type, profile, tone, match score, why it fits, gaps, status, applied date, file links and notes. One row per job: generating again for the same job link (or the same title and company) updates that row, and Status, Applied Date and Notes are never overwritten. The sheet ID and folder ID are set in `src/lib/tracker.ts`.
- **Profiles and history** are saved privately to your Claude account and follow you across devices.

## Build and publish

```bash
npm install
npm run build:artifact   # writes dist/artifact.html
```

Publish `dist/artifact.html` as a claude.ai artifact with these capabilities: `sample` (Claude access), `db` + `user` (private storage), `downloads` (PDF, Word and text downloads), and `mcp` with Google Drive (`create_file`) and Google Sheets (`get_values`, `append_values`, `update_values`) for the tracker.

`npm run dev` runs the app locally, but Claude access and storage only work inside claude.ai; locally it falls back to browser storage and generation is unavailable.
