// SightFlow Sidebar Script
// Provides speech capture, AI planning, and Nextech automation controls

console.log('SightFlow Sidebar: Script loaded');

const SECTION_ORDER = ['history', 'psfhros', 'vp', 'exam', 'imp_plan', 'follow_up'];

const SECTION_METADATA = {
  history: {
    label: 'History',
    description: 'CC, HPI, Mental Status Exam, Extended HPI',
    hotkey: 'Alt+Shift+H'
  },
  psfhros: {
    label: 'PSFH/ROS',
    description: 'Past Medical History, ROS selections',
    hotkey: 'Alt+Shift+M'
  },
  vp: {
    label: 'V & P',
    description: 'Vision & Plan'
  },
  exam: {
    label: 'Exam',
    description: 'Objective exam findings'
  },
  imp_plan: {
    label: 'Imp/Plan',
    description: 'Assessment and plan details'
  },
  follow_up: {
    label: 'Follow Up',
    description: 'Follow-up schedule and instructions'
  }
};

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const SPEECH_SUPPORTED = typeof SpeechRecognition === 'function';

const state = {
  isListening: false,
  recognition: null,
  aiProcessing: false,
  planExecuting: false,
  plan: null,
  patientAlias: null,
  patientContext: null,
  activeTabId: null,
  aiSettings: null
};

// DOM elements
const elements = {};

function cacheElements() {
  elements.assistantInput = document.getElementById('assistant-input');
  elements.listenButton = document.getElementById('listen-button');
  elements.sendToAiButton = document.getElementById('send-to-ai');
  elements.sendToNextechButton = document.getElementById('send-to-nextech');
  elements.transcriptStatus = document.getElementById('transcript-status');
  elements.assistantError = document.getElementById('assistant-error');
  elements.planSummary = document.getElementById('plan-summary');
  elements.planSectionList = document.getElementById('plan-section-list');
  elements.statusMessage = document.getElementById('status-message');

  elements.hpiButton = document.getElementById('hpi-button');
  elements.psfhrosButton = document.getElementById('psfhros-button');

  elements.providerSelect = document.getElementById('provider-select');
  elements.openaiApiKey = document.getElementById('openai-api-key');
  elements.openaiModel = document.getElementById('openai-model');
  elements.openaiTemperature = document.getElementById('openai-temperature');
  elements.saveAiSettings = document.getElementById('save-ai-settings');
  elements.settingsStatus = document.getElementById('settings-status');
}

function init() {
  cacheElements();
  renderPlan(null);
  bindEventListeners();
  initializeSpeechSupport();
  loadAiSettings();
  updateButtons();
}

function bindEventListeners() {
  elements.assistantInput.addEventListener('input', () => {
    clearAssistantError();
    updateButtons();
  });

  elements.listenButton.addEventListener('click', toggleListening);
  elements.sendToAiButton.addEventListener('click', handleAiRequest);
  elements.sendToNextechButton.addEventListener('click', handleExecutePlan);

  elements.hpiButton.addEventListener('click', () => runQuickCommand('sf-insert-hpi', 'HPI insertion triggered!'));
  elements.psfhrosButton.addEventListener('click', () => runQuickCommand('sf-insert-psfhros', 'PMH selection triggered!'));

  elements.saveAiSettings.addEventListener('click', saveAiSettings);
}

function initializeSpeechSupport() {
  if (!SPEECH_SUPPORTED) {
    elements.listenButton.disabled = true;
    elements.listenButton.classList.add('disabled');
    setTranscriptStatus('Speech recognition is not supported in this browser.');
  }
}

function updateButtons() {
  const hasText = Boolean(elements.assistantInput.value.trim());
  elements.sendToAiButton.disabled = !hasText || state.aiProcessing;

  const hasExecutablePlan = Boolean(
    state.plan &&
    state.plan.sections?.some((section) => section.executable && section.commands?.length)
  );

  elements.sendToNextechButton.disabled = !hasExecutablePlan || state.planExecuting;
  if (!elements.sendToNextechButton.disabled) {
    elements.sendToNextechButton.classList.add('attention');
  } else {
    elements.sendToNextechButton.classList.remove('attention');
  }

  if (state.aiProcessing || state.planExecuting) {
    elements.listenButton.disabled = true;
  } else if (SPEECH_SUPPORTED) {
    elements.listenButton.disabled = false;
  }

  updateListenButton();
}

