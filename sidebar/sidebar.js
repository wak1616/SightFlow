// SightFlow AI Assistant - Sidebar Script

// API Configuration (TODO: Move to chrome.storage.sync)
let OPENAI_API_KEY = ''; // TODO: Get from chrome.storage.sync
const OPENAI_API_URL = 'https://api.openai.com/v1';

// DOM Elements
const requestMicButton = document.getElementById('request-mic-button');
const listenButton = document.getElementById('listen-button');
const inputTextarea = document.getElementById('input-textarea');
const sendToAIButton = document.getElementById('send-to-ai');
const planCardsContainer = document.getElementById('plan-cards-container');
const executePlanButton = document.getElementById('execute-plan');
const statusMessage = document.getElementById('status-message');

// State
let mediaRecorder = null;
let audioChunks = [];
let currentPlan = null;
let isRecording = false;

// System prompt for GPT-5-mini
const SYSTEM_PROMPT = `You are a medical charting assistant that converts free text (from speech or typing) into a structured Plan of changes to a Nextech EMR chart.

Output ONLY valid JSON matching this exact structure:
{
  "source": "speech" or "text",
  "raw_input": "the original user input",
  "items": [
    {
      "target_section": "one of: History, PSFH/ROS, V & P, Exam, Diagnostics, Imp/Plan, Follow Up",
      "subsection": "optional: CC, HPI, Extended HPI, Mental Status Exam, or PMHx",
      "selected": true,
      "actions": [{"type": "add_condition", "condition": "condition name"}],
      "commands": [
        {"name": "command-name", "params": {"key": "value"}}
      ]
    }
  ]
}

VALID COMMANDS (exact format required):
- {"name": "sf-insert-hpi", "params": {"text": "string"}}
- {"name": "sf-insert-extended-hpi", "params": {"text": "string"}}
- {"name": "sf-insert-psfhros", "params": {"conditionsToSelect": ["array", "of", "strings"]}}
- {"name": "sf-insert-exam", "params": {"text": "string"}}
- {"name": "sf-insert-diagnostics", "params": {"text": "string"}}
- {"name": "sf-insert-impplan", "params": {"text": "string"}}
- {"name": "sf-insert-followup", "params": {"text": "string"}}

IMPORTANT: Commands MUST be objects with "name" and "params" properties, NOT strings or function calls.

Example for "Patient has history of Diverticulosis":
{
  "source": "text",
  "raw_input": "Patient has history of Diverticulosis",
  "items": [{
    "target_section": "PSFH/ROS",
    "subsection": "PMHx",
    "selected": true,
    "actions": [{"type": "add_condition", "condition": "Diverticulosis"}],
    "commands": [{"name": "sf-insert-psfhros", "params": {"conditionsToSelect": ["Diverticulosis"]}}]
  }]
}

Map medical problems to the right section; for example, "history of X" belongs in PSFH/ROS → PMHx.
Do not invent facts. Only output valid JSON, no markdown, no explanation.`;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  console.log('SightFlow AI: Sidebar loaded');
  await loadAPIKey();
  await checkMicrophonePermission();
  setupEventListeners();
});

// Check microphone permission on load
async function checkMicrophonePermission() {
  try {
    const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
    console.log('SightFlow: Initial microphone permission state:', permissionStatus.state);
    
    if (permissionStatus.state === 'prompt' || permissionStatus.state === 'denied') {
      // Show the permission request button
      requestMicButton.style.display = 'block';
    }
    
    // Listen for permission changes
    permissionStatus.addEventListener('change', () => {
      console.log('SightFlow: Microphone permission changed to:', permissionStatus.state);
      if (permissionStatus.state === 'granted') {
        requestMicButton.style.display = 'none';
      }
    });
  } catch (error) {
    console.log('SightFlow: Could not check microphone permission:', error);
  }
}

// Load API key from chrome.storage.sync
async function loadAPIKey() {
  try {
    const result = await chrome.storage.sync.get(['openai_api_key']);
    if (result.openai_api_key) {
      OPENAI_API_KEY = result.openai_api_key;
    }
  } catch (error) {
    console.error('Failed to load API key:', error);
  }
}

// Setup event listeners
function setupEventListeners() {
  requestMicButton.addEventListener('click', requestMicrophonePermission);
  listenButton.addEventListener('click', toggleRecording);
  inputTextarea.addEventListener('input', updateSendButtonState);
  sendToAIButton.addEventListener('click', sendToAI);
  executePlanButton.addEventListener('click', executePlan);
}

