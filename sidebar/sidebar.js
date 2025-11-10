// SightFlow Sidebar Script - AI-Powered Medical Assistant
// Handles voice capture, text processing, AI analysis, and command execution

console.log('SightFlow Sidebar: Script loaded');

// ==================== STATE MANAGEMENT ====================

const appState = {
  isRecording: false,
  mediaRecorder: null,
  audioChunks: [],
  currentText: '',
  aiAnalysis: null,
  pendingCommands: null,
  patientContext: null,
  deidentifiedId: null,
};

// ==================== UI ELEMENTS ====================

// AI Assistant Elements
const listenButton = document.getElementById('listen-button');
const recordingIndicator = document.getElementById('recording-indicator');
const medicalTextInput = document.getElementById('medical-text-input');
const sendToAIButton = document.getElementById('send-to-ai-button');
const clearTextButton = document.getElementById('clear-text-button');
const sendToNextechButton = document.getElementById('send-to-nextech-button');
const aiAnalysisResults = document.getElementById('ai-analysis-results');
const resultsContent = document.getElementById('results-content');

// Section indicators
const sectionIndicators = {
  history: document.querySelector('[data-section="history"]'),
  psfhros: document.querySelector('[data-section="psfhros"]'),
  vp: document.querySelector('[data-section="vp"]'),
  exam: document.querySelector('[data-section="exam"]'),
  impplan: document.querySelector('[data-section="impplan"]'),
  followup: document.querySelector('[data-section="followup"]'),
};

// Legacy Quick Action Elements
const hpiButton = document.getElementById('hpi-button');
const psfhrosButton = document.getElementById('psfhros-button');
const statusMessage = document.getElementById('status-message');

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('SightFlow Sidebar: DOM loaded, initializing...');
  
  // Check if AI service is configured
  await aiService.loadConfig();
  
  if (!aiService.isConfigured()) {
    showStatus('⚠️ OpenAI API key not configured. Click to set up.', 'warning');
    statusMessage.style.cursor = 'pointer';
    statusMessage.addEventListener('click', showApiKeySetup);
  }
  
  // Initialize event listeners
  initializeEventListeners();
  
  // Get patient context from active tab
  await updatePatientContext();
});

function initializeEventListeners() {
  // Voice recording
  listenButton.addEventListener('click', handleListenClick);
  
  // Text input
  medicalTextInput.addEventListener('input', handleTextInput);
  
  // AI controls
  sendToAIButton.addEventListener('click', handleSendToAI);
  clearTextButton.addEventListener('click', handleClearText);
  
  // Execute button
  sendToNextechButton.addEventListener('click', handleSendToNextech);
  
  // Legacy quick actions
  hpiButton.addEventListener('click', handleHPIClick);
  psfhrosButton.addEventListener('click', handlePSFHROSClick);
}

// ==================== VOICE RECORDING ====================

async function handleListenClick() {
  if (!appState.isRecording) {
    await startRecording();
  } else {
    await stopRecording();
  }
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    appState.mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm'
    });
    
    appState.audioChunks = [];
    
    appState.mediaRecorder.addEventListener('dataavailable', (event) => {
      appState.audioChunks.push(event.data);
    });
    
    appState.mediaRecorder.addEventListener('stop', async () => {
      const audioBlob = new Blob(appState.audioChunks, { type: 'audio/webm' });
      await processAudioToText(audioBlob);
      
      // Stop all tracks to release microphone
      stream.getTracks().forEach(track => track.stop());
    });
    
    appState.mediaRecorder.start();
    appState.isRecording = true;
    
    // Update UI
    listenButton.classList.add('recording');
    listenButton.querySelector('.voice-text').textContent = 'Stop';
    recordingIndicator.classList.remove('hidden');
    
    showStatus('🎤 Recording...', 'info');
    
  } catch (error) {
    console.error('Error starting recording:', error);
    showStatus('Error accessing microphone: ' + error.message, 'error');
  }
}

