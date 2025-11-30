"use strict";
// SightFlow Chrome Extension - Shared Utilities
// Used across multiple content scripts
// ==================== UTILITY FUNCTIONS ====================
/**
 * Async helper to wait/delay execution
 * @param ms - Milliseconds to wait (defaults to 500ms)
 * @returns Promise that resolves after the specified delay
 */
async function wait(ms = 500) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
// Function to click on a textarea for subsequent freetyping
function clickTextAreaWithinSection(section) {
    const sectionElement = document.querySelector(section);
    const textArea = sectionElement?.querySelector('textarea[matinput].editable-textarea');
    if (textArea) {
        textArea.click();
        return textArea;
    }
    else {
        console.log(`SightFlow: Could not find text area within section "${section}"`);
        return null;
    }
}
function getContext() {
    const patientContext = document.title?.trim() || null;
    console.log('SightFlow: Patient context:', patientContext);
    return patientContext;
}
/**
 * Sets the value of a mat-input textarea or input element in a way that Angular will detect
 * @param el - The textarea or input element
 * @param text - The text to insert
 */
function setAngularValue(el, text) {
    // the following DOESN'T work with Angular: element.value = "some text";
    // Checks if the element is a <textarea> or <input>, 
    // then gets the appropriate native browser prototype.
    const isTextarea = el.tagName.toLowerCase() === 'textarea'; //tagName always comes out uppercase, so we need to convert to lowercase
    const prototype = isTextarea ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    // Use the native value setter to bypass Angular's change detection initially
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
    const setter = descriptor?.set;
    if (!setter) {
        console.log('SightFlow: Could not find value setter on prototype');
        return;
    }
    setter.call(el, text);
    // Dispatch input event so Angular detects the change
    el.dispatchEvent(new InputEvent('input', { bubbles: true }));
    el.dispatchEvent(new InputEvent('change', { bubbles: true }));
}
/**
 * Expands a section by clicking on the specified element ID
 * @param sectionId - The ID selector (e.g., '#hpiCC')
 * @returns True if successful, false if element not found
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
 * @returns True if successful, false if element not found
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
 * @param titleText - The title attribute value to search for
 * @returns True if successful, false if element not found
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
            console.log(`SightFlow: Clicked eye location: "${location}"`);
            return true;
        }
    }
    console.log(`SightFlow: Could not find eye location: "${location}"`);
    return false;
}
// Click on a CC finding by matching its text content (span.hpi-finding elements)
function clickCCFindingByText(findingText) {
    const hpiFindingSpans = document.querySelectorAll('chart-hpi span.hpi-finding');
    for (const span of hpiFindingSpans) {
        if (span.textContent?.trim().toLowerCase() === findingText.trim().toLowerCase()) {
            span.click();
            console.log(`SightFlow: Clicked CC finding: "${findingText}"`);
            return true;
        }
    }
    console.log(`SightFlow: Could not find CC finding: "${findingText}"`);
    return false;
}
// Find the findingText input for free-typing a CC
function findCCFindingTextInput() {
    const input = document.querySelector('chart-hpi input[name="findingText"]');
    if (input) {
        console.log('SightFlow: Found findingText input');
        return input;
    }
    console.log('SightFlow: Could not find findingText input');
    return null;
}
/**
 * Checks a checkbox by finding its label text, but only if it's not already checked
 * @param labelText - The text in the label to search for (e.g., "Mental Status Exam")
 * @returns True if successful, false if element not found
 */
