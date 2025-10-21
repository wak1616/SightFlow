// SightFlow Chrome Extension - Background Script
// Listens for keyboard shortcuts and sends messages to content script

chrome.commands.onCommand.addListener(async (command) => {
  // Get the currently active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  
  // Handle Alt+Shift+H shortcut - Insert text into HPI
  if (command === 'sf-insert-hpi') {
    chrome.tabs.sendMessage(tab.id, {
      type: 'INSERT_HPI',
      text: '(TEST) Patient presents with blurry vision OU, worse in dim lighting. Duration 6 months, gradually progressive.'
    });
  }
});