// Request microphone permission
async function requestMicrophonePermission() {
  try {
    showStatus('Opening permission page in new tab...', 'success');
    
    // Open in a new tab (more reliable than popup)
    const permissionUrl = chrome.runtime.getURL('popup_mic_permission.html');
    console.log('SightFlow: Opening permission page:', permissionUrl);
    
    chrome.tabs.create({ url: permissionUrl, active: true }, (tab) => {
      console.log('SightFlow: Permission tab created:', tab);
      
      // Make sure the tab is focused
      chrome.windows.update(tab.windowId, { focused: true });
      
      // Check periodically if permission was granted
      const checkInterval = setInterval(async () => {
        try {
          const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
          console.log('SightFlow: Checking permission state:', permissionStatus.state);
          
          if (permissionStatus.state === 'granted') {
            clearInterval(checkInterval);
            showStatus('✓ Microphone permission granted!', 'success');
            requestMicButton.style.display = 'none';
            
            // Close the permission tab
            chrome.tabs.remove(tab.id);
          }
        } catch (e) {
          console.log('Could not check permission state:', e);
        }
      }, 500);
      
      // Stop checking after 30 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
      }, 30000);
    });
    
  } catch (error) {
    console.error('SightFlow: Failed to open permission page:', error);
    showStatus('⚠️ Failed to open permission page', 'error');
  }
}

// Toggle recording
async function toggleRecording() {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

// Start recording
async function startRecording() {
  try {
    // Check if mediaDevices is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('MediaDevices API not supported');
    }

    console.log('SightFlow: Requesting microphone access...');
    
    // First, check if we can query the permission state
    try {
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
      console.log('SightFlow: Current microphone permission state:', permissionStatus.state);
      
      if (permissionStatus.state === 'denied') {
        throw new Error('Microphone permission was denied. Please enable it in chrome://settings/content/microphone');
      }
    } catch (permError) {
      console.log('SightFlow: Could not query permission state:', permError);
    }

    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100
      } 
    });
    
    console.log('SightFlow: Microphone access granted!');
    
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      await transcribeAudio(audioBlob);
    };

    mediaRecorder.start();
    isRecording = true;
    
    // Update UI
    listenButton.classList.add('listening');
    listenButton.querySelector('.listen-text').textContent = 'Stop';
    showStatus('Listening...', 'success');
  } catch (error) {
    console.error('Failed to start recording:', error);
    let errorMsg = 'Microphone access denied';
    
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      if (error.message.includes('dismissed')) {
        errorMsg = '⚠️ Please click ALLOW when Chrome asks for microphone access';
        requestMicButton.style.display = 'block';
      } else {
        errorMsg = 'Please allow microphone access in your browser settings';
      }
    } else if (error.name === 'NotFoundError') {
      errorMsg = 'No microphone found';
    }
    
    showStatus(errorMsg, 'error');
  }
}

// Stop recording
function stopRecording() {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
    isRecording = false;
    
    // Update UI
    listenButton.classList.remove('listening');
    listenButton.querySelector('.listen-text').textContent = 'Listen';
    showStatus('Processing audio...', 'success');
  }
}

