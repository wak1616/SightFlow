# SightFlow Sidebar Usage Guide

## Accessing the Sidebar

1. Click the SightFlow extension icon in the Chrome toolbar and choose **Open side panel**, or  
2. Open Chrome’s side panel via ⋮ → **More tools** → **Side panel** → select **SightFlow**

The sidebar is designed for use while viewing a patient chart on `https://app1.intellechart.net/*`.

---

## AI Documentation Assistant Workflow

1. **Capture the narrative**
   - Click **Start Listening** to dictate. The button turns green while recording and the transcript is appended to the text area.
   - Or manually type / paste the encounter narrative into the **Narrative** text box.

2. **Review / edit the text**
   - Edit the transcript directly. The **Send to AI** button enables as soon as text is present.

3. **Generate the AI plan**
   - Click **Send to AI**. The assistant de-identifies the patient (using a local alias) and asks the configured LLM to analyse the narrative.
   - When finished, the **Plan Overview** section shows each Nextech chart section (History, PSFH/ROS, V & P, Exam, Imp/Plan, Follow Up). Sections that need updates turn green with pending commands.

4. **Approve & send to Nextech**
   - Review the pending updates. Sections that require manual follow-up include yellow notes.
   - Click **Send to Nextech** to execute all available automated commands (currently History + PSFH/ROS). The button pulses when automation is ready.

5. **Status & completion**
   - Executed sections change to a blue “Completed” state. Status messages appear at the bottom of the sidebar.

---

## Quick Actions

The original shortcuts remain available:

| Action | Button | Shortcut |
| --- | --- | --- |
| Insert HPI draft | 📝 **Insert HPI** | `Alt+Shift+H` |
| Select PMH items | 🔍 **Select PMH** | `Alt+Shift+M` |

These trigger the same workflows as before without running the AI pipeline.

---

## AI & Speech Settings

Open the **AI Settings** section in the sidebar:

- **Provider:** Currently `OpenAI` is fully supported. Future providers can be added from the dropdown.
- **API Key:** Enter your OpenAI API key (`sk-...`). Keys are stored locally via `chrome.storage.local`.
- **Model / Temperature:** Defaults to `gpt-4o-mini` at temperature `0.1`. Adjust if needed.

> **Speech-to-text:** The sidebar uses Chrome’s built-in Web Speech API for low-latency dictation. For higher accuracy you can optionally transcribe recordings server-side and paste the result before running the AI plan.

---

## Requirements & Tips

- Keep the IntelleChart tab active while triggering automation.
- Ensure microphone access is granted when using voice capture.
- AI planning requires network access to the OpenAI API and a valid key.
- Manual sections (V & P, Exam, Imp/Plan, Follow Up) will surface notes until specific automations are implemented.

---

## Status Messages

- ✅ **Success** – Green status banner confirms an action or AI plan completion.
- 🔄 **Info** – Grey/blue banner shown while AI processing or sending commands.
- ⚠️ **Error** – Red banner with details if anything fails (missing key, wrong tab, etc.).

You can clear most temporary issues by reloading the patient chart and reopening the sidebar.

