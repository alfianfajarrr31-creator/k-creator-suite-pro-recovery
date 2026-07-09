# Affiliate Studio v1.4 UX & Direct Copy Patch

## Main changes
- Affiliate Studio changed into a lighter step-based flow.
- Product Source section now supports:
  - product name
  - optional product link
  - optional product image upload
  - optional model/host image upload
- Advanced details are collapsed by default.
- Output is separated into result tabs:
  - Scene Package
  - Upload Copy
  - Prompt Bank
  - Safe Version
- Scene output is rendered as cards instead of one long text block.
- Every scene card has direct copy buttons:
  - Copy Full Scene
  - Copy VO
  - Copy TTI
  - Copy ITV
  - Copy Visual
  - Copy Text Overlay
  - Copy SFX
- Section copy buttons added:
  - Copy All Package
  - Copy All Scenes
  - Copy All TTI
  - Copy All ITV
  - Copy All VO
  - Copy Upload Copy
  - Copy Safe Version

## Validation
- npm install succeeded locally.
- npm run lint succeeded.
- npm run build succeeded.

## Notes
- The source zip had one stray Voice Lab return line that broke TypeScript validation. It was removed as a safe cleanup.
