# SightFlow Nextech Helper

A Chrome extension that helps streamline workflow in Intellechart by providing keyboard shortcuts to insert text into HPI (History of Present Illness) fields.

## Features

- **Keyboard Shortcut**: Press `Alt+Shift+H` to insert text into the Extended HPI textarea
- **Smart Field Detection**: Automatically finds and expands the HPI section if needed
- **Patient Context Awareness**: Shows patient name in confirmation dialog before inserting text
- **Angular-Compatible**: Properly triggers change detection for Angular-based forms

## Installation

1. Clone this repository or download the files
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the extension directory
5. The extension should now be active on Intellechart pages

## Usage

1. Navigate to a patient chart in Intellechart (https://app1.intellechart.net/*)
2. Press `Alt+Shift+H` to trigger the HPI insertion
3. Confirm the action in the dialog box
4. The text will be inserted into the Extended HPI field

## Files

- `manifest.json` - Extension configuration and permissions
- `background.js` - Background service worker handling keyboard shortcuts
- `content.js` - Content script that interacts with the Intellechart page
- `content.css` - Minimal styling for the extension

## Customization

To change the text being inserted, edit the `text` property in the `chrome.tabs.sendMessage` call in `background.js` (line 13).

## Permissions

- `scripting` - Required to inject content scripts
- `activeTab` - Access to the currently active tab
- `storage` - For potential future features requiring data storage
- `host_permissions` - Limited to `app1.intellechart.net` domain

## Development

This extension uses Manifest V3 and is compatible with modern Chrome/Chromium browsers.

## Version

Current version: 0.1.0

## License

