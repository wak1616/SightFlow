// SightFlow Chrome Extension - Content Script for PSFH/ROS
// Handles finding, selecting, and inserting text into the PSFH/ROS textarea in Intellechart
//
// Workflow (optimized through testing):

// ==================== MESSAGE LISTENER ====================

chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg?.type !== 'INSERT_PSFHROS') {
    return;
  }

  console.log('SightFlow PSFHROS: Processing INSERT_PSFHROS command');

  const defaultPayload = {
    sectionId: '#pmHx',
    sectionSelector: 'chart-medical-hx',
    conditions: {
      select: ['Negative'],
      freeText: []
    },
    note: '',
    addButtonSelector: 'chart-medical-hx'
  };

  const overrides = msg.payload ?? {};

  if (msg.psfhros_text && !overrides.note) {
    overrides.note = msg.psfhros_text;
  }

  if (Array.isArray(msg.conditionsToSelect) && !overrides.conditions) {
    overrides.conditions = { select: msg.conditionsToSelect, freeText: [] };
  }

  const payload = {
    ...defaultPayload,
    ...overrides,
    conditions: {
      select: overrides.conditions?.select ?? overrides.select ?? defaultPayload.conditions.select,
      freeText: overrides.conditions?.freeText ?? overrides.freeText ?? defaultPayload.conditions.freeText
    }
  };

  try {
    collapse();

    await expandByID(payload.sectionId);
    await wait();

    const availableTitles = extractTitlesFromScrollable(payload.sectionSelector, '300px');

    const normalizedAvailable = availableTitles.map(title => title.trim().toLowerCase());

    const toSelect = (payload.conditions.select ?? []).filter(Boolean);
    const toCreate = (payload.conditions.freeText ?? []).filter(Boolean);

    for (const condition of toSelect) {
      const lowerCondition = condition.trim().toLowerCase();
      const index = normalizedAvailable.indexOf(lowerCondition);
      if (index !== -1) {
        const matchedTitle = availableTitles[index];
        console.log(`SightFlow: "${condition}" found as "${matchedTitle}", clicking...`);
        clickElementByTitle(matchedTitle);
      } else {
        console.log(`SightFlow: "${condition}" not found in selectable list, moving to free text.`);
        toCreate.push(condition);
      }
    }

    for (const condition of toCreate) {
      console.log(`SightFlow: Free-typing condition "${condition}"`);
      clickAddButtonWithinSection(payload.sectionSelector);
      const textInput = findInputBox(payload.sectionSelector);
      if (textInput) {
        textInput.click();
        setAngularValue(textInput, condition);
      } else {
        console.log(`SightFlow: Could not find the input field for "${condition}"`);
      }
    }

    if (payload.note) {
      const noteArea = clickTextAreaWithinSection(payload.sectionSelector);
      if (noteArea) {
        setAngularValue(noteArea, payload.note);
      }
    }

    collapse();
  } catch (error) {
    console.error('SightFlow PSFHROS: Failed to process INSERT_PSFHROS command', error);
  }
});

