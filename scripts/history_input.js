// SightFlow Chrome Extension - Content Script
// Handles finding, selecting, and inserting text into the Extended HPI textarea in Intellechart
//
// Workflow (optimized through testing):
// 1. Click #hpiCC to expand the HPI section (if hidden)
// 2. Wait for page to load expanded elements (~150ms)
// 3. Find and click the Extended HPI textarea (textarea[matinput])
// 4. Click/event sequence for CC (Chief Complaint) and Eye Location
// 5. Insert text using Angular-compatible value setter
// 6. Select mental status exam checkbox
// 7. Click outside (chart-chart-section-history) to save and collapse

// Simple logging to confirm script loaded
console.log('SightFlow content script loaded successfully');

// Timing constants (in milliseconds)
const EXPANSION_DELAY = 150;    // Wait after expanding HPI section (Angular needs time to render)

/**
 * Finds the Extended HPI textarea
 * @returns {HTMLElement|null} The textarea element or null if not found
 */
function findExtendedHPIField() {
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
  
  // Dispatch input event so Angular detects the change
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Expands the HPI section by clicking on #hpiCC
 * @returns {boolean} True if successful, false if element not found
 */
function expandHPISection() {
  const hpiCC = document.querySelector('#hpiCC');
  if (!hpiCC) {
    return false;
  }
  
  hpiCC.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

/**
 * Finds and clicks the Chief Complaint element containing the specified text
 * @param {string} complaintText - The text to search for (e.g., "Blurred Vision")
 * @returns {boolean} True if successful, false if element not found
 */
function clickChiefComplaint(complaintText) {
  // Find by title attribute (should be unique in DOM)
  const ccElement = document.querySelector(`div[title="${complaintText}"]`);
  
  if (!ccElement) {
    console.log(`SightFlow: Could not find Chief Complaint element with title="${complaintText}"`);
    return false;
  }
  
  // Click the element
  ccElement.click();
  console.log(`SightFlow: Clicked Chief Complaint element: "${complaintText}"`);
  return true;
}

/**
 * Generic helper to find and click a VISIBLE element by title attribute
 * Useful when there may be multiple elements (some hidden) with the same title in the DOM
 * @param {string} titleText - The title attribute value to search for
 * @param {string} elementType - Description for logging (e.g., "Eye Location")
 * @returns {boolean} True if successful, false if element not found
 */
function clickElementByTitle(titleText, elementType) {
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
 * Finds and clicks the Eye Location element containing the specified text
 * @param {string} locationText - The text to search for (e.g., "OU")
 * @returns {boolean} True if successful, false if element not found
 */
function clickEyeLocation(locationText) {
  return clickElementByTitle(locationText, 'Eye Location');
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
    if (matCheckbox.textContent && matCheckbox.textContent.trim().toLowerCase().includes(labelText.trim().toLowerCase())) {
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

// Main message listener - handles INSERT_HPI command from background script

chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg?.type === 'INSERT_HPI') {

    // Step 1: Find the "Extended HPI" textarea
    let extendedhpi_textarea = findExtendedHPIField();
    
    if (!extendedhpi_textarea) {
      alert('Extended HPI textarea not found. Make sure you\'re on the correct page.');
      return;
    }
    
    let bounds = extendedhpi_textarea.getBoundingClientRect();
    
    // Step 2: If textarea is hidden (zero dimensions), try to expand the section
    if (bounds.width === 0 || bounds.height === 0) {
      const expanded = expandHPISection();
      
      if (!expanded) {
        alert('Could not find the HPI section to expand. Please make sure you\'re on the correct page.');
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, EXPANSION_DELAY));
      
      // Re-find the textarea (might be a different element after expansion)
      extendedhpi_textarea = findExtendedHPIField();
      if (!extendedhpi_textarea) {
        alert('HPI textarea disappeared after expansion attempt.');
        return;
      }
    }
    
    // Step 3: Get patient context (uncomment to use for confirmation dialog, if needed in future)
    // const ctx = getContext();
    
    // Step 4: Click sequence for Chief Complaint
    const ccClicked = clickChiefComplaint('Blurred Vision');
    if (!ccClicked) {
      console.warn('SightFlow: Could not click Chief Complaint, continuing anyway...');
    }
    
    // Step 4 (continued): Click sequence for Eye Location
    const locationClicked = clickEyeLocation('OU');
    if (!locationClicked) {
      console.warn('SightFlow: Could not click Eye Location, continuing anyway...');
    }
    
    // Step 5: Click and insert Extended HPI text
    extendedhpi_textarea.click();
    setAngularValue(extendedhpi_textarea, msg.extendedhpi_text);
    console.log('SightFlow: Text inserted into Extended HPI');
    
    // Step 6: Select mental status exam checkbox
    const checkboxChecked = checkCheckboxByLabel('Mental Status Exam');
    if (!checkboxChecked) {
      console.warn('SightFlow: Could not check Mental Status Exam checkbox, continuing anyway...');
    }
    
    // Step 7: Collapse the section to save
    collapseHPISection();
    console.log('SightFlow: HPI section closed');
  }
});

