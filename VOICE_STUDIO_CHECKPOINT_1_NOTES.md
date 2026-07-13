# Voice Studio Stability Checkpoint 1

## Main fixes
- Added explicit Voice Gender Lock: Auto, Male, Female.
- Fixed a critical bug where most UI voice names were rejected server-side and silently fell back to Zephyr.
- Server now accepts all 30 official Gemini TTS prebuilt voice names used by the app.
- Rebuilt voice prompt priority: voice identity > gender > age > pace > emotion > human acting.
- Middle-aged profile is now explicitly 40–55 years old and forbidden from sounding elderly/frail.
- Pace now uses stronger natural-language locks with short-pause and rhythm instructions.
- Added conflict rules so words such as warm, wise, soft, or dramatic cannot override gender, age, or pace.
- Player label now shows resolved gender, age, emotion, and human acting layer.

## Cost
No additional paid service. Uses the existing Gemini TTS endpoint only when generating audio.

## Test recommendation
Use the same short script for every comparison. Test Male + Middle-aged with Charon, Orus, Alnilam, or Sadaltager at 1.0x and 1.3x.
