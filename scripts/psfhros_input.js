// SightFlow Chrome Extension - Content Script for PSFH/ROS
// Handles finding, selecting, and inserting text into the PSFH/ROS textarea in Intellechart
//
// Workflow (optimized through testing):

// ==================== MESSAGE LISTENER ====================

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg?.type) return;

  if (msg.type === 'INSERT_PSFHROS') {
    (async () => {
      console.log('SightFlow PSFHROS: Processing INSERT_PSFHROS command', msg);

      const conditionsToSelect = Array.isArray(msg.conditionsToSelect) ? msg.conditionsToSelect : [];
      const freeTextEntries = Array.isArray(msg.freeTextEntries) ? msg.freeTextEntries : [];

      collapse();
      await expandByID('#pmHx');
      await wait();

      const availableTitles = extractTitlesFromScrollable('chart-medical-hx', '300px');

      for (const condition of conditionsToSelect) {
        const matchedTitle = availableTitles.find((title) => title.trim().toLowerCase() === condition.trim().toLowerCase());
        if (matchedTitle) {
          console.log(`SightFlow: Selecting existing condition "${matchedTitle}"`);
          clickElementByTitle(matchedTitle);
        } else {
          console.log(`SightFlow: Condition "${condition}" not found, freetyping.`);
          await freeTypeCondition(condition);
        }
      }

      for (const customEntry of freeTextEntries) {
        if (customEntry && typeof customEntry === 'string') {
          await freeTypeCondition(customEntry);
        }
      }

      collapse();
      sendResponse({ success: true });
    })().catch((error) => {
      console.error('SightFlow PSFHROS: Failed to process INSERT_PSFHROS', error);
      sendResponse({ success: false, error: error.message });
    });

    return true;
  }
});

async function freeTypeCondition(condition) {
  clickAddButtonWithinSection('chart-medical-hx');
  await wait(200);
  const textInput = findInputBox('chart-medical-hx');
  if (textInput) {
    textInput.click();
    setAngularValue(textInput, condition);
    console.log(`SightFlow: Freely typed "${condition}" into PMHx input.`);
  } else {
    console.log(`SightFlow: Unable to locate free-text input for "${condition}"`);
  }
}
