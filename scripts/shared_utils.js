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
 * Expands or collapses a section by clicking on the specified element tag
 * @param sectionTag - The tag name selector (e.g., 'chart-chart-section-diagnostics')
 * @returns True if successful, false if element not found
 */
async function toggleSectionByTag(sectionTag) {
    const el = document.querySelector(sectionTag);
    if (!el) {
        console.log(`SightFlow: Could not find element with tag "${sectionTag}"`);
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

// ==================== REFRACTION FUNCTIONS ====================

/**
 * Opens the Refractions tab in V&P section
 * @returns True if successful
 */
async function openRefractionsTab() {
    const refractionsTab = document.querySelector('[data-qa="chart_vp_vpRefractionsTab"]');
    if (!refractionsTab) {
        console.log('SightFlow: Could not find Refractions tab');
        return false;
    }
    refractionsTab.click();
    console.log('SightFlow: Clicked Refractions tab');
    await wait(300);
    return true;
}

/**
 * Clicks +Spec Rx button to add a new refraction
 * @returns True if successful
 */
async function clickAddSpecRx() {
    // Find the chart-refractions element first to scope our queries
    const chartRefractions = document.querySelector('chart-refractions');
    if (!chartRefractions) {
        console.log('SightFlow: Could not find chart-refractions element');
        return false;
    }
    
    const specRxBtn = chartRefractions.querySelector('mdi-button[title="Insert Refraction"]');
    if (!specRxBtn) {
        console.log('SightFlow: Could not find +Spec Rx button in chart-refractions');
        return false;
    }
    specRxBtn.click();
    console.log('SightFlow: Clicked +Spec Rx button');
    await wait(300);
    return true;
}

/**
 * Selects "MR Dry" from the refraction type dropdown
 * @returns True if successful
 */
async function selectMRDry() {
    // Find the chart-refractions element first to scope our queries
    const chartRefractions = document.querySelector('chart-refractions');
    if (!chartRefractions) {
        console.log('SightFlow: Could not find chart-refractions element');
        return false;
    }
    
    // Click the mat-select dropdown within chart-refractions
    const matSelect = chartRefractions.querySelector('mat-select');
    if (!matSelect) {
        console.log('SightFlow: Could not find refraction type dropdown in chart-refractions');
        return false;
    }
    matSelect.click();
    console.log('SightFlow: Opened refraction type dropdown');
    
    // Wait for dropdown options to load (they render in a CDK overlay outside chart-refractions)
    await wait(400);
    
    // Find and click the "MR Dry" option - options are in cdk-overlay-container
    const options = document.querySelectorAll('mat-option');
    
    for (const option of options) {
        const optionText = option.textContent.trim();
        if (optionText === 'MR Dry' || optionText.includes('MR Dry')) {
            option.click();
            console.log('SightFlow: Selected MR Dry');
            await wait(300);
            return true;
        }
    }
    
    console.log('SightFlow: Could not find MR Dry option');
    return false;
}

/**
 * Selects a value from the refraction picker table
 * @param value - The value to select (e.g., "-1.00", "+2.50", "007", "Plano")
 * @returns True if successful
 */
async function selectRefractionValue(value) {
    // Find the chart-refractions element first to scope our queries
    const chartRefractions = document.querySelector('chart-refractions');
    if (!chartRefractions) {
        console.log('SightFlow: Could not find chart-refractions element');
        return false;
    }
    
    // Find all picker buttons in the table within chart-refractions
    const pickerBtns = chartRefractions.querySelectorAll('.pickerTextField');
    const normalizedValue = value.toString().trim();
    
    for (const btn of pickerBtns) {
        const btnText = btn.textContent.trim();
        if (btnText === normalizedValue) {
            btn.click();
            console.log(`SightFlow: Selected refraction value: ${normalizedValue}`);
            await wait(150);
            return true;
        }
    }
    
    console.log(`SightFlow: Could not find refraction value: ${normalizedValue}`);
    return false;
}

/**
 * Clicks on the refraction cell for a specific component (Sph, Cyl, Axis, Add) and eye
 * @param component - 'Sph', 'Cyl', 'Axis', or 'Add'
 * @param eye - 'OD' or 'OS'
 * @returns True if successful
 */
async function clickRefractionCell(component, eye) {
    // Find the chart-refractions element first to scope our queries
    const chartRefractions = document.querySelector('chart-refractions');
    if (!chartRefractions) {
        console.log('SightFlow: Could not find chart-refractions element');
        return false;
    }
    
    // Find the header cell for the component within chart-refractions
    const headers = chartRefractions.querySelectorAll('.refraction-cell-header');
    let headerIndex = -1;
    
    for (let i = 0; i < headers.length; i++) {
        if (headers[i].textContent.trim() === component) {
            headerIndex = i;
            break;
        }
    }
    
    if (headerIndex === -1) {
        console.log(`SightFlow: Could not find ${component} header`);
        return false;
    }
    
    // Find the parent of the header to get sibling cells
    const headerParent = headers[headerIndex].parentElement;
    if (!headerParent) {
        console.log(`SightFlow: Could not find parent of ${component} header`);
        return false;
    }
    
    // Get all refraction-cell divs that are siblings
    const cells = headerParent.querySelectorAll('.refraction-cell');
    
    // OD is the first cell (index 0), OS is the second cell (index 1)
    const cellIndex = eye === 'OD' ? 0 : 1;
    
    if (cells.length > cellIndex) {
        cells[cellIndex].click();
        console.log(`SightFlow: Clicked ${component} cell for ${eye}`);
        await wait(150);
        return true;
    }
    
    console.log(`SightFlow: Could not find ${component} cell for ${eye}`);
    return false;
}

/**
 * Inputs a complete refraction for one eye
 * @param eye - 'OD' or 'OS'
 * @param sphere - Sphere value (e.g., "-1.00", "Plano")
 * @param cylinder - Cylinder value (e.g., "-0.50")
 * @param axis - Axis value (e.g., "090", "007")
 * @param add - Add value (optional, e.g., "+2.50")
 * @returns True if successful
 */
async function inputRefractionForEye(eye, sphere, cylinder, axis, add = null) {
    console.log(`SightFlow: Inputting refraction for ${eye}: Sph=${sphere}, Cyl=${cylinder}, Axis=${axis}, Add=${add || 'none'}`);
    
    // Click on the Sphere cell first (only needed for first eye or when starting)
    // After selecting sphere, cylinder auto-selects, then axis, then add
    
    // Select sphere
    if (sphere) {
        await selectRefractionValue(sphere);
        await wait(300);
    }
    
    // Select cylinder (cell should auto-select after sphere)
    if (cylinder) {
        await selectRefractionValue(cylinder);
        await wait(300);
    }
    
    // Select axis (cell should auto-select after cylinder)
    if (axis) {
        // Format axis to 3 digits if needed
        let formattedAxis = axis.toString().padStart(3, '0');
        await selectRefractionValue(formattedAxis);
        await wait(300);
    }
    
    // Select add if provided (cell should auto-select after axis)
    if (add) {
        await selectRefractionValue(add);
        await wait(300);
    }
    
    console.log(`SightFlow: Completed refraction input for ${eye}`);
    return true;
}

/**
 * Opens refraction section and sets up for MR Dry entry
 * @returns True if successful
 */
async function setupRefraction() {
    // Open Refractions tab
    const tabOpened = await openRefractionsTab();
    if (!tabOpened) return false;
    
    // Click +Spec Rx
    const specRxClicked = await clickAddSpecRx();
    if (!specRxClicked) return false;
    
    // Select MR Dry
    const mrDrySelected = await selectMRDry();
    if (!mrDrySelected) return false;
    
    await wait(200);
    return true;
}

/**
 * Clicks the +PL button to add diagnoses to the impression and plan
 * @returns True if successful
 */
async function clickAddToPL() {
    // Find the chart-refractions element first to scope our queries
    const chartRefractions = document.querySelector('chart-refractions');
    if (!chartRefractions) {
        console.log('SightFlow: Could not find chart-refractions element');
        return false;
    }
    
    // Find the +PL button by its title attribute within chart-refractions
    const plButton = chartRefractions.querySelector('mdi-button[title="Add to PL"]');
    if (!plButton) {
        console.log('SightFlow: Could not find +PL button in chart-refractions');
        return false;
    }
    
    plButton.click();
    console.log('SightFlow: Clicked +PL button to add diagnoses to impression and plan');
    await wait(300);
    return true;
}

/**
 * Inputs complete refraction for both eyes
 * @param odRefraction - Object with {sphere, cylinder, axis, add} for OD
 * @param osRefraction - Object with {sphere, cylinder, axis, add} for OS
 * @param shouldCollapse - Whether to collapse V&P section after (default: false, caller handles collapse)
 * @returns True if successful
 */
async function inputFullRefraction(odRefraction, osRefraction, shouldCollapse = false) {
    console.log('SightFlow: Starting full refraction input');
    
    // Setup refraction (open tab, click +Spec Rx, select MR Dry)
    const setupDone = await setupRefraction();
    if (!setupDone) {
        console.log('SightFlow: Failed to setup refraction');
        return false;
    }
    
    // Click on OD Sph cell to start
    console.log('SightFlow: Clicking OD Sph cell to start');
    await clickRefractionCell('Sph', 'OD');
    await wait(300);
    
    // Input OD refraction
    if (odRefraction) {
        await inputRefractionForEye('OD', 
            odRefraction.sphere, 
            odRefraction.cylinder, 
            odRefraction.axis, 
            odRefraction.add
        );
    }
    
    // Wait for Angular to process OD before moving to OS
    await wait(400);
    
    // Click on OS Sph cell to activate OS picker
    console.log('SightFlow: Clicking OS Sph cell');
    await clickRefractionCell('Sph', 'OS');
    await wait(300);
    
    // Input OS refraction
    if (osRefraction) {
        await inputRefractionForEye('OS', 
            osRefraction.sphere, 
            osRefraction.cylinder, 
            osRefraction.axis, 
            osRefraction.add
        );
    }
    
    // Wait then click +PL button to add diagnoses to impression and plan
    await wait(300);
    await clickAddToPL();
    
    // Only collapse if explicitly requested (caller typically handles this)
    if (shouldCollapse) {
        await wait(300);
        await collapseVandPSection();
    }
    
    console.log('SightFlow: Full refraction input complete');
    return true;
}

/**
 * Collapses the V&P section by clicking on the section element
 * @returns True if successful, false if element not found
 */
async function collapseVandPSection() {
    const vandpSection = document.querySelector('chart-section-v-and-p');
    if (!vandpSection) {
        console.log('SightFlow: Could not find chart-section-v-and-p element');
        return false;
    }
    
    vandpSection.click();
    console.log('SightFlow: Clicked chart-section-v-and-p to collapse/save V&P section');
    await wait(300);
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
    // Find all chart-segment and chart-segment-header elements
    const segments = document.querySelectorAll('chart-segment, chart-segment-header');
    
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
    
    // Ensure OU is freshly selected (toggles off/on if already selected)
    await ensureSegmentOUSelected('External');
    
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
    // Find all chart-segment and chart-segment-header elements
    const segments = document.querySelectorAll('chart-segment, chart-segment-header');
    
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
 * Ensures OU is freshly selected in a segment header before proceeding
 * If OU is already selected: deselect it, wait, then reselect it
 * If OU is not selected: select it
 * This ensures a fresh selection state before clicking Defaults
 * @param segmentName - The name of the segment (e.g., "External", "Anterior Segment")
 * @returns True if OU is selected, false if element not found
 */
async function ensureSegmentOUSelected(segmentName) {
    // Find all chart-segment and chart-segment-header elements
    const segments = document.querySelectorAll('chart-segment, chart-segment-header');
    
    for (const segment of segments) {
        // Check if this segment contains the specified name in its header
        const header = segment.querySelector('h4');
        if (header && header.textContent.trim().toLowerCase().includes(segmentName.toLowerCase())) {
            // Found the segment, now find the OU button in the column header
            const columnHeader = segment.querySelector('chart-segment-column-header');
            if (columnHeader) {
                // Find the OU span
                const spans = columnHeader.querySelectorAll('.action-text');
                for (const span of spans) {
                    if (span.textContent.trim() === 'OU') {
                        // Check if OU is already selected (has action-text-selected class)
                        if (span.classList.contains('action-text-selected')) {
                            // OU is selected - deselect it first, wait, then reselect
                            console.log(`SightFlow: OU is selected for ${segmentName}, toggling off then on`);
                            span.click(); // Deselect
                            await wait(200);
                            span.click(); // Reselect
                            await wait(200);
                            console.log(`SightFlow: OU toggled and reselected for ${segmentName} segment`);
                            return true;
                        }
                        // OU is not selected, click to select it
                        span.click();
                        console.log(`SightFlow: Clicked OU to select it for ${segmentName} segment`);
                        await wait(200);
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
    
    // Wait for segment to fully render
    await wait(400);
    
    // Ensure OU is freshly selected (toggles off/on if already selected)
    await ensureSegmentOUSelected('Anterior Segment');
    
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
    
    // Wait for segment to fully render
    await wait(400);
    
    // Ensure OU is freshly selected (toggles off/on if already selected)
    await ensureSegmentOUSelected('Posterior Segment');
    
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

// ==================== DIAGNOSTICS SECTION FUNCTIONS ====================

/**
 * Expands the Diagnostics section by clicking on the header div containing the h3 "Diagnostics"
 * @returns True if successful, false if element not found
 */
async function expandDiagnosticsSection() {
    const diagnosticsSection = document.querySelector('chart-chart-section-diagnostics');
    if (!diagnosticsSection) {
        console.log('SightFlow: Could not find chart-chart-section-diagnostics element');
        return false;
    }
    
    // Find the h3 containing "Diagnostics" within this section
    const h3Elements = diagnosticsSection.querySelectorAll('h3');
    let diagnosticsH3 = null;
    for (const h3 of h3Elements) {
        if (h3.textContent.trim() === 'Diagnostics') {
            diagnosticsH3 = h3;
            break;
        }
    }
    
    if (!diagnosticsH3) {
        console.log('SightFlow: Could not find h3 Diagnostics element');
        return false;
    }
    
    // Click on the parent div (table-cell-left-center) of the h3
    const parentDiv = diagnosticsH3.parentElement;
    if (!parentDiv) {
        console.log('SightFlow: Could not find parent div of Diagnostics h3');
        return false;
    }
    
    parentDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    parentDiv.click();
    console.log('SightFlow: Clicked Diagnostics header to expand');
    await wait(500);
    return true;
}

/**
 * Collapses the Diagnostics section by clicking on the section element
 * @returns True if successful, false if element not found
 */
async function collapseDiagnosticsSection() {
    const diagnosticsSection = document.querySelector('chart-chart-section-diagnostics');
    if (!diagnosticsSection) {
        console.log('SightFlow: Could not find chart-chart-section-diagnostics element');
        return false;
    }
    
    diagnosticsSection.click();
    console.log('SightFlow: Clicked chart-chart-section-diagnostics to collapse/save');
    await wait(300);
    return true;
}

/**
 * Maps common test name variations to their exact title in the EMR
 */
const DIAGNOSTIC_TEST_MAP = {
    // OCT Macula variations
    'oct macula': 'OCT Macula',
    'oct of the macula': 'OCT Macula',
    'macular oct': 'OCT Macula',
    'macula oct': 'OCT Macula',
    // OCT RNFL variations
    'oct rnfl': 'OCT RNFL',
    'rnfl oct': 'OCT RNFL',
    'oct nerve fiber layer': 'OCT RNFL',
    'nerve fiber layer': 'OCT RNFL',
    // IOL Master variations
    'iol master': 'IOL Master/Lenstar',
    'iolmaster': 'IOL Master/Lenstar',
    'lenstar': 'IOL Master/Lenstar',
    'biometry': 'IOL Master/Lenstar',
    // Corneal Topography/Pentacam variations
    'pentacam': 'Corneal Topography',
    'corneal topography': 'Corneal Topography',
    'topography': 'Corneal Topography',
    'topo': 'Corneal Topography',
    // Visual Field variations
    'visual field': 'Visual Field',
    'hvf': 'Visual Field',
    'humphrey visual field': 'Visual Field',
    'vf': 'Visual Field',
    // Fundus Photos
    'fundus photo': 'Fundus Photo',
    'fundus photos': 'Fundus Photo',
    'fundus photography': 'Fundus Photo',
    // Pachymetry
    'pachymetry': 'Pachymetry',
    'corneal thickness': 'Pachymetry',
};

/**
 * Normalizes a test name to its EMR title
 * @param testName - The test name to normalize (e.g., "OCT of the macula", "pentacam")
 * @returns The normalized EMR title or the original name if no mapping found
 */
function normalizeTestName(testName) {
    const normalized = testName.toLowerCase().trim();
    return DIAGNOSTIC_TEST_MAP[normalized] || testName;
}

/**
 * Selects a diagnostic test by clicking on its title element
 * @param testTitle - The title of the test to select (e.g., "OCT Macula", "IOL Master/Lenstar")
 * @returns True if successful, false if element not found
 */
async function selectDiagnosticTest(testTitle) {
    // Normalize the test name first
    const normalizedTitle = normalizeTestName(testTitle);
    
    // Find the div with the matching title attribute within chart-chart-section-diagnostics
    const diagnosticsSection = document.querySelector('chart-chart-section-diagnostics');
    if (!diagnosticsSection) {
        console.log('SightFlow: Could not find chart-chart-section-diagnostics element');
        return false;
    }
    
    // Try exact match first
    let testElement = diagnosticsSection.querySelector(`div[title="${normalizedTitle}"]`);
    
    // If not found, try case-insensitive search
    if (!testElement) {
        const allDivs = diagnosticsSection.querySelectorAll('div[title]');
        for (const div of allDivs) {
            const title = div.getAttribute('title');
            if (title && title.toLowerCase() === normalizedTitle.toLowerCase()) {
                testElement = div;
                break;
            }
        }
    }
    
    if (!testElement) {
        console.log(`SightFlow: Could not find diagnostic test with title "${normalizedTitle}" (original: "${testTitle}")`);
        return false;
    }
    
    testElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    testElement.click();
    console.log(`SightFlow: Selected diagnostic test: ${normalizedTitle}`);
    await wait(300);
    return true;
}

/**
 * Selects a location/laterality for the diagnostic test
 * @param location - The location to select (e.g., "OD", "OS", "OU")
 * @returns True if successful, false if element not found
 */
async function selectDiagnosticLocation(location) {
    // Default to OU if no location specified
    const targetLocation = location || 'OU';
    
    // Find the div with the matching title attribute within chart-chart-section-diagnostics
    const diagnosticsSection = document.querySelector('chart-chart-section-diagnostics');
    if (!diagnosticsSection) {
        console.log('SightFlow: Could not find chart-chart-section-diagnostics element');
        return false;
    }
    
    const locationElement = diagnosticsSection.querySelector(`div[title="${targetLocation}"]`);
    
    if (!locationElement) {
        console.log(`SightFlow: Could not find location "${targetLocation}" in Diagnostics section`);
        return false;
    }
    
    locationElement.click();
    console.log(`SightFlow: Selected diagnostic location: ${targetLocation}`);
    await wait(200);
    return true;
}

/**
 * Adds a complete diagnostic test with location
 * @param testName - The name of the test (e.g., "OCT Macula", "Pentacam", "IOL Master")
 * @param location - The laterality (e.g., "OD", "OS", "OU") - defaults to "OU"
 * @returns True if successful
 */
async function addDiagnosticTest(testName, location = 'OU') {
    console.log(`SightFlow: Adding diagnostic test: ${testName} (${location})`);
    
    // Select the test
    const testSelected = await selectDiagnosticTest(testName);
    if (!testSelected) {
        console.log(`SightFlow: Failed to select test: ${testName}`);
        return false;
    }
    
    // Select the location
    const locationSelected = await selectDiagnosticLocation(location);
    if (!locationSelected) {
        console.log(`SightFlow: Failed to select location: ${location}`);
        // Continue anyway as test was selected
    }
    
    return true;
}

// ==================== IMP/PLAN SECTION FUNCTIONS ====================

/**
 * Clicks the Add button in the Imp/Plan section
 * @returns True if successful, false if element not found
 */
async function clickImpPlanAddButton() {
    // Try finding the button directly in the document first
    const allAddButtons = document.querySelectorAll('button[title="Add"]');
    console.log(`SightFlow: Found ${allAddButtons.length} buttons with title="Add" in document`);
    
    const chartImpression = document.querySelector('chart-impression');
    if (!chartImpression) {
        console.log('SightFlow: Could not find chart-impression element');
        return false;
    }
    console.log('SightFlow: Found chart-impression element');
    
    // Find the button with title="Add" under chart-impression
    const addButton = chartImpression.querySelector('button[title="Add"]');
    if (!addButton) {
        console.log('SightFlow: Could not find button[title="Add"] in chart-impression');
        // Log what buttons ARE in chart-impression
        const buttonsInSection = chartImpression.querySelectorAll('button');
        console.log(`SightFlow: Found ${buttonsInSection.length} buttons in chart-impression`);
        buttonsInSection.forEach((btn, i) => {
            console.log(`SightFlow: Button ${i}: title="${btn.getAttribute('title')}", class="${btn.className}"`);
        });
        return false;
    }
    
    console.log('SightFlow: Found button[title="Add"], attempting click...');
    console.log('SightFlow: Button classes:', addButton.className);
    
    addButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await wait(200);
    
    // Try focus first
    addButton.focus();
    await wait(100);
    
    // Dispatch full mouse event sequence for Angular Material button
    addButton.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
    addButton.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
    addButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    
    console.log('SightFlow: Dispatched mouse events on button[title="Add"] in Imp/Plan section');
    await wait(300);
    return true;
}

/**
 * Normalizes a diagnosis search term by removing plural 's' suffix
 * @param term - The search term (e.g., "cataracts")
 * @returns Normalized term (e.g., "cataract")
 */
function normalizeSearchTerm(term) {
    let normalized = term.trim();
    // Remove trailing 's' for singular form (e.g., cataracts → cataract)
    if (normalized.toLowerCase().endsWith('s') && normalized.length > 3) {
        normalized = normalized.slice(0, -1);
    }
    return normalized;
}

/**
 * Types a search term into the Imp/Plan problem list search box
 * Automatically normalizes the search term (removes plural 's')
 * @param searchTerm - The diagnosis to search for
 * @returns True if successful, false if element not found
 */
async function searchImpPlanDiagnosis(searchTerm) {
    // Normalize search term (remove plural 's')
    const normalizedTerm = normalizeSearchTerm(searchTerm);
    console.log(`SightFlow: Searching for "${normalizedTerm}" (original: "${searchTerm}")`);
    
    const problemList = document.querySelector('chart-problem-list');
    if (!problemList) {
        console.log('SightFlow: Could not find chart-problem-list element');
        return false;
    }
    console.log('SightFlow: Found chart-problem-list element');
    
    // Try multiple possible search input selectors
    let searchInput = problemList.querySelector('input[placeholder="Search"]');
    if (!searchInput) {
        searchInput = problemList.querySelector('input[type="text"]');
    }
    if (!searchInput) {
        searchInput = problemList.querySelector('input');
    }
    
    if (!searchInput) {
        console.log('SightFlow: Could not find Search input in problem list');
        // Log what inputs ARE in the problem list
        const allInputs = problemList.querySelectorAll('input');
        console.log(`SightFlow: Found ${allInputs.length} input(s) in problem list`);
        allInputs.forEach((inp, i) => {
            console.log(`  Input ${i}: placeholder="${inp.getAttribute('placeholder')}", type="${inp.type}"`);
        });
        return false;
    }
    
    console.log(`SightFlow: Found search input with placeholder="${searchInput.getAttribute('placeholder')}"`);
    
    searchInput.click();
    searchInput.focus();
    await wait(100);
    setAngularValue(searchInput, normalizedTerm);
    console.log(`SightFlow: Entered search term: ${normalizedTerm}`);
    await wait(500); // Wait for search results to load
    return true;
}

/**
 * Selects a diagnosis from the Imp/Plan problem list
 * Uses chart-problem-list-items container and clicks on the parent mu-item wrapper
 * @param diagnosisTitle - The title of the diagnosis to select (used for matching)
 * @returns True if successful, false if element not found
 */
async function selectImpPlanDiagnosis(diagnosisTitle) {
    // Use chart-problem-list-items as the container
    const problemListItems = document.querySelector('chart-problem-list-items');
    if (!problemListItems) {
        console.log('SightFlow: Could not find chart-problem-list-items element');
        return false;
    }
    console.log('SightFlow: Found chart-problem-list-items element');
    
    // Get all diagnosis items with title attribute
    const allItems = problemListItems.querySelectorAll('div.problem-list-item[title]');
    console.log(`SightFlow: Found ${allItems.length} diagnosis items in problem list`);
    
    if (allItems.length === 0) {
        console.log('SightFlow: No diagnosis items found in search results');
        return false;
    }
    
    // Log available items for debugging
    console.log('SightFlow: Available diagnoses:');
    allItems.forEach((item, i) => {
        console.log(`  ${i + 1}. ${item.getAttribute('title')}`);
    });
    
    // Normalize the search term for matching
    const normalizedSearch = normalizeSearchTerm(diagnosisTitle).toLowerCase();
    console.log(`SightFlow: Looking for match with normalized term: "${normalizedSearch}"`);
    
    // Find the best matching item - first one that contains the search term wins
    let bestMatch = null;
    for (const item of allItems) {
        const title = item.getAttribute('title');
        if (title && title.toLowerCase().includes(normalizedSearch)) {
            bestMatch = item;
            console.log(`SightFlow: Found matching diagnosis: "${title}"`);
            break; // Take the first match (usually the best/most common)
        }
    }
    
    // If no match found, just take the first result (it's what the search returned)
    if (!bestMatch && allItems.length > 0) {
        bestMatch = allItems[0];
        console.log(`SightFlow: No exact match, selecting first result: "${bestMatch.getAttribute('title')}"`);
    }
    
    if (!bestMatch) {
        console.log(`SightFlow: Could not find any diagnosis to select`);
        return false;
    }
    
    // Click on the parent div (the mu-item wrapper)
    const parentWrapper = bestMatch.parentElement;
    const title = bestMatch.getAttribute('title');
    
    if (parentWrapper && parentWrapper.classList.contains('problem-list-item-wrapper')) {
        parentWrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await wait(100);
        parentWrapper.click();
        console.log(`SightFlow: Clicked parent wrapper for: "${title}"`);
        await wait(200);
        return true;
    } else {
        // Fallback: click the item directly
        bestMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await wait(100);
        bestMatch.click();
        console.log(`SightFlow: Clicked item directly for: "${title}"`);
        await wait(200);
        return true;
    }
}

/**
 * Selects an eye location (OD, OS, OU) for the current diagnosis
 * @param location - The eye location to select ('OD', 'OS', 'OU')
 * @returns True if successful, false if element not found
 */
async function selectImpPlanEyeLocation(location) {
    const problemList = document.querySelector('chart-problem-list');
    if (!problemList) {
        console.log('SightFlow: Could not find chart-problem-list element');
        return false;
    }
    
    const eyeLocations = problemList.querySelector('chart-problem-list-eye-locations');
    if (!eyeLocations) {
        console.log('SightFlow: Could not find chart-problem-list-eye-locations element');
        return false;
    }
    
    // Find the selectable item with the matching title
    const locationElement = eyeLocations.querySelector(`div.selectable-item[title="${location}"]`);
    if (locationElement) {
        locationElement.click();
        console.log(`SightFlow: Selected eye location: ${location}`);
        await wait(200);
        return true;
    }
    
    console.log(`SightFlow: Could not find eye location: ${location}`);
    return false;
}

/**
 * Adds a diagnosis to the Imp/Plan section with eye location
 * Complete workflow: Click Add -> Search/Select diagnosis -> Select eye location
 * @param diagnosisName - The diagnosis name to add
 * @param eyeLocation - The eye location ('OD', 'OS', 'OU') - defaults to 'OU'
 * @returns True if successful
 */
async function addImpPlanDiagnosis(diagnosisName, eyeLocation = 'OU') {
    console.log(`SightFlow: Adding Imp/Plan diagnosis: ${diagnosisName} (${eyeLocation})`);
    
    // Click Add button to open problem list
    const addClicked = await clickImpPlanAddButton();
    if (!addClicked) {
        return false;
    }
    
    await wait(500); // Wait for problem list panel to fully load
    
    // Search for the diagnosis first (don't try direct selection as list is usually long)
    console.log(`SightFlow: Searching for diagnosis: ${diagnosisName}`);
    const searchSucceeded = await searchImpPlanDiagnosis(diagnosisName);
    
    if (!searchSucceeded) {
        console.log('SightFlow: Search failed, trying direct selection...');
    }
    
    await wait(600); // Wait for search results to populate
    
    // Now try to select the diagnosis
    const diagnosisSelected = await selectImpPlanDiagnosis(diagnosisName);
    
    if (!diagnosisSelected) {
        console.log(`SightFlow: Could not find diagnosis: ${diagnosisName}`);
        return false;
    }
    
    // Select eye location
    await wait(300);
    const locationSelected = await selectImpPlanEyeLocation(eyeLocation);
    if (!locationSelected) {
        console.log(`SightFlow: Could not select eye location: ${eyeLocation}`);
        // Continue anyway as diagnosis was selected
    }
    
    return true;
}

/**
 * Collapses/saves the Imp/Plan section
 * @returns True if successful, false if element not found
 */
async function collapseImpPlanSection() {
    const impPlanSection = document.querySelector('chart-chart-section-imp-plan');
    if (!impPlanSection) {
        console.log('SightFlow: Could not find chart-chart-section-imp-plan element');
        return false;
    }
    
    impPlanSection.click();
    console.log('SightFlow: Clicked chart-chart-section-imp-plan to collapse/save');
    await wait(300);
    return true;
}

/**
 * Gets all problem/diagnosis list items from the Imp/Plan section
 * Note: The LAST added diagnosis appears as the FIRST <li> item
 * @returns Array of <li> elements, or empty array if not found
 */
function getImpPlanListItems() {
    const chartImpression = document.querySelector('chart-impression');
    if (!chartImpression) {
        console.log('SightFlow: Could not find chart-impression element');
        return [];
    }
    
    // Use ul.table-layout to get the correct problem list (not dropdown-menu)
    const ul = chartImpression.querySelector('ul.table-layout');
    if (!ul) {
        console.log('SightFlow: Could not find ul.table-layout element in chart-impression');
        return [];
    }
    
    // Get all li elements (they have class "row example-box")
    const listItems = ul.querySelectorAll('li');
    console.log(`SightFlow: Found ${listItems.length} problem list items`);
    
    // Log the diagnoses for debugging
    listItems.forEach((li, i) => {
        const titleSpan = li.querySelector('span.bold.handle');
        const title = titleSpan ? titleSpan.textContent.trim() : 'Unknown';
        console.log(`  ${i + 1}. ${title}`);
    });
    
    return Array.from(listItems);
}

/**
 * Clicks on the discussion-section div within a specific problem list item
 * This opens the section for free text entry
 * @param index - The index of the item (0 = first/most recently added, 1 = second, etc.)
 * @returns True if successful, false if element not found
 */
async function clickImpPlanDiscussionSection(index = 0) {
    const listItems = getImpPlanListItems();
    
    if (listItems.length === 0) {
        console.log('SightFlow: No problem list items found');
        return false;
    }
    
    if (index >= listItems.length) {
        console.log(`SightFlow: Index ${index} out of range, only ${listItems.length} items available`);
        return false;
    }
    
    const targetLi = listItems[index];
    const discussionSection = targetLi.querySelector('div.discussion-section');
    
    if (!discussionSection) {
        console.log(`SightFlow: Could not find discussion-section div in item ${index}`);
        return false;
    }
    
    // Get the diagnosis name for logging
    const titleSpan = targetLi.querySelector('span.bold.handle');
    const diagnosisName = titleSpan ? titleSpan.textContent.trim() : 'Unknown';
    
    discussionSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await wait(100);
    discussionSection.click();
    console.log(`SightFlow: Clicked discussion-section for item ${index}: "${diagnosisName}"`);
    await wait(300);
    
    return true;
}

/**
 * Inserts text into the Quill editor for a specific problem list item's discussion
 * @param index - The index of the item (0 = first/most recently added)
 * @param text - The text to insert
 * @returns True if successful, false if element not found
 */
async function insertImpPlanDiscussionText(index, text) {
    // First open the discussion section
    const opened = await clickImpPlanDiscussionSection(index);
    if (!opened) {
        console.log('SightFlow: Could not open discussion section');
        return false;
    }
    
    // Wait for Quill editor to appear
    await wait(500);
    
    // Find the Quill editor
    const qlEditor = document.querySelector('div.ql-editor');
    if (!qlEditor) {
        console.log('SightFlow: Could not find Quill editor (div.ql-editor)');
        return false;
    }
    
    console.log(`SightFlow: Inserting text into discussion: "${text}"`);
    
    // Set the text content
    qlEditor.innerHTML = `<p>${text}</p>`;
    
    // Remove the "blank" class since we added content
    qlEditor.classList.remove('ql-blank');
    
    // Dispatch input event so Angular picks up the change
    qlEditor.dispatchEvent(new InputEvent('input', { bubbles: true }));
    
    console.log('SightFlow: Text inserted successfully');
    await wait(200);
    
    return true;
}

/**
 * Gets the diagnosis name at a specific index in the Imp/Plan list
 * @param index - The index of the item (0 = first/most recently added)
 * @returns The diagnosis name, or null if not found
 */
function getImpPlanDiagnosisName(index) {
    const listItems = getImpPlanListItems();
    if (index >= listItems.length) {
        return null;
    }
    
    const targetLi = listItems[index];
    const titleSpan = targetLi.querySelector('span.bold.handle');
    return titleSpan ? titleSpan.textContent.trim() : null;
}

// ==================== FOLLOW UP SECTION FUNCTIONS ====================

/**
 * Expands the Follow Up section by finding chart-plan and clicking the appropriate div
 * @returns True if successful, false if element not found
 */
async function expandFollowUpSection() {
    // Find the chart-plan element (parent element for follow up section)
    const chartPlan = document.querySelector('chart-plan');
    if (!chartPlan) {
        console.log('SightFlow: Could not find chart-plan element');
        return false;
    }
    console.log('SightFlow: Found chart-plan element');
    
    // Find the div with classes "table-layout chart-summary-box" within chart-plan
    // This is the clickable area to expand the follow up section
    const targetDiv = chartPlan.querySelector('div.table-layout.chart-summary-box');
    
    if (!targetDiv) {
        console.log('SightFlow: Could not find chart-summary-box div in chart-plan');
        // Log what divs are in chart-plan for debugging
        const divsInPlan = chartPlan.querySelectorAll('div');
        console.log(`SightFlow: Found ${divsInPlan.length} divs in chart-plan`);
        divsInPlan.forEach((div, i) => {
            if (i < 10) { // Log first 10 for debugging
                console.log(`  Div ${i}: class="${div.className}"`);
            }
        });
        return false;
    }
    
    console.log('SightFlow: Found chart-summary-box div, clicking to expand Follow Up');
    targetDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    targetDiv.click();
    await wait(300);
    return true;
}

/**
 * Opens the doctor dropdown in Follow Up section and selects a doctor
 * @param doctorName - The doctor name to select (e.g., "Dr. Banker", "Banker")
 * @returns True if successful, false if element not found
 */
async function selectFollowUpDoctor(doctorName) {
    // Find the chart-follow-up element
    const chartFollowUp = document.querySelector('chart-follow-up');
    if (!chartFollowUp) {
        console.log('SightFlow: Could not find chart-follow-up element');
        return false;
    }
    console.log('SightFlow: Found chart-follow-up element');
    
    // Find the first mat-form-field (doctor dropdown)
    const matFormField = chartFollowUp.querySelector('mat-form-field');
    if (!matFormField) {
        console.log('SightFlow: Could not find mat-form-field in chart-follow-up');
        return false;
    }
    console.log('SightFlow: Found doctor mat-form-field');
    
    // Step 1: Click the Clear button to clear the default doctor
    const clearButton = matFormField.querySelector('button[aria-label="Clear"]');
    if (clearButton) {
        clearButton.click();
        console.log('SightFlow: Clicked Clear button to remove default doctor');
        await wait(300);
    } else {
        console.log('SightFlow: Clear button not found, continuing...');
    }
    
    // Step 2: Click on the mat-form-field itself to open the dropdown
    matFormField.click();
    console.log('SightFlow: Clicked mat-form-field to open doctor dropdown');
    await wait(500);
    
    // Extract just the last name for searching (e.g., "Dr. Banker" -> "Banker", "Dr Banker" -> "Banker")
    let searchTerm = doctorName.trim();
    // Remove "Dr.", "Dr ", "Doctor " prefixes to get just the name
    searchTerm = searchTerm.replace(/^(dr\.?\s*|doctor\s+)/i, '').trim();
    const normalizedSearch = searchTerm.toLowerCase().trim();
    
    console.log(`SightFlow: Looking for doctor with name containing: "${searchTerm}"`);
    
    // Find the dropdown listbox (it renders in a CDK overlay outside chart-follow-up)
    const listbox = document.querySelector('div[role="listbox"].mat-autocomplete-panel');
    if (!listbox) {
        console.log('SightFlow: Could not find doctor dropdown listbox');
        return false;
    }
    console.log('SightFlow: Found doctor dropdown listbox');
    
    // Find all mat-option elements
    const options = listbox.querySelectorAll('mat-option');
    console.log(`SightFlow: Found ${options.length} doctor options in dropdown`);
    
    // Find matching option by title attribute
    let matchedOption = null;
    for (const option of options) {
        const title = option.getAttribute('title');
        if (title) {
            const normalizedTitle = title.toLowerCase().trim();
            // Check if the title contains the search term (e.g., "Dr. Banker" contains "banker")
            if (normalizedTitle.includes(normalizedSearch)) {
                matchedOption = option;
                console.log(`SightFlow: Found matching doctor: "${title}"`);
                break;
            }
        }
    }
    
    if (!matchedOption) {
        console.log(`SightFlow: Could not find doctor matching "${doctorName}"`);
        // Log first 10 available options for debugging
        console.log('SightFlow: Available doctors (first 10):');
        Array.from(options).slice(0, 10).forEach((opt, i) => {
            console.log(`  ${i + 1}. ${opt.getAttribute('title')}`);
        });
        return false;
    }
    
    // Scroll the option into view and click it
    matchedOption.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await wait(100);
    matchedOption.click();
    console.log(`SightFlow: Clicked on doctor: ${matchedOption.getAttribute('title')}`);
    await wait(300);
    return true;
}

/**
 * Finds a mat-form-field by its mat-label text within chart-follow-up
 * @param labelText - The label text to search for (e.g., "Number", "Time")
 * @returns The mat-form-field element or null if not found
 */
function findFollowUpFormFieldByLabel(labelText) {
    const chartFollowUp = document.querySelector('chart-follow-up');
    if (!chartFollowUp) {
        console.log('SightFlow: Could not find chart-follow-up element');
        return null;
    }
    
    // Find all mat-form-field elements
    const formFields = chartFollowUp.querySelectorAll('mat-form-field');
    
    for (const formField of formFields) {
        const matLabel = formField.querySelector('mat-label');
        if (matLabel && matLabel.textContent.trim().toLowerCase() === labelText.toLowerCase()) {
            return formField;
        }
    }
    
    console.log(`SightFlow: Could not find mat-form-field with label "${labelText}"`);
    return null;
}

/**
 * Selects a value from a mat-select dropdown in Follow Up section
 * @param labelText - The label of the mat-form-field (e.g., "Number", "Time")
 * @param valueText - The value text to select (e.g., "2", "Week")
 * @returns True if successful, false if element not found
 */
async function selectFollowUpDropdownValue(labelText, valueText) {
    const formField = findFollowUpFormFieldByLabel(labelText);
    if (!formField) {
        return false;
    }
    console.log(`SightFlow: Found ${labelText} mat-form-field`);
    
    // Find the mat-select inside and click it to open dropdown
    const matSelect = formField.querySelector('mat-select');
    if (!matSelect) {
        console.log(`SightFlow: Could not find mat-select in ${labelText} form field`);
        return false;
    }
    
    matSelect.click();
    console.log(`SightFlow: Clicked ${labelText} dropdown to open`);
    await wait(200); // Wait for dropdown to appear
    
    // Find the dropdown panel (renders in CDK overlay)
    const panel = document.querySelector('div.mat-select-panel');
    if (!panel) {
        console.log(`SightFlow: Could not find mat-select-panel for ${labelText}`);
        return false;
    }
    
    // Find all mat-option elements
    const options = panel.querySelectorAll('mat-option');
    console.log(`SightFlow: Found ${options.length} options in ${labelText} dropdown`);
    
    // Find matching option by span text
    const normalizedValue = valueText.toString().toLowerCase().trim();
    let matchedOption = null;
    
    for (const option of options) {
        const spanText = option.querySelector('span.mat-option-text');
        if (spanText) {
            const optionText = spanText.textContent.trim().toLowerCase();
            if (optionText === normalizedValue) {
                matchedOption = option;
                break;
            }
        }
    }
    
    if (!matchedOption) {
        console.log(`SightFlow: Could not find option "${valueText}" in ${labelText} dropdown`);
        // Log available options for debugging
        console.log(`SightFlow: Available ${labelText} options:`);
        options.forEach((opt, i) => {
            const span = opt.querySelector('span.mat-option-text');
            if (span && i < 10) {
                console.log(`  ${span.textContent.trim()}`);
            }
        });
        return false;
    }
    
    // Click the matched option
    matchedOption.click();
    console.log(`SightFlow: Selected ${labelText}: ${valueText}`);
    await wait(200);
    return true;
}

/**
 * Selects the number in the Follow Up Number dropdown
 * @param number - The number to select (e.g., "2", 2)
 * @returns True if successful
 */
async function selectFollowUpNumber(number) {
    return await selectFollowUpDropdownValue('Number', number.toString());
}

/**
 * Selects the time unit in the Follow Up Time dropdown
 * Converts plural to singular (weeks -> Week, days -> Day, months -> Month)
 * @param timeUnit - The time unit (e.g., "weeks", "week", "Week", "days", "month")
 * @returns True if successful
 */
async function selectFollowUpTimeUnit(timeUnit) {
    // Normalize: convert to singular and capitalize first letter
    let normalized = timeUnit.toLowerCase().trim();
    
    // Remove trailing 's' for singular form
    if (normalized.endsWith('s')) {
        normalized = normalized.slice(0, -1);
    }
    
    // Capitalize first letter to match dropdown format (Day, Week, Month)
    normalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);
    
    console.log(`SightFlow: Selecting time unit: "${normalized}" (from "${timeUnit}")`);
    return await selectFollowUpDropdownValue('Time', normalized);
}