function updateListenButton() {
  if (!SPEECH_SUPPORTED) return;

  const isListening = state.isListening;
  elements.listenButton.classList.toggle('listening', isListening);
  elements.listenButton.querySelector('.button-text').textContent = isListening ? 'Stop Listening' : 'Start Listening';
  elements.listenButton.querySelector('.button-icon').textContent = isListening ? '🛑' : '🎤';
}

function setTranscriptStatus(message) {
  elements.transcriptStatus.textContent = message || '';
}

function setAssistantError(message) {
  elements.assistantError.textContent = message || '';
}

function clearAssistantError() {
  elements.assistantError.textContent = '';
}

function showStatus(message, type = 'success', duration = 3000) {
  elements.statusMessage.textContent = message;
  elements.statusMessage.className = `status-message show ${type}`;
  if (duration) {
    setTimeout(() => {
      elements.statusMessage.classList.remove('show');
    }, duration);
  }
}

async function runQuickCommand(commandName, successMessage) {
  try {
    const tab = await getActiveClinicalTab();
    await chrome.runtime.sendMessage({
      type: 'EXECUTE_COMMAND',
      command: commandName,
      tabId: tab.id
    });
    showStatus(successMessage, 'success');
  } catch (error) {
    console.error('SightFlow Sidebar: Quick command error', error);
    showStatus(error.message || 'Failed to execute command', 'error');
  }
}

async function getActiveClinicalTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    throw new Error('No active tab found');
  }
  if (!tab.url || !tab.url.includes('app1.intellechart.net')) {
    throw new Error('Please navigate to IntelleChart first.');
  }
  state.activeTabId = tab.id;
  return tab;
}

function initRecognition() {
  if (!SPEECH_SUPPORTED) return null;
  if (state.recognition) return state.recognition;

  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.continuous = true;

  recognition.onstart = () => {
    state.isListening = true;
    setTranscriptStatus('Listening...');
    updateButtons();
  };

  recognition.onerror = (event) => {
    console.error('SightFlow Sidebar: Speech error', event);
    stopListening(true);
    setAssistantError(event.error === 'not-allowed'
      ? 'Microphone permission denied. Please allow access to use voice capture.'
      : `Speech error: ${event.error || 'unknown issue'}`);
  };

  recognition.onend = () => {
    if (state.isListening) {
      recognition.start(); // Auto-restart for continuous capture
    } else {
      setTranscriptStatus('');
      updateButtons();
    }
  };

  recognition.onresult = (event) => {
    let interimText = '';
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      if (!result[0]) continue;
      const transcript = result[0].transcript.trim();
      if (!transcript) continue;
      if (result.isFinal) {
        appendTranscript(transcript);
        setTranscriptStatus('Captured segment.');
      } else {
        interimText += `${transcript} `;
      }
    }

    if (interimText) {
      setTranscriptStatus(`Listening… ${interimText}`);
    }
  };

  state.recognition = recognition;
  return recognition;
}

function toggleListening() {
  if (state.isListening) {
    stopListening();
  } else {
    startListening();
  }
}

function startListening() {
  clearAssistantError();
  const recognition = initRecognition();
  if (!recognition) return;
  try {
    recognition.start();
  } catch (error) {
    console.error('SightFlow Sidebar: Failed to start recognition', error);
    setAssistantError('Unable to start speech recognition. Check microphone access.');
  }
  updateButtons();
}

function stopListening(dueToError = false) {
  if (!SPEECH_SUPPORTED || !state.recognition) return;
  state.isListening = false;
  try {
    state.recognition.stop();
  } catch (error) {
    console.warn('SightFlow Sidebar: Recognition stop error', error);
  }
  if (!dueToError) {
    setTranscriptStatus('Listening stopped.');
  }
  updateButtons();
}

