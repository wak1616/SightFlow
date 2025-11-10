# ⚡ SightFlow Quick Start Guide

Get up and running with SightFlow in 5 minutes!

## Step 1: Install Extension (2 min)

1. **Open Chrome Extensions**
   - Go to: `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)

2. **Load SightFlow**
   - Click "Load unpacked"
   - Select the `sightflow` directory
   - Extension should appear in your extensions list

3. **Pin to Toolbar**
   - Click the puzzle piece icon
   - Pin SightFlow for easy access

---

## Step 2: Get API Key (2 min)

1. **Sign up for OpenAI**
   - Visit: https://platform.openai.com/signup
   - Create account (or sign in)

2. **Add Payment Method**
   - Go to: https://platform.openai.com/account/billing
   - Add credit card
   - Set usage limits if desired (e.g., $20/month)

3. **Create API Key**
   - Go to: https://platform.openai.com/api-keys
   - Click "Create new secret key"
   - Name it "SightFlow"
   - **COPY THE KEY** (you won't see it again!)

---

## Step 3: Configure SightFlow (1 min)

1. **Open Intellechart**
   - Navigate to any patient chart
   - URL should be: `https://app1.intellechart.net/...`

2. **Open SightFlow Sidebar**
   - Click the SightFlow icon in Chrome toolbar
   - Sidebar opens on the right

3. **Enter API Key**
   - You'll see: "⚠️ OpenAI API key not configured"
   - Click the message
   - Paste your API key
   - Click OK

4. **Grant Microphone Permission**
   - Click the "Listen" button
   - Click "Allow" when Chrome asks for microphone access

---

## Step 4: Test It! (1 min)

### Test Voice Input

1. Click **"Listen"** 🎤
2. Say: *"Patient has a history of diabetes and hypertension"*
3. Click **"Listen"** again to stop
4. Text should appear in the box

### Test AI Analysis

1. Click **"Send to AI"** 🧠
2. Wait a few seconds
3. "PSFH/ROS" section should highlight green
4. You'll see planned changes listed

### Test Execution

1. Click **"Send to Nextech"** ⚡
2. Changes apply to the chart
3. Form clears, ready for next patient

---

## ✅ You're Ready!

Your SightFlow is now fully configured. Here's what to do next:

### Daily Workflow

```
For each patient:
1. 🎤 Click Listen → Speak notes → Click Listen
2. ✏️ Edit text if needed
3. 🧠 Click Send to AI → Review changes
4. ⚡ Click Send to Nextech → Done!
```

### Alternative: Type Instead of Voice

- Skip the Listen button
- Just type in the text box
- Continue with Send to AI

---

## 📖 Learn More

- **Full Setup**: [AI_ASSISTANT_GUIDE.md](AI_ASSISTANT_GUIDE.md)
- **Examples**: See README.md "Example Use Cases"
- **Troubleshooting**: See AI_ASSISTANT_GUIDE.md "Troubleshooting"

---

## 💡 Pro Tips

1. **Speak Naturally**: No need to use specific keywords
2. **Multi-Section Updates**: Mention multiple things in one recording
3. **Edit Before AI**: Clean up transcription for better results
4. **Review Before Execute**: Always check planned changes
5. **Use Quick Actions**: Alt+Shift+H and Alt+Shift+M still work!

---

## 🆘 Common First-Time Issues

### "Error accessing microphone"
→ Check Chrome settings: `chrome://settings/content/microphone`

### "API key not configured"
→ Click the status message and enter your key

### "Commands not executing"
→ Make sure you're on an Intellechart page

### "Transcription failed"
→ Record at least 1-2 seconds of speech

---

## 📊 Cost Example

For typical usage (20 patients/day):
- Speech-to-text: ~$0.10/day
- AI analysis: ~$0.20/day
- **Total: ~$6-10/month**

Much cheaper than your time! ⏰💰

---

## 🎉 Success!

You're now using AI-powered medical charting. Enjoy the time savings!

**Questions?** Check [AI_ASSISTANT_GUIDE.md](AI_ASSISTANT_GUIDE.md) or open an issue.

---

**Happy Charting! 🩺**
