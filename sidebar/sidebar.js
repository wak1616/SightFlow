const SECTION_DEFINITIONS = [
  { key: 'history', label: 'History', hotkey: 'Alt+Shift+H', description: 'HPI, CC, Mental Status' },
  { key: 'psfhros', label: 'PSFH/ROS', hotkey: 'Alt+Shift+M', description: 'Past Medical History & ROS' },
  { key: 'vp', label: 'V & P', description: 'Vitals & Procedures' },
  { key: 'exam', label: 'Exam', description: 'Objective findings' },
  { key: 'impressionPlan', label: 'Imp/Plan', description: 'Assessment & Plan' },
  { key: 'followUp', label: 'Follow Up', description: 'Disposition & reminders' }
];

const SUPPORTED_COMMANDS = {
  history: 'updateExtendedHpi',
  psfhros: 'updatePmHxConditions'
};

const state = {
  recording: false,
  mediaRecorder: null,
  mediaStream: null,
  audioChunks: [],
  transcript: '',
  plan: createEmptyPlan(),
  planMetadata: null,
  patientContext: null,
  elements: {}
};

document.addEventListener('DOMContentLoaded', initializeSidebar);

function initializeSidebar() {
  cacheDomElements();
  attachEventListeners();
  refreshTranscriptUI('');
  refreshPlanUI();
  loadAssistantConfig();
  console.log('SightFlow Sidebar: Initialized');
}

function cacheDomElements() {
  state.elements.listenButton = document.getElementById('listen-button');
  state.elements.recordingIndicator = document.getElementById('recording-indicator');
  state.elements.transcriptInput = document.getElementById('transcript-input');
  state.elements.sendToAiButton = document.getElementById('send-to-ai-button');
  state.elements.clearTranscriptButton = document.getElementById('clear-transcript-button');
  state.elements.sectionsContainer = document.getElementById('sections-container');
  state.elements.sectionCards = mapSectionElements('.section-card');
  state.elements.sectionEditors = mapSectionElements('.section-editor');
  state.elements.sectionStatuses = mapSectionElements('.section-status', 'status');
  state.elements.sectionChips = mapSectionElements('.section-chip-row', 'chips');
  state.elements.sectionRationales = mapSectionElements('.section-rationale', 'rationale');
  state.elements.sendToNextechButton = document.getElementById('send-to-nextech-button');
  state.elements.statusMessage = document.getElementById('status-message');
  state.elements.planProviderLabel = document.getElementById('plan-provider-label');
  state.elements.planContextLabel = document.getElementById('plan-context-label');
  state.elements.toggleSettingsButton = document.getElementById('toggle-settings-button');
  state.elements.settingsPanel = document.getElementById('settings-panel');
  state.elements.saveSettingsButton = document.getElementById('save-settings-button');
  state.elements.providerSelect = document.getElementById('provider-select');
  state.elements.openaiApiKeyInput = document.getElementById('openai-api-key');
  state.elements.openaiLlmModelInput = document.getElementById('openai-llm-model');
  state.elements.openaiSttModelInput = document.getElementById('openai-stt-model');
}

function mapSectionElements(selector, keyName = 'editor') {
  const map = new Map();
  document.querySelectorAll(selector).forEach((element) => {
    const { section } = element.dataset;
    if (!section) return;
    map.set(section, element);
  });
  return map;
}

function attachEventListeners() {
  state.elements.listenButton.addEventListener('click', toggleRecording);
  state.elements.transcriptInput.addEventListener('input', handleTranscriptChange);
  state.elements.sendToAiButton.addEventListener('click', handleSendToAi);
  state.elements.clearTranscriptButton.addEventListener('click', clearTranscript);
  state.elements.sendToNextechButton.addEventListener('click', handleSendToNextech);
  state.elements.saveSettingsButton.addEventListener('click', saveAssistantConfig);
  state.elements.toggleSettingsButton.addEventListener('click', toggleSettingsPanel);

  state.elements.sectionsContainer.addEventListener('click', (event) => {
    const target = event.target;
    if (target.dataset.role === 'remove-chip') {
      event.preventDefault();
      removeChip(target.dataset.section, target.dataset.chipType, target.dataset.chipValue);
    }
  });

  state.elements.sectionEditors.forEach((editor, sectionKey) => {
    editor.addEventListener('input', (event) => {
      handleSectionEditorChange(sectionKey, event.target.value);
    });
  });
}