function checkCheckboxByLabel(labelText) {
    // Find all mat-checkbox elements
    const allCheckboxes = document.querySelectorAll('mat-checkbox');
    for (const matCheckbox of allCheckboxes) {
        // Check if this checkbox's label contains the text we're looking for (case-insensitive)
        if (matCheckbox.textContent?.trim().toLowerCase().includes(labelText.trim().toLowerCase())) {
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
    const inputBox = sectionElement?.querySelector("div input");
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
function extractPMHxTitlesFromScrollable(parentTagNameString, yPixels) {
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
    const titles = Array.from(elements).map(element => element.getAttribute('title')).filter((title) => title !== null);
    return titles;
}
//Extract CC findings and Eye Locations from scrollable lists within chart-hpi section
function extractCCandLocationFromScrollables(yPixels = 300) {
    const parentTagNameString = 'chart-hpi';
    // Find all scrollable divs within chart-hpi, then filter by height
    const scrollableDivs = document.querySelectorAll(`${parentTagNameString} div.scrollable`);
    let ccFindings = [];
    let eyeLocations = [];
    for (const div of scrollableDivs) {
        // Check if style attribute contains the exact height specification
        const styleAttr = div.getAttribute('style');
        if (styleAttr && styleAttr.includes(`height: ${yPixels}`)) {
            // Check for CC Findings (span.hpi-finding elements)
            const hpiFindingElements = div.querySelectorAll('span.hpi-finding');
            if (hpiFindingElements.length > 0) {
                ccFindings = Array.from(hpiFindingElements).map(element => element.textContent?.trim() ?? '');
                const first3CC = ccFindings.slice(0, 3);
                const last3CC = ccFindings.slice(-3);
                console.log(`SightFlow: Extracted ${ccFindings.length} CC findings. First 3: [${first3CC.join(', ')}] | Last 3: [${last3CC.join(', ')}]`);
            }
            // Check for Eye Locations (div[title] elements, excluding history-row-item class)
            const titleElements = div.querySelectorAll('div[title]:not(.history-row-item)');
            if (titleElements.length > 0 && hpiFindingElements.length === 0) {
                eyeLocations = Array.from(titleElements).map(element => element.getAttribute('title')).filter((title) => title !== null);
                const first3Loc = eyeLocations.slice(0, 3);
                const last3Loc = eyeLocations.slice(-3);
                console.log(`SightFlow: Extracted ${eyeLocations.length} Eye Locations. First 3: [${first3Loc.join(', ')}] | Last 3: [${last3Loc.join(', ')}]`);
            }
        }
    }
    if (ccFindings.length === 0 && eyeLocations.length === 0) {
        console.log(`SightFlow: Could not find scrollable divs with height ${yPixels}px within ${parentTagNameString}`);
    }
    return { ccFindings, eyeLocations };
}

// ==================== VISUAL ACUITY FUNCTIONS ====================

/**
 * Expands the Visual Acuity section by clicking the circle flag
 * @returns True if successful, false if element not found
 */
async function expandVisualAcuitySection() {
    const circleFlag = document.querySelector('[data-qa="assistedCodingVisualAcuityCircleFlag"]');
    if (!circleFlag) {
        console.log('SightFlow: Could not find Visual Acuity circle flag');
        return false;
    }
    circleFlag.scrollIntoView({ behavior: 'smooth', block: 'center' });
    circleFlag.click();
    console.log('SightFlow: Clicked Visual Acuity circle flag to expand');
    await wait(300);
    return true;
}

/**
 * Clicks on a visual acuity item cell (e.g., with glasses or without glasses)
 * @param columnIndex - The column index (0 = Dsc/without glasses, 2 = Dcc Spec/with glasses)
 * @param eye - 'OD' for right eye, 'OS' for left eye
 * @returns True if successful, false if element not found
 */
async function clickVisualAcuityItemCell(columnIndex, eye) {
    // Find the parent row for the specified eye
    // OD: data-qa="visualAcuityODRow"
    // OS: data-qa="visualAcuityOSRow"
    const rowDataQa = eye === 'OD' ? 'visualAcuityODRow' : 'visualAcuityOSRow';
    const parentRow = document.querySelector(`[data-qa="${rowDataQa}"]`);
    
    const typeName = columnIndex === 0 ? 'Dsc (without glasses)' : 'Dcc Spec (with glasses)';
    
    if (!parentRow) {
        console.log(`SightFlow: Could not find visual acuity row for ${eye} with data-qa="${rowDataQa}"`);
        return false;
    }
    
    console.log(`SightFlow: Found ${eye} row, looking for column ${columnIndex} (${typeName})`);
    
    // Find the clickable span within this row
    // The span has data-qa="visualAcuityItemText_X" where X is the column index
    const targetSpan = parentRow.querySelector(`[data-qa="visualAcuityItemText_${columnIndex}"]`);
    
    if (!targetSpan) {
        // Fallback: try the div container
        const targetDiv = parentRow.querySelector(`[data-qa="visualAcuityItem_${columnIndex}"]`);
        if (targetDiv) {
            targetDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await wait(50);
            targetDiv.click();
            console.log(`SightFlow: Clicked div for ${eye} ${typeName}`);
            await wait(200);
            return true;
        }
        console.log(`SightFlow: Could not find visual acuity cell for ${eye} column ${columnIndex}`);
        return false;
    }
    
    // Scroll into view and click
    targetSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await wait(50);
    targetSpan.click();
    console.log(`SightFlow: Clicked span for ${eye} ${typeName}`);
    await wait(200);
    return true;
}

/**
 * Selects a visual acuity value (e.g., 20/20, 20/15, etc.)
 * @param visionValue - The vision value to select (e.g., "20/20", "20/15")
 * @returns True if successful, false if value not found
 */
async function selectVisualAcuityValue(visionValue) {
    // Find all visual acuity value buttons
    const valueButtons = document.querySelectorAll('input[type="button"][data-qa^="visualAcuityItemValueId_"]');
    
    console.log(`SightFlow: Looking for value "${visionValue}" among ${valueButtons.length} buttons`);
    
    for (const button of valueButtons) {
        if (button.value === visionValue) {
            button.click();
            console.log(`SightFlow: Selected visual acuity value: ${visionValue}`);
            await wait(200);
            return true;
        }
    }
    
    console.log(`SightFlow: Could not find visual acuity value: ${visionValue}. Available values: ${Array.from(valueButtons).slice(0, 10).map(b => b.value).join(', ')}...`);
    return false;
}

/**
 * Sets visual acuity for a specific eye and type
 * @param eye - 'OD' for right eye, 'OS' for left eye
 * @param withGlasses - true for with glasses (Dcc Spec), false for without glasses (Dsc)
 * @param visionValue - The vision value (e.g., "20/20")
 * @returns True if successful
 */
async function setVisualAcuity(eye, withGlasses, visionValue) {
    const columnIndex = withGlasses ? 2 : 0; // 0 = Dsc (column 0), 2 = Dcc Spec (column 2)
    
    console.log(`SightFlow: Setting visual acuity for ${eye}, ${withGlasses ? 'Dcc Spec (with glasses)' : 'Dsc (without glasses)'}: ${visionValue}`);
    
    // Click on the appropriate cell to open the value selector
    const cellClicked = await clickVisualAcuityItemCell(columnIndex, eye);
    if (!cellClicked) {
        console.log(`SightFlow: Failed to click cell for ${eye}`);
        return false;
    }
    
    // Wait for the value selector to appear
    await wait(200);
    
    // Select the vision value
    const valueSelected = await selectVisualAcuityValue(visionValue);
    
    return valueSelected;
}

// ==================== IOP (INTRAOCULAR PRESSURE) FUNCTIONS ====================

/**
 * Expands the IOP section by clicking the circle flag
 * @returns True if successful, false if element not found
 */
async function expandIOPSection() {
    const circleFlag = document.querySelector('[data-qa="assistedCodingIOPCircleFlag"]');
    if (!circleFlag) {
        console.log('SightFlow: Could not find IOP circle flag');
        return false;
    }
    circleFlag.scrollIntoView({ behavior: 'smooth', block: 'center' });
    circleFlag.click();
    console.log('SightFlow: Clicked IOP circle flag to expand');
    await wait(300);
    return true;
}

/**
 * Sets IOP value for a specific eye
 * @param eye - 'OD' for right eye, 'OS' for left eye
 * @param iopValue - The IOP value (e.g., "15", "18")
 * @returns True if successful
 */
async function setIOPValue(eye, iopValue) {
    // Find the IOP input field using the correct data-qa attributes
    // OD: data-qa="chart_vp_iop_iopRowOD_0"
    // OS: data-qa="chart_vp_iop_iopRowOS_0"
    const dataQa = eye === 'OD' ? 'chart_vp_iop_iopRowOD_0' : 'chart_vp_iop_iopRowOS_0';
    const iopInput = document.querySelector(`[data-qa="${dataQa}"]`);
    
    if (!iopInput) {
        console.log(`SightFlow: Could not find IOP input for ${eye} with data-qa="${dataQa}"`);
        return false;
    }
    
    // Click to focus the input
    iopInput.click();
    await wait(100);
    
    // Use setAngularValue to properly set the value in Angular
    setAngularValue(iopInput, iopValue);
    console.log(`SightFlow: Set IOP for ${eye}: ${iopValue}`);
    return true;
}

// ==================== EXAM SECTION FUNCTIONS ====================

/**
 * Clicks on an exam subsection nav item to expand it
 * @param navIndex - The index of the nav item (0 = External, 1 = Anterior Segment, etc.)
 * @returns True if successful, false if element not found
 */
async function clickExamNavItem(navIndex) {
    const navItem = document.querySelector(`[data-qa="chart_exam_sectionNavItem_${navIndex}"]`);
    if (!navItem) {
        console.log(`SightFlow: Could not find exam nav item with index ${navIndex}`);
        return false;
    }
    navItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    navItem.click();
    console.log(`SightFlow: Clicked exam nav item ${navIndex}`);
    await wait(200);
    return true;
}

/**
 * Clicks the [Defaults] button in a chart segment header to set all defaults
 * @param segmentName - The name of the segment (e.g., "External", "Anterior Segment")
 * @returns True if successful, false if element not found
 */
async function clickSegmentDefaults(segmentName) {
    // Find all chart-segment elements
    const segments = document.querySelectorAll('chart-segment');
    
    for (const segment of segments) {
        // Check if this segment contains the specified name in its header
        const header = segment.querySelector('h4');
        if (header && header.textContent.trim().toLowerCase().includes(segmentName.toLowerCase())) {
            // Found the segment, now find the [Defaults] button
            const defaultsBtn = segment.querySelector('.action-defaults');
            if (defaultsBtn) {
                defaultsBtn.click();
                console.log(`SightFlow: Clicked [Defaults] for ${segmentName} segment`);
                await wait(200);
                return true;
            }
            console.log(`SightFlow: Found ${segmentName} segment but no [Defaults] button`);
            return false;
        }
    }
    
    console.log(`SightFlow: Could not find segment with name "${segmentName}"`);
    return false;
}

/**
 * Sets the External exam to defaults (normal exam)
 * @returns True if successful
 */
async function setExternalExamDefaults() {
    // Click on External nav item (index 0)
    const navClicked = await clickExamNavItem(0);
    if (!navClicked) {
        return false;
    }
    
    await wait(200);
    
    // Click the [Defaults] button for External segment
    const defaultsClicked = await clickSegmentDefaults('External');
    return defaultsClicked;
}

/**
 * Clicks the OU button in a segment header to select both eyes
 * @param segmentName - The name of the segment (e.g., "Anterior Segment", "Posterior Segment")
 * @returns True if successful, false if element not found
 */
async function clickSegmentOU(segmentName) {
    // Find all chart-segment elements
    const segments = document.querySelectorAll('chart-segment');
    
    for (const segment of segments) {
        // Check if this segment contains the specified name in its header
        const header = segment.querySelector('h4');
        if (header && header.textContent.trim().toLowerCase().includes(segmentName.toLowerCase())) {
            // Found the segment, now find the OU button in the column header
            const columnHeader = segment.querySelector('chart-segment-column-header');
            if (columnHeader) {
                // Find the middle span (OU) - it's the one with margin style
                const spans = columnHeader.querySelectorAll('.action-text');
                for (const span of spans) {
                    if (span.textContent.trim() === 'OU') {
                        span.click();
                        console.log(`SightFlow: Clicked OU for ${segmentName} segment`);
                        await wait(100);
                        return true;
                    }
                }
            }
            console.log(`SightFlow: Found ${segmentName} segment but no OU button`);
            return false;
        }
    }
    
    console.log(`SightFlow: Could not find segment with name "${segmentName}"`);
    return false;
}

/**
 * Sets the Anterior Segment exam to defaults
 * @returns True if successful
 */
async function setAnteriorSegmentDefaults() {
    // Click on Anterior Segment nav item (index 1)
    const navClicked = await clickExamNavItem(1);
    if (!navClicked) {
        return false;
    }
    
    await wait(200);
    
    // Click OU to select both eyes
    await clickSegmentOU('Anterior Segment');
    await wait(100);
    
    // Click the [Defaults] button for Anterior Segment
    const defaultsClicked = await clickSegmentDefaults('Anterior Segment');
    return defaultsClicked;
}

/**
 * Sets lens findings for a specific eye in Anterior Segment
 * @param eye - 'OD' for right eye, 'OS' for left eye
 * @param findingText - The lens finding text (e.g., "2+ NS cataract", "PCIOL well-centered")
 * @returns True if successful
 */
async function setAnteriorSegmentLens(eye, findingText) {
    // Click on the finding list for the specified eye
    // OD (right eye) = findingList_6_1
    // OS (left eye) = findingList_6_2
    const findingListId = eye === 'OD' ? 'findingList_6_1' : 'findingList_6_2';
    const findingList = document.querySelector(`#${findingListId}`);
    
    if (!findingList) {
        console.log(`SightFlow: Could not find lens finding list for ${eye} (${findingListId})`);
        return false;
    }
    
    findingList.click();
    console.log(`SightFlow: Clicked lens finding list for ${eye}`);
    await wait(200);
    
    // Find the input field for the finding text
    const input = document.querySelector('input[name="selectedPatEncFindingFindingText"]');
    if (!input) {
        console.log(`SightFlow: Could not find lens finding input field`);
        return false;
    }
    
    input.click();
    await wait(100);
    
    // Use setAngularValue to set the text (works for input elements too)
    setAngularValue(input, findingText);
    console.log(`SightFlow: Set lens finding for ${eye}: ${findingText}`);
    await wait(200);
    
    return true;
}

/**
 * Sets the Posterior Segment exam to defaults
 * @returns True if successful
 */
async function setPosteriorSegmentDefaults() {
    // Click on Posterior Segment nav item (index 2)
    const navClicked = await clickExamNavItem(2);
    if (!navClicked) {
        return false;
    }
    
    await wait(200);
    
    // Click OU to select both eyes
    await clickSegmentOU('Posterior Segment');
    await wait(100);
    
    // Click the [Defaults] button for Posterior Segment
    const defaultsClicked = await clickSegmentDefaults('Posterior Segment');
    return defaultsClicked;
}

/**
 * Sets CDR (cup-disc ratio) for a specific eye in Posterior Segment
 * @param eye - 'OD' for right eye, 'OS' for left eye
 * @param cdrValue - The CDR value (e.g., "0.5", "0.55", ".6") - will be formatted as "CDR 0.X"
 * @returns True if successful
 */
async function setPosteriorSegmentCDR(eye, cdrValue) {
    // Click on the finding list for the specified eye (Disc section)
    // OD (right eye) = findingList_14_1
    // OS (left eye) = findingList_14_2
    const findingListId = eye === 'OD' ? 'findingList_14_1' : 'findingList_14_2';
    const findingList = document.querySelector(`#${findingListId}`);
    
    if (!findingList) {
        console.log(`SightFlow: Could not find disc/CDR finding list for ${eye} (${findingListId})`);
        return false;
    }
    
    findingList.click();
    console.log(`SightFlow: Clicked disc/CDR finding list for ${eye}`);
    await wait(200);
    
    // Find the input field for the finding text
    const input = document.querySelector('input[name="selectedPatEncFindingFindingText"]');
    if (!input) {
        console.log(`SightFlow: Could not find CDR finding input field`);
        return false;
    }
    
    input.click();
    await wait(100);
    
    // Format the CDR value properly (ensure "CDR 0.X" format)
    let formattedCDR = cdrValue.toString().trim();
    // Remove any existing "CDR" prefix
    formattedCDR = formattedCDR.replace(/^CDR\s*/i, '');
    // Ensure it starts with "0." if it starts with just "."
    if (formattedCDR.startsWith('.')) {
        formattedCDR = '0' + formattedCDR;
    }
    // Add "CDR " prefix
    formattedCDR = `CDR ${formattedCDR}`;
    
    // Use setAngularValue to set the text
    setAngularValue(input, formattedCDR);
    console.log(`SightFlow: Set CDR for ${eye}: ${formattedCDR}`);
    await wait(200);
    
    return true;
}
