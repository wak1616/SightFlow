"use strict";
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
            }
            catch (error) {
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
        case 'V & P':
            await executeVPCommands(allCommands);
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
        const commandName = command.name;
        const commandParams = command.params;
        if (!commandName)
            continue;
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
                const matchedFinding = availableCCFindings.find(f => f.trim().toLowerCase() === finding.trim().toLowerCase());
                if (matchedFinding) {
                    // Found in list - click on the finding
                    console.log(`SightFlow: CC finding "${finding}" found as "${matchedFinding}"`);
                    clickCCFindingByText(matchedFinding);
                    await wait(300);
                    // If location provided, try to click on it
                    if (location) {
                        const matchedLocation = availableEyeLocations.find(loc => loc.trim().toLowerCase() === location.trim().toLowerCase());
                        if (matchedLocation) {
                            console.log(`SightFlow: Eye location "${location}" found as "${matchedLocation}"`);
                            clickLocationInScrollable(matchedLocation);
                        }
                        else {
                            console.log(`SightFlow: Eye location "${location}" not found in available list`);
                        }
                    }
                }
                else {
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
        const commandName = command.name;
        const commandParams = command.params;
        if (commandName === 'sf-insert-psfhros' && commandParams.conditionsToSelect) {
            allConditions.push(...commandParams.conditionsToSelect);
        }
    }
    // Process all conditions
    for (const condition of allConditions) {
        const matchedTitle = availableTitles.find(title => title.trim().toLowerCase() === condition.trim().toLowerCase());
        if (matchedTitle) {
            console.log(`SightFlow: "${condition}" found as "${matchedTitle}", clicking...`);
            clickElementByTitle(matchedTitle);
        }
        else {
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
    await wait(300);
    
    let needsExternalDefaults = false;
    let needsAnteriorDefaults = false;
    let needsPosteriorDefaults = false;
    let anteriorLensOD = null;
    let anteriorLensOS = null;
    let posteriorCDR_OD = null;
    let posteriorCDR_OS = null;
    
    // Parse all commands first
    for (const command of commands) {
        const commandName = command.name;
        const commandParams = command.params;
        
        if (commandName === 'sf-exam-external-defaults') {
            needsExternalDefaults = true;
        }
        
        if (commandName === 'sf-exam-anterior-defaults') {
            needsAnteriorDefaults = true;
        }
        
        if (commandName === 'sf-exam-anterior-lens') {
            if (commandParams.od) anteriorLensOD = commandParams.od;
            if (commandParams.os) anteriorLensOS = commandParams.os;
        }
        
        if (commandName === 'sf-exam-posterior-defaults') {
            needsPosteriorDefaults = true;
        }
        
        if (commandName === 'sf-exam-posterior-cdr') {
            if (commandParams.od) posteriorCDR_OD = commandParams.od;
            if (commandParams.os) posteriorCDR_OS = commandParams.os;
        }
    }
    
    // Execute in order: External → Anterior → Posterior
    
    // 1. Set External exam to defaults if needed
    if (needsExternalDefaults) {
        console.log('SightFlow: Setting External exam to defaults');
        await setExternalExamDefaults();
        await wait(200);
    }
    
    // 2. Set Anterior Segment defaults and lens findings if needed
    if (needsAnteriorDefaults || anteriorLensOD || anteriorLensOS) {
        if (needsAnteriorDefaults) {
            console.log('SightFlow: Setting Anterior Segment to defaults');
            await setAnteriorSegmentDefaults();
            await wait(200);
        } else {
            // Just navigate to Anterior Segment
            await clickExamNavItem(1);
            await wait(200);
        }
        
        // Handle lens findings
        if (anteriorLensOD) {
            console.log(`SightFlow: Setting OD lens finding: ${anteriorLensOD}`);
            await setAnteriorSegmentLens('OD', anteriorLensOD);
            await wait(200);
        }
        
        if (anteriorLensOS) {
            console.log(`SightFlow: Setting OS lens finding: ${anteriorLensOS}`);
            await setAnteriorSegmentLens('OS', anteriorLensOS);
            await wait(200);
        }
    }
    
    // 3. Set Posterior Segment defaults and CDR if needed
    if (needsPosteriorDefaults || posteriorCDR_OD || posteriorCDR_OS) {
        if (needsPosteriorDefaults) {
            console.log('SightFlow: Setting Posterior Segment to defaults');
            await setPosteriorSegmentDefaults();
            await wait(200);
        } else {
            // Just navigate to Posterior Segment
            await clickExamNavItem(2);
            await wait(200);
        }
        
        // Handle CDR findings
        if (posteriorCDR_OD) {
            console.log(`SightFlow: Setting OD CDR: ${posteriorCDR_OD}`);
            await setPosteriorSegmentCDR('OD', posteriorCDR_OD);
            await wait(200);
        }
        
        if (posteriorCDR_OS) {
            console.log(`SightFlow: Setting OS CDR: ${posteriorCDR_OS}`);
            await setPosteriorSegmentCDR('OS', posteriorCDR_OS);
            await wait(200);
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
        const commandName = command.name;
        const commandParams = command.params;
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
        const commandName = command.name;
        const commandParams = command.params;
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
        const commandName = command.name;
        const commandParams = command.params;
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

// Execute all V&P (Vision & Pressure) section commands
async function executeVPCommands(commands) {
    console.log('SightFlow: Starting V&P section batch execution');
    
    // Collect vision, IOP, and refraction data from all commands
    let visionData = {
        odWithGlasses: null,
        osWithGlasses: null,
        odWithoutGlasses: null,
        osWithoutGlasses: null
    };
    let iopData = {
        od: null,
        os: null
    };
    let refractionData = {
        od: null,  // {sphere, cylinder, axis, add}
        os: null   // {sphere, cylinder, axis, add}
    };
    
    for (const command of commands) {
        const commandName = command.name;
        const commandParams = command.params;
        
        if (commandName === 'sf-insert-vision') {
            // Extract vision values
            if (commandParams.odWithGlasses) visionData.odWithGlasses = commandParams.odWithGlasses;
            if (commandParams.osWithGlasses) visionData.osWithGlasses = commandParams.osWithGlasses;
            if (commandParams.odWithoutGlasses) visionData.odWithoutGlasses = commandParams.odWithoutGlasses;
            if (commandParams.osWithoutGlasses) visionData.osWithoutGlasses = commandParams.osWithoutGlasses;
        }
        
        if (commandName === 'sf-insert-iop') {
            // Extract IOP values
            if (commandParams.od) iopData.od = commandParams.od;
            if (commandParams.os) iopData.os = commandParams.os;
        }
        
        if (commandName === 'sf-insert-refraction') {
            // Extract refraction values
            if (commandParams.od) refractionData.od = commandParams.od;
            if (commandParams.os) refractionData.os = commandParams.os;
        }
    }
    
    // Check if we have any vision data to enter
    const hasVisionData = visionData.odWithGlasses || visionData.osWithGlasses || 
                          visionData.odWithoutGlasses || visionData.osWithoutGlasses;
    
    // Check if we have any IOP data to enter
    const hasIOPData = iopData.od || iopData.os;
    
    // Check if we have any refraction data to enter
    const hasRefractionData = refractionData.od || refractionData.os;
    
    // Process Visual Acuity if we have vision data
    if (hasVisionData) {
        console.log('SightFlow: Expanding Visual Acuity section');
        await expandVisualAcuitySection();
        await wait(300);
        
        // Enter all RIGHT EYE (OD) visions first
        if (visionData.odWithoutGlasses) {
            console.log(`SightFlow: === Setting OD Dsc (without glasses): ${visionData.odWithoutGlasses} ===`);
            await setVisualAcuity('OD', false, visionData.odWithoutGlasses);
            await wait(200);
        }
        
        if (visionData.odWithGlasses) {
            console.log(`SightFlow: === Setting OD Dcc Spec (with glasses): ${visionData.odWithGlasses} ===`);
            await setVisualAcuity('OD', true, visionData.odWithGlasses);
            await wait(200);
        }
        
        // Then enter all LEFT EYE (OS) visions
        if (visionData.osWithoutGlasses) {
            console.log(`SightFlow: === Setting OS Dsc (without glasses): ${visionData.osWithoutGlasses} ===`);
            await setVisualAcuity('OS', false, visionData.osWithoutGlasses);
            await wait(200);
        }
        
        if (visionData.osWithGlasses) {
            console.log(`SightFlow: === Setting OS Dcc Spec (with glasses): ${visionData.osWithGlasses} ===`);
            await setVisualAcuity('OS', true, visionData.osWithGlasses);
            await wait(200);
        }
        
        // Collapse Visual Acuity section if no IOP or refraction data
        if (!hasIOPData && !hasRefractionData) {
            console.log('SightFlow: No IOP/refraction data, collapsing Visual Acuity section');
            const circleFlag = document.querySelector('[data-qa="assistedCodingVisualAcuityCircleFlag"]');
            if (circleFlag) {
                circleFlag.click();
                await wait(300);
            }
        }
    }
    
    // Process IOP if we have IOP data
    if (hasIOPData) {
        console.log('SightFlow: Expanding IOP section');
        await expandIOPSection();
        // expandIOPSection already waits 300ms
        
        if (iopData.od) {
            console.log(`SightFlow: Setting OD IOP: ${iopData.od}`);
            await setIOPValue('OD', iopData.od);
            await wait(100);
        }
        
        if (iopData.os) {
            console.log(`SightFlow: Setting OS IOP: ${iopData.os}`);
            await setIOPValue('OS', iopData.os);
            await wait(100);
        }
        
        // Collapse IOP section if no refraction data
        if (!hasRefractionData) {
            const iopCircleFlag = document.querySelector('[data-qa="assistedCodingIOPCircleFlag"]');
            if (iopCircleFlag) {
                iopCircleFlag.click();
                await wait(200);
            }
        }
    }
    
    // Process Refraction if we have refraction data
    if (hasRefractionData) {
        console.log('SightFlow: Processing refraction data');
        await inputFullRefraction(refractionData.od, refractionData.os);
        // inputFullRefraction already clicks chart-section-v-and-p to save
    } else {
        // Only collapse if no refraction data (refraction saves itself)
        await wait(200);
        collapse();
    }
    
    console.log('SightFlow: V&P section batch execution complete');
}