function createEmptyPlan() {
  const sections = {};
  SECTION_DEFINITIONS.forEach((section) => {
    sections[section.key] = {
      pending: false,
      status: 'idle',
      summary: '',
      rationale: '',
      commands: []
    };
  });
  return { sections, summary: '', warnings: [] };
}

async function toggleRecording() {
  if (state.recording) {
    stopRecording();
  } else {
    await startRecording();
  }
}

async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia) {
    showStatus('error', 'Microphone access is not supported in this browser context.');
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.mediaStream = stream;
    const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? { mimeType: 'audio/webm;codecs=opus' }
      : undefined;
    const recorder = new MediaRecorder(stream, options);
    state.audioChunks = [];
    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) {
        state.audioChunks.push(event.data);
      }
    });
    recorder.addEventListener('stop', handleRecordingStop);
    recorder.start();
    state.mediaRecorder = recorder;
    state.recording = true;
    updateRecordingUI();
  } catch (error) {
    console.error('SightFlow Sidebar: Unable to start recording', error);
    showStatus('error', `Microphone access denied: ${error.message}`);
  }
}

function stopRecording() {
  if (!state.recording || !state.mediaRecorder) {
    return;
  }
  state.mediaRecorder.stop();
  state.recording = false;
  updateRecordingUI();
}

async function handleRecordingStop() {
  try {
    const blob = new Blob(state.audioChunks, {
      type: state.mediaRecorder?.mimeType || 'audio/webm'
    });
    cleanupMediaStream();
    const base64Audio = await blobToBase64(blob);
    const { tabId, context } = await getActiveTabContext();
    const response = await sendMessage({
      type: 'PROCESS_SPEECH_TO_TEXT',
      audio: { base64: base64Audio, mimeType: blob.type },
      context
    });
    if (response?.success && response.transcript) {
      appendTranscript(response.transcript.trim());
      showStatus('success', 'Speech captured and transcribed.');
    } else {
      const errorMessage = response?.error || 'Unable to transcribe audio.';
      showStatus('error', errorMessage);
    }
  } catch (error) {
    console.error('SightFlow Sidebar: Speech capture failed', error);
    showStatus('error', `Speech capture failed: ${error.message}`);
  } finally {
    cleanupMediaStream();
    updateRecordingUI();
  }
}

function cleanupMediaStream() {
  if (state.mediaStream) {
    state.mediaStream.getTracks().forEach((track) => track.stop());
  }
  state.mediaStream = null;
  state.mediaRecorder = null;
  state.audioChunks = [];
}

function updateRecordingUI() {
  if (!state.elements.listenButton) return;
  if (state.recording) {
    state.elements.listenButton.classList.add('is-recording');
    state.elements.listenButton.querySelector('.button-label').textContent = 'Stop Listening';
    state.elements.recordingIndicator.classList.remove('hidden');
  } else {
    state.elements.listenButton.classList.remove('is-recording');
    state.elements.listenButton.querySelector('.button-label').textContent = 'Start Listening';
    state.elements.recordingIndicator.classList.add('hidden');
  }
}

function handleTranscriptChange(event) {
  const value = typeof event === 'string' ? event : event.target.value;
  state.transcript = value;
  updateSendToAiAvailability();
}

function appendTranscript(newText) {
  if (!newText) return;
  state.transcript = state.transcript ? `${state.transcript.trim()}\n${newText}` : newText;
  refreshTranscriptUI(state.transcript);
  updateSendToAiAvailability();
}

function refreshTranscriptUI(value) {
  state.elements.transcriptInput.value = value;
}

function clearTranscript() {
  state.transcript = '';
  refreshTranscriptUI('');
  updateSendToAiAvailability();
}

function updateSendToAiAvailability() {
  const hasContent = Boolean(state.transcript.trim());
  state.elements.sendToAiButton.disabled = !hasContent;
}

