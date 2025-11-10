// SightFlow Chrome Extension - Content Script for PSFH/ROS
// Handles finding, selecting, and inserting text into the PSFH/ROS textarea in Intellechart
//
// Workflow (optimized through testing):

// ==================== MESSAGE LISTENER ====================

chrome.runtime.onMessage.addListener(async (msg) => {
  console.log('SightFlow PSFHROS: Message received in content script', msg);
  
  // Handle GET_CONTEXT request
  if (msg?.type === 'GET_CONTEXT') {
    const ctx = getContext();
    return Promise.resolve({ context: ctx });
  }
  
  // Handle legacy INSERT_PSFHROS command
  if (msg?.type === 'INSERT_PSFHROS') {
    console.log('SightFlow PSFHROS: Processing INSERT_PSFHROS command');
    
    //***Get patient context 
    const ctx = getContext();

    // STEP 1: Make sure relevant section is collapsed before starting
    collapse();
    
    // STEP 2: Expand the PSFHROS section
    expandByID('#pmHx');
    await wait();
  
    // STEP 3: Extract all available titles from a scrollable div within a parent element (argument = tagName of parent element)
    const availableTitles = extractTitlesFromScrollable('chart-medical-hx', '300px');

    // STEP 4: Click PMH problems by Title (only if they exist in the list), otherwise free type the condition(s)
    const conditionsToSelect = ['Negative', 'Diverticulosis', 'Diabetes Type II', 'broken heart'];
    
    for (const condition of conditionsToSelect) {
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

        // Try to find the free text input field, use an attribute argument)
        const textInput = findInputBox('chart-medical-hx');
        
        if (textInput) {
          console.log('SightFlow:clicking...');
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
  
  // Handle AI-generated INSERT_PSFHROS_AI command
  if (msg?.type === 'INSERT_PSFHROS_AI') {
    console.log('SightFlow PSFHROS: Processing AI-generated command with conditions:', msg.conditions);
    
    const ctx = getContext();
    
    // STEP 1: Collapse any open sections
    collapse();
    
    // STEP 2: Expand the PSFHROS section
    expandByID('#pmHx');
    await wait();
    
    // STEP 3: Extract available titles
    const availableTitles = extractTitlesFromScrollable('chart-medical-hx', '300px');
    
    // STEP 4: Process each condition from AI
    const conditionsToSelect = msg.conditions || [];
    
    for (const condition of conditionsToSelect) {
      await wait(300); // Small delay between conditions
      
      // Search for the condition
      const matchedTitle = availableTitles.find(title => 
        title.trim().toLowerCase() === condition.trim().toLowerCase()
      );
      
      if (matchedTitle) {
        console.log(`SightFlow AI: "${condition}" found as "${matchedTitle}", clicking...`);
        clickElementByTitle(matchedTitle);
      } else {
        console.log(`SightFlow AI: "${condition}" is NOT available, free-texting...`);
        
        clickAddButtonWithinSection('chart-medical-hx');
        await wait(200);
        
        const textInput = findInputBox('chart-medical-hx');
        if (textInput) {
          textInput.click();
          setAngularValue(textInput, condition);
          console.log("SightFlow AI: Text inserted into input box");
        } else {
          console.log(`SightFlow AI: Could not find input field for "${condition}"`);
        }
      }
    }
    
    // STEP 5: collapse to save
    await wait(500);
    collapse();
  }
});

