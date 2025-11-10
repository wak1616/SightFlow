// ==================== MESSAGE LISTENER ====================

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg?.type) return;

  if (msg.type === 'GET_CONTEXT') {
    sendResponse({ context: getContext() });
    return;
  }

  if (msg.type === 'INSERT_HPI') {
    (async () => {
      console.log('SightFlow HPI: Processing INSERT_HPI command');

      collapse();
      await expandByID('#hpiCC');
      await wait(500);

      clickElementByTitle('CC');
      clickElementByTitle('Blurred Vision');
      clickLocationInScrollable('OU');

      const extendedHpiTextarea = clickTextAreaWithinSection('chart-hpi');
      if (extendedHpiTextarea && msg.extendedhpi_text) {
        setAngularValue(extendedHpiTextarea, msg.extendedhpi_text);
        console.log('SightFlow: Text inserted into Extended HPI');
      }

      checkCheckboxByLabel('Mental Status Exam');
      collapse();
      sendResponse({ success: true });
    })().catch((error) => {
      console.error('SightFlow HPI: Failed to process INSERT_HPI', error);
      sendResponse({ success: false, error: error.message });
    });

    return true;
  }
});
