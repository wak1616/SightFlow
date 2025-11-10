# SightFlow Extension - Installation & Testing Guide

## 🔄 Updating the Extension

Since you've added new files (sidebar), you need to reload the extension:

1. Open Chrome and go to `chrome://extensions/`
2. Find "SightFlow Nextech Helper"
3. Click the **refresh/reload** icon (circular arrow) on the extension card
4. Verify no errors appear

## 🎯 Opening the Sidebar

### Method 1: Extension Icon (Recommended)
1. Click the SightFlow extension icon in your Chrome toolbar
2. Right-click and select "Open side panel"
3. The sidebar should appear on the right side of your browser

### Method 2: Chrome Menu
1. Click the three-dot menu (⋮) in Chrome
2. Navigate to: More Tools → Side Panel
3. Select "SightFlow" from the dropdown

### Method 3: Using Action Button (if configured)
1. Simply click the SightFlow icon
2. The sidebar may open automatically depending on your Chrome settings

## 🎨 Sidebar Highlights (v0.1.0)

- Gradient header with logo + subtitle
- **AI Documentation Assistant** card with dictation, narrative input, AI buttons, and a plan overview
- **Quick Actions** for the existing HPI / PMH hotkeys
- **AI Settings** for provider, API key, model, and temperature
- Status banner plus footer version label

## 🧪 Testing the Sidebar

### Test 1 – Visual Check
- [ ] Sidebar opens without errors
- [ ] AI Assistant, Plan Overview, Quick Actions, and Settings all render
- [ ] `Send to AI` is disabled until text is entered
- [ ] `Send to Nextech` is disabled until a plan exists

### Test 2 – Dictation & Transcript
1. Click **Start Listening** (allow microphone access if prompted).
2. Speak a short sentence; the transcript should appear in the narrative box.
3. Click **Stop Listening**; the status banner should acknowledge the stop.

### Test 3 – AI Planning (requires OpenAI key)
1. Enter a valid key in **AI Settings** and click **Save Settings**.
2. On a patient chart, type “Patient has a history of Diverticulosis”.
3. Click **Send to AI**.
   - Plan summary should mention PSFH/ROS.
   - PSFH/ROS card should turn green with a pending command.

### Test 4 – Execute Plan
1. Click **Send to Nextech**.
2. Expect status “Plan executed in Nextech!”.
3. PSFH/ROS card turns blue (Completed).

### Test 5 – Legacy Actions
- [ ] Clicking **Insert HPI** still works.
- [ ] Clicking **Select PMH** still works.
- [ ] Keyboard shortcuts `Alt+Shift+H` and `Alt+Shift+M` still work.

## 🐛 Troubleshooting

### Sidebar doesn't open
- Reload the extension at `chrome://extensions/`
- Check the extension errors console
- Restart Chrome if needed

### Buttons don't work
- Open DevTools console for errors
- Confirm you are on `https://app1.intellechart.net/*`
- Make sure content scripts loaded (reload the page)

### AI request fails
- Verify OpenAI API key is valid and saved
- Confirm network access to `https://api.openai.com/`
- Make sure a patient chart is loaded (so patient context is available)

### Dictation issues
- Check Chrome microphone permissions (click the lock icon in the omnibox → Site settings)
- Some environments disable the Web Speech API; if so, dictate elsewhere and paste into the narrative box

## 📁 Key Files Updated

```
SightFlow/
├── background.js          # AI planning + plan execution logic
├── manifest.json          # Includes microphone + OpenAI permissions
├── scripts/
│   ├── history_input.js   # Accepts dynamic payloads
│   └── psfhros_input.js   # Uses AI-provided condition lists and free text
└── sidebar/
    ├── sidebar.html       # New assistant layout
    ├── sidebar.css        # Updated styling
    └── sidebar.js         # Speech capture, AI orchestration, UI state
```

## ✅ Success Criteria

Release is ready when:
1. ✅ Sidebar renders all new sections without console errors
2. ✅ Dictation starts/stops (or gracefully warns if unsupported)
3. ✅ AI planning returns section highlights for supported narratives
4. ✅ `Send to Nextech` executes History/PSFH-ROS commands successfully
5. ✅ Quick actions and keyboard shortcuts still operate
6. ✅ Status banners provide feedback throughout the workflow

Enjoy your upgraded SightFlow sidebar! 🎉

