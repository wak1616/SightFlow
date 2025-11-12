// SightFlow Chrome Extension - Plan Executor
// Handles execution of plan items from the AI assistant

// Listen for EXECUTE_PLAN messages
chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  if (msg?.type === 'EXECUTE_PLAN') {
    console.log('SightFlow Plan Executor: Received plan', msg);
    
    try {
      await executePlanItems(msg.items);
      sendResponse({ success: true });
    } catch (error) {
      console.error('SightFlow Plan Executor: Error', error);
      sendResponse({ success: false, error: error.message });
    }
    
    return true; // Keep message channel open
  }
});

// Execute plan items
async function executePlanItems(items) {
  for (const item of items) {
    console.log(`SightFlow: Executing item for ${item.target_section}`, item);
    
    for (const command of item.commands) {
      await executeCommand(command);
      await wait(500); // Small delay between commands
    }
  }
}

// Execute a single command
async function executeCommand(command) {
  console.log('SightFlow: Executing command', command);
  
  switch (command.name) {
    case 'sf-insert-hpi':
      await insertHPI(command.params.text);
      break;
      
    case 'sf-insert-extended-hpi':
      await insertExtendedHPI(command.params.text);
      break;
      
    case 'sf-insert-psfhros':
      await insertPSFHROS(command.params.conditionsToSelect);
      break;
      
    case 'sf-insert-exam':
      await insertExam(command.params.text);
      break;
      
    case 'sf-insert-diagnostics':
      await insertDiagnostics(command.params.text);
      break;
      
    case 'sf-insert-impplan':
      await insertImpPlan(command.params.text);
      break;
      
    case 'sf-insert-followup':
      await insertFollowUp(command.params.text);
      break;
      
    default:
      console.warn('SightFlow: Unknown command', command.name);
  }
}

// Command implementations
async function insertHPI(text) {
  collapse();
  expandByID('#hpiCC');
  await wait(500);
  
  const textarea = clickTextAreaWithinSection('chart-hpi');
  if (textarea) {
    setAngularValue(textarea, text);
  }
  
  collapse();
}

async function insertExtendedHPI(text) {
  collapse();
  expandByID('#hpiCC');
  await wait(500);
  
  const textarea = clickTextAreaWithinSection('chart-hpi');
  if (textarea) {
    setAngularValue(textarea, text);
  }
  
  checkCheckboxByLabel('Mental Status Exam');
  collapse();
}

async function insertPSFHROS(conditions) {
  // Use existing PSFHROS logic by sending a message that will be handled by psfhros_input.js
  console.log('SightFlow: Sending INSERT_PSFHROS message with conditions:', conditions);
  
  // Get patient context 
  const ctx = getContext();

  // STEP 1: Make sure relevant section is collapsed before starting
  collapse();
  
  // STEP 2: Expand the PSFHROS section
  expandByID('#pmHx');
  await wait();

  // STEP 3: Extract all available titles from a scrollable div within a parent element
  const availableTitles = extractTitlesFromScrollable('chart-medical-hx', '300px');

  // STEP 4: Click PMH problems by Title (only if they exist in the list), otherwise free type the condition(s)
  for (const condition of conditions) {
    // Search for the condition, ignoring leading/trailing whitespace
    const matchedTitle = availableTitles.find(title => 
      title.trim().toLowerCase() === condition.trim().toLowerCase()
    );
    
    if (matchedTitle) {
      console.log(`SightFlow: "${condition}" found as "${matchedTitle}", clicking...`);
      clickElementByTitle(matchedTitle); // Use the original title with whitespace
    } else {
      console.log(`SightFlow: "${condition}" is NOT available in the list, free-texting it...`);
      
      // First need to click on the specific medical history Add button 
      clickAddButtonWithinSection('chart-medical-hx');

      // Try to find the free text input field
      const textInput = findInputBox('chart-medical-hx');
      
      if (textInput) {
        console.log('SightFlow: clicking...');
        textInput.click();
        console.log("SightFlow: Clicked input box within section. Free typing...");
        // Type the condition using setAngularValue
        setAngularValue(textInput, condition);
        console.log("SightFlow: Text inserted into input box and event dispatched.");
      } else {
        console.log(`SightFlow: Could not find the input field for "${condition}"`);
      }
    }
  }

  // STEP 5: collapse to save
  collapse();
}

async function insertExam(text) {
  collapse();
  expandByID('#exam'); // TODO: Update with correct selector from Nextech DOM inspection
  await wait(500);
  
  const textarea = clickTextAreaWithinSection('chart-exam');
  if (textarea) {
    setAngularValue(textarea, text);
  }
  
  collapse();
}

async function insertDiagnostics(text) {
  collapse();
  expandByID('#diagnostics'); // TODO: Update with correct selector from Nextech DOM inspection
  await wait(500);
  
  const textarea = clickTextAreaWithinSection('chart-diagnostics');
  if (textarea) {
    setAngularValue(textarea, text);
  }
  
  collapse();
}

async function insertImpPlan(text) {
  collapse();
  expandByID('#impPlan'); // TODO: Update with correct selector from Nextech DOM inspection
  await wait(500);
  
  const textarea = clickTextAreaWithinSection('chart-imp-plan');
  if (textarea) {
    setAngularValue(textarea, text);
  }
  
  collapse();
}

async function insertFollowUp(text) {
  collapse();
  expandByID('#followUp'); // TODO: Update with correct selector from Nextech DOM inspection
  await wait(500);
  
  const textarea = clickTextAreaWithinSection('chart-follow-up');
  if (textarea) {
    setAngularValue(textarea, text);
  }
  
  collapse();
}

// Handle section focus messages (for keyboard shortcuts)
chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  if (msg?.type === 'FOCUS_SECTION') {
    console.log('SightFlow: Focusing section', msg.section);
    
    try {
      switch (msg.section) {
        case 'History':
          collapse();
          expandByID('#hpiCC');
          await wait(500);
          const historyTextarea = clickTextAreaWithinSection('chart-hpi');
          if (historyTextarea) historyTextarea.focus();
          break;
          
        case 'PSFH/ROS':
          collapse();
          expandByID('#pmHx');
          await wait(500);
          break;
          
        default:
          console.warn('Unknown section:', msg.section);
      }
      sendResponse({ success: true });
    } catch (error) {
      console.error('SightFlow: Error focusing section', error);
      sendResponse({ success: false, error: error.message });
    }
    
    return true;
  }
});
