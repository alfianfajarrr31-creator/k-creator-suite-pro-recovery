import { buildRecruitmentPrompt, RecruitmentFormData, validateRecruitmentData } from './RecruitmentDNA';
import { fetchWithBackoff } from '../../GeminiService';

const DRAFT_KEY = 'kcs_design_recruitment_draft_v3';
const TEMPLATE_KEY = 'kcs_design_recruitment_template_v1';
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
  const report = analyzeRecruitmentContent();
  setText('designContentScore', `${report.score}%`);
  setText('designDensityStatus', report.over > 0 || report.long > 0 ? 'Konten terlalu padat untuk ukuran ini' : 'Kepadatan konten aman');
  setText('designDensityDetail', `${report.total} poin • ${report.over} melebihi kapasitas • ${report.long} bullet terlalu panjang`);
  const scoreBar = document.getElementById('designContentScoreBar') as HTMLElement | null;
  if (scoreBar) scoreBar.style.width = `${report.score}%`;
  const badge = document.getElementById('designDensityBadge');
  if (badge) { badge.textContent = report.over > 0 || report.long > 0 ? 'Perlu diringkas' : 'Siap dipakai'; badge.className = report.over > 0 || report.long > 0 ? 'px-2 py-1 rounded-full text-[9px] font-black bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'px-2 py-1 rounded-full text-[9px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'; }
  updateRecruitmentPreview(data, color);
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


function splitItems(text: string): string[] {
  return text.split(/\r?\n|;/).map((item) => item.trim().replace(/^[-•\d.)\s]+/, '')).filter(Boolean);
}

function lines(text: string, fallback: string, limit = 4): string[] {
  const items = splitItems(text).slice(0, limit);
  return items.length ? items : [fallback];
}

const capacityByRatio: Record<string, { requirements: number; responsibilities: number; benefits: number; maxWords: number }> = {
  '1:1': { requirements: 4, responsibilities: 3, benefits: 3, maxWords: 9 },
  '4:5': { requirements: 5, responsibilities: 4, benefits: 4, maxWords: 10 },
  '9:16': { requirements: 4, responsibilities: 3, benefits: 3, maxWords: 9 },
  '16:9': { requirements: 3, responsibilities: 2, benefits: 2, maxWords: 8 },
  'A4': { requirements: 8, responsibilities: 6, benefits: 5, maxWords: 12 },
  'A3': { requirements: 10, responsibilities: 8, benefits: 6, maxWords: 14 },
};

function compactItem(item: string, maxWords: number): string {
  const words = item.replace(/[.!]+$/, '').split(/\s+/).filter(Boolean);
  return words.length <= maxWords ? words.join(' ') : `${words.slice(0, maxWords).join(' ')}…`;
}

export function analyzeRecruitmentContent() {
  const data = readRecruitmentForm();
  const cap = capacityByRatio[data.ratio] || capacityByRatio['4:5'];
  const groups = {
    requirements: splitItems(data.requirements),
    responsibilities: splitItems(data.responsibilities),
    benefits: splitItems(data.benefits),
  };
  const total = groups.requirements.length + groups.responsibilities.length + groups.benefits.length;
  const over = Math.max(0, groups.requirements.length-cap.requirements) + Math.max(0, groups.responsibilities.length-cap.responsibilities) + Math.max(0, groups.benefits.length-cap.benefits);
  const long = [...groups.requirements, ...groups.responsibilities, ...groups.benefits].filter(x => x.split(/\s+/).length > cap.maxWords).length;
  const densityScore = Math.max(20, Math.min(100, 100 - over*8 - long*4));
  const completeness = [data.companyName,data.position,data.requirements,data.contact].filter(Boolean).length / 4 * 100;
  const score = Math.round(densityScore*0.55 + completeness*0.45);
  return { data, cap, groups, total, over, long, densityScore, score };
}

export function optimizeRecruitmentLocally(): void {
  const report = analyzeRecruitmentContent();
  const mapping: Array<[string, string[], number]> = [
    ['designRequirements', report.groups.requirements, report.cap.requirements],
    ['designResponsibilities', report.groups.responsibilities, report.cap.responsibilities],
    ['designBenefits', report.groups.benefits, report.cap.benefits],
  ];
  mapping.forEach(([id, items, limit]) => {
    const el = document.getElementById(id) as HTMLTextAreaElement | null;
    if (el) el.value = items.slice(0, limit).map(item => compactItem(item, report.cap.maxWords)).join('\n');
  });
  updateDesignStudioUI();
}

export async function optimizeRecruitmentWithAI(): Promise<void> {
  const data = readRecruitmentForm();
  const cap = capacityByRatio[data.ratio] || capacityByRatio['4:5'];
  const response = await fetchWithBackoff('/api/gemini/recruitment-optimize', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requirements: data.requirements, responsibilities: data.responsibilities, benefits: data.benefits, ratio: data.ratio, limits: cap })
  });
  const raw = await response.json();
  const text = raw?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const parsed = typeof text === 'string' ? JSON.parse(text) : text;
  const fields: Array<[string, unknown]> = [['designRequirements', parsed.requirements],['designResponsibilities', parsed.responsibilities],['designBenefits', parsed.benefits]];
  fields.forEach(([id, items]) => { const el=document.getElementById(id) as HTMLTextAreaElement|null; if(el && Array.isArray(items)) el.value=items.join('\n'); });
  updateDesignStudioUI();
}

