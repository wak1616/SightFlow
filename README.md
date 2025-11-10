# SightFlow Nextech Helper

A Manifest V3 Chrome extension that brings an AI-assisted copilot into the Nextech (Intellechart) workflow. SightFlow captures free text or speech, produces an LLM-generated plan for each chart section, and executes vetted changes on demand.

## Key Features

- **Voice or Free-Text Capture** – Dictate encounter notes via the Listen button or type directly into the sidebar.
- **LLM Driven Planner** – “Send to AI” analyzes the narrative and prepares section-specific commands (History, PSFH/ROS, etc.).
- **Pending Section Dashboard** – Each Nextech section receives a status card, editable notes, and visual indicators when changes await approval.
- **One-Click Execution** – “Send to Nextech” runs the approved automation (currently History + PSFH/ROS) by invoking the existing keyboard command flows.
- **De-identification Pipeline** – Patient context strings are hashed into a local chart ID before any outbound API request; configurable providers live in `chrome.storage`.
- **Fallback Heuristics** – If an LLM or key is unavailable, a local parser still surfaces reasonable default actions.

### Still Available

- `Alt+Shift+H` – Insert/update History section directly.
- `Alt+Shift+M` – Insert/update PSFH/ROS selections.

## Installation

1. Clone the repository or download the source.
2. Navigate to `chrome://extensions/` and enable **Developer mode**.
3. Click **Load unpacked** and select this project folder.
4. Pin the extension and open a patient chart at `https://app1.intellechart.net/*`.

## Configuring the Assistant

1. Open the side panel (extension icon → “Open side panel”).
2. Expand **Assistant Settings**.
3. Select the provider (OpenAI supported in v0.2.0).
4. Supply an API key and, optionally, custom model IDs.
5. Click **Save Settings**. Keys remain local to the browser profile.

Without an API key the extension reverts to heuristics for planning; speech-to-text requires the OpenAI audio endpoint and microphone permission.

## Project Structure

| Path | Purpose |
| --- | --- |
| `manifest.json` | Extension manifest (MV3) and permissions |
| `background.js` | Service worker: commands, LLM/STT orchestration, de-identification |
| `scripts/shared_utils.js` | DOM helpers shared by content scripts |
| `scripts/history_input.js` | Applies History updates within Nextech |
| `scripts/psfhros_input.js` | Applies PSFH/ROS updates within Nextech |
| `sidebar/` | Sidebar UI (HTML/CSS/JS) |
| `SIDEBAR_USAGE.md` | Detailed usage guide |

## Permissions

- `activeTab` – Identify the focused chart tab for messaging.
- `commands` – Register keyboard shortcuts (`Alt+Shift+H/M`).
- `sidePanel` – Provide the modern Chrome side panel UI.
- `storage` – Persist assistant configuration, chart ID mapping.
- `optional_permissions: audioCapture` – Request microphone access when voice capture is used.
- `host_permissions` – Scoped to `https://app1.intellechart.net/*`.

## Development Notes

- Built for modern Chromium browsers with Manifest V3.
- No bundler—plain ES and DOM APIs keep the footprint small.
- Voice capture uses `MediaRecorder`; ensure HTTPS contexts during testing.
- LLM calls target `https://api.openai.com/` (routes configurable in `background.js`).

## Version

- Current version: **0.2.0**

## License

TBD (add license details if required).
