// SightFlow Sidebar Assistant
// Handles audio capture, AI analysis requests, and Nextech command orchestration

console.log('SightFlow Sidebar: Assistant UI loaded');

const SECTION_CONFIG = [
  { id: 'history', label: 'History', hotkey: 'Alt+Shift+H' },
  { id: 'psfhros', label: 'PSFH/ROS', hotkey: 'Alt+Shift+M' },
  { id: 'vp', label: 'V & P', hotkey: 'Alt+Shift+V' },
  { id: 'exam', label: 'Exam', hotkey: 'Alt+Shift+E' },
  { id: 'impPlan', label: 'Imp/Plan', hotkey: 'Alt+Shift+P' },
  { id: 'followUp', label: 'Follow Up', hotkey: 'Alt+Shift+F' }
];

const state = {
  transcript: '',
  alias: '',
  isListening: false,
  plan: null,
  sections: SECTION_CONFIG.reduce((acc, section) => {
    acc[section.id] = { status: 'idle', actions: [] };
    return acc;
  }, {})
};

// DOM references
const transcriptInput = document.getElementById('transcript-input');
const patientAliasInput = document.getElementById('patient-alias-input');
const listenButton = document.getElementById('listen-button');
const listenIndicator = document.getElementById('listen-indicator');
const sendToAiButton = document.getElementById('send-to-ai-button');
const sendToNextechButton = document.getElementById('send-to-nextech-button');
const statusMessage = document.getElementById('status-message');
const sectionList = document.getElementById('section-list');
const planCard = document.getElementById('plan-card');
const planContent = document.getElementById('plan-content');

const speechController = createSpeechController();

init();

function init() {
  renderSections();
  restoreDraftFromStorage();
  wireEventListeners();
}

function renderSections() {
  sectionList.innerHTML = '';
  SECTION_CONFIG.forEach(section => {
    const item = document.createElement('li');
    item.className = 'section-item';
    item.dataset.sectionId = section.id;

    const name = document.createElement('span');
    name.className = 'section-name';
    name.textContent = section.label;

    const tags = document.createElement('div');
    tags.className = 'section-tags';

    const statusBadge = document.createElement('span');
    statusBadge.className = 'section-badge idle';
    statusBadge.textContent = 'idle';
    statusBadge.dataset.role = 'status-badge';

    const hotkeyBadge = document.createElement('span');
    hotkeyBadge.className = 'section-badge idle';
    hotkeyBadge.textContent = section.hotkey;
    hotkeyBadge.dataset.role = 'hotkey-badge';

    tags.appendChild(statusBadge);
    tags.appendChild(hotkeyBadge);
    item.appendChild(name);
    item.appendChild(tags);
    sectionList.appendChild(item);
  });
}

function wireEventListeners() {
  transcriptInput.addEventListener('input', () => {
    state.transcript = transcriptInput.value;
    saveDraftToStorage();
    updateSendToAiState();
    if (state.plan) {
      resetPlan();
    }
  });

  patientAliasInput.addEventListener('input', () => {
    state.alias = patientAliasInput.value.trim();
    saveDraftToStorage();
  });

  listenButton.addEventListener('click', async () => {
    if (!speechController) {
      showStatus('Speech recognition not supported in this browser.', 'error');
      return;
    }

    try {
      if (!state.isListening) {
        await speechController.start();
      } else {
        speechController.stop();
      }
    } catch (err) {
      console.error('SightFlow Sidebar: Speech controller error', err);
      showStatus(err.message || 'Unable to access microphone.', 'error');
      setListening(false);
    }
  });

  sendToAiButton.addEventListener('click', handleSendToAi);
  sendToNextechButton.addEventListener('click', handleSendToNextech);
}

function updateSendToAiState() {
  const hasTranscript = state.transcript.trim().length > 0;
  sendToAiButton.disabled = !hasTranscript;
}