function renderList(id: string, items: string[]): void {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = items.map((item) => `<li>• ${escapeHtml(item)}</li>`).join('');
}

function escapeHtml(input: string): string {
  return input.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char] || char));
}

function updateRecruitmentPreview(data: RecruitmentFormData, accent: string): void {
  const poster = document.getElementById('designPosterPreview') as HTMLElement | null;
  if (!poster) return;
  poster.style.setProperty('--brand', accent || '#C026D3');
  poster.style.setProperty('--brand2', data.secondaryColor || '#F5D0FE');

  setText('designPosterCompany', data.companyName || 'Nama Perusahaan');
  setText('designPosterPosition', data.position || 'Your Next Great Role');
  setText('designPosterEmployment', `${data.employmentType || 'Full Time'} • ${data.workMode || 'WFO'}`.toUpperCase());
  setText('designPosterLocation', `📍 ${data.location || 'Lokasi'}`);
  setText('designPosterCTA', data.cta || 'Apply Now');
  setText('designPosterContact', data.contact || 'email@company.com');
  setText('designPosterDeadline', data.deadline ? `Deadline\n${data.deadline}` : '');
  setText('designPreviewRatioLabel', data.ratio || '4:5');

  const salary = document.getElementById('designPosterSalary');
  if (salary) {
    salary.textContent = data.salary ? `💰 ${data.salary}` : '';
    salary.classList.toggle('hidden', !data.salary);
  }
  const cap = capacityByRatio[data.ratio] || capacityByRatio['4:5'];
  renderList('designPosterRequirements', lines(data.requirements, 'Tambahkan requirement utama', cap.requirements));
  renderList('designPosterResponsibilities', lines(data.responsibilities, 'Tambahkan jobdesk utama', cap.responsibilities));
  renderList('designPosterBenefits', lines(data.benefits, 'Tambahkan benefit menarik', cap.benefits));

  const responsibilitySection = document.getElementById('designPosterResponsibilitySection');
  if (responsibilitySection) responsibilitySection.classList.toggle('hidden', !data.responsibilities.trim());
  const benefitSection = document.getElementById('designPosterBenefitSection');
  if (benefitSection) benefitSection.classList.toggle('hidden', !data.benefits.trim());

  const logoSource = document.getElementById('designLogoPreview') as HTMLImageElement | null;
  const posterLogo = document.getElementById('designPosterLogo') as HTMLImageElement | null;
  const fallback = document.getElementById('designPosterLogoFallback');
  const hasLogo = Boolean(logoSource?.src && data.logoName);
  if (posterLogo) {
    if (hasLogo && logoSource) posterLogo.src = logoSource.src;
    else posterLogo.removeAttribute('src');
    posterLogo.classList.toggle('hidden', !hasLogo);
  }
  fallback?.classList.toggle('hidden', hasLogo);

  const ratioMap: Record<string, { width: string; minHeight: string; radius: string }> = {
    '1:1': { width: '480px', minHeight: '480px', radius: '26px' },
    '4:5': { width: '410px', minHeight: '545px', radius: '26px' },
    '9:16': { width: '350px', minHeight: '622px', radius: '26px' },
    '16:9': { width: '650px', minHeight: '366px', radius: '24px' },
    'A4': { width: '420px', minHeight: '594px', radius: '10px' },
    'A3': { width: '440px', minHeight: '622px', radius: '10px' },
  };
  const size = ratioMap[data.ratio] || ratioMap['4:5'];
  poster.style.width = size.width;
  poster.style.minHeight = size.minHeight;
  poster.style.borderRadius = size.radius;

  const style = data.style.toLowerCase();
  poster.style.fontFamily = style.includes('luxury') ? 'Georgia, serif' : 'Inter, ui-sans-serif, system-ui, sans-serif';
  poster.style.background = style.includes('technology') ? 'linear-gradient(145deg,#07111f,#0f172a)' : style.includes('luxury') ? 'linear-gradient(145deg,#fffaf0,#f5ead7)' : style.includes('creative') ? `linear-gradient(145deg,${data.secondaryColor || '#F5D0FE'},#ffffff)` : '#ffffff';
  poster.style.color = style.includes('technology') ? '#f8fafc' : '#0f172a';
}

export function saveRecruitmentTemplate(): void {
  localStorage.setItem(TEMPLATE_KEY, JSON.stringify(readRecruitmentForm()));
}

export function loadRecruitmentTemplate(): boolean {
  const raw = localStorage.getItem(TEMPLATE_KEY);
  if (!raw) return false;
  try {
    const data = JSON.parse(raw);
    const map: Record<string, string> = {
      designCompanyName: data.companyName, designIndustry: data.industry,
      designEmploymentType: data.employmentType, designWorkMode: data.workMode,
      designLocation: data.location, designContact: data.contact, designCTA: data.cta,
      designStyle: data.style, designRatio: data.ratio, designExtraNotes: data.extraNotes,
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

export function exportRecruitmentPrompt(format: 'txt' | 'md'): boolean {
  const prompt = document.getElementById('designPromptOutput')?.textContent?.trim() || '';
  if (!prompt) return false;
  const data = readRecruitmentForm();
  const safeName = `${data.companyName || 'company'}-${data.position || 'recruitment-poster'}`
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const content = format === 'md' ? `# Recruitment Poster Prompt\n\n${prompt}\n` : prompt;
  const blob = new Blob([content], { type: format === 'md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${safeName || 'recruitment-poster-prompt'}.${format}`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return true;
}
