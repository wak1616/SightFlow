// SightFlow Sidebar Script - AI Assistant
// Handles speech-to-text, LLM integration, and command execution

console.log('SightFlow Sidebar: AI Assistant script loaded');

// DOM Elements
const listenButton = document.getElementById('listen-button');
const listeningIndicator = document.getElementById('listening-indicator');
const medicalTextInput = document.getElementById('medical-text-input');
const sendToAIButton = document.getElementById('send-to-ai-button');
const sendToNextechButton = document.getElementById('send-to-nextech-button');
const statusMessage = document.getElementById('status-message');
const settingsButton = document.getElementById('settings-button');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsButton = document.getElementById('close-settings');
const apiKeyInput = document.getElementById('api-key-input');
const saveApiKeyButton = document.getElementById('save-api-key');

// State
let recognition = null;
let isListening = false;
let currentPlan = null;
let patientContext = null;
let deidentifiedId = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  console.log('SightFlow Sidebar: DOM loaded');
  
  // Initialize speech recognition
  initializeSpeechRecognition();
  
  // Load API key
  await llmService.loadApiKey();
  
  // Get patient context
  await updatePatientContext();
  
  // Setup event listeners
  setupEventListeners();
});

/**
 * Initialize Web Speech API
 */
function initializeSpeechRecognition() {
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
      console.log('Speech recognition started');
      isListening = true;
      listenButton.classList.add('listening');
      listenButton.querySelector('.listen-text').textContent = 'Stop';
      listeningIndicator.classList.remove('hidden');
    };
    
    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }
      
      // Update textarea with both interim and final results
      const currentText = medicalTextInput.value;
      const newText = currentText + finalTranscript;
      medicalTextInput.value = newText + interimTranscript;
      
      // Enable Send to AI button if there's text
      if (newText.trim().length > 0) {
        sendToAIButton.disabled = false;
      }
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      showStatus('Speech recognition error: ' + event.error, 'error');
      stopListening();
    };
    
    recognition.onend = () => {
      console.log('Speech recognition ended');
      stopListening();
    };
  } else {
    console.warn('Speech recognition not supported');
    listenButton.disabled = true;
    listenButton.title = 'Speech recognition not supported in this browser';
  }
}

/**
 * Start listening
 */
function startListening() {
  if (!recognition) {
    showStatus('Speech recognition not available', 'error');
    return;
  }
  
  try {
    recognition.start();
  } catch (error) {
    console.error('Error starting recognition:', error);
    showStatus('Error starting speech recognition', 'error');
  }
}

/**
 * Stop listening
 */
function stopListening() {
  if (recognition && isListening) {
    recognition.stop();
  }
  
  isListening = false;
  listenButton.classList.remove('listening');
  listenButton.querySelector('.listen-text').textContent = 'Listen';
  listeningIndicator.classList.add('hidden');
  
  // Enable Send to AI button if there's text
  if (medicalTextInput.value.trim().length > 0) {
    sendToAIButton.disabled = false;
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Listen button
  listenButton.addEventListener('click', () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  });
  
  // Text input change
  medicalTextInput.addEventListener('input', () => {
    const hasText = medicalTextInput.value.trim().length > 0;
    sendToAIButton.disabled = !hasText;
  });
  
  // Send to AI button
  sendToAIButton.addEventListener('click', async () => {
    await analyzeWithAI();
  });
  
  // Send to Nextech button
  sendToNextechButton.addEventListener('click', async () => {
    await executePlan();
  });
  
  // Settings
  settingsButton.addEventListener('click', () => {
    // Clear input when opening settings (user can enter new key)
    apiKeyInput.value = '';
    apiKeyInput.placeholder = llmService.apiKey ? 'API key is configured (enter new to change)' : 'sk-...';
    settingsModal.classList.remove('hidden');
  });
  
  closeSettingsButton.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
  });
  
  saveApiKeyButton.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey && apiKey.startsWith('sk-')) {
      await llmService.setApiKey(apiKey);
      showStatus('API key saved successfully', 'success');
      settingsModal.classList.add('hidden');
      apiKeyInput.value = '';
    } else if (apiKey === '' && llmService.apiKey) {
      // User cleared the field but we already have a key - keep existing
      showStatus('Using existing API key', 'info');
      settingsModal.classList.add('hidden');
    } else {
      showStatus('Invalid API key format. Must start with "sk-"', 'error');
    }
  });
  
  // Close modal on outside click
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      settingsModal.classList.add('hidden');
    }
  });
}

/**
 * Update patient context from active tab
 */
async function updatePatientContext() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url.includes('app1.intellechart.net')) {
      // Request context from content script
      chrome.tabs.sendMessage(tab.id, { type: 'GET_CONTEXT' }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('Could not get context:', chrome.runtime.lastError);
          patientContext = 'Unknown Patient';
        } else {
          patientContext = response?.context || 'Unknown Patient';
          // Get or create deidentified ID
          deidentifiedId = deidentificationService.getDeidentifiedId(patientContext);
          console.log('Patient context:', patientContext, 'Deidentified ID:', deidentifiedId);
        }
      });
    }
  } catch (error) {
    console.error('Error updating patient context:', error);
    patientContext = 'Unknown Patient';
    deidentifiedId = deidentificationService.getDeidentifiedId(patientContext);
  }
}

