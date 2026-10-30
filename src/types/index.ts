export interface Profile {
  id: string
  name: string // e.g. "AI Automation Role", "PM Role"
  resumeText: string
  toolsAndSkills: string
  portfolioUrl: string
  portfolioProjects: string
  contactBlock: string // name, email, phone, linkedin, resume link
  specialInstructions: string
  cvFileName?: string // name of the uploaded master CV file, if any
}

export interface JobInput {
  jobTitle: string
  companyName: string
  addressTo: string
  platform: string // where job was posted
  jobUrl?: string // link to the job post (used to avoid duplicate tracker rows)
  companyOverview: string
  jobSummary: string
  responsibilities: string
  qualifications: string
  additionals: string
}

export type ToneOption = 'professional' | 'assertive' | 'warm'

export type OutputMode = 'cover_letter' | 'pitch' | 'cv_and_letter'

export interface HistoryEntry {
  id: string
  createdAt: string // ISO date string
  profileName: string
  jobTitle: string
  companyName: string
  tone: ToneOption
  outputMode: OutputMode
  output: string // cover letter or pitch
  cv?: string // tailored CV (cv_and_letter mode)
  gaps?: string // gaps between the job post and the CV
  jobUrl?: string
  platform?: string
  matchScore?: number | null
  trackerNote?: string // result of saving to Drive / Google Sheets
}
