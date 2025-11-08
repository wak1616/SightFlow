
// ==================== MESSAGE LISTENER ====================

// Main message listener - handles INSERT_HPI command from background script

chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg?.type === 'INSERT_HPI') {
    //Step 1: Get patient context (uncomment to use for confirmation dialog, if needed in future)
    const ctx = getContext();
    
    // Step 2: Expand the HPI section
    expandByID('#hpiCC');
    
    await wait();
    
    // Step 3: Find and add to the mat-input-xx text area (might be a different element after expansion)
    extendedhpi_textarea = findMatInputArea();
    extendedhpi_textarea.click();
    setAngularValue(extendedhpi_textarea, msg.extendedhpi_text);
    console.log('SightFlow: Text inserted into Extended HPI');
    
    // Step 4: Click sequence for Chief Complaint
    clickElementByTitle('Blurred Vision');
    
    // Step 4 (continued): Click sequence for Eye Location
    clickVisibleElementByTitle('OU');
    
    // Step 6: Select mental status exam checkbox (if not already selected)
    checkCheckboxByLabel('Mental Status Exam');

    // Step 7: Collapse the section to save
    collapse();
  }
});

