# SightFlow Nextech Helper

A Chrome extension that helps streamline workflow in Intellechart by providing keyboard shortcuts and a convenient sidebar to insert text into HPI (History of Present Illness) fields and select PMH elements.

## Features

- **Sidebar Interface**: Beautiful side panel with buttons for quick actions
- **Keyboard Shortcuts**: 
  - Press `Alt+Shift+H` to insert text into the Extended HPI textarea
  - Press `Alt+Shift+M` to select PMH (Past Medical History) elements
- **Smart Field Detection**: Automatically finds and expands the HPI section if needed
- **Patient Context Awareness**: Gathers patient context for processing
- **Angular-Compatible**: Properly triggers change detection for Angular-based forms
- **Modern UI**: Aesthetically pleasing interface with the SightFlow logo

## Installation

1. Clone this repository or download the files
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the extension directory
5. The extension should now be active on Intellechart pages

## Usage

### Using the Sidebar (Recommended)

1. Navigate to a patient chart in Intellechart (https://app1.intellechart.net/*)
2. Click the SightFlow extension icon and open the side panel
3. Use the action buttons:
   - **Insert HPI** button - Inserts HPI text (equivalent to Alt+Shift+H)
   - **Select PMH** button - Selects PMH elements (equivalent to Alt+Shift+M)
4. Status messages will appear to confirm the action

### Using Keyboard Shortcuts

1. Navigate to a patient chart in Intellechart (https://app1.intellechart.net/*)
2. Press `Alt+Shift+H` to trigger the HPI insertion
3. Press `Alt+Shift+M` to trigger the PMH selection
4. The actions will execute automatically

## Files

- `manifest.json` - Extension configuration and permissions
- `background.js` - Background service worker handling keyboard shortcuts and sidebar messages
- `scripts/history_input.js` - Content script for HPI insertion
- `scripts/psfhros_input.js` - Content script for PMH selection
- `scripts/shared_utils.js` - Shared utility functions
- `sidebar/sidebar.html` - Sidebar interface
- `sidebar/sidebar.css` - Sidebar styling
- `sidebar/sidebar.js` - Sidebar functionality

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

