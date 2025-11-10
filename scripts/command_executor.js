// Command Executor - Executes LLM-generated commands for different chart sections
// This script runs in the content script context and can interact with the chart

chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  console.log('SightFlow Command Executor: Message received', msg);
  
  if (msg?.type === 'EXECUTE_PLAN') {
    const { plan } = msg;
    console.log('SightFlow Command Executor: Executing plan', plan);
    
    // Execute asynchronously
    (async () => {
      try {
        // Get patient context
        const ctx = getContext();
        
        // Execute commands for each section
        const results = {};
        
        if (plan.sections.History?.needsUpdate) {
          results.History = await executeHistoryCommands(plan.sections.History.commands);
        }
        
        if (plan.sections['PSFH/ROS']?.needsUpdate) {
          results['PSFH/ROS'] = await executePSFHROSCommands(plan.sections['PSFH/ROS'].commands);
        }
        
        if (plan.sections['V&P']?.needsUpdate) {
          results['V&P'] = await executeVPCommands(plan.sections['V&P'].commands);
        }
        
        if (plan.sections.Exam?.needsUpdate) {
          results.Exam = await executeExamCommands(plan.sections.Exam.commands);
        }
        
        if (plan.sections['Imp/Plan']?.needsUpdate) {
          results['Imp/Plan'] = await executeImpPlanCommands(plan.sections['Imp/Plan'].commands);
        }
        
        if (plan.sections['Follow Up']?.needsUpdate) {
          results['Follow Up'] = await executeFollowUpCommands(plan.sections['Follow Up'].commands);
        }
        
        // Send success response
        sendResponse({
          success: true,
          results
        });
        
      } catch (error) {
        console.error('SightFlow Command Executor: Error executing plan', error);
        sendResponse({
          success: false,
          error: error.message
        });
      }
    })();
    
    return true; // Keep message channel open for async response
  }
});

/**
 * Executes commands for History section
 */
async function executeHistoryCommands(commands) {
  collapse();
  expandByID('#hpiCC');
  await wait(500);
  
  for (const cmd of commands) {
    if (cmd.type === 'insertExtendedHPI') {
      const textarea = clickTextAreaWithinSection('chart-hpi');
      if (textarea) {
        setAngularValue(textarea, cmd.value);
      }
    } else if (cmd.type === 'setCC') {
      // Click CC element
      clickElementByTitle('CC');
      // Then click the specific CC value if provided
      if (cmd.value) {
        clickElementByTitle(cmd.value);
      }
    } else if (cmd.type === 'setMentalStatus') {
      checkCheckboxByLabel('Mental Status Exam');
    }
  }
  
  collapse();
  return { success: true };
}

/**
 * Executes commands for PSFH/ROS section
 */
async function executePSFHROSCommands(commands) {
  collapse();
  expandByID('#pmHx');
  await wait(500);
  
  const availableTitles = extractTitlesFromScrollable('chart-medical-hx', '300px');
  
  for (const cmd of commands) {
    if (cmd.type === 'addCondition' && cmd.conditions) {
      for (const condition of cmd.conditions) {
        const matchedTitle = availableTitles.find(title => 
          title.trim().toLowerCase() === condition.trim().toLowerCase()
        );
        
        if (matchedTitle) {
          clickElementByTitle(matchedTitle);
        } else {
          // Free type the condition
          clickAddButtonWithinSection('chart-medical-hx');
          const textInput = findInputBox('chart-medical-hx');
          if (textInput) {
            textInput.click();
            setAngularValue(textInput, condition);
          }
        }
      }
    }
  }
  
  collapse();
  return { success: true };
}

/**
 * Executes commands for V&P section
 */
async function executeVPCommands(commands) {
  // TODO: Implement V&P section commands
  console.log('V&P commands not yet implemented');
  return { success: false, message: 'V&P section not yet implemented' };
}

/**
 * Executes commands for Exam section
 */
async function executeExamCommands(commands) {
  // TODO: Implement Exam section commands
  console.log('Exam commands not yet implemented');
  return { success: false, message: 'Exam section not yet implemented' };
}

/**
 * Executes commands for Imp/Plan section
 */
async function executeImpPlanCommands(commands) {
  // TODO: Implement Imp/Plan section commands
  console.log('Imp/Plan commands not yet implemented');
  return { success: false, message: 'Imp/Plan section not yet implemented' };
}

/**
 * Executes commands for Follow Up section
 */
async function executeFollowUpCommands(commands) {
  // TODO: Implement Follow Up section commands
  console.log('Follow Up commands not yet implemented');
  return { success: false, message: 'Follow Up section not yet implemented' };
}
