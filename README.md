# SightFlow Nextech Helper

A Chrome MV3 extension that streamlines Nextech charting by pairing quick keyboard triggers with an LLM-assisted sidebar co-pilot for History and PMHx data entry.

## Key Features

- **AI Assistant Sidebar**: Dictate or free-type patient narratives, generate an AI plan, and preview section-specific automation before approval.
- **Speech Capture**: One-click microphone capture (Web Speech API) with visual feedback; auto-saves draft transcripts locally.
- **Section Awareness**: Tracks History, PSFH/ROS, V & P, Exam, Imp/Plan, and Follow Up sections, highlighting pending updates that the AI proposes.
- **Pluggable LLM Planner**: Ships with deterministic heuristics and supports remote OpenAI planning once an API key is stored via `chrome.storage`.
- **Chart Execution Pipeline**: “Send to Nextech” replays approved commands through existing content scripts (e.g., `sf-insert-hpi`, `sf-insert-psfhros`).
- **Keyboard Shortcuts**: Continue using `Alt+Shift+H` and `Alt+Shift+M` for quick History/PMHx updates while the assistant evolves.

## Installation

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top-right corner.
4. Click **Load unpacked** and select the project root.
5. Open a patient chart at `https://app1.intellechart.net/*` and launch the SightFlow side panel.

## Using the Assistant Sidebar

1. Click **Listen** to dictate (or type directly into the transcript area). Draft text is persisted locally.
2. (Optional) Enter a de-identified chart number. This value is sent to the planner instead of PHI.
3. Press **Send to AI**. The background worker either:
   - Calls OpenAI (if an API key is configured), or
   - Falls back to local heuristics for common phrases (e.g., Diverticulosis → PSFH/ROS).
4. Review the generated plan. Sections with pending updates glow green.
5. Click **Send to Nextech** to run the queued commands inside the live chart.

## Configuring the LLM + Speech Stack

The extension defaults to Chrome’s built-in Web Speech API for transcription and a heuristic planner. To enable full LLM planning and server-grade transcription:

1. Acquire an OpenAI API key with access to:
   - `gpt-4o-mini` (planning)
   - `gpt-4o-mini-transcribe` (speech-to-text, optional)
2. Open the DevTools console for the sidebar (`chrome://extensions`, “Inspect views”).
3. Store secrets in `chrome.storage.local`:
   ```js
   chrome.storage.local.set({
     openAiApiKey: 'sk-...',
     openAiModel: 'gpt-4o-mini'
   });
   ```
4. (Optional) Add a custom system prompt via `plannerSystemPrompt` to fine-tune command selection.

> **HIPAA Note**: The assistant sends only de-identified chart aliases plus the free-text transcript. Mapping between real PHI and the alias should remain on the clinician’s local system.

## Modifying/Extending Automations

- Update `background.js` → `SUPPORTED_COMMANDS` and `SECTION_IDS` when new sections or commands go live.
- Extend `scripts/history_input.js` or `scripts/psfhros_input.js` to accept richer payloads (e.g., medications, ROS details).
- Enhance heuristics in `buildHeuristicPlan` to cover more conditions while testing without LLM calls.
- Add new content scripts for V & P, Exam, etc., and emit matching planner actions.

## File Overview

- `manifest.json` – Extension definition, permissions (`activeTab`, `commands`, `sidePanel`, `storage`, OpenAI host access).
- `background.js` – Service worker orchestrating keyboard shortcuts, AI planning, and action execution.
- `scripts/shared_utils.js` – DOM helpers shared across content scripts.
- `scripts/history_input.js` – Executes `sf-insert-hpi`.
- `scripts/psfhros_input.js` – Executes `sf-insert-psfhros` with dynamic condition lists.
- `sidebar/sidebar.html|css|js` – Assistant UI, state management, speech, and messaging.
- `SIDEBAR_USAGE.md` – Supplemental usage notes for the side panel (if present).

## Development Tips

- The side panel stores drafts in `chrome.storage.local` under `sfAssistantDraft`.
- Toggle heuristics vs. OpenAI by simply adding/removing the API key in storage—no reload needed.
- Use the Chrome DevTools console (`chrome://extensions` → Inspect views → `sidebar.html`) to inspect assistant state.

## License
