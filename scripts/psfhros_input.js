// SightFlow Chrome Extension - Content Script for PSFH/ROS
// Handles finding, selecting,and inserting text into the PSFH/ROS textarea in Intellechart
//
// Workflow (optimized through testing):
// 1. Click 


// Simple logging to confirm script loaded
console.log('SightFlow PSFH/ROS content script loaded successfully');

// Find PMH selection for a specific condition
function findPMHField (elementTitle) {
  const pmhElement = document.querySelector(`div[title="${elementTitle}"]`);

  if (!pmhElement) {
    console.log(`SightFlow: Could not find PMH element with title="${elementTitle}"`);
    return false;
  }

  return pmhElement;
}
chrome.runtime.onMessage.addListener(async (msg) => {
  console.log('SightFlow PSFHROS: Message received in content script', msg);
  
  if (msg?.type === 'INSERT_PSFHROS') {
    console.log('SightFlow PSFHROS: Processing INSERT_PSFHROS command');
   
    // STEP 1: Find PMH element
    let pmh_inputarea = findPMHField('Colon Cancer');
    console.log('SightFlow PSFHROS: Search result:', pmh_inputarea);

    if (!pmh_inputarea) {
      console.log('SightFlow PSFHROS: Element not found, showing alert');
      alert('PMH input area not found. Make sure you\'re on the correct page.');
      return;
    }
    console.log('SightFlow PSFHROS: PMH element found successfully!', pmh_inputarea);
    // STEP 2: If PMH area is hidden, try to expand it:
  }
});

