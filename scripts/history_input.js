
// ==================== MESSAGE LISTENER ====================

// Main message listener - handles INSERT_HPI command from background script

chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg?.type === 'INSERT_HPI') {
    //***Get patient context (uncomment to use for confirmation dialog, if needed in future)***
    //const ctx = getContext();
    
    //Step 1: Make sure relevant section is collapsed before starting
    collapse();

    // Step 2: Expand the HPI section
    await expandByID('#hpiCC');

    // Step 3: Click CC
    clickElementByTitle('CC');

    // Step 4: Click the actual CC 
    clickElementByTitle('Blurred Vision');
    
    // Step 5: Click the eye(s)/location
    clickLocationInScrollable('OU');
    
    // Step 6: Find and add to the mat-input-xx text area (might be a different element after expansion)
    extendedhpi_textarea = clickTextAreaWithinSection('chart-hpi');
    setAngularValue(extendedhpi_textarea, msg.extendedhpi_text);
    console.log('SightFlow: Text inserted into Extended HPI');

    
    // Step 7: Select mental status exam checkbox (if not already selected)
    checkCheckboxByLabel('Mental Status Exam');

    // Step 8: Collapse the section to save
    collapse();
  }
});

