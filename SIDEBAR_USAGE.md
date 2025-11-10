# SightFlow Sidebar Usage Guide

## Opening the Side Panel

1. Click the SightFlow extension in the Chrome toolbar and choose **Open side panel**  
2. Or open Chrome’s three-dot menu → **More Tools** → **Side Panel** → **SightFlow**

> The assistant optimizes the charting workflow in Intellechart (`app1.intellechart.net`). Keep a patient chart open for best results.

## Encounter Capture

1. **Listen** – Hit **Start Listening** to capture dictation. Speak normally and press again to stop. The audio is transcribed and appended to the Encounter Notes text box (you can also type directly).
2. **Review/Edit Notes** – Edit the captured text freely in the Encounter Notes area.
3. **Send to AI** – Enabled once notes are present. Clicking sends the narrative to the assistant, which produces a structured chart update plan.
4. **Status Banner** – Every step surfaces feedback (info, success, warning, or error) at the bottom of the panel.

## Section Planner

- Each Nextech section (History, PSFH/ROS, V & P, Exam, Imp/Plan, Follow Up) is summarised in a card.
- A green highlight signals that an automated change is ready for approval.
- Cards expose:
  - **Pending status** and the hotkey reminder (e.g. `Alt+Shift+H` for History).
  - **Editable note boxes** (when automation is available) to tweak the content before execution.
  - **Condition chips** for PSFH/ROS. Remove an item by clicking the `×` badge.
- The banner above the cards shows the de-identified chart ID generated for the current encounter.

## Approving Changes

1. Review the highlighted sections and make any final edits.
2. Select **Send to Nextech**. Only sections with supported automation (currently History + PSFH/ROS) execute the underlying commands.
3. A summary appears when execution finishes, including any warnings.

## Assistant Settings

- Expand **Assistant Settings** to configure:
  - Provider (OpenAI supported today)
  - API key
  - LLM model for planning (`gpt-4o-mini` by default)
  - Speech-to-text model (`gpt-4o-mini-transcribe` by default)
- Settings are stored locally via `chrome.storage`. Remember to supply a valid key for live requests.

## Keyboard Shortcuts

- `Alt+Shift+H` – Trigger History command in Nextech (mirrors “History” card)
- `Alt+Shift+M` – Trigger PSFH/ROS command

## Notes & Safeguards

- The assistant hashes the patient context (page title) into a local chart ID before sending requests to external APIs.
- If the OpenAI key is absent or the API call fails, the sidebar falls back to a local heuristic parser so you can keep iterating.
- Audio capture requires microphone permission the first time the Listen button is used.

## Troubleshooting

- **No active tab** – Ensure the chart page is focused when invoking actions.
- **Permission errors** – Confirm Chrome granted microphone access and that your API key is current.
- **Unsupported sections** – Sections without automation stay grey but can contain manual notes for reference.

Enjoy a faster, voice-enabled Nextech workflow with SightFlow Copilot!
