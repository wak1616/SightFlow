// SightFlow Chrome Extension - Content Script
// Handles finding and inserting text into the Extended HPI textarea in Intellechart
//
// Workflow (optimized through testing):
// 1. Click #hpiCC to expand the HPI section (if hidden)
// 2. Wait for page to load expanded elements (~150ms)
// 3. Find and click the Extended HPI textarea (textarea[matinput])
// 4. Insert text using Angular-compatible value setter
// 5. Click outside (chart-chart-section-history) to save and collapse

// Simple logging to confirm script loaded
console.log('SightFlow content script loaded successfully');

// Timing constants (in milliseconds)
const EXPANSION_DELAY = 150;    // Wait after expanding HPI section (Angular needs time to render)

/**
 * Finds the HPI textarea, prioritizing visible ones
 * @returns {HTMLElement|null} The textarea element or null if not found
 */
function findField() {
  const allElements = document.querySelectorAll('textarea[matinput].editable-textarea');
  
  // Loop through all matching textareas and return the first visible one
  for (let i = 0; i < allElements.length; i++) {
    const el = allElements[i];
    const bounds = el.getBoundingClientRect();
    
    // Check if element has actual dimensions (is visible)
    if (bounds.width > 0 && bounds.height > 0) {
      return el;
    }
  }
  
  // If none are visible, return the first match (might become visible after expansion)
  return allElements[0] || null;
}

/**
 * Gets patient context from the page (name and DOB)
 * @returns {Object} Object containing patient name and dob
 */
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
  
  // Dispatch events so Angular detects the change
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Expands the Extended HPI section by clicking on #hpiCC
 * @returns {boolean} True if successful, false if element not found
 */
function expandExtendedHPI() {
  const hpiCC = document.querySelector('#hpiCC');
  if (!hpiCC) {
    return false;
  }
  
  hpiCC.scrollIntoView({ behavior: 'auto', block: 'center' });
  hpiCC.click();
  return true;
}

/**
 * Collapses and saves the HPI section by clicking outside the edit area
 * @returns {boolean} True if successful, false if element not found
 */
function collapseHPISection() {
  const chartSection = document.querySelector('chart-chart-section-history');
  if (!chartSection) {
    return false;
  }
  
  chartSection.click();
  return true;
}

// Main message listener - handles INSERT_HPI command from background script

chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg?.type === 'INSERT_HPI') {
    // Step 1: Find the HPI textarea
    let el = findField();
    
    if (!el) {
      alert('HPI textarea not found. Make sure you\'re on the correct page.');
      return;
    }
    
    let bounds = el.getBoundingClientRect();
    
    // Step 2: If textarea is hidden (zero dimensions), try to expand the section
    if (bounds.width === 0 || bounds.height === 0) {
      const expanded = expandExtendedHPI();
      
      if (!expanded) {
        alert('Could not find the HPI section to expand. Please make sure you\'re on the correct page.');
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, EXPANSION_DELAY));
      
      // Re-find the textarea (might be a different element after expansion)
      el = findField();
      if (!el) {
        alert('HPI textarea disappeared after expansion attempt.');
        return;
      }
      
      bounds = el.getBoundingClientRect();
      
      // Check if expansion worked
      if (bounds.width === 0 || bounds.height === 0) {
        alert('Could not automatically expand the Extended HPI section. Please manually expand it first, then try again.');
        return;
      }
    }
    
    // Step 3: Get patient context and show confirmation dialog
    const ctx = getContext();
    const patientName = ctx.name || 'patient';
    const patientDOB = ctx.dob ? `\nDOB: ${ctx.dob}` : '';
    
    if (!confirm(`Insert text into Extended HPI for ${patientName}?${patientDOB}\n\n<< ${msg.text} >>`)) {
      return;
    }
    
    // Step 4: Click and insert text
    el.click();
    setAngularValue(el, msg.text);
    console.log('SightFlow: Text inserted into Extended HPI');
    
    // Step 5: Collapse the section to save
    collapseHPISection();
  }
});
