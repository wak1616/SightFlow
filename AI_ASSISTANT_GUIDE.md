# SightFlow AI Assistant Setup Guide

## Overview

The SightFlow AI Assistant is an intelligent medical charting tool that uses voice recognition and AI to parse clinical notes and automatically populate fields in your Nextech Intellechart system. It features:

- 🎤 **Voice-to-Text**: Capture clinical notes using speech
- 🧠 **AI-Powered Parsing**: Automatically understands medical terminology and context
- 🔒 **HIPAA-Conscious**: De-identifies patient data before sending to AI APIs
- ✅ **Approval Workflow**: Review all changes before they're applied to the chart
- 🚀 **Fast & Efficient**: Reduces manual data entry time

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [API Setup](#api-setup)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Usage Guide](#usage-guide)
6. [De-identification System](#de-identification-system)
7. [Supported Sections](#supported-sections)
8. [Troubleshooting](#troubleshooting)
9. [Privacy & Security](#privacy--security)

---

## Prerequisites

Before setting up the AI Assistant, ensure you have:

- ✅ Google Chrome browser (version 88 or later)
- ✅ Access to Nextech Intellechart (https://app1.intellechart.net)
- ✅ Microphone access for voice input
- ✅ OpenAI API account (for AI features)

---

## API Setup

### Why OpenAI?

We recommend **OpenAI** for both speech-to-text and intelligent parsing because:

1. **Whisper API**: Industry-leading speech-to-text accuracy, especially for medical terminology
2. **GPT-4**: Excellent at understanding medical context and structured data extraction
3. **Single Provider**: Simplified setup and billing
4. **HIPAA BAA Available**: OpenAI offers Business Associate Agreements for healthcare

### Getting Your OpenAI API Key

1. **Create an Account**
   - Visit: https://platform.openai.com/signup
   - Sign up with your email or Google account

2. **Add Payment Method**
   - Go to: https://platform.openai.com/account/billing
   - Add a credit card (required for API access)
   - Consider setting usage limits for budget control

3. **Generate API Key**
   - Navigate to: https://platform.openai.com/api-keys
   - Click "Create new secret key"
   - Give it a name (e.g., "SightFlow Assistant")
   - **IMPORTANT**: Copy the key immediately - you won't see it again!
   - Store it securely (you'll need it in the Configuration step)

4. **Verify Access**
   - Ensure you have access to:
     - **Whisper API** (for speech-to-text)
     - **GPT-4** or **GPT-4 Turbo** (for intelligent parsing)

### Estimated Costs

Typical usage costs (as of 2024):

- **Speech-to-Text (Whisper)**: $0.006 per minute of audio
- **GPT-4 Turbo**: ~$0.01-0.03 per analysis (depending on note length)

**Example**: 20 patients/day with voice notes = approximately $5-10/month

---

## Installation

1. **Clone or Download the Extension**
   ```bash
   cd /path/to/sightflow
   ```

2. **Load Extension in Chrome**
   - Open Chrome and go to: `chrome://extensions/`
   - Enable "Developer mode" (top-right toggle)
   - Click "Load unpacked"
   - Select the SightFlow directory

3. **Verify Installation**
   - You should see "SightFlow Nextech Helper" in your extensions
   - Pin it to your toolbar for easy access

---

## Configuration

### First-Time Setup

1. **Open the Sidebar**
   - Navigate to any Intellechart page
   - Click the SightFlow icon in your Chrome toolbar
   - The sidebar will open on the right

2. **Configure API Key**
   - On first use, you'll see: "⚠️ OpenAI API key not configured"
   - Click on this message
   - Paste your OpenAI API key
   - Click OK

3. **Grant Microphone Access**
   - Click the "Listen" button
   - Chrome will ask for microphone permission
   - Click "Allow"

4. **Test the Setup**
   - Click "Listen" and say: "Patient has a history of diabetes"
   - Click "Listen" again to stop
   - The text should appear in the input box
   - Click "Send to AI" to test the analysis

---

## Usage Guide

### Workflow Overview

```
┌─────────────┐
│   Listen    │ ──► Record voice or type text
└─────────────┘
       │
       ▼
┌─────────────┐
│  Edit Text  │ ──► Review and modify if needed
└─────────────┘
       │
       ▼
┌─────────────┐
│ Send to AI  │ ──► AI analyzes and plans actions
└─────────────┘
       │
       ▼
┌─────────────┐
│   Review    │ ──► Check which sections will be modified
└─────────────┘
       │
       ▼
┌─────────────┐
│Send Nextech │ ──► Execute approved changes
└─────────────┘
```

### Step-by-Step Instructions

#### 1. Capture Clinical Notes

**Option A: Voice Input**
- Click the 🎤 **Listen** button
- Speak your clinical notes naturally
- Click **Listen** again to stop recording
- The transcribed text appears in the text box

**Option B: Type Directly**
- Click in the text area
- Type your clinical notes
- No need to use the Listen button

#### 2. Review and Edit

- Review the transcribed/typed text
- Edit as needed - it's just a text box!
- The "Send to AI" button enables when you have text

#### 3. AI Analysis

- Click **🧠 Send to AI**
- Wait a few seconds while AI analyzes the text
- You'll see:
  - Which chart sections will be modified (highlighted in green)
  - Specific actions planned for each section
  - AI confidence level and any notes

#### 4. Review Planned Changes

- Check the "Chart Sections" area
- Green sections = changes pending
- Read the "Planned Changes" details
- If you need to modify, go back to step 2

#### 5. Execute Changes

- Click **⚡ Send to Nextech** (now active and flashing)
- Changes are applied to the chart automatically
- Sections briefly flash to confirm execution
- The form clears, ready for the next patient

### Example Use Cases

#### Example 1: Adding Past Medical History

**Input** (voice or text):
```
Patient has a history of Type 2 Diabetes, Hypertension, 
and had Cataract Surgery in 2020
```

**AI Analysis**:
- Section: PSFH/ROS
- Action: Add conditions
  - Diabetes Type II
  - Hypertension
  - Cataract Surgery (2020)

**Result**: Conditions added to PMHx section

---

#### Example 2: Recording HPI

**Input**:
```
Chief complaint blurry vision both eyes. Patient reports 
progressive vision loss over 6 months, especially at night. 
Difficulty reading despite using glasses. Denies eye pain 
or redness. Wants evaluation for possible cataracts.
```

**AI Analysis**:
- Section: History
- Action: Add HPI
  - CC: Blurred Vision
  - Location: OU
  - Extended HPI: [full text]

**Result**: HPI section populated with structured data

---

#### Example 3: Multiple Sections

**Input**:
```
Patient presents with blurry vision OU. PMH significant 
for diabetes and hypertension. Plan: dilated eye exam, 
check visual acuity, discuss cataract surgery options. 
Follow up in 2 weeks.
```

**AI Analysis**:
- Section: History → Add HPI details
- Section: PSFH/ROS → Add Diabetes, Hypertension
- Section: Imp/Plan → Add treatment plan
- Section: Follow Up → Schedule 2 weeks

**Result**: Multiple sections updated simultaneously

---

## De-identification System

### How It Works

To enhance HIPAA compliance, SightFlow de-identifies patient data before sending to AI:

1. **Patient Context Captured**
   - Name, DOB, and other identifiers from the chart page title

2. **De-identified ID Generated**
   - Creates anonymous ID: `SF-0001`, `SF-0002`, etc.
   - Stored locally in your browser only

3. **AI Receives Only**
   - De-identified ID: `SF-0001`
   - Clinical text (no PHI)

4. **Mapping Stored Locally**
   - `SF-0001` → Patient Info
   - Never leaves your computer
   - Used only for context in future sessions

### Viewing De-identification Mappings

To view or export your mappings:

```javascript
// Open Chrome DevTools (F12) in the sidebar
// Run in console:
deidentificationService.exportMappings().then(console.log)
```

### Clearing Mappings

To clear all stored mappings:

```javascript
// In Chrome DevTools console:
deidentificationService.clearAllMappings()
```

---

## Supported Sections

The AI Assistant can populate the following Nextech sections:

| Section | Description | AI Capabilities |
|---------|-------------|-----------------|
| **History** | HPI, CC, MSE, Extended HPI | ✅ Structured HPI<br>✅ Chief Complaint<br>✅ Location (OD/OS/OU)<br>✅ Extended HPI text<br>✅ Mental Status Exam |
| **PSFH/ROS** | Past Medical History | ✅ Add conditions<br>✅ Match existing options<br>✅ Free-text entry |
| **V & P** | Vision & Plan | 🚧 Coming soon |
| **Exam** | Physical Examination | 🚧 Coming soon |
| **Imp/Plan** | Impression & Plan | 🚧 Coming soon |
| **Follow Up** | Follow-up scheduling | 🚧 Coming soon |

### Expanding Capabilities

To add support for new sections, edit:
- `/services/ai-service.js` - Update AI prompts
- `/scripts/` - Add new content scripts
- `/background.js` - Add command handlers

---

## Troubleshooting

### Common Issues

#### "OpenAI API key not configured"

**Solution**: Click the status message and enter your API key

---

#### "Error accessing microphone"

**Possible Causes**:
1. Permission denied
2. Microphone in use by another app
3. No microphone detected

**Solutions**:
- Check Chrome site settings: `chrome://settings/content/microphone`
- Ensure microphone isn't muted
- Try a different browser profile

---

#### "Error: GPT API error"

**Possible Causes**:
1. Invalid API key
2. Insufficient credits
3. Rate limit exceeded

**Solutions**:
- Verify API key is correct
- Check OpenAI billing page
- Wait 1 minute and try again

---

#### "Transcription failed"

**Possible Causes**:
1. Audio too short
2. Background noise
3. Unsupported audio format

**Solutions**:
- Record at least 1-2 seconds
- Use in quiet environment
- Check microphone quality

---

#### Changes not applying to chart

**Possible Causes**:
1. Not on Intellechart page
2. Section not expanded
3. Chart in read-only mode

**Solutions**:
- Ensure URL contains `app1.intellechart.net`
- Refresh the page
- Check chart isn't locked

---

### Debug Mode

To enable detailed logging:

1. Open Chrome DevTools (F12)
2. Go to Console tab
3. Look for messages starting with "SightFlow:"
4. Share relevant errors for support

---

## Privacy & Security

### Data Handling

- ✅ **Patient mappings**: Stored locally in Chrome storage only
- ✅ **API keys**: Stored locally, never transmitted except to OpenAI
- ✅ **Audio recordings**: Sent to OpenAI Whisper, then deleted
- ✅ **Clinical notes**: De-identified before sending to GPT-4

### HIPAA Considerations

⚠️ **Important**: While we implement de-identification:

1. **OpenAI BAA**: Consider signing a Business Associate Agreement with OpenAI
2. **Risk Assessment**: Perform your own HIPAA risk assessment
3. **Compliance Review**: Have your compliance officer review this tool
4. **Informed Consent**: Consider patient consent for AI-assisted charting

### Recommendations

1. **For Maximum Privacy**: Type instead of using voice
2. **Audit Trail**: Keep logs of AI usage in your practice
3. **Data Deletion**: OpenAI retains API data for 30 days (can be reduced)
4. **Access Control**: Only authorized users should have the API key

### Opt-Out

To disable AI features and use manual entry only:
- Simply don't configure the API key
- Use the "Quick Actions" buttons (Alt+Shift+H, Alt+Shift+M)

---

## Advanced Configuration

### Customizing AI Behavior

Edit `/services/ai-service.js` to adjust:

- **Temperature**: Lower = more consistent (0.1 recommended)
- **Model**: Switch between GPT-4 and GPT-4-Turbo
- **Prompts**: Customize how AI interprets medical notes

### Adding Custom Commands

1. Edit `/services/ai-service.js` - Add to system prompt
2. Edit `/background.js` - Add command handler
3. Edit content scripts - Implement actions
4. Update sidebar UI - Add section indicator

---

## Support & Feedback

- **Issues**: Open a GitHub issue
- **Questions**: Contact your internal IT support
- **Feature Requests**: Submit via GitHub

---

## Version History

### v0.2.0 (Current)
- ✨ AI-powered assistant with voice input
- 🔒 De-identification system
- ✅ Approval workflow
- 📋 Support for History and PSFH/ROS sections

### v0.1.0
- 🎯 Basic keyboard shortcuts
- 📝 Manual HPI and PMH entry

---

## License & Disclaimer

This tool is provided as-is for use with Nextech Intellechart. Users are responsible for:
- HIPAA compliance
- API costs
- Verifying accuracy of AI-generated data
- Proper clinical documentation practices

**Always review AI-generated content before approving changes to patient charts.**