function setListening(active) {
  state.isListening = active;
  listenButton.classList.toggle('active', active);
  listenIndicator.hidden = !active;
  listenButton.querySelector('.button-label').textContent = active ? 'Stop' : 'Listen';
}

function saveDraftToStorage() {
  chrome.storage.local.set({
    sfAssistantDraft: {
      transcript: state.transcript,
      alias: state.alias
    }
  });
}

function restoreDraftFromStorage() {
  chrome.storage.local.get(['sfAssistantDraft'], ({ sfAssistantDraft }) => {
    if (!sfAssistantDraft) return;
    const { transcript, alias } = sfAssistantDraft;
    if (transcript) {
      state.transcript = transcript;
      transcriptInput.value = transcript;
      updateSendToAiState();
    }
    if (alias) {
      state.alias = alias;
      patientAliasInput.value = alias;
    }
  });
}

async function handleSendToAi() {
  const transcript = state.transcript.trim();
  if (!transcript) {
    showStatus('Add some text before sending to AI.', 'error');
    return;
  }

  const activeTab = await getActiveChartTab();
  if (!activeTab) return;

  setBusy(sendToAiButton, true, 'Thinking…');
  showStatus('Analysing note with AI…');

  const context = await requestChartContext(activeTab.id);

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'LLM_ANALYZE',
      payload: {
        transcript,
        alias: state.alias || null,
        tabId: activeTab.id,
        chartContext: context
      }
    });

    if (!response?.success) {
      throw new Error(response?.error || 'AI analysis failed');
    }

    applyPlan(response.plan || null);
    showStatus('AI plan ready. Review before sending to Nextech.', 'success');
  } catch (error) {
    console.error('SightFlow Sidebar: AI analysis failed', error);
    showStatus(error.message || 'AI analysis failed', 'error');
    resetPlan();
  } finally {
    setBusy(sendToAiButton, false, 'Send to AI');
  }
}

async function handleSendToNextech() {
  if (!state.plan?.actions?.length) {
    showStatus('No pending changes to send.', 'error');
    return;
  }

  const activeTab = await getActiveChartTab();
  if (!activeTab) return;

  setBusy(sendToNextechButton, true, 'Sending…');
  showStatus('Sending actions to Nextech…');

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'EXECUTE_ACTIONS',
      payload: {
        tabId: activeTab.id,
        alias: state.alias || null,
        actions: state.plan.actions
      }
    });

    if (!response?.success) {
      throw new Error(response?.error || 'Failed to send actions');
    }

    markSectionsAsUpdated();
    showStatus('Updates applied in Nextech.', 'success');
  } catch (error) {
    console.error('SightFlow Sidebar: Failed to send actions', error);
    showStatus(error.message || 'Failed to send actions', 'error');
  } finally {
    setBusy(sendToNextechButton, false, 'Send to Nextech');
  }
}

function applyPlan(plan) {
  state.plan = plan;
  SECTION_CONFIG.forEach(section => {
    const pendingActions = plan?.actions?.filter(action => action.sectionId === section.id) || [];
    state.sections[section.id] = {
      status: pendingActions.length ? 'pending' : 'idle',
      actions: pendingActions
    };
  });

  renderSectionsStatus();
  renderPlan(plan);
  sendToNextechButton.disabled = !(plan?.actions?.length);

  if (!plan?.actions?.length) {
    showStatus('AI did not detect actionable changes.', 'error');
  }
}

function resetPlan() {
  state.plan = null;
  SECTION_CONFIG.forEach(section => {
    state.sections[section.id] = { status: 'idle', actions: [] };
  });
  renderSectionsStatus();
  planCard.hidden = true;
  planContent.innerHTML = '';
  sendToNextechButton.disabled = true;
}

function markSectionsAsUpdated() {
  SECTION_CONFIG.forEach(section => {
    if (state.sections[section.id].actions.length) {
      state.sections[section.id].status = 'updated';
    }
  });
  renderSectionsStatus();
  planCard.hidden = true;
}

