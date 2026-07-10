import { buildRecruitmentPrompt, RecruitmentFormData, validateRecruitmentData } from './RecruitmentDNA';

const DRAFT_KEY = 'kcs_design_recruitment_draft_v2';
let logoObjectUrl = '';

const fieldIds = [
  'designCompanyName','designIndustry','designPosition','designEmploymentType','designWorkMode',
  'designLocation','designSalary','designRequirements','designResponsibilities','designBenefits',
  'designDeadline','designContact','designCTA','designStyle','designRatio','designExtraNotes',
  'designLogoName','designPrimaryColor','designSecondaryColor'
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
    logoName: value('designLogoName'),
    primaryColor: value('designPrimaryColor'),
    secondaryColor: value('designSecondaryColor'),
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
      designLogoName: data.logoName, designPrimaryColor: data.primaryColor, designSecondaryColor: data.secondaryColor,
    };
    Object.entries(map).forEach(([id, nextValue]) => {
      const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
      if (el && typeof nextValue === 'string') el.value = nextValue;
    });
    updateDesignStudioUI();
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
  removeDesignLogo();
  updateDesignStudioUI();
}

const industryRules: Record<string, { style: string; visual: string; accent: string; benefit: string }> = {
  Technology: { style: 'Modern Corporate', visual: 'modern workspace, laptop, subtle technology elements', accent: '#2563EB', benefit: 'Remote option, learning budget, internet allowance' },
  Retail: { style: 'Bold Recruitment', visual: 'professional retail team and clean store environment', accent: '#F97316', benefit: 'Sales incentive, uniform, employee discount' },
  Hospitality: { style: 'Luxury Corporate', visual: 'welcoming hospitality staff and premium interior', accent: '#B45309', benefit: 'Service charge, meal, uniform' },
  'Food & Beverage': { style: 'Friendly Startup', visual: 'professional restaurant or kitchen team', accent: '#DC2626', benefit: 'Meal allowance, service charge, shift incentive' },
  Healthcare: { style: 'Minimalist Professional', visual: 'clean healthcare environment and trusted medical staff', accent: '#0D9488', benefit: 'Medical benefit, shift allowance, certification support' },
  Education: { style: 'Friendly Startup', visual: 'bright learning environment and approachable educators', accent: '#7C3AED', benefit: 'Training, teaching resources, development program' },
  Finance: { style: 'Luxury Corporate', visual: 'premium corporate office and confident professional team', accent: '#1E3A8A', benefit: 'Performance bonus, insurance, professional certification' },
  Logistics: { style: 'Bold Recruitment', visual: 'organized warehouse or logistics operation', accent: '#EA580C', benefit: 'Shift allowance, transport, meal allowance' },
  Manufacturing: { style: 'Modern Corporate', visual: 'safe modern factory and professional operators', accent: '#475569', benefit: 'Shift allowance, safety equipment, meal allowance' },
};