async function stopRecording() {
  if (appState.mediaRecorder && appState.isRecording) {
    appState.mediaRecorder.stop();
    appState.isRecording = false;
    
    // Update UI
    listenButton.classList.remove('recording');
    listenButton.querySelector('.voice-text').textContent = 'Listen';
    recordingIndicator.classList.add('hidden');
    
    showStatus('⏸️ Processing audio...', 'info');
  }
}

async function processAudioToText(audioBlob) {
  try {
    showStatus('🔄 Transcribing audio...', 'info');
    
    const text = await aiService.transcribeAudio(audioBlob);
    
    // Append to existing text or replace
    const currentText = medicalTextInput.value.trim();
    if (currentText) {
      medicalTextInput.value = currentText + ' ' + text;
    } else {
      medicalTextInput.value = text;
    }
    
    appState.currentText = medicalTextInput.value;
    
    // Enable "Send to AI" button
    enableSendToAI();
    
    showStatus('✅ Transcription complete!', 'success');
    
  } catch (error) {
    console.error('Error transcribing audio:', error);
    showStatus('Error: ' + error.message, 'error');
  }
}

// ==================== TEXT INPUT HANDLING ====================

function handleTextInput(event) {
  appState.currentText = event.target.value.trim();
  
  if (appState.currentText.length > 0) {
    enableSendToAI();
  } else {
    disableSendToAI();
  }
}

function handleClearText() {
  medicalTextInput.value = '';
  appState.currentText = '';
  appState.aiAnalysis = null;
  appState.pendingCommands = null;
  
  disableSendToAI();
  disableSendToNextech();
  hideAIResults();
  resetSectionIndicators();
  
  showStatus('🗑️ Cleared', 'info');
}

// ==================== AI ANALYSIS ====================

async function handleSendToAI() {
  if (!appState.currentText) {
    showStatus('Please enter some text first', 'error');
    return;
  }
  
  if (!aiService.isConfigured()) {
    showStatus('API key not configured', 'error');
    showApiKeySetup();
    return;
  }
  
  try {
    showStatus('🧠 Analyzing with AI...', 'info');
    disableSendToAI();
    
    // Get patient context and de-identify
    await updatePatientContext();
    
    // Send to AI for analysis
    const analysis = await aiService.analyzeMedicalText(
      appState.currentText,
      appState.deidentifiedId
    );
    
    appState.aiAnalysis = analysis;
    appState.pendingCommands = analysis.sections;
    
    // Update UI based on analysis
    displayAIResults(analysis);
    highlightAffectedSections(analysis.sections);
    enableSendToNextech();
    
    showStatus('✅ AI analysis complete!', 'success');
    
  } catch (error) {
    console.error('Error analyzing text:', error);
    showStatus('Error: ' + error.message, 'error');
    enableSendToAI();
  }
}

function displayAIResults(analysis) {
  resultsContent.innerHTML = '';
  
  // Display confidence and notes
  if (analysis.notes) {
    const notesDiv = document.createElement('div');
    notesDiv.className = 'command-details';
    notesDiv.style.marginBottom = '12px';
    notesDiv.textContent = `📝 ${analysis.notes}`;
    resultsContent.appendChild(notesDiv);
  }
  
  // Display planned commands
  analysis.sections.forEach(sectionData => {
    const commandItem = document.createElement('div');
    commandItem.className = 'command-item';
    
    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'command-section';
    sectionTitle.textContent = sectionData.section;
    commandItem.appendChild(sectionTitle);
    
    sectionData.commands.forEach(command => {
      const commandDetail = document.createElement('div');
      commandDetail.className = 'command-details';
      
      if (command.action === 'add_condition') {
        commandDetail.textContent = `Add conditions: ${command.parameters.conditions.join(', ')}`;
      } else if (command.action === 'add_hpi') {
        commandDetail.textContent = `Add HPI: ${command.parameters.cc || 'N/A'}`;
        if (command.parameters.extended_hpi) {
          commandDetail.textContent += ` - ${command.parameters.extended_hpi.substring(0, 50)}...`;
        }
      } else if (command.action === 'add_text') {
        commandDetail.textContent = `Add text: ${command.parameters.text.substring(0, 50)}...`;
      }
      
      commandItem.appendChild(commandDetail);
    });
    
    resultsContent.appendChild(commandItem);
  });
  
  aiAnalysisResults.classList.remove('hidden');
}

