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
      extendedhpi_text: 'Patient presents with blurry vision OU, despite the use of glasses, as well as increased glare. This has worsened over the past 6 months. The patient has been told he may have cataracts.'
    });
  }
});