function renderSectionsStatus() {
  sectionList.querySelectorAll('.section-item').forEach(item => {
    const sectionId = item.dataset.sectionId;
    const sectionState = state.sections[sectionId];
    const badge = item.querySelector('[data-role="status-badge"]');

    item.classList.remove('pending');
    badge.classList.remove('idle', 'pending', 'updated');

    let label = 'idle';
    if (sectionState.status === 'pending') {
      item.classList.add('pending');
      badge.classList.add('pending');
      label = 'pending';
    } else if (sectionState.status === 'updated') {
      badge.classList.add('updated');
      label = 'updated';
    } else {
      badge.classList.add('idle');
    }

    badge.textContent = label;
  });
}

function renderPlan(plan) {
  if (!plan || !plan.actions || plan.actions.length === 0) {
    planCard.hidden = true;
    planContent.innerHTML = '';
    return;
  }

  planCard.hidden = false;
  planContent.innerHTML = '';

  SECTION_CONFIG.forEach(section => {
    const actions = plan.actions.filter(action => action.sectionId === section.id);
    if (!actions.length) return;

    const sectionEl = document.createElement('div');
    sectionEl.className = 'plan-section highlight';

    const header = document.createElement('div');
    header.className = 'plan-section-header';

    const title = document.createElement('span');
    title.className = 'plan-section-title';
    title.textContent = section.label;

    const badge = document.createElement('span');
    badge.className = 'section-badge pending';
    badge.textContent = `${actions.length} action${actions.length > 1 ? 's' : ''}`;

    header.appendChild(title);
    header.appendChild(badge);

    const summary = document.createElement('div');
    summary.className = 'plan-section-summary';
    summary.textContent = actions.map(a => a.summary || 'Update requested').join(' • ');

    const list = document.createElement('div');
    list.className = 'plan-actions';

    actions.forEach(action => {
      const row = document.createElement('div');
      row.className = 'plan-action';
      row.innerHTML = `
        <span><strong>Command:</strong> ${action.command}</span>
        <span><strong>Target:</strong> ${action.details?.target || '—'}</span>
      `;
      list.appendChild(row);
    });

    sectionEl.appendChild(header);
    sectionEl.appendChild(summary);
    sectionEl.appendChild(list);
    planContent.appendChild(sectionEl);
  });
}

function showStatus(message, type = '') {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
}

async function getActiveChartTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    showStatus('No active tab found.', 'error');
    return null;
  }

  if (!tab.url || !tab.url.includes('app1.intellechart.net')) {
    showStatus('Open Intellechart before using the assistant.', 'error');
    return null;
  }

  return tab;
}

function setBusy(button, busy, fallbackLabel) {
  if (busy) {
    button.dataset.prevLabel = button.textContent;
    button.textContent = fallbackLabel;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.prevLabel || fallbackLabel;
    button.disabled = false;
    delete button.dataset.prevLabel;
  }
}

async function requestChartContext(tabId) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: 'GET_CONTEXT' });
    return response?.context || null;
  } catch (err) {
    console.warn('SightFlow Sidebar: Unable to retrieve context.', err);
    return null;
  }
}

function createSpeechController() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  let finalTranscript = '';

  recognition.onstart = () => {
    finalTranscript = transcriptInput.value.trim();
    setListening(true);
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error', event);
    showStatus(event.error === 'not-allowed'
      ? 'Microphone access denied.'
      : 'Speech recognition error.', 'error');
    setListening(false);
  };

  recognition.onend = () => {
    setListening(false);
  };

  recognition.onresult = (event) => {
    let interimTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const transcriptChunk = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcriptChunk + ' ';
      } else {
        interimTranscript += transcriptChunk;
      }
    }

    const combined = (finalTranscript + interimTranscript).trim();
    transcriptInput.value = combined;
    state.transcript = combined;
    updateSendToAiState();
    saveDraftToStorage();
  };

  return {
    start() {
      recognition.start();
    },
    stop() {
      recognition.stop();
    }
  };
}