function highlightAffectedSections(sections) {
  // Reset all sections first
  resetSectionIndicators();
  
  // Highlight affected sections
  sections.forEach(sectionData => {
    const sectionKey = mapSectionName(sectionData.section);
    const indicator = sectionIndicators[sectionKey];
    
    if (indicator) {
      indicator.classList.remove('inactive');
      indicator.classList.add('pending');
    }
  });
}

function mapSectionName(sectionName) {
  const mapping = {
    'History': 'history',
    'PSFH/ROS': 'psfhros',
    'V & P': 'vp',
    'Exam': 'exam',
    'Imp/Plan': 'impplan',
    'Follow Up': 'followup',
  };
  return mapping[sectionName] || null;
}

function resetSectionIndicators() {
  Object.values(sectionIndicators).forEach(indicator => {
    indicator.classList.remove('pending', 'active');
    indicator.classList.add('inactive');
  });
}

// ==================== COMMAND EXECUTION ====================

async function handleSendToNextech() {
  if (!appState.pendingCommands) {
    showStatus('No commands to execute', 'error');
    return;
  }
  
  try {
    showStatus('⚡ Executing commands...', 'info');
    disableSendToNextech();
    
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      showStatus('No active tab found', 'error');
      return;
    }
    
    if (!tab.url.includes('app1.intellechart.net')) {
      showStatus('Please navigate to Intellechart first', 'error');
      return;
    }
    
    // Execute commands for each section
    for (const sectionData of appState.pendingCommands) {
      await executeCommandsForSection(tab.id, sectionData);
    }
    
    // Update UI
    markSectionsAsExecuted();
    showStatus('✅ All commands executed successfully!', 'success');
    
    // Clear state after short delay
    setTimeout(() => {
      handleClearText();
    }, 3000);
    
  } catch (error) {
    console.error('Error executing commands:', error);
    showStatus('Error: ' + error.message, 'error');
    enableSendToNextech();
  }
}

async function executeCommandsForSection(tabId, sectionData) {
  console.log('Executing commands for section:', sectionData.section);
  
  if (sectionData.section === 'PSFH/ROS') {
    // Execute PMH commands
    for (const command of sectionData.commands) {
      if (command.action === 'add_condition') {
        await chrome.runtime.sendMessage({
          type: 'EXECUTE_AI_COMMAND',
          command: 'INSERT_PSFHROS',
          tabId: tabId,
          parameters: {
            conditions: command.parameters.conditions,
          },
        });
      }
    }
  } else if (sectionData.section === 'History') {
    // Execute HPI commands
    for (const command of sectionData.commands) {
      if (command.action === 'add_hpi') {
        await chrome.runtime.sendMessage({
          type: 'EXECUTE_AI_COMMAND',
          command: 'INSERT_HPI',
          tabId: tabId,
          parameters: command.parameters,
        });
      }
    }
  }
  // Add more section handlers as needed
  
  await wait(500); // Wait between sections
}

function markSectionsAsExecuted() {
  Object.values(sectionIndicators).forEach(indicator => {
    if (indicator.classList.contains('pending')) {
      indicator.classList.remove('pending');
      indicator.classList.add('active');
      
      // Revert after animation
      setTimeout(() => {
        indicator.classList.remove('active');
        indicator.classList.add('inactive');
      }, 2000);
    }
  });
}

// ==================== PATIENT CONTEXT ====================

