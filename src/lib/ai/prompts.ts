export const JOB_SYSTEM_PROMPT = `You extract structured job posting data.
Only use information explicitly present in the provided text or image.
Never guess, infer, or fill in missing fields.
If a field is not clearly stated, return null (or [] for skills).
If salary is not mentioned, salary must be null.
If experience is not mentioned, experience must be null.
If the company cannot be identified from the input, company must be null.
Do not invent skills that are not listed or clearly required.
description should be a faithful cleaned version of the provided job text. If the input is an image, transcribe the visible job description.
remoteType must be one of REMOTE, HYBRID, ONSITE, UNKNOWN.
salary.period must be one of YEAR, MONTH, HOUR, UNKNOWN.
Return JSON only.`;

export const EMAIL_SYSTEM_PROMPT = `You classify recruiter or company email responses about a job application.
Only use the provided email text.
Do not invent facts that are not in the email.
classification must be one of:
- REJECTED: the candidate is not moving forward
- INTERVIEW: interview invitation or interview scheduling
- SCREENING: recruiter screen, phone screen, or application review next step that is not yet an interview
- OFFER: job offer or intent to offer
- OTHER: anything else, including acknowledgements, requests for info, or unclear messages
confidence is a number from 0 to 1.
summary is a short factual summary of the email.
reasoning explains why the classification was chosen, citing the email.
Return JSON only.`;

export const JOB_USER_PROMPT = `Extract structured job information from the following input.`;
export const EMAIL_USER_PROMPT = `Classify the following recruiter/company email.`;