function appendTranscript(segment) {
  const current = elements.assistantInput.value;
  const needsNewLine = current && !current.endsWith('\n');
  const updated = `${current}${needsNewLine ? '\n' : ''}${segment}`.trim();
  elements.assistantInput.value = updated ? `${updated}\n` : updated;
  elements.assistantInput.scrollTop = elements.assistantInput.scrollHeight;
  clearAssistantError();
  updateButtons();
}

async function prepareClinicalContext() {
  const tab = await getActiveClinicalTab();
  let contextResponse;
  try {
    contextResponse = await chrome.tabs.sendMessage(tab.id, { type: 'REQUEST_PATIENT_CONTEXT' });
  } catch (error) {
    console.error('SightFlow Sidebar: Failed to fetch patient context', error);
  }

  const patientContext = contextResponse?.context;
  if (!patientContext) {
    throw new Error('Unable to identify the current patient context. Make sure the chart is fully loaded.');
  }

  const aliasResponse = await chrome.runtime.sendMessage({
    type: 'GET_OR_CREATE_PATIENT_ALIAS',
    patientContext
  });

  if (!aliasResponse?.success) {
    throw new Error(aliasResponse?.error || 'Failed to de-identify patient context.');
  }

  state.patientAlias = aliasResponse.alias;
  state.patientContext = patientContext;
  state.activeTabId = tab.id;

  return {
    patientAlias: aliasResponse.alias,
    patientContext,
    tabId: tab.id
  };
}

async function handleAiRequest() {
  clearAssistantError();
  const narrative = elements.assistantInput.value.trim();
  if (!narrative) return;

  try {
    state.aiProcessing = true;
    updateButtons();
    setTranscriptStatus('');
    showStatus('Planning chart updates with AI…', 'info');

    const context = await prepareClinicalContext();
    const provider = elements.providerSelect.value;

    const response = await chrome.runtime.sendMessage({
      type: 'PROCESS_CLINICAL_TEXT',
      rawText: narrative,
      patientAlias: context.patientAlias,
      provider
    });

    if (!response?.success) {
      throw new Error(response?.error || 'AI planning failed');
    }

    state.plan = response.plan;
    renderPlan(state.plan);
    showStatus('AI plan ready. Review sections before sending to Nextech.', 'success');
  } catch (error) {
    console.error('SightFlow Sidebar: AI request error', error);
    setAssistantError(error.message || 'Failed to process text with AI.');
    showStatus('AI request failed', 'error');
  } finally {
    state.aiProcessing = false;
    updateButtons();
  }
}

async function handleExecutePlan() {
  if (!state.plan) return;

  try {
    state.planExecuting = true;
    updateButtons();
    showStatus('Sending plan to Nextech…', 'info', 4000);

    const tab = await getActiveClinicalTab(); // refresh tab reference
    const response = await chrome.runtime.sendMessage({
      type: 'EXECUTE_PLAN',
      plan: state.plan,
      tabId: tab.id
    });

    if (!response?.success) {
      throw new Error(response?.error || 'Execution failed');
    }

    markSectionsAsCompleted(response.executed || []);
    renderPlan(state.plan);
    showStatus('Plan executed in Nextech!', 'success');
  } catch (error) {
    console.error('SightFlow Sidebar: Plan execution error', error);
    showStatus(error.message || 'Failed to send plan', 'error');
  } finally {
    state.planExecuting = false;
    updateButtons();
  }
}

function markSectionsAsCompleted(executedEntries) {
  if (!state.plan?.sections || !executedEntries.length) return;
  const executedSet = new Set(executedEntries.map((entry) => entry.sectionId));
  state.plan.sections = state.plan.sections.map((section) => {
    if (executedSet.has(section.id)) {
      return {
        ...section,
        status: 'completed',
        commands: []
      };
    }
    return section;
  });
}

