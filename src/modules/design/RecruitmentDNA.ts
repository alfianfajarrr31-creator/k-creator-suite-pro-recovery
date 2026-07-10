export type RecruitmentFormData = {
  companyName: string;
  industry: string;
  position: string;
  employmentType: string;
  workMode: string;
  location: string;
  salary: string;
  requirements: string;
  responsibilities: string;
  benefits: string;
  deadline: string;
  contact: string;
  cta: string;
  style: string;
  ratio: string;
  extraNotes: string;
  logoName: string;
  primaryColor: string;
  secondaryColor: string;
};

export const recruitmentDNA = {
  id: 'recruitment-poster-v2',
  version: '2.0.0',
  name: 'Recruitment Designer',
  required: ['companyName', 'position', 'requirements', 'contact'],
  supportedOutputs: ['1:1', '4:5', '9:16', 'A4'],
  zeroCost: true,
};

function cleanLines(value: string): string[] {
  return value.split(/\n|;/).map((item) => item.trim()).filter(Boolean);
}

export function validateRecruitmentData(data: RecruitmentFormData): string[] {
  const missing: string[] = [];
  if (!data.companyName) missing.push('Nama perusahaan');
  if (!data.position) missing.push('Posisi lowongan');
  if (!data.requirements) missing.push('Requirement');
  if (!data.contact) missing.push('Kontak lamaran');
  return missing;
}

export function buildRecruitmentPrompt(data: RecruitmentFormData): string {
  const requirements = cleanLines(data.requirements);
  const responsibilities = cleanLines(data.responsibilities);
  const benefits = cleanLines(data.benefits);
  const brandColors = [data.primaryColor, data.secondaryColor].filter(Boolean).join(' and ');

  const blocks = [
    `Create a professional recruitment poster for ${data.companyName}.`,
    data.logoName ? `Use the uploaded company logo named "${data.logoName}" faithfully. Do not redraw, distort, replace, or invent the logo.` : `Reserve a clean logo area at the top-left without inventing a logo.`,
    brandColors ? `Brand palette: use ${brandColors} as the main visual colors, with accessible contrast and neutral supporting tones.` : '',
    data.industry ? `Industry: ${data.industry}.` : '',
    `Main headline: "WE'RE HIRING". Job position: "${data.position}".`,
    `Employment type: ${data.employmentType}. Work arrangement: ${data.workMode}.`,
    data.location ? `Placement/location: ${data.location}.` : '',
    data.salary ? `Salary information to display: ${data.salary}.` : '',
    requirements.length ? `Requirements section: ${requirements.join(' • ')}.` : '',
    responsibilities.length ? `Responsibilities section: ${responsibilities.join(' • ')}.` : '',
    benefits.length ? `Benefits section: ${benefits.join(' • ')}.` : '',
    data.deadline ? `Application deadline: ${data.deadline}.` : '',
    `Application contact: ${data.contact}. Call to action: "${data.cta}".`,
    `Visual style: ${data.style}. Output format: ${data.ratio}.`,
    `Use a clean information hierarchy: company identity at top, strong job title as the hero text, concise requirement and benefit blocks, and a highly visible application CTA at the bottom. Keep generous spacing, professional typography, strong contrast, and social-media-safe margins.`,
    `Use one relevant professional hero visual such as an employee, office, or role-related workplace scene. Avoid crowded compositions and keep enough negative space for readable copy.`,
    data.extraNotes ? `Additional direction: ${data.extraNotes}.` : '',
    `All visible poster text must be spelled correctly and remain readable. Do not invent company facts, salary, benefits, requirements, contact details, deadlines, QR codes, or certifications. Do not add watermarks, fake logos, random icons, illegible text, excessive decoration, duplicated limbs, or unrelated people.`
  ];

  return blocks.filter(Boolean).join('\n\n');
}