async function handleSendToAi() {
  if (!state.transcript.trim()) {
    showStatus('error', 'Add encounter text before sending to the assistant.');
    return;
  }

  setButtonLoading(state.elements.sendToAiButton, true);
  showStatus('info', 'Analyzing encounter with assistant…');

  try {
    const { tabId, context } = await getActiveTabContext();
    state.patientContext = context;
    const response = await sendMessage({
      type: 'RUN_LLM_ANALYSIS',
      transcript: state.transcript,
      context,
      sections: SECTION_DEFINITIONS.map((section) => section.key)
    });

    if (!response?.success) {
      throw new Error(response?.error || 'Assistant failed to analyze encounter.');
    }

    state.plan = response.plan ?? createEmptyPlan();
    state.planMetadata = response.metadata ?? null;
    refreshPlanUI();

    const providerLabel = response.metadata?.provider === 'openai'
      ? `Plan source: OpenAI (${response.metadata?.model || 'model not set'})`
      : 'Plan source: Heuristic parser';

    const statusMessage = response.plan?.summary || 'Assistant plan ready for review.';
    showStatus('success', statusMessage);
    updatePlanProviderLabel(providerLabel, response.metadata?.warnings || []);
    updatePlanContextLabel(response.metadata?.patientId || null);
  } catch (error) {
    console.error('SightFlow Sidebar: Failed to run assistant analysis', error);
    showStatus('error', `Assistant error: ${error.message}`);
  } finally {
    setButtonLoading(state.elements.sendToAiButton, false);
  }
}

async function handleSendToNextech() {
  if (!planHasRunnableCommands(state.plan)) {
    showStatus('error', 'No pending actions available to send.');
    return;
  }

  setButtonLoading(state.elements.sendToNextechButton, true);
  showStatus('info', 'Sending approved actions to Nextech…');

  try {
    const { tabId } = await getActiveTabContext();
    const response = await sendMessage({
      type: 'APPLY_PENDING_ACTIONS',
      plan: state.plan,
      tabId
    });

    if (!response?.success) {
      throw new Error(response?.error || 'Failed to apply plan to Nextech.');
    }

    const appliedCount = response.applied?.length || 0;
    const warningDetails = response.warnings?.length ? `\n${response.warnings.join('\n')}` : '';
    showStatus(
      warningDetails ? 'warning' : 'success',
      appliedCount
        ? `Applied ${appliedCount} action(s) to Nextech.${warningDetails ? `\n${warningDetails}` : ''}`
        : `No automated actions were executed.${warningDetails ? `\n${warningDetails}` : ''}`
    );

    state.plan = createEmptyPlan();
    refreshPlanUI();
  } catch (error) {
    console.error('SightFlow Sidebar: Failed to send plan to Nextech', error);
    showStatus('error', `Failed to apply plan: ${error.message}`);
  } finally {
    setButtonLoading(state.elements.sendToNextechButton, false);
  }
}

function refreshPlanUI() {
  refreshPlanPendingStates();

  SECTION_DEFINITIONS.forEach((section) => {
    const sectionData = state.plan.sections?.[section.key] ?? {
      pending: false,
      summary: '',
      rationale: '',
      commands: []
    };

    const card = state.elements.sectionCards.get(section.key);
    const statusLabel = state.elements.sectionStatuses.get(section.key);
    const editor = state.elements.sectionEditors.get(section.key);
    const chipsContainer = state.elements.sectionChips.get(section.key);
    const rationale = state.elements.sectionRationales.get(section.key);

    if (!card || !statusLabel || !editor) return;

    const displayData = deriveSectionDisplay(section.key, sectionData);

    card.classList.toggle('pending', sectionData.pending && displayData.hasCommandData);
    statusLabel.textContent =
      sectionData.pending && displayData.hasCommandData ? 'Pending' : 'Idle';

    editor.value = displayData.text ?? '';
    editor.disabled = !displayData.isEditable;

    renderSectionChips(chipsContainer, section.key, displayData.chips);
    rationale.textContent = displayData.rationale || '';
  });

  state.elements.sendToNextechButton.disabled = !planHasRunnableCommands(state.plan);
}

function deriveSectionDisplay(sectionKey, sectionData) {
  const display = {
    text: '',
    chips: [],
    rationale: sectionData.rationale ?? sectionData.summary ?? '',
    isEditable: false,
    hasCommandData: false
  };

  const command = findSupportedCommand(sectionKey, sectionData.commands);

  if (!command) {
    return display;
  }

  display.hasCommandData = true;

  if (sectionKey === 'history' && command.payload) {
    const text = command.payload.text ?? command.payload.extendedHpi ?? '';
    display.text = text;
    display.isEditable = true;
  }

  if (sectionKey === 'psfhros' && command.payload) {
    const select = Array.isArray(command.payload.select) ? command.payload.select : [];
    const freeText = Array.isArray(command.payload.freeText) ? command.payload.freeText : [];
    display.chips = [
      ...select.map((item) => ({ label: item, type: 'select' })),
      ...freeText.map((item) => ({ label: item, type: 'freeText' }))
    ];
    display.text = command.payload.note ?? '';
    display.isEditable = true;
  }

  if (!display.text && sectionData.summary) {
    display.text = sectionData.summary;
  }

  return display;
}

