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
- **Download as Word (.docx)** with clean formatting: Arial 11pt, real headings and bullets, A4, 2 cm margins.
- **Profiles and history** are saved privately to your Claude account and follow you across devices.

## Build and publish

```bash
npm install
npm run build:artifact   # writes dist/artifact.html
```

Publish `dist/artifact.html` as a claude.ai artifact with these capabilities: `sample` (Claude access), `db` + `user` (private storage), `downloads` (Word/text downloads).

`npm run dev` runs the app locally, but Claude access and storage only work inside claude.ai; locally it falls back to browser storage and generation is unavailable.
