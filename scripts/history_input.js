
// ==================== MESSAGE LISTENER ====================

// Main message listener - handles INSERT_HPI command from background script

chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg?.type !== 'INSERT_HPI') {
    return;
  }

  console.log('SightFlow HPI: Processing INSERT_HPI command');

  const defaultPayload = {
    ccSectionTitle: 'CC',
    ccOptionTitle: 'Blurred Vision',
    locationTitle: 'OU',
    extendedHpi: 'Patient presents with blurry vision OU, despite the use of glasses, as well as increased glare. This has worsened over the past 6 months. The patient has been told he may have cataracts.',
    autoCheckMentalStatus: true,
    mentalStatusLabel: 'Mental Status Exam'
  };

  const overrides = msg.payload ?? {};

  if (msg.extendedhpi_text && !overrides.extendedHpi) {
    overrides.extendedHpi = msg.extendedhpi_text;
  }

  if (msg.cc && !overrides.ccOptionTitle) {
    overrides.ccOptionTitle = msg.cc;
  }

  if (msg.location && !overrides.locationTitle) {
    overrides.locationTitle = msg.location;
  }

  if (typeof msg.autoCheckMentalStatus === 'boolean' && overrides.autoCheckMentalStatus === undefined) {
    overrides.autoCheckMentalStatus = msg.autoCheckMentalStatus;
  }

  const payload = { ...defaultPayload, ...overrides };

  try {
    //Step 1: Make sure relevant section is collapsed before starting
    collapse();

    // Step 2: Expand the HPI section
    await expandByID('#hpiCC');

    await wait(500);

    // Step 3: Click CC header if provided
    if (payload.ccSectionTitle) {
      clickElementByTitle(payload.ccSectionTitle);
    }

    // Step 4: Select the actual CC option
    if (payload.ccOptionTitle) {
      clickElementByTitle(payload.ccOptionTitle);
    }
    
    // Step 5: Click the eye(s)/location
    if (payload.locationTitle) {
      clickLocationInScrollable(payload.locationTitle);
    }
    
    // Step 6: Find and add to the Extended HPI textarea
    const extendedhpiTextarea = clickTextAreaWithinSection('chart-hpi');
    if (extendedhpiTextarea && payload.extendedHpi) {
      setAngularValue(extendedhpiTextarea, payload.extendedHpi);
      console.log('SightFlow: Text inserted into Extended HPI');
    }

    // Step 7: Select mental status exam checkbox (if not already selected)
    if (payload.autoCheckMentalStatus && payload.mentalStatusLabel) {
      checkCheckboxByLabel(payload.mentalStatusLabel);
    }

    // Step 8: Collapse the section to save
    collapse();
  } catch (error) {
    console.error('SightFlow HPI: Failed to process INSERT_HPI command', error);
  }
});