function renderPlan(plan) {
  const summaryText = plan?.summary?.trim();
  if (summaryText) {
    elements.planSummary.textContent = summaryText;
    elements.planSummary.classList.add('active');
    elements.planSummary.classList.remove('muted');
  } else {
    elements.planSummary.textContent = 'No AI plan yet. Capture dictation or type a narrative, then send to AI.';
    elements.planSummary.classList.add('muted');
    elements.planSummary.classList.remove('active');
  }

  elements.planSectionList.innerHTML = '';
  const sectionsById = new Map((plan?.sections || []).map((section) => [section.id, section]));

  SECTION_ORDER.forEach((sectionId) => {
    const metadata = SECTION_METADATA[sectionId];
    const sectionPlan = sectionsById.get(sectionId);
    const status = sectionPlan?.status || 'inactive';
    const commands = sectionPlan?.commands || [];
    const manualNotes = sectionPlan?.manualNotes || [];
    const executable = sectionPlan?.executable ?? false;

    const li = document.createElement('li');
    li.className = `section-card ${status}`;

    const header = document.createElement('div');
    header.className = 'section-header';

    const title = document.createElement('div');
    title.className = 'section-title-text';
    title.textContent = metadata.label;

    const statusChip = document.createElement('span');
    statusChip.className = `section-status-chip ${status}`;
    statusChip.textContent = status === 'pending'
      ? 'Pending approval'
      : status === 'completed'
        ? 'Completed'
        : 'Inactive';

    const hotkey = metadata.hotkey;
    const hotkeyEl = hotkey ? document.createElement('span') : null;
    if (hotkeyEl) {
      hotkeyEl.className = 'section-hotkey';
      hotkeyEl.textContent = hotkey;
    }

    header.appendChild(title);
    header.appendChild(statusChip);
    if (hotkeyEl) header.appendChild(hotkeyEl);

    li.appendChild(header);

    const description = document.createElement('p');
    description.className = 'section-reasoning';
    description.textContent = sectionPlan?.reasoning || metadata.description || '';
    li.appendChild(description);

    if (commands.length) {
      const list = document.createElement('ul');
      list.className = 'command-list';
      commands.forEach((command) => {
        const item = document.createElement('li');
        const label = executable ? command.description || command.messageType : `Review: ${command.description}`;
        item.textContent = label;
        list.appendChild(item);
      });
      li.appendChild(list);
    }

    manualNotes.forEach((note) => {
      const noteEl = document.createElement('div');
      noteEl.className = 'manual-note';
      noteEl.textContent = note.description || 'Manual review required';
      li.appendChild(noteEl);
    });

    elements.planSectionList.appendChild(li);
  });
}

async function loadAiSettings() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_AI_SETTINGS' });
    if (!response?.success) throw new Error(response?.error || 'Unable to load AI settings');

    state.aiSettings = response.settings;
    const { provider, openai } = state.aiSettings;

    elements.providerSelect.value = provider || 'openai';
    elements.openaiApiKey.value = openai?.apiKey || '';
    elements.openaiModel.value = openai?.model || '';
    elements.openaiTemperature.value = typeof openai?.temperature === 'number' ? openai.temperature : '';
    elements.settingsStatus.textContent = 'Settings loaded.';
  } catch (error) {
    console.error('SightFlow Sidebar: Failed to load AI settings', error);
    elements.settingsStatus.textContent = error.message || 'Unable to load AI settings.';
  }
}

async function saveAiSettings() {
  const provider = elements.providerSelect.value;
  const openai = {
    apiKey: elements.openaiApiKey.value.trim(),
    model: elements.openaiModel.value.trim() || undefined
  };

  const temperatureRaw = elements.openaiTemperature.value;
  if (temperatureRaw) {
    const parsed = Number(temperatureRaw);
    if (!Number.isNaN(parsed)) {
      openai.temperature = parsed;
    }
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'SAVE_AI_SETTINGS',
      settings: { provider, openai }
    });

    if (!response?.success) throw new Error(response?.error || 'Unable to save settings');

    state.aiSettings = response.settings;
    elements.settingsStatus.textContent = 'Settings saved.';
    showStatus('AI settings updated.', 'success');
  } catch (error) {
    console.error('SightFlow Sidebar: Save AI settings error', error);
    elements.settingsStatus.textContent = error.message || 'Failed to save settings.';
    showStatus('Failed to save AI settings', 'error');
  }
}

document.addEventListener('DOMContentLoaded', init);
