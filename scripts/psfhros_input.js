// SightFlow Chrome Extension - Content Script for PSFH/ROS
// Handles finding, selecting,and inserting text into the PSFH/ROS textarea in Intellechart
//
// Workflow (optimized through testing):
// 1. 


// Simple logging to confirm script loaded
console.log('SightFlow PSFH/ROS content script loaded successfully');

// Timing constants (in milliseconds)
const EXPANSION_DELAY = 150;    // Wait after expanding section (Angular needs time to render)



function getContext() {
  const name = document.querySelector('[data-test="patient-name"], .patient-name')?.textContent?.trim();
  
  // Find DOB by looking for the "DOB" label element and searching within its parent container
  let dob = null;
  const allLabels = document.querySelectorAll('label');
  const dobLabel = Array.from(allLabels).find(el => {
    const text = el.textContent?.trim();
    return text === 'DOB';
  });
  
  if (dobLabel && dobLabel.parentElement) {
    // Search within the parent container of the DOB label
    const container = dobLabel.parentElement;
    // Look for the DOB value in the next sibling or parent's next sibling
    let candidate = dobLabel.nextElementSibling;
    if (candidate) {
      dob = candidate.textContent?.trim();
    } else {
      candidate = container.nextElementSibling;
      if (candidate) {
        dob = candidate.textContent?.trim();
      }
    }
  }
  
  const context = { name, dob };
  console.log('SightFlow: Patient context:', context);
  return context;
}

/**
 * Sets the value of a textarea in a way that Angular will detect
 * @param {HTMLElement} el - The textarea element
 * @param {string} text - The text to insert
 */
function setAngularValue(el, text) {
  // Use the native value setter to bypass Angular's change detection initially
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  setter.call(el, text);
  
  // Dispatch input event so Angular detects the change
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Expands the PMHx section by clicking on the appropriate element
 * @returns {boolean} True if successful, false if element not found
 */
function expandPSFHROSSection() {
  // This selector may need to be adjusted based on the actual DOM structure
  const psfhrosSection = document.querySelector('#psfhrosCC, [data-section="psfhros"]');
  if (!psfhrosSection) {
    return false;
  }
  
  psfhrosSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
  psfhrosSection.click();
  return true;
}

/**
 * Collapses and saves the PSFH/ROS section by clicking outside the edit area
 * @returns {boolean} True if successful, false if element not found
 */
function collapsePSFHROSSection() {
  const chartSection = document.querySelector('chart-chart-section-history, chart-chart-section-psfhros');
  if (!chartSection) {
    return false;
  }
  
  chartSection.click();
  return true;
}

// Main message listener - handles INSERT_PSFHROS command from background script

chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg?.type === 'INSERT_PSFHROS') {
    
    // Step 1: Find the PSFH/ROS textarea
    let psfhros_textarea = findPSFHROSField();
    
    if (!psfhros_textarea) {
      alert('PSFH/ROS textarea not found. Make sure you\'re on the correct page.');
      return;
    }
    
    let bounds = psfhros_textarea.getBoundingClientRect();
    
    // Step 2: If textarea is hidden (zero dimensions), try to expand the section
    if (bounds.width === 0 || bounds.height === 0) {
      const expanded = expandPSFHROSSection();
      
      if (!expanded) {
        alert('Could not find the PSFH/ROS section to expand. Please make sure you\'re on the correct page.');
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, EXPANSION_DELAY));
      
      // Re-find the textarea (might be a different element after expansion)
      psfhros_textarea = findPSFHROSField();
      if (!psfhros_textarea) {
        alert('PSFH/ROS textarea disappeared after expansion attempt.');
        return;
      }
    }
    
    // Step 3: Click and insert PSFH/ROS text
    psfhros_textarea.click();
    setAngularValue(psfhros_textarea, msg.psfhros_text);
    console.log('SightFlow: Text inserted into PSFH/ROS');
    
    // Step 4: Collapse the section to save
    collapsePSFHROSSection();
    console.log('SightFlow: PSFH/ROS section closed');
  }
});