function renderSectionChips(container, sectionKey, chips) {
  if (!container) return;
  container.innerHTML = '';
  chips.forEach((chip) => {
    const chipElement = document.createElement('span');
    chipElement.className = `section-chip${chip.type === 'freeText' ? ' free-text' : ''}`;
    chipElement.textContent = chip.label;
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.dataset.role = 'remove-chip';
    removeButton.dataset.section = sectionKey;
    removeButton.dataset.chipType = chip.type;
    removeButton.dataset.chipValue = chip.label;
    removeButton.setAttribute('aria-label', `Remove ${chip.label}`);
    removeButton.textContent = '×';
    chipElement.appendChild(removeButton);
    container.appendChild(chipElement);
  });
}

function handleSectionEditorChange(sectionKey, value) {
  const commandType = SUPPORTED_COMMANDS[sectionKey];
  if (!commandType) return;
  const command = ensureSectionCommand(sectionKey, commandType);
  if (!command) return;
  if (sectionKey === 'history') {
    command.payload = { ...(command.payload || {}), text: value };
  } else if (sectionKey === 'psfhros') {
    command.payload = { ...(command.payload || {}), note: value };
  }
  refreshPlanPendingStates();
  refreshPlanUI();
}

function removeChip(sectionKey, chipType, chipValue) {
  const commandType = SUPPORTED_COMMANDS[sectionKey];
  if (!commandType) return;
  const command = ensureSectionCommand(sectionKey, commandType);
  if (!command?.payload) return;

  const payloadKey = chipType === 'freeText' ? 'freeText' : 'select';
  const list = Array.isArray(command.payload[payloadKey])
    ? [...command.payload[payloadKey]]
    : [];
  const index = list.findIndex((item) => item === chipValue);
  if (index !== -1) {
    list.splice(index, 1);
    command.payload[payloadKey] = list;
    refreshPlanPendingStates();
    refreshPlanUI();
  }
}

function refreshPlanPendingStates() {
  SECTION_DEFINITIONS.forEach((section) => {
    const sectionPlan = state.plan.sections[section.key];
    if (!sectionPlan) return;
    const command = findSupportedCommand(section.key, sectionPlan.commands);
    let hasData = false;
    if (section.key === 'history' && command?.payload) {
      hasData = Boolean((command.payload.text || '').trim());
    } else if (section.key === 'psfhros' && command?.payload) {
      const selections = command.payload.select || [];
      const freeText = command.payload.freeText || [];
      hasData =
        (Array.isArray(selections) && selections.length > 0) ||
        (Array.isArray(freeText) && freeText.length > 0) ||
        Boolean((command.payload.note || '').trim());
    }
    sectionPlan.pending = hasData;
    sectionPlan.status = hasData ? 'pending' : 'idle';
  });
}

function planHasRunnableCommands(plan) {
  return SECTION_DEFINITIONS.some((section) => {
    const command = findSupportedCommand(section.key, plan.sections?.[section.key]?.commands);
    if (!command) return false;
    if (section.key === 'history') {
      return Boolean((command.payload?.text || '').trim());
    }
    if (section.key === 'psfhros') {
      const payload = command.payload || {};
      const hasSelections = Array.isArray(payload.select) && payload.select.length > 0;
      const hasFreeText = Array.isArray(payload.freeText) && payload.freeText.length > 0;
      const hasNote = Boolean((payload.note || '').trim());
      return hasSelections || hasFreeText || hasNote;
    }
    return false;
  });
}

function findSupportedCommand(sectionKey, commands) {
  if (!Array.isArray(commands) || !SUPPORTED_COMMANDS[sectionKey]) return null;
  return commands.find((command) => command.type === SUPPORTED_COMMANDS[sectionKey]) || null;
}