// Transcribe audio using OpenAI gpt-4o-transcribe
async function transcribeAudio(audioBlob) {
  if (!OPENAI_API_KEY) {
    showStatus('API key not configured', 'error');
    return;
  }

  try {
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    formData.append('model', 'gpt-4o-transcribe');

    const response = await fetch(`${OPENAI_API_URL}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    inputTextarea.value = data.text;
    updateSendButtonState();
    showStatus('Transcription complete', 'success');
  } catch (error) {
    console.error('Transcription error:', error);
    showStatus('Transcription failed', 'error');
  }
}

// Update send button state
function updateSendButtonState() {
  sendToAIButton.disabled = !inputTextarea.value.trim();
}

// Send to AI for plan generation
async function sendToAI() {
  if (!OPENAI_API_KEY) {
    showStatus('API key not configured', 'error');
    return;
  }

  const inputText = inputTextarea.value.trim();
  if (!inputText) return;

  showStatus('Generating plan...', 'success');
  sendToAIButton.disabled = true;

  try {
    const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: inputText }
        ],
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('API error response:', errorData);
      const errorMsg = errorData?.error?.message || `HTTP ${response.status}`;
      throw new Error(errorMsg);
    }

    const data = await response.json();
    console.log('AI response:', data);
    
    const planJson = JSON.parse(data.choices[0].message.content);
    console.log('Parsed plan:', planJson);
    
    // Set source and raw_input if not present
    planJson.source = planJson.source || 'text';
    planJson.raw_input = inputText;
    
    // Ensure all items have selected property
    planJson.items = planJson.items.map(item => ({
      ...item,
      selected: item.selected !== false
    }));

    currentPlan = planJson;
    displayPlan(currentPlan);
    updateSectionsHighlight();
    showStatus('Plan generated successfully', 'success');
  } catch (error) {
    console.error('AI generation error:', error);
    showStatus(`Failed: ${error.message}`, 'error');
  } finally {
    sendToAIButton.disabled = false;
  }
}

// Display plan cards
function displayPlan(plan) {
  planCardsContainer.innerHTML = '';
  
  if (plan.warnings && plan.warnings.length > 0) {
    const warningDiv = document.createElement('div');
    warningDiv.className = 'plan-card';
    warningDiv.style.borderLeft = '3px solid var(--danger-color)';
    warningDiv.innerHTML = `
      <div style="color: var(--danger-color); font-weight: 600;">Warnings:</div>
      <ul style="margin: 8px 0 0 20px; font-size: 13px;">
        ${plan.warnings.map(w => `<li>${w}</li>`).join('')}
      </ul>
    `;
    planCardsContainer.appendChild(warningDiv);
  }

  plan.items.forEach((item, index) => {
    const card = createPlanCard(item, index);
    planCardsContainer.appendChild(card);
  });

  updateExecuteButtonState();
}

// Create a plan card element
function createPlanCard(item, index) {
  const card = document.createElement('div');
  card.className = `plan-card ${!item.selected ? 'unselected' : ''}`;
  
  const actionText = item.actions.map(action => {
    if (action.type === 'insert_text') {
      return `${action.field}: ${action.value}`;
    } else if (action.type === 'add_condition') {
      return `Add condition: ${action.condition}`;
    } else if (action.type === 'set_vital') {
      return `${action.vital}: ${action.value}`;
    }
    return JSON.stringify(action);
  }).join('; ');

  card.innerHTML = `
    <div class="plan-card-header">
      <input type="checkbox" class="plan-checkbox" ${item.selected ? 'checked' : ''} 
             data-index="${index}">
      <div>
        <span class="plan-section">${item.target_section}</span>
        ${item.subsection ? `<span class="plan-subsection">(${item.subsection})</span>` : ''}
      </div>
    </div>
    <div class="plan-content">${actionText}</div>
    ${item.confidence !== undefined ? 
      `<div class="plan-confidence">Confidence: ${Math.round(item.confidence * 100)}%</div>` : ''}
  `;

  // Add checkbox listener
  const checkbox = card.querySelector('.plan-checkbox');
  checkbox.addEventListener('change', (e) => {
    currentPlan.items[index].selected = e.target.checked;
    card.classList.toggle('unselected', !e.target.checked);
    updateSectionsHighlight();
    updateExecuteButtonState();
  });

  return card;
}

// Update sections highlight
function updateSectionsHighlight() {
  // Reset all sections
  document.querySelectorAll('.section-item').forEach(el => {
    el.classList.remove('active');
  });

  if (!currentPlan) return;

  // Get active sections from selected plan items
  const activeSections = new Set();
  currentPlan.items.forEach(item => {
    if (item.selected) {
      activeSections.add(item.target_section);
    }
  });

  // Highlight active sections
  activeSections.forEach(section => {
    const sectionEl = document.querySelector(`.section-item[data-section="${section}"]`);
    if (sectionEl) {
      sectionEl.classList.add('active');
    }
  });
}

// Update execute button state
function updateExecuteButtonState() {
  const hasSelectedItems = currentPlan && 
    currentPlan.items.some(item => item.selected);
  
  executePlanButton.disabled = !hasSelectedItems;
  executePlanButton.classList.toggle('ready', hasSelectedItems);
}

// Execute the plan
async function executePlan() {
  if (!currentPlan) return;

  const selectedItems = currentPlan.items.filter(item => item.selected);
  if (selectedItems.length === 0) return;

  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      showStatus('No active tab found', 'error');
      return;
    }

    // Check if we're on the correct domain
    if (!tab.url.includes('app1.intellechart.net')) {
      showStatus('Please navigate to Intellechart first', 'error');
      return;
    }

    // Send message to content script
    console.log('Sending plan to content script:', selectedItems);
    
    chrome.tabs.sendMessage(tab.id, {
      type: 'EXECUTE_PLAN',
      items: selectedItems
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Chrome runtime error:', chrome.runtime.lastError);
        showStatus(`Failed: ${chrome.runtime.lastError.message}`, 'error');
      } else if (response && !response.success) {
        console.error('Content script error:', response.error);
        showStatus(`Failed: ${response.error}`, 'error');
      } else {
        console.log('Plan executed successfully:', response);
        showStatus('Plan sent to Nextech!', 'success');
        // Clear the plan after successful execution
        currentPlan = null;
        planCardsContainer.innerHTML = '';
        inputTextarea.value = '';
        updateSectionsHighlight();
        updateExecuteButtonState();
      }
    });
  } catch (error) {
    console.error('Execution error:', error);
    showStatus('Error: ' + error.message, 'error');
  }
}

// Status message helper
function showStatus(message, type = 'success') {
  statusMessage.textContent = message;
  statusMessage.className = `status-message show ${type}`;
  
  setTimeout(() => {
    statusMessage.classList.remove('show');
  }, 3000);
}