# SightFlow AI Assistant - Documentation

## Overview
SightFlow AI Assistant is a Chrome extension that adds intelligent voice-to-text and AI-powered plan generation to Nextech EMR. It uses OpenAI's gpt-4o-transcribe for speech recognition and gpt-5-mini for generating structured medical charting plans.

## Features

### 1. Speech-to-Text Input
- Click "Listen" button to start recording
- Uses OpenAI gpt-4o-transcribe for accurate medical transcription
- Alternative: Type directly in the text area

### 2. AI Plan Generation
- Converts natural language into structured EMR changes
- Uses gpt-5-mini with strict JSON output
- Generates actionable commands for each EMR section

### 3. Visual Section Indicators
- Seven EMR sections always visible:
  - History (CC, HPI, Extended HPI, Mental Status Exam)
  - PSFH/ROS (PMHx)
  - V & P (Vitals)
  - Exam
  - Diagnostics
  - Imp/Plan
  - Follow Up
- Sections with pending changes highlighted in green

### 4. Plan Review & Execution
- Each plan item has a checkbox for selection/deselection
- "Send ALL to Nextech" button flashes when items are selected
- Executes only selected items when clicked

## Setup

### 1. Install Extension
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the SightFlow directory
4. Pin the extension for easy access

### 2. Configure OpenAI API Key
1. Click the extension icon
2. Go to extension options/settings
3. Enter your OpenAI API key
4. Click "Save Settings"

### 3. Usage
1. Navigate to Nextech EMR
2. Open SightFlow side panel
3. Click "Listen" or type your notes
4. Click "Send to AI" to generate plan
5. Review and select/deselect items
6. Click "Send ALL to Nextech" to execute

## Architecture

### File Structure
```
SightFlow/
├── manifest.json           # Extension configuration
├── background.js          # Service worker for commands
├── options.html/js        # Settings page
├── sidebar/
│   ├── sidebar.html      # AI Assistant UI
│   ├── sidebar.js        # Main logic
│   └── sidebar.css       # Styles
├── scripts/
│   ├── shared_utils.js   # Common DOM helpers
│   ├── history_input.js  # History section handler
│   ├── psfhros_input.js  # PSFH/ROS handler
│   └── plan_executor.js  # AI plan executor
└── src/types/
    └── plan.ts          # TypeScript definitions
```

### Key Components

1. **Speech Recognition**
   - MediaRecorder API for audio capture
   - OpenAI gpt-4o-transcribe for transcription
   
2. **Plan Generation**
   - System prompt enforces strict JSON schema
   - Maps natural language to EMR sections
   - Generates both actions and executable commands

3. **Command Execution**
   - plan_executor.js receives selected items
   - Maps commands to existing helper functions
   - Manipulates Nextech DOM using Angular-aware methods

## Example Test Case

**Input**: "patient has a history of Diverticulosis"

**Generated Plan**:
```json
{
  "source": "speech",
  "raw_input": "patient has a history of Diverticulosis",
  "items": [{
    "target_section": "PSFH/ROS",
    "subsection": "PMHx",
    "actions": [{"type": "add_condition", "condition": "Diverticulosis"}],
    "commands": [{
      "name": "sf-insert-psfhros",
      "params": {"conditionsToSelect": ["Diverticulosis"]}
    }],
    "selected": true
  }]
}
```

**Result**: Adds Diverticulosis to Past Medical History

## Troubleshooting

1. **Microphone not working**
   - Check browser permissions
   - Ensure HTTPS connection

2. **API errors**
   - Verify API key in settings
   - Check OpenAI API status

3. **Commands not executing**
   - Ensure you're on correct Nextech page
   - Check console for errors
   - Verify DOM selectors match current Nextech version

## Future Enhancements

- Additional command types for other EMR sections
- Batch processing of multiple patients
- Voice commands for navigation
- Integration with more EMR systems
