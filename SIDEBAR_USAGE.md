# SightFlow AI Assistant Usage Guide

## Accessing the AI Assistant

1. **Open the Side Panel**: Click the SightFlow extension icon in your Chrome toolbar, then click the sidebar icon (or right-click and select "Open side panel")
2. **Alternative**: In Chrome, go to the three-dot menu → More Tools → Side Panel → SightFlow

## Using the AI Assistant

### 1. Grant Microphone Permission (First Time Only)

If you see an orange "🔓 Grant Microphone Permission" button:
1. Click the button
2. A popup window will open
3. Click "Grant Permission" in the popup
4. When Chrome asks, click "Allow" for microphone access
5. The orange button will disappear once permission is granted

### 2. Input Your Notes

**Option A: Voice Input** (Recommended for speed)
1. Click the "🎤 Listen" button
2. Speak your clinical notes clearly
3. Click "Stop" when finished
4. Your speech will be automatically transcribed into the text area

**Option B: Manual Text Input**
1. Simply type your notes into the text area
2. No need to format - the AI understands natural language

### 3. Generate a Plan

1. Click "Send to AI" button (enabled when text is present)
2. Wait a few seconds while the AI analyzes your notes
3. A structured plan will appear showing proposed changes

### 4. Review the Plan

The plan shows:
- **Section cards**: Each card represents a change to an EMR section
- **Checkboxes**: Select/deselect individual changes
- **Green indicators**: Sections with pending changes are highlighted
- **Details**: What will be added/modified in each section

### 5. Execute the Plan

1. Review all plan items
2. Uncheck any changes you don't want to apply
3. Click the "Send ALL to Nextech" button
4. Selected changes will be applied to the patient chart

## EMR Sections

The AI can make changes to these sections:
- **History**: Chief Complaint, HPI, Extended HPI, Mental Status Exam
- **PSFH/ROS**: Past Medical History (PMHx)
- **V & P**: Vitals and Physical measurements
- **Exam**: Physical Examination findings
- **Diagnostics**: Diagnostic test results
- **Imp/Plan**: Impression and treatment plan
- **Follow Up**: Follow-up instructions

## Example Workflows

### Adding Medical History
**Say**: "Patient has a history of diabetes type 2 and hypertension"

**Result**: 
- Two plan items appear
- PSFH/ROS section highlighted
- Click "Send ALL to Nextech" to add both conditions

### Recording Vitals
**Say**: "Blood pressure 120 over 80, heart rate 72"

**Result**:
- Plan shows vital signs to be recorded
- V & P section highlighted
- Review and execute

### Complex Note
**Say**: "Patient presents with blurry vision for 6 months. History of diabetes. BP 130/80. Plan cataract surgery in 2 weeks."

**Result**:
- Multiple plan items across different sections
- Review each section's changes
- Selectively apply or modify

## Requirements

- Must be on Nextech EMR (app1.intellechart.net/Eye2MVC/Chart/Chart/Index/)
- Must be viewing a patient chart
- OpenAI API key must be configured in extension settings
- Microphone permission required for voice input

## Status Messages

The sidebar displays feedback:
- ✅ **Success**: Green messages for completed actions
- ❌ **Error**: Red messages if something goes wrong
- ℹ️ **Info**: Blue messages for processing status

## Features

- 🎤 Speech-to-text with medical terminology recognition
- 🤖 AI-powered structured data extraction
- 🎯 Visual section indicators
- ✅ Selective plan execution
- 📱 Responsive design
- 🔒 Secure API key storage
- ✨ Modern, professional UI

## Troubleshooting

**"Microphone access denied"**
- Click the orange "Grant Microphone Permission" button
- Make sure to click "Allow" in Chrome's permission prompt

**"API key not configured"**
- Right-click extension icon → Options
- Enter your OpenAI API key
- Click "Save Settings"

**"Failed to generate plan"**
- Check your internet connection
- Verify your OpenAI API key is valid
- Check browser console for error details

**"Failed to execute plan"**
- Make sure you're on the correct Nextech page
- Reload the page and try again
- Check browser console for errors
