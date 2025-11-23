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

## 🎨 Sidebar Features

The sidebar includes:
- **SightFlow Logo** (128x128 icon) at the top
- **Gradient Header** with app name and subtitle
- **AI Assistant Interface**:
  - 🎤 Voice input with speech-to-text
  - 📝 Text input for manual entry
  - 🤖 AI-powered plan generation
  - ✅ Plan review and execution
- **Status Messages** showing success/error feedback
- **Version Number** at the bottom (v0.2.0)

## 🧪 Testing the Sidebar

### Test 1: Visual Appearance
- [ ] Sidebar opens without errors
- [ ] Logo displays correctly
- [ ] Both buttons are visible and styled properly
- [ ] Gradient header looks good
- [ ] Text is readable

### Test 2: Button Functionality (Basic)
1. Open the sidebar on ANY page
2. Click the "Insert HPI" button
3. You should see either:
   - ❌ Error: "Please navigate to Intellechart first" (if not on Intellechart)
   - ✅ Success: "HPI insertion triggered!" (if on Intellechart)

### Test 3: Full Functionality (On Intellechart)
1. Navigate to: `https://app1.intellechart.net/Eye2MVC/Chart/Chart/Index/`
2. Open a patient chart
3. Test voice input:
   - Click "Listen" button
   - Say "patient has a history of diverticulosis"
   - Click "Stop"
   - Text should appear in the textarea
4. Test AI plan generation:
   - Click "Send to AI"
   - Review the generated plan
   - Click "Send ALL to Nextech"
   - Verify the changes are applied to the EMR

## 🐛 Troubleshooting

### Sidebar doesn't open
- Make sure you reloaded the extension at `chrome://extensions/`
- Check the extension errors console for any issues
- Try restarting Chrome

### Buttons don't work
- Check browser console (F12) for errors
- Verify you're on the correct Intellechart URL
- Make sure the content scripts are loaded

### Styling looks broken
- Clear browser cache
- Reload the extension
- Check that `sidebar.css` file exists

## 📁 New Files Created

```
SightFlow/
├── sidebar/
│   ├── sidebar.html    # Sidebar UI structure
│   ├── sidebar.css     # Beautiful styling
│   └── sidebar.js      # Button click handlers
├── manifest.json       # Updated with sidePanel permission
└── background.js       # Updated to handle sidebar messages
```

## 🎨 Design Features

- **Modern gradient header** (blue to green)
- **Icon-based buttons** with emoji indicators
- **Smooth animations** and hover effects
- **Responsive layout** adapts to sidebar width
- **Status feedback** with color-coded messages
- **Professional typography** using system fonts
- **Accessible color contrast** for readability

## ✅ Success Criteria

Your sidebar is working correctly if:
1. ✅ It opens without errors
2. ✅ Logo is displayed prominently
3. ✅ AI assistant interface is visible and styled properly
4. ✅ Speech-to-text functionality works
5. ✅ AI plan generation creates valid plans
6. ✅ Plan execution applies changes to Nextech
7. ✅ Status messages appear and fade out
8. ✅ Design is aesthetically pleasing

Enjoy your new SightFlow AI assistant! 🎉

