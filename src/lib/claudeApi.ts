import type { JobInput, OutputMode, Profile, ToneOption } from '../types'

import {
  useCapability,
  type SampleFn,
} from './claudeRuntime'

const SYSTEM_PROMPT = `You are an expert personal career coach with a strong ability to craft professional, ATS-optimized cover letters. You specialize in tailoring job descriptions to match a resume, highlighting relevant skills and experience while keeping the tone authentic and human-like.`

const PITCH_SYSTEM_PROMPT = `You are an expert freelance proposal writer specializing in Upwork and freelance platform pitches.
You write short, direct, human-sounding pitches that win clients.
You never use formal cover letter structure. No 'Dear Hiring Manager'. No long paragraphs.
You write like a confident specialist talking directly to a client.`

const TONE_DESCRIPTIONS: Record<ToneOption, string> = {
  professional: 'professional = formal and polished',
  assertive: 'assertive = confident and direct',
  warm: 'warm = personable and enthusiastic',
}

function formatToday(): string {
  return new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function buildUserPrompt(
  profile: Profile,
  job: JobInput,
  tone: ToneOption
): string {
  const specialInstructionsSection =
    profile.specialInstructions.trim() !== ''
      ? `
---SPECIAL INSTRUCTIONS---
The applicant has provided these additional rules. Follow them strictly in addition to the standard rules above:
${profile.specialInstructions}
`
      : ''

  const portfolioProjectsSection =
    profile.portfolioProjects.trim() !== ''
      ? `
---PORTFOLIO PROJECTS---
${profile.portfolioProjects}
`
      : ''

  return `Write a customized cover letter using the following inputs. Follow these rules strictly:
1. Emphasize keywords — skills, tools, qualifications, and responsibilities from the job description.
2. Always match skills and experience from the resume. If something is missing, highlight transferable skills.
3. Optimize for ATS keywords.
4. Prioritize relevant experience first.
5. Use action-oriented and quantifiable achievements.
6. Mention the platform where the job was posted (if provided).
7. If any section (Overview, Summary, Responsibilities, Qualifications) is blank, skip it entirely — no placeholder text.
8. State in the letter that a portfolio link has been attached.
9. Do not overstate AI automation experience. The applicant is self-taught (n8n, Make.com, Relevance AI, Zapier) through self-study. Always direct the employer to the portfolio for examples.
10. If a qualification is not directly held, state familiarity and understanding — only highlight qualifications actually present.
11. Express a long-term goal to grow with the company for many years.
12. Convey the desire to be a problem-solving companion, not just an employee — someone who contributes lasting value and customer satisfaction.
13. Use the current date in the letter. Today's date is ${formatToday()}.
14. End the letter with the contact block provided.
15. Tone: ${TONE_DESCRIPTIONS[tone]}.

---PROFILE---
Name context: ${profile.name}
Resume & Experience:
${profile.resumeText}

Tools & Skills:
${profile.toolsAndSkills}
${portfolioProjectsSection}
Portfolio: ${profile.portfolioUrl}

Contact block:
${profile.contactBlock}
${specialInstructionsSection}
---JOB DETAILS---
Job Title: ${job.jobTitle}
Company Name: ${job.companyName}
Address To: ${job.addressTo}
Platform where posted: ${job.platform}
Company Overview: ${job.companyOverview}
Job Summary: ${job.jobSummary}
Responsibilities: ${job.responsibilities}
Qualifications: ${job.qualifications}
Additional notes: ${job.additionals}`
}

const PITCH_TONE_DESCRIPTIONS: Record<ToneOption, string> = {
  professional: 'professional = clear and polished',
  assertive: 'assertive = confident and direct',
  warm: 'warm = friendly and enthusiastic',
}

function buildPitchPrompt(
  profile: Profile,
  job: JobInput,
  tone: ToneOption
): string {
  const specialInstructionsLine =
    profile.specialInstructions.trim() !== ''
      ? `\nSpecial instructions: ${profile.specialInstructions}`
      : ''

  return `Write a short freelance pitch for the following job. Follow these rules strictly:
1. Maximum 200 words. No exceptions.
2. Open with 1 sentence showing you understand their specific problem — reference something concrete from the job description.
3. Follow with 2-3 sentences showing you have done this exact thing before — reference 1-2 specific portfolio projects with outcomes and links.
4. 1 sentence on your relevant tools/approach for this specific job.
5. Close with 1 short confident sentence expressing enthusiasm and availability.
6. NO formal greetings, NO "Dear", NO sign-off, NO contact block, NO date.
7. Write in first person, conversational tone — like a human specialist, not a robot.
8. If special instructions are provided, follow them strictly.
9. Tone modifier: ${PITCH_TONE_DESCRIPTIONS[tone]}.

---PROFILE---
Name: ${profile.name}
Experience summary: ${profile.resumeText.slice(0, 500)}
Tools & Skills: ${profile.toolsAndSkills.slice(0, 300)}
Portfolio projects: ${profile.portfolioProjects}${specialInstructionsLine}

---JOB DETAILS---
Job Title: ${job.jobTitle}
Platform: ${job.platform}
Company/Client: ${job.companyName}
Job Summary: ${job.jobSummary}
Responsibilities: ${job.responsibilities}
Qualifications: ${job.qualifications}
Additionals: ${job.additionals}`
}

export interface CallOptions {
  onText?: (text: string) => void
  signal?: AbortSignal
  quick?: boolean
}

// Runs the prompt on the viewer's own Claude account through the artifact
// runtime. No API key is involved, so nothing secret ships with the page.
async function callClaude(
  system: string,
  userContent: string,
  opts: CallOptions = {}
): Promise<string> {
  const sample = await useCapability<SampleFn>('sample')
  if (!sample) {
    throw new Error(
      'Claude is only available when this page is opened inside claude.ai.'
    )
  }
  // The runtime has no separate system prompt, so the role goes first.
  const input = `${system}\n\n${userContent}\n\nReply with only the requested output, no preamble or commentary.`
  const { text } = await sample(input, {
    onText: opts.onText ? ({ text }) => opts.onText!(text) : undefined,
    signal: opts.signal,
    modelTier: opts.quick ? 'quick' : 'default',
    cache: false,
  })
  const out = text.trim()
  if (!out) throw new Error('Claude returned an empty response.')
  return out
}

/**
 * Generate a tailored cover letter (or freelance pitch) from a profile,
 * job input, tone, and output mode.
 */
export async function generateCoverLetter(
  profile: Profile,
  job: JobInput,
  tone: ToneOption,
  outputMode: OutputMode = 'cover_letter',
  opts: CallOptions = {}
): Promise<string> {
  if (outputMode === 'pitch') {
    const pitchPrompt = buildPitchPrompt(profile, job, tone)
    return callClaude(PITCH_SYSTEM_PROMPT, pitchPrompt, opts)
  }
  const userPrompt = buildUserPrompt(profile, job, tone)
  return callClaude(SYSTEM_PROMPT, userPrompt, opts)
}

/**
 * Parse a raw job description into structured JobInput fields using Claude.
 * Returns a partial JobInput with whatever fields could be extracted.
 */
export async function parseJobDescription(
  rawText: string
): Promise<Partial<JobInput>> {
  const system =
    'You extract structured data from job postings. You only ever respond with a single valid JSON object and nothing else.'

  const userContent = `Extract the following fields from the job description below and return ONLY a JSON object with these exact keys (use an empty string "" for anything not present):

{
  "jobTitle": "",
  "companyName": "",
  "addressTo": "",
  "platform": "",
  "companyOverview": "",
  "jobSummary": "",
  "responsibilities": "",
  "qualifications": "",
  "additionals": ""
}

Job description:
"""
${rawText}
"""`

  const responseText = await callClaude(system, userContent, { quick: true })

  // Pull the JSON object out of the response, even if wrapped in prose/fences.
  const match = responseText.match(/\{[\s\S]*\}/)
  if (!match) {
    throw new Error('Could not parse structured fields from the response.')
  }

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(match[0])
  } catch {
    throw new Error('The extracted fields were not valid JSON.')
  }

  const keys: (keyof JobInput)[] = [
    'jobTitle',
    'companyName',
    'addressTo',
    'platform',
    'companyOverview',
    'jobSummary',
    'responsibilities',
    'qualifications',
    'additionals',
  ]

  const result: Partial<JobInput> = {}
  for (const key of keys) {
    const value = parsed[key]
    if (typeof value === 'string' && value.trim() !== '') {
      result[key] = value
    }
  }
  return result
}
