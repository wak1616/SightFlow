// SightFlow AI Assistant - Sidebar Script

// API Configuration (TODO: Move to chrome.storage.sync)
let OPENAI_API_KEY = ''; // TODO: Get from chrome.storage.sync
const OPENAI_API_URL = 'https://api.openai.com/v1';

// DOM Elements
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
Only output valid JSON with the following TypeScript shape: Plan { source, raw_input, items[], warnings? }.
VALID sections: ["History","PSFH/ROS","V & P","Exam","Diagnostics","Imp/Plan","Follow Up"].
History subsections: ["CC","HPI","Extended HPI","Mental Status Exam"].
PSFH/ROS subsections: ["PMHx"].
VALID actions:
– insert_text(field, value) for narrative fields (CC, HPI, Extended HPI, Mental Status Exam, Exam, Diagnostics, Imp/Plan, Follow Up)
– add_condition(condition[, codeSystem, code]) for PMHx
– set_vital(vital, value) for V & P.
VALID commands (these are what the frontend will actually execute):
– sf-insert-hpi({ text })
– sf-insert-extended-hpi({ text })
– sf-insert-psfhros({ conditionsToSelect: string[] })
– sf-insert-exam({ text })
– sf-insert-diagnostics({ text })
– sf-insert-impplan({ text })
– sf-insert-followup({ text })
Do not invent any other command names.
For each PlanItem, set target_section and optionally subsection, include one or more actions, and the exact list of commands to run.
Map medical problems to the right section; for example, "history of Diverticulosis" belongs in PSFH/ROS → PMHx.
Do not invent facts that are not present in the input.
If you are uncertain, include an explanatory warning in Plan.warnings and set the relevant PlanItem.selected to false.
Always respond with a single JSON object, no explanation, no markdown.`;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  console.log('SightFlow AI: Sidebar loaded');
  await loadAPIKey();
  setupEventListeners();
});

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
  listenButton.addEventListener('click', toggleRecording);
  inputTextarea.addEventListener('input', updateSendButtonState);
  sendToAIButton.addEventListener('click', sendToAI);
  executePlanButton.addEventListener('click', executePlan);
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
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
    showStatus('Microphone access denied', 'error');
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
        temperature: 0,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const planJson = JSON.parse(data.choices[0].message.content);
    
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
    showStatus('Failed to generate plan', 'error');
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
    chrome.tabs.sendMessage(tab.id, {
      type: 'EXECUTE_PLAN',
      items: selectedItems
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error:', chrome.runtime.lastError);
        showStatus('Failed to execute plan', 'error');
      } else {
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