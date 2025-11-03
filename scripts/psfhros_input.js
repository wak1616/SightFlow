// SightFlow Chrome Extension - Content Script for PSFH/ROS
// Handles finding, selecting,and inserting text into the PSFH/ROS textarea in Intellechart
//
// Workflow (optimized through testing):
// 1. 


// Simple logging to confirm script loaded
console.log('SightFlow PSFH/ROS content script loaded successfully');

// Timing constants (in milliseconds)
const EXPANSION_DELAY = 150;    // Wait after expanding section (Angular needs time to render)

function findPMHFeild () {
  

chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg?.type === 'INSERT_PSFHROS') {
    // STEP 1: Expand the PMH section
    let pmh_inputarea = findPMHField();
   
  }
});

