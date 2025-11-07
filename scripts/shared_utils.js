// SightFlow Chrome Extension - Shared Utilities
// Used across multiple content scripts


// ==================== UTILITY FUNCTIONS ====================

/**
 * Async helper to wait/delay execution
 * @param {number} ms - Milliseconds to wait (defaults to 150ms)
 * @returns {Promise} Promise that resolves after the specified delay
 */
async function wait(ms = 150) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Finds a visible mat input TEXT area
 * @returns {HTMLElement|null} The textarea element or null if not found
 */
function findMatInputArea() {
  const allElements = document.querySelectorAll('textarea[matinput].editable-textarea');
  // Loop through all matching textareas and return the first visible one
  for (let i = 0; i < allElements.length; i++) {
    const el = allElements[i];
    const bounds = el.getBoundingClientRect();
    console.log(`Element ${i}: w=${bounds.width}, h=${bounds.height}, visible=${bounds.width > 0 && bounds.height > 0}`, el);
    // Check if element has actual dimensions (is visible)
    if (bounds.width > 0 && bounds.height > 0) {
      return el;
    }
  }
  return null;
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
 * Sets the value of a mat-input textarea in a way that Angular will detect
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
 * Expands a section by clicking on the specified element ID
 * @param {string} sectionId - The ID selector (e.g., '#hpiCC')
 * @returns {boolean} True if successful, false if element not found
 */
function expandByID(sectionId) {
  const el = document.querySelector(sectionId);
  if (!el) {
    console.log(`SightFlow: Could not find element with selector "${sectionId}"`);
    return false;
  }
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.click();
  return true;
}

/**
 * Collapses and saves the section by clicking outside the edit area
 * @returns {boolean} True if successful, false if element not found
 */
function collapse() {
  const outerSection = document.querySelector('chart-chart-section-history');
  if (!outerSection) {
    console.log('SightFlow: Could not find chart-chart-section-history element');
    return false;
  }
  outerSection.click();
  return true;
}

/**
 * Finds and clicks a div element by title attribute
 * @param {string} titleText - The title attribute value to search for
 * @returns {boolean} True if successful, false if element not found
 */
function clickElementByTitle(titleText) {
  // Find by title attribute (should be unique in DOM)
  const element = document.querySelector(`div[title="${titleText}"]`);
  
  if (!element) {
    console.log(`SightFlow: Could not find element with title="${titleText}"`);
    return false;
  }
  // Click the element
  element.click();
  console.log(`SightFlow: Clicked element: "${titleText}"`);
  return true;
}

/**
 * Generic helper to find and click a VISIBLE element by title attribute
 * Useful when there may be multiple elements (some hidden) with the same title in the DOM
 * @param {string} titleText - The title attribute value to search for
 * @param {string} elementType - Description for logging (e.g., "Eye Location")
 * @returns {boolean} True if successful, false if element not found
 */
function clickVisibleElementByTitle(titleText, elementType) {
  const allDivs = document.querySelectorAll('div[title]');
  for (let i = 0; i < allDivs.length; i++) {
    const div = allDivs[i];
    if (div.getAttribute('title') === titleText) {
      // Check if visible (in case there are multiple matches, we want the visible one)
      const bounds = div.getBoundingClientRect();
      if (bounds.width > 0 && bounds.height > 0) {
        div.click();
        console.log(`SightFlow: Clicked ${elementType}: "${titleText}"`);
        return true;
      }
    }
  }
  console.log(`SightFlow: Could not find visible ${elementType} element with title="${titleText}"`);
  return false;
}

/**
 * Checks a checkbox by finding its label text, but only if it's not already checked
 * @param {string} labelText - The text in the label to search for (e.g., "Mental Status Exam")
 * @returns {boolean} True if successful, false if element not found
 */
function checkCheckboxByLabel(labelText) {
  // Find all mat-checkbox elements
  const allCheckboxes = document.querySelectorAll('mat-checkbox');
  
  for (let i = 0; i < allCheckboxes.length; i++) {
    const matCheckbox = allCheckboxes[i];
    // Check if this checkbox's label contains the text we're looking for (case-insensitive)
    if (matCheckbox.textContent.trim().toLowerCase().includes(labelText.trim().toLowerCase())) {
      // Find the actual input element inside
      const checkbox = matCheckbox.querySelector('input[type="checkbox"]');
      
      if (!checkbox) {
        console.log(`SightFlow: Found mat-checkbox with label "${labelText}" but no input inside`);
        return false;
      }
      
      // Check if already checked
      if (checkbox.checked) {
        console.log(`SightFlow: Checkbox "${labelText}" is already checked, skipping`);
        return true;
      }
      
      // Click to check it
      checkbox.click();
      console.log(`SightFlow: Checked checkbox: "${labelText}"`);
      return true;
    }
  }
  console.log(`SightFlow: Could not find checkbox with label containing "${labelText}"`);
  return false;
}

/**
 * Extracts all title attribute values from divs within a parent div with class "scrollable"
 * Finds the scrollable div with the most title elements (typically the medical history list)
 * @returns {Array<string>} Array of title values, or empty array if not found
 */
function extractTitlesFromScrollable() {
  // Find all divs with class "scrollable"
  const allScrollableDivs = document.querySelectorAll('div.scrollable');
  console.log(`SightFlow: Found ${allScrollableDivs.length} divs with class "scrollable"`);
  
  // Loop through all and find the one with the most title elements
  let maxTitles = 0;
  let bestTitles = [];
  
  for (let i = 0; i < allScrollableDivs.length; i++) {
    const div = allScrollableDivs[i];
    const titledDivs = div.querySelectorAll('div[title]');
    
    console.log(`SightFlow: Scrollable div ${i}: titles=${titledDivs.length}`);
    
    // Keep track of the div with the most titles
    if (titledDivs.length > maxTitles) {
      maxTitles = titledDivs.length;
      bestTitles = Array.from(titledDivs).map(d => d.getAttribute('title'));
      console.log(`SightFlow: New best candidate at index ${i} with ${maxTitles} titles`);
    }
  }
  
  if (maxTitles === 0) {
    console.log('SightFlow: Could not find any div with class "scrollable" that contains title elements');
    return [];
  }
  
  console.log(`SightFlow: Selected scrollable div with ${bestTitles.length} titles`);
  return bestTitles;
}


