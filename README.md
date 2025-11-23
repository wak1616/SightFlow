# SightFlow AI Assistant

A Chrome extension that adds intelligent voice-to-text and AI-powered plan generation to Nextech EMR. It uses OpenAI's gpt-4o-transcribe for speech recognition and gpt-5-mini for generating structured medical charting plans.

## Features

- **🎤 Speech-to-Text**: Record voice notes that are automatically transcribed using OpenAI's gpt-4o-transcribe model
- **📝 Manual Text Input**: Type notes directly into the text area
- **🤖 AI Plan Generation**: Converts natural language into structured EMR changes using gpt-5-mini
- **✅ Plan Review**: Review and selectively apply AI-generated changes
- **🎯 Visual Indicators**: See which EMR sections have pending changes
- **⚡ One-Click Execution**: Apply all selected changes to Nextech with one button
- **🔒 Secure**: API keys stored locally in Chrome sync storage

## Installation

1. Clone this repository or download the files
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the extension directory
5. The extension should now be active on Intellechart pages

## Setup

### Configure OpenAI API Key

1. Right-click the SightFlow extension icon
2. Select "Options" or "Settings"
3. Enter your OpenAI API key
4. Click "Save Settings"

Your API key is stored securely in Chrome's sync storage and never shared.

## Usage

### Using the AI Assistant

1. Navigate to a patient chart in Nextech EMR (https://app1.intellechart.net/Eye2MVC/Chart/Chart/Index/)
2. Click the SightFlow extension icon to open the side panel
3. Choose your input method:
   - **Voice**: Click "Listen" → speak your notes → click "Stop"
   - **Text**: Type directly into the text area
4. Click "Send to AI" to generate a structured plan
5. Review the plan items (each has a checkbox)
6. Click "Send ALL to Nextech" to apply selected changes

### Example

**Input**: "Patient has a history of diverticulosis"

**Result**: The AI will:
- Generate a plan to add Diverticulosis to Past Medical History
- Highlight the PSFH/ROS section in green
- Show a preview card with the change
- Apply the change when you click "Send ALL to Nextech"

## EMR Sections Supported

- **History**: CC, HPI, Extended HPI, Mental Status Exam
- **PSFH/ROS**: Past Medical History (PMHx)
- **V & P**: Vitals and Physical
- **Exam**: Physical Examination
- **Diagnostics**: Diagnostic findings
- **Imp/Plan**: Impression and Plan
- **Follow Up**: Follow-up instructions

## Files

- `manifest.json` - Extension configuration
- `background.js` - Background service worker
- `options.html/js` - Settings page for API key
- `sidebar/` - AI assistant interface
  - `sidebar.html` - UI structure
  - `sidebar.css` - Styling
  - `sidebar.js` - Main logic (speech-to-text, AI integration)
- `scripts/` - Content scripts for Nextech integration
  - `shared_utils.js` - Shared utility functions
  - `history_input.js` - History section handler
  - `psfhros_input.js` - PSFH/ROS handler
  - `plan_executor.js` - AI plan executor
- `src/types/plan.ts` - TypeScript type definitions (documentation)

## Permissions

- `activeTab` - Access to the currently active tab
- `sidePanel` - Display the AI assistant in the side panel
- `storage` - Store API key securely
- `audioCapture` - Record voice for speech-to-text
- `tabs` - Manage tabs for permission prompts
- `host_permissions` - Limited to `app1.intellechart.net` domain

## Development

This extension uses:
- Manifest V3
- Vanilla JavaScript (no build step required)
- OpenAI API (gpt-4o-transcribe for transcription, gpt-5-mini for plan generation)
- Chrome Side Panel API

## Version

Current version: 0.2.0

## Troubleshooting

**Microphone not working:**
- Check browser permissions
- Click the orange "Grant Microphone Permission" button
- Ensure you're on HTTPS

**API errors:**
- Verify your API key in settings
- Check OpenAI API status

**Commands not executing:**
- Ensure you're on the correct Nextech page
- Reload the page and extension
- Check browser console for errors

## License

