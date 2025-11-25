// SightFlow Chrome Extension - Plan Executor
// Handles execution of plan items from the AI assistant

// Listen for EXECUTE_PLAN messages
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'EXECUTE_PLAN') {
    console.log('SightFlow Plan Executor: Received plan', msg);
    
    // Handle async execution
    (async () => {
      try {
        await executePlanItems(msg.items);
        sendResponse({ success: true });
      } catch (error) {
        console.error('SightFlow Plan Executor: Error', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    
    return true; // Keep message channel open for async response
  }
});

// Execute plan items - batched by section for efficiency
async function executePlanItems(items) {
  console.log(`SightFlow Plan Executor: Starting execution of ${items.length} item(s)`);
  
  // Group items by section to minimize open/close cycles
  const itemsBySection = {};
  
  for (const item of items) {
    const section = item.target_section;
    if (!itemsBySection[section]) {
      itemsBySection[section] = [];
    }
    itemsBySection[section].push(item);
  }
  
  console.log('SightFlow: Grouped items by section:', Object.keys(itemsBySection));
  
  // Execute each section's items together
  for (const [section, sectionItems] of Object.entries(itemsBySection)) {
    console.log(`\nSightFlow: Processing section: ${section} with ${sectionItems.length} item(s)`);
    await executeSectionItems(section, sectionItems);
  }
  
  console.log('SightFlow Plan Executor: Execution complete');
}

// Execute all items for a specific section
async function executeSectionItems(section, items) {
  // Collect all commands from all items in this section
  const allCommands = [];
  
  for (const item of items) {
    if (item.commands && item.commands.length > 0) {
      allCommands.push(...item.commands);
    }
  }
  
  if (allCommands.length === 0) {
    console.warn(`SightFlow: No commands to execute for section ${section}`);
    return;
  }
  
  console.log(`SightFlow: Executing ${allCommands.length} command(s) for ${section}`);
  
  // Execute commands based on section type
  switch (section) {
    case 'History':
      await executeHistoryCommands(allCommands);
      break;
      
    case 'PSFH/ROS':
      await executePMHxCommands(allCommands);
      break;
      
    case 'Exam':
      await executeExamCommands(allCommands);
      break;
      
    case 'Diagnostics':
      await executeDiagnosticsCommands(allCommands);
      break;
      
    case 'Imp/Plan':
      await executeImpPlanCommands(allCommands);
      break;
      
    case 'Follow Up':
      await executeFollowUpCommands(allCommands);
      break;
      
    default:
      console.warn(`SightFlow: Unknown section: ${section}`);
  }
}

// Execute all History section commands in one open/close cycle
async function executeHistoryCommands(commands) {
  console.log('SightFlow: Opening History section for batch execution');
  collapse();
  expandByID('#hpiCC');
  await wait(500);
  
  const { ccFindings, eyeLocations } = extractCCandLocationFromScrollables();
  const availableCCFindings = ccFindings;
  const availableEyeLocations = eyeLocations;
  
  let needsMentalStatus = false;
  const textContents = [];
  
  // Process all commands to determine what we need
  for (const command of commands) {
    const commandName = command.name || command.command;
    const commandParams = command.params || command.args;
    
    if (!commandName) continue;
    
    switch (commandName) {
      case 'sf-insert-extended-hpi':
        if (commandParams.text) {
          textContents.push(commandParams.text);
        }
        break;
        
      case 'sf-insert-mental-status':
        needsMentalStatus = true;
        if (commandParams.text) {
          textContents.push(commandParams.text);
        }
        break;
        
      case 'sf-insert-CCs':
        // Handle CC insertion with finding and location
        const finding = commandParams.finding;
        const location = commandParams.location;
        
        if (!finding) {
          console.log('SightFlow: sf-insert-CCs requires a finding parameter');
          break;
        }
        
        // Try to find a matching CC finding in the available list
        const matchedFinding = availableCCFindings.find(f => 
          f.trim().toLowerCase() === finding.trim().toLowerCase()
        );
        
        if (matchedFinding) {
          // Found in list - click on the finding
          console.log(`SightFlow: CC finding "${finding}" found as "${matchedFinding}"`);
          clickCCFindingByText(matchedFinding);
          await wait(300);
          
          // If location provided, try to click on it
          if (location) {
            const matchedLocation = availableEyeLocations.find(loc => 
              loc.trim().toLowerCase() === location.trim().toLowerCase()
            );
            
            if (matchedLocation) {
              console.log(`SightFlow: Eye location "${location}" found as "${matchedLocation}"`);
              clickLocationInScrollable(matchedLocation);
            } else {
              console.log(`SightFlow: Eye location "${location}" not found in available list`);
            }
          }
        } else {
          // Not found in list - free-type into findingText input
          console.log(`SightFlow: CC finding "${finding}" not in list, free-typing...`);
          const ccInput = findCCFindingTextInput();
          if (ccInput) {
            ccInput.click();
            await wait(200);
            // Combine finding and location if both provided
            const fullCC = location ? `${finding} ${location}` : finding;
            setAngularValue(ccInput, fullCC);
          }
        }
        await wait(300);
        break;
    }
  }
  
  // Check mental status checkbox if needed
  if (needsMentalStatus) {
    console.log('SightFlow: Checking Mental Status Exam checkbox');
    checkCheckboxByLabel('Mental Status Exam');
    await wait(500); // Wait for UI to update
  }
  
  // Insert all text content
  if (textContents.length > 0) {
    const combinedText = textContents.join(' ');
    console.log('SightFlow: Inserting combined text:', combinedText);
    const textarea = clickTextAreaWithinSection('chart-hpi');
    if (textarea) {
      setAngularValue(textarea, combinedText);
    }
  }
  
  collapse();
  console.log('SightFlow: History section batch execution complete');
}

// Execute all PSFH/ROS section commands in one open/close cycle
async function executePMHxCommands(commands) {
  console.log('SightFlow: Opening PSFH/ROS section for batch execution');
  
  collapse();
  expandByID('#pmHx');
  await wait();
  
  const availableTitles = extractPMHxTitlesFromScrollable('chart-medical-hx', '300px');
  
  // Collect all conditions from all commands
  const allConditions = [];
  for (const command of commands) {
    const commandName = command.name || command.command;
    const commandParams = command.params || command.args;
    
    if (commandName === 'sf-insert-psfhros' && commandParams.conditionsToSelect) {
      allConditions.push(...commandParams.conditionsToSelect);
    }
  }
  
  // Process all conditions
  for (const condition of allConditions) {
    const matchedTitle = availableTitles.find(title => 
      title.trim().toLowerCase() === condition.trim().toLowerCase()
    );
    
    if (matchedTitle) {
      console.log(`SightFlow: "${condition}" found as "${matchedTitle}", clicking...`);
      clickElementByTitle(matchedTitle);
    } else {
      console.log(`SightFlow: "${condition}" is NOT available in the list, free-texting it...`);
      clickAddButtonWithinSection('chart-medical-hx');
      const textInput = findInputBox('chart-medical-hx');
      
      if (textInput) {
        textInput.click();
        setAngularValue(textInput, condition);
      }
    }
  }
  
  collapse();
  console.log('SightFlow: PSFH/ROS section batch execution complete');
}

// Execute all Exam section commands in one open/close cycle
async function executeExamCommands(commands) {
  console.log('SightFlow: Opening Exam section for batch execution');
  collapse();
  expandByID('#exam');
  await wait(500);
  
  const textContents = [];
  for (const command of commands) {
    const commandName = command.name || command.command;
    const commandParams = command.params || command.args;
    
    if (commandName === 'sf-insert-exam' && commandParams.text) {
      textContents.push(commandParams.text);
    }
  }
  
  if (textContents.length > 0) {
    const combinedText = textContents.join(' ');
    const textarea = clickTextAreaWithinSection('chart-exam');
    if (textarea) {
      setAngularValue(textarea, combinedText);
    }
  }
  
  collapse();
  console.log('SightFlow: Exam section batch execution complete');
}

// Execute all Diagnostics section commands in one open/close cycle
async function executeDiagnosticsCommands(commands) {
  console.log('SightFlow: Opening Diagnostics section for batch execution');
  collapse();
  expandByID('#diagnostics');
  await wait(500);
  
  const textContents = [];
  for (const command of commands) {
    const commandName = command.name || command.command;
    const commandParams = command.params || command.args;
    
    if (commandName === 'sf-insert-diagnostics' && commandParams.text) {
      textContents.push(commandParams.text);
    }
  }
  
  if (textContents.length > 0) {
    const combinedText = textContents.join(' ');
    const textarea = clickTextAreaWithinSection('chart-diagnostics');
    if (textarea) {
      setAngularValue(textarea, combinedText);
    }
  }
  
  collapse();
  console.log('SightFlow: Diagnostics section batch execution complete');
}

// Execute all Imp/Plan section commands in one open/close cycle
async function executeImpPlanCommands(commands) {
  console.log('SightFlow: Opening Imp/Plan section for batch execution');
  collapse();
  expandByID('#impPlan');
  await wait(500);
  
  const textContents = [];
  for (const command of commands) {
    const commandName = command.name || command.command;
    const commandParams = command.params || command.args;
    
    if (commandName === 'sf-insert-impplan' && commandParams.text) {
      textContents.push(commandParams.text);
    }
  }
  
  if (textContents.length > 0) {
    const combinedText = textContents.join(' ');
    const textarea = clickTextAreaWithinSection('chart-imp-plan');
    if (textarea) {
      setAngularValue(textarea, combinedText);
    }
  }
  
  collapse();
  console.log('SightFlow: Imp/Plan section batch execution complete');
}

// Execute all Follow Up section commands in one open/close cycle
async function executeFollowUpCommands(commands) {
  console.log('SightFlow: Opening Follow Up section for batch execution');
  collapse();
  expandByID('#followUp');
  await wait(500);
  
  const textContents = [];
  for (const command of commands) {
    const commandName = command.name || command.command;
    const commandParams = command.params || command.args;
    
    if (commandName === 'sf-insert-followup' && commandParams.text) {
      textContents.push(commandParams.text);
    }
  }
  
  if (textContents.length > 0) {
    const combinedText = textContents.join(' ');
    const textarea = clickTextAreaWithinSection('chart-follow-up');
    if (textarea) {
      setAngularValue(textarea, combinedText);
    }
  }
  
  collapse();
  console.log('SightFlow: Follow Up section batch execution complete');
}