function setText(id: string, text: string): void {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

export function updateDesignStudioUI(): void {
  const data = readRecruitmentForm();
  const required = [data.companyName, data.position, data.requirements, data.contact];
  const important = [data.industry, data.location, data.responsibilities, data.benefits, data.deadline, data.logoName];
  const completeRequired = required.filter(Boolean).length;
  const completeImportant = important.filter(Boolean).length;
  const progress = Math.round(((completeRequired * 2 + completeImportant) / (required.length * 2 + important.length)) * 100);
  const safeProgress = Number.isFinite(progress) ? progress : 0;

  const bar = document.getElementById('designProgressBar') as HTMLElement | null;
  if (bar) bar.style.width = `${safeProgress}%`;
  setText('designProgressValue', `${safeProgress}%`);
  setText('designRequiredStatus', completeRequired === 4 ? 'Data wajib lengkap' : `${completeRequired}/4 data wajib lengkap`);

  const rule = industryRules[data.industry] || {
    style: data.style || 'Modern Corporate',
    visual: 'professional employee or role-related workplace visual',
    accent: data.primaryColor || '#C026D3',
    benefit: 'Tambahkan benefit paling menarik untuk kandidat',
  };
  setText('designRecommendationStyle', data.style || rule.style);
  setText('designRecommendationVisual', rule.visual);
  setText('designRecommendationBenefit', rule.benefit);

  const color = data.primaryColor || rule.accent;
  const swatch = document.getElementById('designRecommendationSwatch') as HTMLElement | null;
  if (swatch) swatch.style.backgroundColor = color;
  setText('designRecommendationColor', color.toUpperCase());
}

export function applyIndustryRecommendation(): void {
  const data = readRecruitmentForm();
  const rule = industryRules[data.industry];
  if (!rule) return;
  const style = document.getElementById('designStyle') as HTMLSelectElement | null;
  const primary = document.getElementById('designPrimaryColor') as HTMLInputElement | null;
  if (style) style.value = rule.style;
  if (primary && !primary.value) primary.value = rule.accent;
  updateDesignStudioUI();
}

function componentToHex(value: number): string {
  return Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0');
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`.toUpperCase();
}

function luminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export async function handleDesignLogo(file: File): Promise<void> {
  if (!file.type.startsWith('image/')) throw new Error('File logo harus berupa gambar.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Ukuran logo maksimal 5 MB.');

  if (logoObjectUrl) URL.revokeObjectURL(logoObjectUrl);
  logoObjectUrl = URL.createObjectURL(file);
  const preview = document.getElementById('designLogoPreview') as HTMLImageElement | null;
  if (preview) preview.src = logoObjectUrl;
  document.getElementById('designLogoEmpty')?.classList.add('hidden');
  document.getElementById('designLogoPreviewWrap')?.classList.remove('hidden');
  const logoName = document.getElementById('designLogoName') as HTMLInputElement | null;
  if (logoName) logoName.value = file.name;
  setText('designLogoFileName', file.name);

  const img = new Image();
  img.src = logoObjectUrl;
  await img.decode();
  const canvas = document.createElement('canvas');
  const size = 80;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Browser tidak mendukung analisis warna.');
  ctx.clearRect(0, 0, size, size);
  const scale = Math.min(size / img.width, size / img.height);
  const width = img.width * scale;
  const height = img.height * scale;
  ctx.drawImage(img, (size - width) / 2, (size - height) / 2, width, height);
  const pixels = ctx.getImageData(0, 0, size, size).data;
  const buckets = new Map<string, { r: number; g: number; b: number; count: number }>();

  for (let i = 0; i < pixels.length; i += 16) {
    const alpha = pixels[i + 3];
    if (alpha < 100) continue;
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    if (r > 245 && g > 245 && b > 245) continue;
    if (r < 12 && g < 12 && b < 12) continue;
    const qr = Math.round(r / 32) * 32;
    const qg = Math.round(g / 32) * 32;
    const qb = Math.round(b / 32) * 32;
    const key = `${qr},${qg},${qb}`;
    const bucket = buckets.get(key) || { r: 0, g: 0, b: 0, count: 0 };
    bucket.r += r; bucket.g += g; bucket.b += b; bucket.count += 1;
    buckets.set(key, bucket);
  }

  const colors = [...buckets.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)
    .map((x) => ({ r: x.r / x.count, g: x.g / x.count, b: x.b / x.count, count: x.count }));
  const primaryColor = colors[0] || { r: 192, g: 38, b: 211 };
  const secondaryColor = colors.find((c) => Math.abs(luminance(c.r, c.g, c.b) - luminance(primaryColor.r, primaryColor.g, primaryColor.b)) > 45) || colors[1] || { r: 255, g: 255, b: 255 };
  const primaryHex = rgbToHex(primaryColor.r, primaryColor.g, primaryColor.b);
  const secondaryHex = rgbToHex(secondaryColor.r, secondaryColor.g, secondaryColor.b);
  const primaryInput = document.getElementById('designPrimaryColor') as HTMLInputElement | null;
  const secondaryInput = document.getElementById('designSecondaryColor') as HTMLInputElement | null;
  if (primaryInput) primaryInput.value = primaryHex;
  if (secondaryInput) secondaryInput.value = secondaryHex;
  const primarySwatch = document.getElementById('designPrimarySwatch') as HTMLElement | null;
  const secondarySwatch = document.getElementById('designSecondarySwatch') as HTMLElement | null;
  if (primarySwatch) primarySwatch.style.backgroundColor = primaryHex;
  if (secondarySwatch) secondarySwatch.style.backgroundColor = secondaryHex;
  setText('designPrimaryColorLabel', primaryHex);
  setText('designSecondaryColorLabel', secondaryHex);
  updateDesignStudioUI();
}

export function removeDesignLogo(): void {
  if (logoObjectUrl) URL.revokeObjectURL(logoObjectUrl);
  logoObjectUrl = '';
  const input = document.getElementById('designLogoInput') as HTMLInputElement | null;
  if (input) input.value = '';
  const logoName = document.getElementById('designLogoName') as HTMLInputElement | null;
  const primary = document.getElementById('designPrimaryColor') as HTMLInputElement | null;
  const secondary = document.getElementById('designSecondaryColor') as HTMLInputElement | null;
  if (logoName) logoName.value = '';
  if (primary) primary.value = '';
  if (secondary) secondary.value = '';
  const preview = document.getElementById('designLogoPreview') as HTMLImageElement | null;
  if (preview) preview.removeAttribute('src');
  document.getElementById('designLogoPreviewWrap')?.classList.add('hidden');
  document.getElementById('designLogoEmpty')?.classList.remove('hidden');
  setText('designPrimaryColorLabel', 'Belum dianalisis');
  setText('designSecondaryColorLabel', 'Belum dianalisis');
  const primarySwatch = document.getElementById('designPrimarySwatch') as HTMLElement | null;
  const secondarySwatch = document.getElementById('designSecondarySwatch') as HTMLElement | null;
  if (primarySwatch) primarySwatch.style.backgroundColor = '#334155';
  if (secondarySwatch) secondarySwatch.style.backgroundColor = '#64748B';
  updateDesignStudioUI();
}
