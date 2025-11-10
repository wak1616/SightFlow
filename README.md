# SightFlow Nextech Helper

SightFlow adds a side-panel copilot to Nextech IntelleChart that can capture dictation, analyse encounters with an LLM, and execute scripted updates to chart sections.

## Features

- **AI Documentation Assistant**  
  Dictate or free-type the visit narrative, send it to an LLM (OpenAI by default), and review a structured plan mapped to Nextech sections (History, PSFH/ROS, V & P, Exam, Imp/Plan, Follow Up).

- **One-click automation**  
  After approving the plan, click **Send to Nextech** to run the scripted updates. History + PSFH/ROS are automated today; other sections surface manual TODO notes.

- **Speech capture**  
  Built-in “Listen” button uses Chrome’s Web Speech API for immediate transcription. Transcripts remain local until you explicitly send them to the AI pipeline.

- **Quick actions still available**  
  Retains shortcut buttons (`Alt+Shift+H`, `Alt+Shift+M`) for inserting the default HPI or selecting PMHx conditions without running the AI flow.

- **Patient de-identification**  
  A local alias is generated per patient context before any data is sent to external APIs.

- **Modern UI**  
  Redesigned sidebar with section status chips, animated buttons, AI settings, and inline status feedback.

## Installation

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (top-right).
4. Click **Load unpacked** and choose the project directory.
5. The extension becomes available on `https://app1.intellechart.net/*`.

## Usage

### AI Workflow

1. Open a patient chart in IntelleChart and launch the SightFlow side panel.
2. Capture the visit narrative by dictating (**Start Listening**) or typing into the text area.
3. Click **Send to AI**. SightFlow de-identifies the patient, calls the configured LLM, and surfaces a section-by-section plan.
4. Review the plan. Pending sections turn green; notes indicate items that still require manual follow-up.
5. Click **Send to Nextech** to execute the automated commands. Completed sections turn blue.

### Quick Action Buttons

- 📝 **Insert HPI** – same as pressing `Alt+Shift+H`
- 🔍 **Select PMH** – same as pressing `Alt+Shift+M`

### Keyboard Shortcuts

- `Alt+Shift+H` – trigger the HPI workflow
- `Alt+Shift+M` – trigger the PSFH/ROS workflow

## AI & Speech Configuration

1. In the sidebar, open **AI Settings**.
2. Choose a provider (OpenAI is implemented today).
3. Enter your OpenAI API key (`sk-...`). The key is stored locally via `chrome.storage.local`.
4. Optionally adjust the model (defaults to `gpt-4o-mini`) and temperature (`0.1`).

### Recommended Provider Stack

- **LLM Planning:** `gpt-4o-mini` (OpenAI Responses / Chat Completions)  
  Delivers reliable JSON plans with a low-latency footprint suitable for Manifest V3 service workers.

- **Speech-to-text:** Chrome Web Speech API for quick dictation (no extra API calls).  
  For higher accuracy or noise-robust medical dictation, capture audio separately and send to `gpt-4o-mini-transcribe` (OpenAI Whisper successor) before pasting into the assistant. This keeps the extension lightweight while allowing an end-to-end OpenAI workflow when needed.

## Files

- `manifest.json` – Extension configuration, permissions, side panel entry.
- `background.js` – Service worker orchestrating shortcuts, AI requests, and plan execution.
- `scripts/` – Content scripts and shared utilities injected into IntelleChart.
- `sidebar/` – Sidebar HTML, CSS, and JS (UI, speech, AI orchestration).
- `SIDEBAR_USAGE.md` – Detailed sidebar walkthrough.

## Customisation Notes

- Extend `background.js` → `SECTION_DEFS` and `PLAN_JSON_SCHEMA` to add new automated sections or plan commands.
- Update content scripts (e.g., `history_input.js`, `psfhros_input.js`) to support additional payload fields.
- `sidebar/sidebar.js` centralises UI behaviour; tweak prompts, status text, or add new provider options here.

## Permissions

- `activeTab` – Identify the current IntelleChart tab.
- `commands` – Keyboard shortcuts (`Alt+Shift+H/M`).
- `sidePanel` – Register the sidebar entry.
- `storage` – Persist AI settings and patient alias map.
- `microphone` – Allow voice input via Web Speech API.
- `host_permissions`
  - `https://app1.intellechart.net/*` – Inject content scripts.
  - `https://api.openai.com/*` – Call OpenAI APIs.

## Development

- Manifest V3 compliant, runs in a service worker context.
- Speech recognition uses the browser API; no external dependencies are bundled.
- Works best on the latest Chrome (desktop) with microphone access enabled.

## Version

Current version: 0.1.0

