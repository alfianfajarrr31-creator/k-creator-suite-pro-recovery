# Affiliate Reference Brain v1.5.1 — Output Panel Fix

Fixes a UI state bug where affiliate generation could show a success toast but the generated package did not appear in the workspace.

## Root Cause
- Generate logic was trying to unhide `affiliateOutputFilled`, but the actual HTML container is `affiliateOutputPanel`.
- Prompt Bank fields were also written to an old/non-existent `affiliatePromptBankText` id, while the v1.4/v1.5 UI uses separate fields:
  - `affiliateImagePromptsText`
  - `affiliateVideoPromptsText`
  - `affiliateNarrationText`

## Fix
- Generate now hides `affiliateOutputEmpty` and unhides `affiliateOutputPanel`.
- Generate now fills all visible and hidden output fields used by direct copy buttons:
  - strategy
  - angles
  - hooks
  - storyboard
  - upload copy
  - image prompts
  - video prompts
  - narration/VO
  - safe version

## Validation
- npm install: OK
- npm run lint: OK
- npm run build: OK
