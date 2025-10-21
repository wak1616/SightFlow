// SightFlow Chrome Extension - Content Script
// Handles finding and inserting text into the Extended HPI textarea in Intellechart

// Selectors for finding the HPI textarea (optimized based on testing)
const SELECTORS = {
  HPI: 'textarea[matinput].editable-textarea'
};

// Simple logging to confirm script loaded
console.log('SightFlow content script loaded successfully');

/**
 * Finds the HPI textarea, prioritizing visible ones
 * @param {string} section - The section to find (currently only 'HPI')
 * @returns {HTMLElement|null} The textarea element or null if not found
 */
function findField(section) {
  const allElements = document.querySelectorAll(SELECTORS[section]);
  
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
 * Gets patient context from the page (name, MRN, encounter date)
 * @returns {Object} Object containing patient name, mrn, and encounter info
 */
function getContext() {
  const name = document.querySelector('[data-test="patient-name"], .patient-name')?.textContent?.trim();
  const mrn = document.querySelector('[data-test="patient-mrn"], .patient-mrn')?.textContent?.trim();
  const enc = document.querySelector('[data-test="encounter-date"], .encounter-date')?.textContent?.trim();
  return { name, mrn, enc };
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
  el.dispatchEvent(new Event('blur', { bubbles: true }));
}

/**
 * Attempts to expand the Extended HPI section by clicking on the HPI area
 * @returns {boolean} True if an element was found and clicked, false otherwise
 */
function expandExtendedHPI() {
  const hpiElement = document.querySelector('div[dragula="HPIFINDINGSNESTED"]');
  if (hpiElement) {
    hpiElement.click();
    hpiElement.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    return true;
  }
  return false;
}

/**
 * Main message listener - handles INSERT_HPI command from background script
 */
chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg?.type === 'INSERT_HPI') {
    // Step 1: Find the HPI textarea
    let el = findField('HPI');
    
    if (!el) {
      alert('HPI textarea not found. Make sure you\'re on the correct page.');
      return;
    }
    
    let bounds = el.getBoundingClientRect();
    
    // Step 2: If textarea is hidden (zero dimensions), try to expand the section
    if (bounds.width === 0 || bounds.height === 0) {
      expandExtendedHPI();
      
      // Wait for UI to update after clicking
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Re-find the textarea (might be a different element after expansion)
      el = findField('HPI');
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
    
    if (!confirm(`Insert text into Extended HPI for ${patientName}?\n\n${msg.text}`)) {
      return;
    }
    
    // Step 4: Focus and insert text
    el.focus();
    el.click();
    
    // Small delay to ensure field is ready
    setTimeout(() => {
      setAngularValue(el, msg.text);
    }, 100);
  }
});
