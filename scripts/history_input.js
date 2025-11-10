
// ==================== MESSAGE LISTENER ====================

// Main message listener - handles INSERT_HPI command from background script

chrome.runtime.onMessage.addListener(async (msg) => {
  // Handle GET_CONTEXT request
  if (msg?.type === 'GET_CONTEXT') {
    const ctx = getContext();
    return Promise.resolve({ context: ctx });
  }
  
  // Handle legacy INSERT_HPI command
  if (msg?.type === 'INSERT_HPI') {
    console.log('SightFlow HPI: Processing INSERT_HPI command');

    //***Get patient context 
    const ctx = getContext();
    
    //Step 1: Make sure relevant section is collapsed before starting
    collapse();

    // Step 2: Expand the HPI section
    expandByID('#hpiCC');

    await wait(500);

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
  
  // Handle AI-generated INSERT_HPI_AI command
  if (msg?.type === 'INSERT_HPI_AI') {
    console.log('SightFlow HPI: Processing AI-generated command', msg.parameters);
    
    const ctx = getContext();
    const params = msg.parameters || {};
    
    // Step 1: Collapse any open sections
    collapse();
    
    // Step 2: Expand the HPI section
    expandByID('#hpiCC');
    await wait(500);
    
    // Step 3: Click CC if provided
    if (params.cc) {
      clickElementByTitle('CC');
      await wait(200);
      clickElementByTitle(params.cc);
    }
    
    // Step 4: Click location if provided
    if (params.location) {
      await wait(200);
      clickLocationInScrollable(params.location);
    }
    
    // Step 5: Add extended HPI text if provided
    if (params.extended_hpi) {
      await wait(300);
      const extendedhpi_textarea = clickTextAreaWithinSection('chart-hpi');
      if (extendedhpi_textarea) {
        setAngularValue(extendedhpi_textarea, params.extended_hpi);
        console.log('SightFlow AI: Text inserted into Extended HPI');
      }
    }
    
    // Step 6: Check Mental Status Exam if requested
    if (params.mental_status) {
      await wait(200);
      checkCheckboxByLabel('Mental Status Exam');
    }
    
    // Step 7: Collapse to save
    await wait(500);
    collapse();
  }
});

