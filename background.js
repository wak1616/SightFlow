// SightFlow Chrome Extension - Background Script
// Listens for keyboard shortcuts and sends messages to content script

chrome.commands.onCommand.addListener(async (command) => {
  console.log('SightFlow: Command received:', command);
  
  // Get the currently active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    console.log('SightFlow: No active tab found');
    return;
  }
  
  // Handle Alt+Shift+H shortcut - Insert text into HPI
  if (command === 'sf-insert-hpi') {
    console.log('SightFlow: Sending INSERT_HPI message to tab', tab.id);
    chrome.tabs.sendMessage(tab.id, {
      type: 'INSERT_HPI',
      extendedhpi_text: 'Patient presents with blurry vision OU, despite the use of glasses, as well as increased glare. This has worsened over the past 6 months. The patient has been told he may have cataracts.'
    });
  }
  
  // Handle Alt+Shift+M shortcut - Insert text into PSFH/ROS
  if (command === 'sf-insert-psfhros') {
    console.log('SightFlow: Sending INSERT_PSFHROS message to tab', tab.id);
    chrome.tabs.sendMessage(tab.id, {
      type: 'INSERT_PSFHROS',
      psfhros_text: 'PSFH/ROS content goes here.'
    });
  }
});

