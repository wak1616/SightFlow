
// ==================== MESSAGE LISTENER ====================

// Main message listener - handles INSERT_HPI command from background script

const DEFAULT_HISTORY_CONFIG = {
  ccGroupTitle: 'CC',
  ccTitle: 'Blurred Vision',
  location: 'OU',
  extendedHpi: 'Patient presents with blurry vision OU, despite the use of glasses, as well as increased glare. This has worsened over the past 6 months. The patient has been told he may have cataracts.',
  ensureMentalStatusExam: true
};

chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  if (msg?.type === 'INSERT_HPI') {
    console.log('SightFlow HPI: Processing INSERT_HPI command');

    //***Get patient context 
    const ctx = getContext();
    
    const payload = msg.payload || {};
    const config = {
      ...DEFAULT_HISTORY_CONFIG,
      ...payload
    };
    const extendedText = payload.extendedHpi || msg.extendedhpi_text || DEFAULT_HISTORY_CONFIG.extendedHpi;

    //Step 1: Make sure relevant section is collapsed before starting
    collapse();

    // Step 2: Expand the HPI section
    expandByID('#hpiCC');

    await wait(500);

    // Step 3: Click CC
    if (!payload.skipCcSelection) {
      clickElementByTitle(config.ccGroupTitle);

      // Step 4: Click the actual CC 
      if (config.ccTitle) {
        clickElementByTitle(config.ccTitle);
      }
      
      // Step 5: Click the eye(s)/location
      if (config.location) {
        clickLocationInScrollable(config.location);
      }
    }
    
    // Step 6: Find and add to the mat-input-xx text area (might be a different element after expansion)
    extendedhpi_textarea = clickTextAreaWithinSection('chart-hpi');
    if (extendedhpi_textarea && extendedText) {
      setAngularValue(extendedhpi_textarea, extendedText);
      console.log('SightFlow: Text inserted into Extended HPI');
    }

    
    // Step 7: Select mental status exam checkbox (if not already selected)
    if (config.ensureMentalStatusExam) {
      checkCheckboxByLabel('Mental Status Exam');
    }

    // Step 8: Collapse the section to save
    collapse();

    sendResponse?.({ success: true });
    return true;
  }
});