function ensureSectionCommand(sectionKey, commandType) {
  if (!state.plan.sections[sectionKey]) {
    state.plan.sections[sectionKey] = { pending: false, status: 'idle', commands: [] };
  }
  let command = state.plan.sections[sectionKey].commands.find((cmd) => cmd.type === commandType);
  if (!command) {
    command = { type: commandType, payload: {} };
    state.plan.sections[sectionKey].commands.push(command);
  }
  return command;
}

function updatePlanProviderLabel(label, warnings) {
  if (!state.elements.planProviderLabel) return;
  state.elements.planProviderLabel.textContent = label || '';
  if (warnings?.length) {
    showStatus('warning', warnings.join('\n'));
  }
}

function updatePlanContextLabel(patientId) {
  if (!state.elements.planContextLabel) return;
  state.elements.planContextLabel.textContent = patientId ? `Chart ID: ${patientId}` : '';
}

function toggleSettingsPanel() {
  const expanded =
    state.elements.toggleSettingsButton.getAttribute('aria-expanded') === 'true';
  const nextExpanded = !expanded;
  state.elements.toggleSettingsButton.setAttribute('aria-expanded', String(nextExpanded));
  state.elements.settingsPanel.classList.toggle('expanded', nextExpanded);
  state.elements.settingsPanel.classList.toggle('collapsed', !nextExpanded);
}

async function loadAssistantConfig() {
  const response = await sendMessage({ type: 'GET_ASSISTANT_CONFIG' });
  if (!response?.success || !response.config) {
    showStatus('warning', 'Assistant settings not loaded. Using defaults.');
    return;
  }
  const { provider, openai } = response.config;
  state.elements.providerSelect.value = provider || 'openai';
  if (openai) {
    state.elements.openaiApiKeyInput.value = openai.apiKey || '';
    state.elements.openaiLlmModelInput.value = openai.llmModel || 'gpt-4o-mini';
    state.elements.openaiSttModelInput.value = openai.sttModel || 'gpt-4o-mini-transcribe';
  }
}

async function saveAssistantConfig() {
  const config = {
    provider: state.elements.providerSelect.value,
    openai: {
      apiKey: state.elements.openaiApiKeyInput.value.trim(),
      llmModel: state.elements.openaiLlmModelInput.value.trim() || 'gpt-4o-mini',
      sttModel: state.elements.openaiSttModelInput.value.trim() || 'gpt-4o-mini-transcribe'
    }
  };

  setButtonLoading(state.elements.saveSettingsButton, true);
  try {
    const response = await sendMessage({ type: 'SAVE_ASSISTANT_CONFIG', config });
    if (!response?.success) {
      throw new Error(response?.error || 'Unable to save assistant configuration.');
    }
    showStatus('success', 'Assistant settings saved.');
  } catch (error) {
    console.error('SightFlow Sidebar: Failed to save assistant settings', error);
    showStatus('error', `Failed to save settings: ${error.message}`);
  } finally {
    setButtonLoading(state.elements.saveSettingsButton, false);
  }
}

function setButtonLoading(button, isLoading) {
  if (!button) return;
  if (isLoading) {
    button.dataset.originalText = button.textContent;
    button.dataset.originalDisabled = String(button.disabled);
    button.textContent = 'Working…';
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    const restoreDisabled = button.dataset.originalDisabled === 'true';
    button.disabled = restoreDisabled;
  }
}

function showStatus(type, message) {
  if (!state.elements.statusMessage || !message) return;
  const className = `status-message show ${type}`;
  state.elements.statusMessage.className = className;
  state.elements.statusMessage.textContent = message;
  clearTimeout(state.elements.statusTimeout);
  state.elements.statusTimeout = setTimeout(() => {
    state.elements.statusMessage.className = 'status-message';
  }, 6000);
}

async function getActiveTabContext() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) {
    throw new Error('No active tab detected.');
  }

  const context = await requestPatientContext(tab.id);
  return { tabId: tab.id, context };
}

function requestPatientContext(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(
      tabId,
      { type: 'REQUEST_CONTEXT' },
      (response) => {
        if (chrome.runtime.lastError) {
          resolve(null);
        } else {
          resolve(response?.context ?? null);
        }
      }
    );
  });
}

function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ success: false, error: chrome.runtime.lastError.message });
      } else {
        resolve(response);
      }
    });
  });
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
