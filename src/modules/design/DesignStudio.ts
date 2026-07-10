import { buildRecruitmentPrompt, RecruitmentFormData, validateRecruitmentData } from './RecruitmentDNA';

const DRAFT_KEY = 'kcs_design_recruitment_draft_v1';

const fieldIds = [
  'designCompanyName','designIndustry','designPosition','designEmploymentType','designWorkMode',
  'designLocation','designSalary','designRequirements','designResponsibilities','designBenefits',
  'designDeadline','designContact','designCTA','designStyle','designRatio','designExtraNotes'
] as const;

function value(id: string): string {
  return (document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null)?.value?.trim() || '';
}

export function readRecruitmentForm(): RecruitmentFormData {
  return {
    companyName: value('designCompanyName'),
    industry: value('designIndustry'),
    position: value('designPosition'),
    employmentType: value('designEmploymentType') || 'Full Time',
    workMode: value('designWorkMode') || 'WFO',
    location: value('designLocation'),
    salary: value('designSalary'),
    requirements: value('designRequirements'),
    responsibilities: value('designResponsibilities'),
    benefits: value('designBenefits'),
    deadline: value('designDeadline'),
    contact: value('designContact'),
    cta: value('designCTA') || 'Apply Now',
    style: value('designStyle') || 'Modern Corporate',
    ratio: value('designRatio') || '4:5',
    extraNotes: value('designExtraNotes'),
  };
}

export function generateRecruitmentPrompt(): { prompt: string; missing: string[] } {
  const data = readRecruitmentForm();
  return { prompt: buildRecruitmentPrompt(data), missing: validateRecruitmentData(data) };
}

export function saveRecruitmentDraft(): void {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(readRecruitmentForm()));
}

export function loadRecruitmentDraft(): boolean {
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) return false;
  try {
    const data = JSON.parse(raw);
    const map: Record<string, string> = {
      designCompanyName: data.companyName, designIndustry: data.industry, designPosition: data.position,
      designEmploymentType: data.employmentType, designWorkMode: data.workMode, designLocation: data.location,
      designSalary: data.salary, designRequirements: data.requirements, designResponsibilities: data.responsibilities,
      designBenefits: data.benefits, designDeadline: data.deadline, designContact: data.contact,
      designCTA: data.cta, designStyle: data.style, designRatio: data.ratio, designExtraNotes: data.extraNotes,
    };
    Object.entries(map).forEach(([id, nextValue]) => {
      const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
      if (el && typeof nextValue === 'string') el.value = nextValue;
    });
    return true;
  } catch {
    return false;
  }
}

export function clearRecruitmentDraft(): void {
  localStorage.removeItem(DRAFT_KEY);
  fieldIds.forEach((id) => {
    const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
    if (!el) return;
    if (id === 'designEmploymentType') el.value = 'Full Time';
    else if (id === 'designWorkMode') el.value = 'WFO';
    else if (id === 'designCTA') el.value = 'Apply Now';
    else if (id === 'designStyle') el.value = 'Modern Corporate';
    else if (id === 'designRatio') el.value = '4:5';
    else el.value = '';
  });
}