/**
 * Analyze text with AI
 */
async function analyzeWithAI() {
  const text = medicalTextInput.value.trim();
  
  if (!text) {
    showStatus('Please enter or speak medical notes first', 'error');
    return;
  }
  
  if (!llmService.apiKey) {
    showStatus('Please configure OpenAI API key in settings', 'error');
    settingsModal.classList.remove('hidden');
    return;
  }
  
  // Disable button during analysis
  sendToAIButton.disabled = true;
  sendToAIButton.textContent = 'Analyzing...';
  showStatus('Analyzing medical text with AI...', 'info');
  
  try {
    // Deidentify text before sending
    const deidentifiedText = deidentificationService.deidentifyText(
      text,
      patientContext || 'Patient',
      deidentifiedId || 'CHART-UNKNOWN'
    );
    
    // Get deidentified ID if not already set
    if (!deidentifiedId) {
      deidentifiedId = deidentificationService.getDeidentifiedId(patientContext || 'Unknown Patient');
    }
    
    // Call LLM service
    const plan = await llmService.analyzeMedicalText(deidentifiedText, deidentifiedId);
    
    // Store plan
    currentPlan = plan;
    
    // Update UI to show pending sections
    updateSectionHighlights(plan);
    
    // Enable Send to Nextech button
    sendToNextechButton.disabled = false;
    sendToNextechButton.classList.add('active');
    
    showStatus('Analysis complete! Review sections and click "Send to Nextech"', 'success');
    
  } catch (error) {
    console.error('Error analyzing with AI:', error);
    showStatus('Error: ' + error.message, 'error');
  } finally {
    sendToAIButton.disabled = false;
    sendToAIButton.innerHTML = '<span class="button-icon">🤖</span><span>Send to AI</span>';
  }
}

/**
 * Update section highlights based on plan
 */
function updateSectionHighlights(plan) {
  // Reset all sections
  document.querySelectorAll('.chart-section').forEach(section => {
    section.classList.remove('pending');
  });
  
  // Highlight sections that need updates
  const sectionMap = {
    'History': 'section-history',
    'PSFH/ROS': 'section-psfhros',
    'V&P': 'section-vp',
    'Exam': 'section-exam',
    'Imp/Plan': 'section-impplan',
    'Follow Up': 'section-followup'
  };
  
  Object.keys(plan.sections).forEach(sectionName => {
    if (plan.sections[sectionName]?.needsUpdate) {
      const sectionId = sectionMap[sectionName];
      if (sectionId) {
        const sectionElement = document.getElementById(sectionId);
        if (sectionElement) {
          sectionElement.classList.add('pending');
        }
      }
    }
  });
}

/**
 * Execute plan by sending commands to content script
 */
async function executePlan() {
  if (!currentPlan) {
    showStatus('No plan to execute. Please analyze text first.', 'error');
    return;
  }
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.url.includes('app1.intellechart.net')) {
      showStatus('Please navigate to Intellechart first', 'error');
      return;
    }
    
    // Disable button during execution
    sendToNextechButton.disabled = true;
    sendToNextechButton.textContent = 'Executing...';
    showStatus('Executing commands in chart...', 'info');
    
    // Send plan to content script
    chrome.tabs.sendMessage(tab.id, {
      type: 'EXECUTE_PLAN',
      plan: currentPlan
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error:', chrome.runtime.lastError);
        showStatus('Failed to execute plan: ' + chrome.runtime.lastError.message, 'error');
        sendToNextechButton.disabled = false;
        sendToNextechButton.classList.add('active');
      } else if (response?.success) {
        showStatus('Plan executed successfully!', 'success');
        // Reset UI
        currentPlan = null;
        medicalTextInput.value = '';
        sendToAIButton.disabled = true;
        sendToNextechButton.disabled = true;
        sendToNextechButton.classList.remove('active');
        updateSectionHighlights({ sections: {} });
      } else {
        showStatus('Execution failed: ' + (response?.error || 'Unknown error'), 'error');
        sendToNextechButton.disabled = false;
        sendToNextechButton.classList.add('active');
      }
    });
    
  } catch (error) {
    console.error('Error executing plan:', error);
    showStatus('Error: ' + error.message, 'error');
    sendToNextechButton.disabled = false;
    sendToNextechButton.classList.add('active');
  }
}

/**
 * Show status message
 */
function showStatus(message, type = 'success') {
  statusMessage.textContent = message;
  statusMessage.className = `status-message show ${type}`;
  
  // Hide after 5 seconds (longer for important messages)
  setTimeout(() => {
    statusMessage.classList.remove('show');
  }, 5000);
}

// Listen for context updates from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CONTEXT_UPDATE') {
    patientContext = message.context;
    deidentifiedId = deidentificationService.getDeidentifiedId(patientContext);
    console.log('Context updated:', patientContext);
  }
});
