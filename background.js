// SightFlow Chrome Extension - Background Script
// Coordinates keyboard shortcuts, sidebar requests, AI planning, and content script messaging

const SECTION_DEFS = {
  history: {
    id: 'history',
    label: 'History',
    executable: true,
    hotkey: 'Alt+Shift+H',
    allowedMessageTypes: ['INSERT_HPI']
  },
  psfhros: {
    id: 'psfhros',
    label: 'PSFH/ROS',
    executable: true,
    hotkey: 'Alt+Shift+M',
    allowedMessageTypes: ['INSERT_PSFHROS']
  },
  vp: {
    id: 'vp',
    label: 'V & P',
    executable: false,
    allowedMessageTypes: ['MANUAL_ACTION']
  },
  exam: {
    id: 'exam',
    label: 'Exam',
    executable: false,
    allowedMessageTypes: ['MANUAL_ACTION']
  },
  imp_plan: {
    id: 'imp_plan',
    label: 'Imp/Plan',
    executable: false,
    allowedMessageTypes: ['MANUAL_ACTION']
  },
  follow_up: {
    id: 'follow_up',
    label: 'Follow Up',
    executable: false,
    allowedMessageTypes: ['MANUAL_ACTION']
  }
};

function deepClone(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

const DEFAULT_HISTORY_PAYLOAD = {
  ccGroupTitle: 'CC',
  ccTitle: 'Blurred Vision',
  location: 'OU',
  extendedHpi: 'Patient presents with blurry vision OU, despite the use of glasses, as well as increased glare. This has worsened over the past 6 months. The patient has been told he may have cataracts.',
  ensureMentalStatusExam: true
};

const DEFAULT_PSFHROS_PAYLOAD = {
  conditionsToSelect: ['Negative'],
  freeTextEntries: [],
  removeConditions: []
};

const COMMAND_REGISTRY = {
  'sf-insert-hpi': {
    messageType: 'INSERT_HPI',
    defaultPayload: DEFAULT_HISTORY_PAYLOAD
  },
  'sf-insert-psfhros': {
    messageType: 'INSERT_PSFHROS',
    defaultPayload: DEFAULT_PSFHROS_PAYLOAD
  }
};

const DEFAULT_AI_SETTINGS = {
  provider: 'openai',
  openai: {
    model: 'gpt-4o-mini',
    temperature: 0.1
  }
};

const PLAN_JSON_SCHEMA = {
  name: 'ClinicalPlan',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['sections'],
    properties: {
      summary: {
        type: 'string',
        description: 'Short summary of the plan for clinician review'
      },
      sections: {
        type: 'array',
        description: 'Sections to update',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'commands'],
          properties: {
            id: {
              type: 'string',
              enum: Object.keys(SECTION_DEFS)
            },
            reasoning: {
              type: 'string',
              description: 'Why this section should change'
            },
            commands: {
              type: 'array',
              items: {
                type: 'object',
                required: ['messageType', 'description'],
                additionalProperties: true,
                properties: {
                  messageType: {
                    type: 'string',
                    enum: ['INSERT_HPI', 'INSERT_PSFHROS', 'MANUAL_ACTION']
                  },
                  description: {
                    type: 'string',
                    description: 'Human-readable explanation of the command'
                  },
                  payload: {
                    type: 'object',
                    additionalProperties: true
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

const OPENAI_SYSTEM_PROMPT = `
You are SightFlow's clinical workflow planner for Nextech IntelleChart.
Given a de-identified clinical narrative you must determine which chart sections require updates.

Constraints:
- Only use section ids: history, psfhros, vp, exam, imp_plan, follow_up.
- Provide concise reasoning for each section you include.
- Return an array of commands per section. Each command must specify a messageType, description, and payload.
- Supported messageType values:
  * INSERT_HPI: payload must include "extendedHpi" (string). You may optionally include "ccTitle", "ccGroupTitle", "location", "ensureMentalStatusExam" (boolean), or "skipCcSelection" (boolean).
  * INSERT_PSFHROS: payload may include "conditionsToSelect" (array of strings as they appear in Nextech), "freeTextEntries" (array of strings for manual insert), and "removeConditions" (array).
  * MANUAL_ACTION: use when automation is not available. payload should include "note" summarizing what the clinician should do manually.
- Prefer INSERT_PSFHROS when you want to add or update PMHx/PSFH/ROS content that maps to known conditions (e.g., "Diverticulosis").
- Keep payloads tightly scoped to the changes required; do not repeat the entire narrative.
- Omit sections that do not require changes.
- Respond with JSON only, conforming to the provided schema.
`.trim();

chrome.commands.onCommand.addListener(async (command) => {
  console.log('SightFlow: Command received:', command);
  try {
    await executeCommandOnActiveTab(command);
  } catch (err) {
    console.error('SightFlow: Failed to execute command from shortcut', err);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message?.type) return undefined;

  switch (message.type) {
    case 'EXECUTE_COMMAND':
      handleExecuteCommand(message, sendResponse);
      return true;
    case 'SAVE_AI_SETTINGS':
      handleSaveAiSettings(message, sendResponse);
      return true;
    case 'GET_AI_SETTINGS':
      handleGetAiSettings(sendResponse);
      return true;
    case 'GET_OR_CREATE_PATIENT_ALIAS':
      handleGetOrCreatePatientAlias(message, sendResponse);
      return true;
    case 'PROCESS_CLINICAL_TEXT':
      handleProcessClinicalText(message, sendResponse);
      return true;
    case 'EXECUTE_PLAN':
      handleExecutePlan(message, sendResponse);
      return true;
    default:
      return undefined;
  }
});

async function executeCommandOnActiveTab(commandName, payloadOverride = {}) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error('No active tab found');
  }
  await executeCommandOnTab(tab.id, commandName, payloadOverride);
}

async function executeCommandOnTab(tabId, commandName, payloadOverride = {}) {
  const registryEntry = COMMAND_REGISTRY[commandName];
  if (!registryEntry) {
    throw new Error(`Unknown command "${commandName}"`);
  }
  const payload = {
    ...registryEntry.defaultPayload,
    ...payloadOverride
  };
  const message = buildCommandMessage(registryEntry.messageType, payload);
  console.log('SightFlow: Sending message to tab', tabId, message);
  await chrome.tabs.sendMessage(tabId, message);
}

function buildCommandMessage(messageType, payload) {
  if (messageType === 'INSERT_HPI') {
    return {
      type: 'INSERT_HPI',
      payload,
      extendedhpi_text: payload.extendedHpi
    };
  }
  if (messageType === 'INSERT_PSFHROS') {
    const freeText = Array.isArray(payload.freeTextEntries) ? payload.freeTextEntries[0] : undefined;
    return {
      type: 'INSERT_PSFHROS',
      payload,
      psfhros_text: freeText
    };
  }
  return { type: messageType, payload };
}

function handleExecuteCommand(message, sendResponse) {
  const { command, tabId, payload } = message;
  if (!tabId) {
    sendResponse({ success: false, error: 'No tabId provided' });
    return;
  }

  executeCommandOnTab(tabId, command, payload)
    .then(() => sendResponse({ success: true }))
    .catch((error) => {
      console.error('SightFlow: Failed to execute command', error);
      sendResponse({ success: false, error: error.message });
    });
}

function handleSaveAiSettings(message, sendResponse) {
  const incoming = message.settings || {};

  const merged = mergeAiSettings(incoming);
  chrome.storage.local.set({ aiSettings: merged })
    .then(() => {
      sendResponse({ success: true, settings: merged });
    })
    .catch((error) => {
      console.error('SightFlow: Failed to save AI settings', error);
      sendResponse({ success: false, error: error.message });
    });
}

function handleGetAiSettings(sendResponse) {
  getAiSettings()
    .then((settings) => sendResponse({ success: true, settings }))
    .catch((error) => {
      console.error('SightFlow: Failed to load AI settings', error);
      sendResponse({ success: false, error: error.message });
    });
}

function handleGetOrCreatePatientAlias(message, sendResponse) {
  const patientContext = message.patientContext;
  if (!patientContext) {
    sendResponse({ success: false, error: 'Missing patient context' });
    return;
  }

  getOrCreatePatientAlias(patientContext)
    .then((result) => sendResponse({ success: true, ...result }))
    .catch((error) => {
      console.error('SightFlow: Failed to get patient alias', error);
      sendResponse({ success: false, error: error.message });
    });
}

function handleProcessClinicalText(message, sendResponse) {
  const { rawText, patientAlias, provider } = message;
  if (!rawText?.trim()) {
    sendResponse({ success: false, error: 'No clinical text provided' });
    return;
  }

  processClinicalText(rawText, patientAlias, provider)
    .then((plan) => sendResponse({ success: true, plan }))
    .catch((error) => {
      console.error('SightFlow: AI planning failed', error);
      sendResponse({
        success: false,
        error: error.message,
        details: error.details || null
      });
    });
}

function handleExecutePlan(message, sendResponse) {
  const { plan, tabId } = message;
  if (!tabId) {
    sendResponse({ success: false, error: 'Missing tabId' });
    return;
  }
  if (!plan?.sections?.length) {
    sendResponse({ success: false, error: 'No sections to execute' });
    return;
  }

  executePlanOnTab(plan, tabId)
    .then((result) => sendResponse({ success: true, ...result }))
    .catch((error) => {
      console.error('SightFlow: Failed to execute plan on tab', error);
      sendResponse({ success: false, error: error.message });
    });
}

async function executePlanOnTab(plan, tabId) {
  const executed = [];
  const skipped = [];

  for (const section of plan.sections) {
    const sectionDef = SECTION_DEFS[section.id];
    if (!sectionDef) continue;

    const commands = Array.isArray(section.commands) ? section.commands : [];
    for (const command of commands) {
      if (!command?.messageType) {
        skipped.push({ sectionId: section.id, reason: 'Missing messageType' });
        continue;
      }

      if (!sectionDef.allowedMessageTypes.includes(command.messageType)) {
        skipped.push({ sectionId: section.id, reason: `Command ${command.messageType} not allowed for section` });
        continue;
      }

      if (command.messageType === 'MANUAL_ACTION') {
        skipped.push({ sectionId: section.id, reason: 'Manual action' });
        continue;
      }

      try {
        const message = buildCommandMessage(command.messageType, command.payload || {});
        await chrome.tabs.sendMessage(tabId, message);
        await delay(400);
        executed.push({ sectionId: section.id, messageType: command.messageType });
      } catch (error) {
        console.error('SightFlow: Failed to execute command in plan', section.id, command, error);
        skipped.push({ sectionId: section.id, reason: error.message });
      }
    }
  }

  return { executed, skipped };
}

async function getAiSettings() {
  const stored = (await chrome.storage.local.get('aiSettings')).aiSettings;
  if (!stored) {
    const merged = deepClone(DEFAULT_AI_SETTINGS);
    await chrome.storage.local.set({ aiSettings: merged });
    return merged;
  }
  return mergeAiSettings(stored);
}

function mergeAiSettings(incoming) {
  const result = deepClone(DEFAULT_AI_SETTINGS);
  if (!incoming) return result;

  if (incoming.provider) {
    result.provider = incoming.provider;
  }
  result.openai = {
    ...DEFAULT_AI_SETTINGS.openai,
    ...(incoming.openai || {})
  };
  return result;
}

async function getOrCreatePatientAlias(patientContext) {
  const key = 'patientAliasMap';
  const store = await chrome.storage.local.get(key);
  const aliasMap = store[key] || {};

  if (!aliasMap[patientContext]) {
    aliasMap[patientContext] = generateAlias();
    await chrome.storage.local.set({ [key]: aliasMap });
  }

  return {
    alias: aliasMap[patientContext],
    patientContext
  };
}

function generateAlias() {
  const random = crypto.randomUUID().split('-')[0].toUpperCase();
  const timestampPart = Date.now().toString(36).toUpperCase();
  return `SF-${timestampPart}-${random}`;
}

async function processClinicalText(rawText, patientAlias, providerOverride) {
  const settings = await getAiSettings();
  const provider = providerOverride || settings.provider || 'openai';

  if (provider !== 'openai') {
    const error = new Error(`Provider "${provider}" is not implemented yet`);
    error.details = { provider };
    throw error;
  }

  return processWithOpenAi(rawText, patientAlias, settings.openai);
}

async function processWithOpenAi(rawText, patientAlias, openaiSettings) {
  const apiKey = openaiSettings.apiKey;
  if (!apiKey) {
    const error = new Error('OpenAI API key is not configured');
    error.details = { missing: 'openai.apiKey' };
    throw error;
  }

  const requestPayload = {
    model: openaiSettings.model || DEFAULT_AI_SETTINGS.openai.model,
    temperature: typeof openaiSettings.temperature === 'number'
      ? openaiSettings.temperature
      : DEFAULT_AI_SETTINGS.openai.temperature,
    response_format: {
      type: 'json_schema',
      json_schema: PLAN_JSON_SCHEMA
    },
    messages: buildOpenAiMessages(rawText, patientAlias)
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestPayload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    const error = new Error(`OpenAI request failed: ${response.status}`);
    error.details = { responseText: errorText };
    throw error;
  }

  const json = await response.json();
  let content = json.choices?.[0]?.message?.content;
  if (Array.isArray(content)) {
    content = content.map((c) => c?.text || '').join('').trim();
  }
  if (typeof content !== 'string') {
    const error = new Error('Unexpected OpenAI response format');
    error.details = { response: json };
    throw error;
  }

  let rawPlan;
  try {
    rawPlan = JSON.parse(content);
  } catch (parseError) {
    const error = new Error('Failed to parse OpenAI response JSON');
    error.details = { content };
    throw error;
  }

  return sanitizePlan(rawPlan, {
    provider: 'openai',
    model: requestPayload.model,
    patientAlias
  });
}

function buildOpenAiMessages(rawText, patientAlias) {
  const trimmed = rawText.trim();
  return [
    {
      role: 'system',
      content: OPENAI_SYSTEM_PROMPT
    },
    {
      role: 'user',
      content: [
        `Patient alias: ${patientAlias || 'UNKNOWN'}`,
        'Clinical narrative:',
        '"""',
        trimmed,
        '"""',
        '',
        'Respond with JSON only.'
      ].join('\n')
    }
  ];
}

function sanitizePlan(rawPlan, meta = {}) {
  const summary = typeof rawPlan?.summary === 'string' ? rawPlan.summary : '';
  const sectionsInput = Array.isArray(rawPlan?.sections) ? rawPlan.sections : [];

  const sections = [];
  for (const section of sectionsInput) {
    const sectionDef = SECTION_DEFS[section.id];
    if (!sectionDef) continue;

    const commandsInput = Array.isArray(section.commands) ? section.commands : [];
    const commands = [];
    const manualNotes = [];
    for (const command of commandsInput) {
      if (!command?.messageType) continue;

      if (!sectionDef.allowedMessageTypes.includes(command.messageType)) {
        manualNotes.push({
          description: command.description || 'Unsupported command',
          payload: command.payload || {},
          reason: 'messageType not allowed for section'
        });
        continue;
      }

      if (command.messageType === 'MANUAL_ACTION') {
        manualNotes.push({
          description: command.description || 'Manual follow-up required',
          payload: command.payload || {}
        });
        continue;
      }

      commands.push({
        messageType: command.messageType,
        description: command.description || '',
        payload: command.payload || {}
      });
    }

    sections.push({
      id: sectionDef.id,
      label: sectionDef.label,
      reasoning: section.reasoning || '',
      commands,
      manualNotes,
      status: commands.length > 0 || manualNotes.length > 0 ? 'pending' : 'inactive',
      executable: sectionDef.executable,
      hotkey: sectionDef.hotkey || null
    });
  }

  return {
    summary,
    sections,
    meta
  };
}

function delay(ms = 300) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