async function updatePatientContext() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.url.includes('app1.intellechart.net')) {
      appState.patientContext = null;
      appState.deidentifiedId = 'SF-UNKNOWN';
      return;
    }
    
    // Get patient context from page (via content script)
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'GET_CONTEXT'
    });
    
    if (response && response.context) {
      appState.patientContext = response.context;
      appState.deidentifiedId = await deidentificationService.getDeidentifiedId(response.context);
      console.log('Patient context updated:', appState.deidentifiedId);
    }
    
  } catch (error) {
    console.log('Could not get patient context:', error);
    appState.patientContext = null;
    appState.deidentifiedId = 'SF-UNKNOWN';
  }
}

// ==================== LEGACY QUICK ACTIONS ====================

async function handleHPIClick() {
  console.log('SightFlow Sidebar: HPI button clicked');
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      showStatus('No active tab found', 'error');
      return;
    }
    
    if (!tab.url.includes('app1.intellechart.net')) {
      showStatus('Please navigate to Intellechart first', 'error');
      return;
    }
    
    chrome.runtime.sendMessage({
      type: 'EXECUTE_COMMAND',
      command: 'sf-insert-hpi',
      tabId: tab.id
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error:', chrome.runtime.lastError);
        showStatus('Failed to execute command', 'error');
      } else {
        showStatus('HPI insertion triggered!', 'success');
      }
    });
    
  } catch (error) {
    console.error('SightFlow Sidebar: Error executing HPI command', error);
    showStatus('Error: ' + error.message, 'error');
  }
}

async function handlePSFHROSClick() {
  console.log('SightFlow Sidebar: PSFHROS button clicked');
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      showStatus('No active tab found', 'error');
      return;
    }
    
    if (!tab.url.includes('app1.intellechart.net')) {
      showStatus('Please navigate to Intellechart first', 'error');
      return;
    }
    
    chrome.runtime.sendMessage({
      type: 'EXECUTE_COMMAND',
      command: 'sf-insert-psfhros',
      tabId: tab.id
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error:', chrome.runtime.lastError);
        showStatus('Failed to execute command', 'error');
      } else {
        showStatus('PMH selection triggered!', 'success');
      }
    });
    
  } catch (error) {
    console.error('SightFlow Sidebar: Error executing PSFHROS command', error);
    showStatus('Error: ' + error.message, 'error');
  }
}

// ==================== UI HELPERS ====================

function enableSendToAI() {
  sendToAIButton.disabled = false;
  sendToAIButton.classList.remove('disabled');
}

function disableSendToAI() {
  sendToAIButton.disabled = true;
  sendToAIButton.classList.add('disabled');
}

function enableSendToNextech() {
  sendToNextechButton.disabled = false;
  sendToNextechButton.classList.remove('disabled');
  sendToNextechButton.classList.add('ready');
}

function disableSendToNextech() {
  sendToNextechButton.disabled = true;
  sendToNextechButton.classList.add('disabled');
  sendToNextechButton.classList.remove('ready');
}

function hideAIResults() {
  aiAnalysisResults.classList.add('hidden');
}

function showStatus(message, type = 'success') {
  statusMessage.textContent = message;
  statusMessage.className = `status-message show ${type}`;
  
  setTimeout(() => {
    statusMessage.classList.remove('show');
  }, 3000);
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== API KEY SETUP ====================

function showApiKeySetup() {
  const apiKey = prompt(
    'Enter your OpenAI API Key:\n\n' +
    'Get your API key from: https://platform.openai.com/api-keys\n\n' +
    'Your key will be stored locally and never shared.'
  );
  
  if (apiKey && apiKey.trim()) {
    aiService.setApiKey(apiKey.trim()).then(() => {
      showStatus('✅ API key saved successfully!', 'success');
      statusMessage.style.cursor = 'default';
      statusMessage.removeEventListener('click', showApiKeySetup);
    });
  }
}
