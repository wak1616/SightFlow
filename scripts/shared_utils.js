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
 * Sets the value of a mat-input textarea or input element in a way that Angular will detect
 * @param {HTMLElement} el - The textarea or input element
 * @param {string} text - The text to insert
 */
function setAngularValue(el, text) {
  // Determine if it's a textarea or input element
  const isTextarea = el.tagName.toLowerCase() === 'textarea';
  const prototype = isTextarea ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  
  // Use the native value setter to bypass Angular's change detection initially
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
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
 * @returns {boolean} True if successful, false if element not found
 */
function clickVisibleElementByTitle(titleText) {
  const allDivs = document.querySelectorAll('div[title]');
  for (let i = 0; i < allDivs.length; i++) {
    const div = allDivs[i];
    if (div.getAttribute('title') === titleText) {
      // Check if visible (in case there are multiple matches, we want the visible one)
      const bounds = div.getBoundingClientRect();
      if (bounds.width > 0 && bounds.height > 0) {
        div.click();
        console.log(`SightFlow: Clicked element with title="${titleText}"`);
        return true;
      }
    }
  }
  console.log(`SightFlow: Could not find visible element with title="${titleText}"`);
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
 * Clicks a button with a specific title inside a parent element that has a specific attribute
 * Note: Angular binds attributes as attr.data-qa, not data-qa, so we need to check the attribute directly
 * @param {string} parentElement - The parent element selector (e.g., 'icp-add-button')
 * @param {string} attrString - The full attribute specification (e.g., 'attr.data-qa="medicalHxControllAddButton"')
 * @param {string} childButtonTitle - The title attribute of the button to click (e.g., "Add")
 * @returns {boolean} True if successful, false if element not found
 */
function clickButtonByParentAndTitle(parentElement, attrString, childButtonTitle) {
  // Parse the attribute string to extract attribute name and value
  // Expected format: 'attr.data-qa="medicalHxControllAddButton"'
  const match = attrString.match(/^([^=]+)="([^"]+)"$/);
  if (!match) {
    console.log(`SightFlow: Invalid attribute string format: "${attrString}". Expected format: 'attr.name="value"'`);
    return false;
  }
  
  const attrName = match[1].trim();
  const attrValue = match[2];
  
  // Find all parent elements and check for the specified attribute
  const allParents = document.querySelectorAll(parentElement);
  console.log(`SightFlow: Found ${allParents.length} ${parentElement} elements`);
  
  for (let i = 0; i < allParents.length; i++) {
    const container = allParents[i];
    // Check for the specified attribute
    const attr = container.getAttribute(attrName);
    
    if (attr === attrValue) {
      // Found the right container, now find the button inside
      const button = container.querySelector(`button[title="${childButtonTitle}"]`);
      if (button) {
        button.click();
        console.log(`SightFlow: Clicked button with title="${childButtonTitle}" (parent has ${attrName}="${attrValue}")`);
        return true;
      } else {
        console.log(`SightFlow: Found correct ${parentElement} but no button[title="${childButtonTitle}"] inside`);
      }
    }
  }
  
  console.log(`SightFlow: Could not find button with title="${childButtonTitle}" in ${parentElement}[${attrName}="${attrValue}"]`);
  return false;
}

/**
 * Finds a text input element by a specific attribute
 * Note: Angular binds attributes as attr.data-qa, not data-qa, so we need to check the attribute directly
 * @param {string} attrString - The full attribute specification (e.g., 'attr.data-qa="medicalHxControlUpdateMedicalText"')
 * @returns {HTMLElement|null} The matching input element, or null if not found
 */
function findTextInputByAttribute(attrString) {
  // Parse the attribute string to extract attribute name and value
  // Expected format: 'attr.data-qa="medicalHxControlUpdateMedicalText"'
  const match = attrString.match(/^([^=]+)="([^"]+)"$/);
  if (!match) {
    console.log(`SightFlow: Invalid attribute string format: "${attrString}". Expected format: 'attr.name="value"'`);
    return null;
  }
  
  const attrName = match[1].trim();
  const attrValue = match[2];
  
  // Find all input[type="text"] elements
  const allInputs = document.querySelectorAll('input[type="text"]');
  console.log(`SightFlow: Found ${allInputs.length} input[type="text"] elements`);
  
  for (let i = 0; i < allInputs.length; i++) {
    const input = allInputs[i];
    // Check for the specified attribute
    const attr = input.getAttribute(attrName);
    
    if (attr === attrValue) {
      console.log(`SightFlow: Found text input (${i}) with ${attrName}="${attrValue}"`);
      return input;
    }
  }
  
  console.log(`SightFlow: Could not find text input with ${attrName}="${attrValue}"`);
  return null;
}

/**
 * Extracts all title attribute values from divs within a parent div with class "scrollable"
 * Finds the scrollable div with the most title elements (typically the medical history list)
 * @returns {Array<string>} Array of title values, or empty array if not found
 */
function extractTitlesFromScrollable() {
  // Find all divs with class "scrollable"
  const allScrollableDivs = document.querySelectorAll('div.scrollable');
  
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


