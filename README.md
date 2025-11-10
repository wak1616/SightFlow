# 🩺 SightFlow - AI-Powered Medical Charting Assistant

[![Version](https://img.shields.io/badge/version-0.2.0-blue.svg)](https://github.com/yourusername/sightflow)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Chrome](https://img.shields.io/badge/chrome-v88%2B-yellow.svg)](https://www.google.com/chrome/)

> **Transform clinical documentation with AI-powered voice recognition and intelligent charting**

SightFlow is a Chrome extension that revolutionizes medical charting in Nextech Intellechart by combining voice recognition, AI-powered parsing, and automated data entry - all while maintaining HIPAA-conscious de-identification.

---

## ✨ Key Features

### 🎤 Voice-to-Text Capture
- **Hands-free documentation**: Speak naturally, SightFlow transcribes
- **Medical terminology optimized**: Uses OpenAI Whisper for accuracy
- **Edit before sending**: Review and modify transcriptions

### 🧠 Intelligent AI Parsing
- **Understands context**: GPT-4 analyzes clinical notes
- **Structured extraction**: Automatically maps to chart sections
- **Multi-section support**: Updates History, PSFH/ROS, and more

### 🔒 HIPAA-Conscious Design
- **De-identification**: Patient data anonymized before AI processing
- **Local storage**: Mappings never leave your computer
- **Transparent workflow**: See exactly what's being sent

### ✅ Approval Workflow
- **Visual feedback**: Sections highlight green when changes are pending
- **Review before execution**: Full transparency of planned actions
- **One-click apply**: Send approved changes to Nextech

### ⚡ Time-Saving Automation
- **Reduce documentation time by 50%+**
- **Eliminate repetitive typing**
- **Focus on patient care, not data entry**

---

## 🚀 Quick Start

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/sightflow.git

# Load in Chrome
# 1. Open chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the sightflow directory
```

### 2. Get OpenAI API Key

1. Visit [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Create a new secret key
3. Copy and save it securely

### 3. Configure SightFlow

1. Navigate to Intellechart
2. Click the SightFlow icon
3. Enter your OpenAI API key when prompted
4. Grant microphone permissions

### 4. Start Charting!

```
1. Click "Listen" 🎤
2. Speak your clinical notes
3. Click "Send to AI" 🧠
4. Review the planned changes
5. Click "Send to Nextech" ⚡
```

---

## 📖 Documentation

- **[AI Assistant Guide](AI_ASSISTANT_GUIDE.md)** - Complete setup and usage instructions
- **[Installation Guide](INSTALLATION_GUIDE.md)** - Detailed installation steps
- **[Sidebar Usage](SIDEBAR_USAGE.md)** - UI reference guide

---

## 🎯 Example Use Cases

### Adding Past Medical History

**Say**: *"Patient has diabetes type 2, hypertension, and glaucoma"*

**Result**: Conditions automatically added to PMHx section

---

### Recording HPI

**Say**: *"Chief complaint blurry vision both eyes for 6 months, worse at night, difficulty reading with glasses, wants cataract evaluation"*

**Result**: Structured HPI with CC, location (OU), and extended notes

---

### Multi-Section Updates

**Say**: *"Blurry vision OU. PMH includes diabetes. Plan: dilated exam, discuss surgery. Follow up 2 weeks"*

**Result**: Updates to History, PSFH/ROS, Imp/Plan, and Follow Up sections

---

## 📊 Supported Sections

| Section | Status | Features |
|---------|--------|----------|
| **History** | ✅ Active | HPI, CC, Location, Extended HPI, MSE |
| **PSFH/ROS** | ✅ Active | PMHx conditions, auto-matching, free-text |
| **V & P** | 🚧 Coming | Vision metrics, treatment plans |
| **Exam** | 🚧 Coming | Physical findings, measurements |
| **Imp/Plan** | 🚧 Coming | Diagnoses, treatment plans |
| **Follow Up** | 🚧 Coming | Scheduling, instructions |

---

## 🔧 Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **APIs**: 
  - OpenAI Whisper (Speech-to-Text)
  - OpenAI GPT-4 (Intelligent Parsing)
- **Platform**: Chrome Extension Manifest V3
- **Storage**: Chrome Local Storage

---

## 📁 Project Structure

```
sightflow/
├── manifest.json              # Extension configuration
├── background.js              # Service worker, command routing
├── sidebar/
│   ├── sidebar.html          # Main UI
│   ├── sidebar.js            # UI logic, state management
│   └── sidebar.css           # Styling
├── services/
│   ├── ai-service.js         # OpenAI API integration
│   └── deidentification.js   # Patient data de-identification
├── scripts/
│   ├── shared_utils.js       # Common utilities
│   ├── history_input.js      # HPI/History automation
│   └── psfhros_input.js      # PMHx automation
├── config/
│   └── api-config.js         # API configuration template
└── images/                    # Extension icons
```

---

## 🔐 Privacy & Security

### Data Flow

```
Patient Chart → De-identify → AI Analysis → Review → Execute
     ↓              ↓              ↓           ↓         ↓
  Local ID      SF-0001     Structured    User      Nextech
  (stored)      (sent)      Commands     Approval     Chart
```

### What Gets Sent to OpenAI

- ✅ De-identified patient ID (e.g., "SF-0001")
- ✅ Clinical text (without PHI)
- ❌ Patient name
- ❌ Date of birth
- ❌ Chart number

### What Stays Local

- All patient identification mappings
- Your OpenAI API key
- Usage history

---

## 💰 Cost Estimates

Based on OpenAI pricing (2024):

| Usage | Monthly Cost |
|-------|-------------|
| **Light** (5-10 patients/day) | $2-5 |
| **Medium** (10-20 patients/day) | $5-10 |
| **Heavy** (20-40 patients/day) | $10-20 |

*Costs include both Whisper (speech-to-text) and GPT-4 (analysis)*

---

## ⚙️ Configuration Options

### AI Model Selection

Edit `/services/ai-service.js`:

```javascript
gptModel: 'gpt-4-turbo-preview',  // Fast, cost-effective
// or
gptModel: 'gpt-4',                 // More accurate, slower
```

### Temperature Adjustment

```javascript
temperature: 0.1,  // Consistent (recommended)
// or
temperature: 0.3,  // More creative
```

### De-identification

Enable/disable in `/services/deidentification.js`:

```javascript
// Always uses de-identification by default
// To disable: remove deidentification calls in sidebar.js
```

---

## 🐛 Troubleshooting

### Extension not loading
- Check Chrome version (88+)
- Ensure Developer mode enabled
- Reload extension after changes

### Microphone not working
- Grant permissions in Chrome settings
- Check microphone isn't in use
- Try reloading the page

### API errors
- Verify API key is correct
- Check OpenAI account has credits
- Ensure rate limits not exceeded

### Commands not executing
- Confirm you're on Intellechart page
- Check console for error messages
- Verify chart section isn't locked

**For detailed troubleshooting, see [AI Assistant Guide](AI_ASSISTANT_GUIDE.md#troubleshooting)**

---

## 🛣️ Roadmap

### v0.3.0 (Planned)
- [ ] Support for Exam section
- [ ] Support for Imp/Plan section
- [ ] Support for Follow Up section
- [ ] Custom AI prompt editor
- [ ] Usage analytics dashboard

### v0.4.0 (Future)
- [ ] Multiple AI provider support (Google, Anthropic)
- [ ] Offline mode with local models
- [ ] Team collaboration features
- [ ] Template library
- [ ] Voice commands for navigation

---

## 🤝 Contributing

We welcome contributions! To contribute:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## ⚠️ Disclaimer

**IMPORTANT**: This tool is provided as-is for use with Nextech Intellechart. Users are responsible for:

- ✅ HIPAA compliance in their practice
- ✅ Verifying accuracy of AI-generated data
- ✅ Proper clinical documentation practices
- ✅ API costs and usage
- ✅ Obtaining necessary Business Associate Agreements

**Always review AI-generated content before approving changes to patient charts.**

This extension does not replace professional medical judgment. All clinical decisions remain the sole responsibility of licensed healthcare providers.

---

## 📧 Support

For questions or issues:
- Open an issue on GitHub
- Check the [AI Assistant Guide](AI_ASSISTANT_GUIDE.md) for detailed help

---

## 🙏 Acknowledgments

- OpenAI for Whisper and GPT-4 APIs
- Nextech for Intellechart platform
- Medical professionals who provided feedback

---

## 🌟 Show Your Support

If SightFlow helps your practice:
- ⭐ Star this repo
- 🐛 Report bugs
- 💡 Suggest features
- 📣 Share with colleagues

---

**Made with ❤️ for healthcare providers who deserve better tools**
