# AI Assistant Setup Guide

## Overview

The SightFlow AI Assistant is an LLM-powered feature that helps parse free-text medical notes (from speech or typing) and automatically generates commands to populate various sections of the Nextech chart.

## Features

- **Speech-to-Text**: Use your microphone to dictate medical notes
- **Text Input**: Type medical notes directly
- **AI Analysis**: LLM analyzes the text and determines which chart sections need updates
- **Visual Feedback**: Sections that will be modified are highlighted in green
- **HIPAA Compliance**: Patient data is deidentified before sending to the LLM API

## Setup Instructions

### 1. Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with `sk-`)

### 2. Configure API Key in Extension

1. Open the SightFlow sidebar
2. Click the "Settings" button at the bottom
3. Paste your OpenAI API key in the input field
4. Click "Save API Key"
5. The key is stored locally and never shared

### 3. Using the AI Assistant

#### Speech-to-Text Method:

1. Navigate to a patient chart in Intellechart
2. Open the SightFlow sidebar
3. Click the "Listen" button (microphone icon)
4. Speak your medical notes (e.g., "Patient has a history of Diverticulosis")
5. Click "Listen" again to stop recording
6. Review and edit the transcribed text if needed
7. Click "Send to AI" button
8. Wait for analysis (sections will highlight in green if changes are pending)
9. Review the highlighted sections
10. Click "Send to Nextech" to execute the changes

#### Text Input Method:

1. Navigate to a patient chart in Intellechart
2. Open the SightFlow sidebar
3. Type medical notes directly into the text area
4. Click "Send to AI" button
5. Follow steps 8-10 above

## Chart Sections

The AI Assistant can modify the following sections:

- **History**: Includes HPI (History of Present Illness), CC (Chief Complaint), Mental Status Exam, and Extended HPI
- **PSFH/ROS**: Includes PMHx (Past Medical History) - can add conditions or select from list
- **V & P**: Vital signs and Physical exam data (coming soon)
- **Exam**: Physical examination findings (coming soon)
- **Imp/Plan**: Impression and Plan (coming soon)
- **Follow Up**: Follow-up instructions (coming soon)

## How It Works

1. **Deidentification**: Patient name and DOB are replaced with a deidentified chart number before sending to the API
2. **LLM Analysis**: OpenAI GPT-4 analyzes the deidentified text and generates structured commands
3. **Command Execution**: The extension executes the commands to modify the appropriate chart sections
4. **User Approval**: You review highlighted sections before clicking "Send to Nextech"

## API Recommendations

### Speech-to-Text
- **Chrome Web Speech API**: Built-in, no external API needed
- Works directly in the browser
- No additional setup required

### LLM
- **OpenAI GPT-4**: Recommended for best results
  - Excellent structured output capabilities
  - Well-documented API
  - Reliable service
  - Requires API key (paid service)

### Alternative LLM Options
- **Google Gemini**: Free tier available, good alternative
- **Anthropic Claude**: High quality, requires API key

## Troubleshooting

### Speech Recognition Not Working
- Ensure microphone permissions are granted to Chrome
- Check that you're using Chrome/Chromium browser
- Try refreshing the page

### API Key Errors
- Verify the API key is correct (starts with `sk-`)
- Check your OpenAI account has available credits
- Ensure you have internet connection

### Sections Not Highlighting
- Make sure the text contains relevant medical information
- Check that the LLM response was successful (check browser console)
- Verify you're on the correct Intellechart page

### Commands Not Executing
- Ensure you're on a patient chart page
- Check browser console for errors
- Verify the chart sections are accessible

## Security & Privacy

- **Local Storage**: API keys are stored locally in Chrome's storage
- **Deidentification**: Patient identifiers are replaced before API calls
- **No Data Sharing**: Patient data is never shared with third parties except OpenAI (with deidentification)
- **HIPAA Compliance**: Deidentification helps meet HIPAA requirements, but consult your compliance officer

## Cost Considerations

OpenAI API usage is charged per token. Typical costs:
- Input: ~$0.03 per 1K tokens
- Output: ~$0.06 per 1K tokens
- Average medical note analysis: ~$0.01-0.05 per request

Monitor your usage at [OpenAI Usage Dashboard](https://platform.openai.com/usage)

## Support

For issues or questions, check the browser console for error messages and logs.
