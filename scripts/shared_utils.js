// SightFlow Chrome Extension - Shared Utilities
// Used across multiple content scripts


// ==================== UTILITY FUNCTIONS ====================

/**
 * Async helper to wait/delay execution
 * @param {number} ms - Milliseconds to wait (defaults to 150ms)
 * @returns {Promise} Promise that resolves after the specified delay
 */
async function wait(ms = 500) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to click on a textarea for subsequent freetyping
function clickTextAreaWithinSection(section){
  const sectionElement = document.querySelector(section);
  const textArea = sectionElement.querySelector('textarea[matinput].editable-textarea');
  if (textArea) {
    textArea.click();
    return textArea;
  } else {
    console.log(`SightFlow: Could not find text area within section "${section}"`);
    return null;
  }
}


function getContext() {
  const patientContext = document.title?.trim() || null;
  console.log('SightFlow: Patient context:', patientContext);
  return patientContext;
}

// Listen for context requests from sidebar
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'GET_CONTEXT') {
    const context = getContext();
    sendResponse({ context: context });
    return true; // Keep channel open for async response
  }
});

/**
 * Sets the value of a mat-input textarea or input element in a way that Angular will detect
 * @param {HTMLElement} el - The textarea or input element
 * @param {string} text - The text to insert
 */
function setAngularValue(el, text) {
  // the following DOESN'T work with Angular: element.value = "some text";
  // Checks if the element is a <textarea> or <input>, 
  // then gets the appropriate native browser prototype.
  const isTextarea = el.tagName.toLowerCase() === 'textarea'; //tagName always comes out uppercase, so we need to convert to lowercase
  const prototype = isTextarea ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  
  // Use the native value setter to bypass Angular's change detection initially
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
  setter.call(el, text);
  
  // Dispatch input event so Angular detects the change
  el.dispatchEvent(new InputEvent('input', { bubbles: true }));
  el.dispatchEvent(new InputEvent('change', { bubbles: true }));
}

/**
 * Expands a section by clicking on the specified element ID
 * @param {string} sectionId - The ID selector (e.g., '#hpiCC')
 * @returns {Promise<boolean>} True if successful, false if element not found
 */
async function expandByID(sectionId) {
  const el = document.querySelector(sectionId);
  if (!el) {
    console.log(`SightFlow: Could not find element with selector "${sectionId}"`);
    return false;
  }
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.click();
  await wait();
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

// Function  to be able to select "OU" from CC/HPI screen (parentElement should be easilty identifiable)
function clickLocationInScrollable(location) {
  const scrollableDivs = document.querySelectorAll('div[class="scrollable"]');
  for (const div of scrollableDivs) {
    // Look for a child div with the specified title (1-2 layers down)
    const targetChild = div.querySelector(`div[title="${location}"]`);
    if (targetChild) {
      targetChild.click();
      return; // stop after finding the first match
    }
  }
}

/**
 * Checks a checkbox by finding its label text, but only if it's not already checked
 * @param {string} labelText - The text in the label to search for (e.g., "Mental Status Exam")
 * @returns {boolean} True if successful, false if element not found
 */
function checkCheckboxByLabel(labelText) {
  // Find all mat-checkbox elements
  const allCheckboxes = document.querySelectorAll('mat-checkbox');
  
  for (const matCheckbox of allCheckboxes) {
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

function clickAddButtonWithinSection(section) {
  const addButton = document.querySelector(`${section} button`);
  if (addButton) {
    addButton.click();
    console.log(`SightFlow: Clicked add button within section "${section}"`);
    return true;
  }
  else {
    console.log(`SightFlow: Could not find add button within section "${section}"`);
    return false;
  }
}

//Find inputbox using attrstring.
function findInputBox(section) {
  const sectionElement = document.querySelector(section);
  const inputBox = sectionElement.querySelector("div input");
  if (inputBox) {
    console.log("SightFlow: Found input box within section");
    return inputBox;
  }
  else {
    console.log("Sightflow: Found NO input box within section");
    return null;
  }
}

//Start with parent element, then find scrollable list and extrat titles from there.
function extractTitlesFromScrollable(parentTagNameString, yPixels) {
  // Find all scrollable divs within parent, then filter by height
  const scrollableDivs = document.querySelectorAll(`${parentTagNameString} div.scrollable`);
  
  let parentDiv = null;
  for (const div of scrollableDivs) {
    // Check if style attribute contains the exact height specification
    const styleAttr = div.getAttribute('style');
    if (styleAttr && styleAttr.includes(`height: ${yPixels}`)) {
      parentDiv = div;
      break;
    }
  }
  
  if (!parentDiv) {
    console.log(`SightFlow: Could not find scrollable div with height ${yPixels}px within ${parentTagNameString}`);
    return [];
  }
  
  const elements = parentDiv.querySelectorAll('div[title]');
  console.log(`SightFlow: Extracted ${elements.length} titles from scrollable div`);
  const titles = Array.from(elements).map(element => element.getAttribute('title'));
  return titles;
}
