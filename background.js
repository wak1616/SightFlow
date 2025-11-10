const SECTION_DEFINITIONS = [
  { key: 'history', label: 'History', command: 'sf-insert-hpi', hotkey: 'Alt+Shift+H' },
  { key: 'psfhros', label: 'PSFH/ROS', command: 'sf-insert-psfhros', hotkey: 'Alt+Shift+M' },
  { key: 'vp', label: 'V & P' },
  { key: 'exam', label: 'Exam' },
  { key: 'impressionPlan', label: 'Imp/Plan' },
  { key: 'followUp', label: 'Follow Up' }
];

const DEFAULT_ASSISTANT_CONFIG = {
  provider: 'openai',
  openai: {
    llmModel: 'gpt-4o-mini',
    sttModel: 'gpt-4o-mini-transcribe',
    apiKey: ''
  }
};

const KNOWN_PMH_CONDITIONS = [
  'Hypertension',
  'Diabetes Type II',
  'Diabetes Type 2',
  'Diverticulosis',
  'Glaucoma',
  'Cataracts',
  'Hyperlipidemia',
  'Asthma'
];

const DEFAULT_COMMAND_PAYLOADS = {
  'sf-insert-hpi': {
    extendedHpi:
      'Patient presents with blurry vision OU, despite the use of glasses, as well as increased glare. This has worsened over the past 6 months. The patient has been told he may have cataracts.',
    ccOptionTitle: 'Blurred Vision',
    locationTitle: 'OU',
    autoCheckMentalStatus: true,
    mentalStatusLabel: 'Mental Status Exam'
  },
  'sf-insert-psfhros': {
    conditions: { select: ['Negative'], freeText: [] },
    note: ''
  }
};

const COMMAND_TO_MESSAGE_TYPE = {
  'sf-insert-hpi': 'INSERT_HPI',
  'sf-insert-psfhros': 'INSERT_PSFHROS'
};

const SUPPORTED_SECTION_COMMANDS = {
  history: {
    updateExtendedHpi: async ({ tabId, payload }) =>
      sendTabMessage(tabId, {
        type: 'INSERT_HPI',
        payload: {
          extendedHpi: payload.text ?? payload.extendedHpi ?? '',
          ccOptionTitle:
            payload.cc ??
            payload.chiefComplaint ??
            DEFAULT_COMMAND_PAYLOADS['sf-insert-hpi'].ccOptionTitle,
          locationTitle: payload.location ?? DEFAULT_COMMAND_PAYLOADS['sf-insert-hpi'].locationTitle,
          autoCheckMentalStatus:
            payload.autoCheckMentalStatus ?? DEFAULT_COMMAND_PAYLOADS['sf-insert-hpi'].autoCheckMentalStatus,
          mentalStatusLabel:
            payload.mentalStatusLabel ?? DEFAULT_COMMAND_PAYLOADS['sf-insert-hpi'].mentalStatusLabel
        },
        extendedhpi_text: payload.text ?? payload.extendedHpi ?? ''
      })
  },
  psfhros: {
    updatePmHxConditions: async ({ tabId, payload }) =>
      sendTabMessage(tabId, {
        type: 'INSERT_PSFHROS',
        payload: {
          conditions: {
            select: payload.select ?? [],
            freeText: payload.freeText ?? []
          },
          note: payload.note ?? ''
        },
        psfhros_text: payload.note ?? '',
        conditionsToSelect: payload.select ?? []
      })
  }
};

const OPENAI_PLAN_SCHEMA = {
  type: 'json_schema',
  json_schema: {
    name: 'sightflow_plan',
    strict: false,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        summary: { type: 'string', description: 'One-line summary of recommended updates.' },
        warnings: {
          type: 'array',
          items: { type: 'string' }
        },
        sections: {
          type: 'object',
          additionalProperties: false,
          properties: SECTION_DEFINITIONS.reduce((acc, section) => {
            acc[section.key] = {
              type: 'object',
              additionalProperties: false,
              properties: {
                pending: { type: 'boolean' },
                summary: { type: 'string' },
                rationale: { type: 'string' },
                commands: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      type: { type: 'string' },
                      description: { type: 'string' },
                      payload: { type: 'object' }
                    },
                    required: ['type']
                  }
                }
              },
              required: ['pending']
            };
            return acc;
          }, {})
        }
      },
      required: ['sections']
    }
  }
};

chrome.commands.onCommand.addListener(async (command) => {
  try {
    console.log('SightFlow: Command received:', command);
    const tabId = await getActiveTabId();
    if (!tabId) {
      console.warn('SightFlow: No active tab found for command execution');
      return;
    }
    await dispatchCommand(tabId, command, {});
  } catch (error) {
    console.error('SightFlow: Command execution failed', error);
  }
});

const MESSAGE_HANDLERS = {
  EXECUTE_COMMAND: handleExecuteCommand,
  PROCESS_SPEECH_TO_TEXT: handleSpeechToText,
  RUN_LLM_ANALYSIS: handleRunLlmAnalysis,
  APPLY_PENDING_ACTIONS: handleApplyPendingActions,
  GET_ASSISTANT_CONFIG: handleGetAssistantConfig,
  SAVE_ASSISTANT_CONFIG: handleSaveAssistantConfig
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handler = MESSAGE_HANDLERS[message.type];
  if (!handler) {
    return false;
  }

  handler(message, sender)
    .then((result) => sendResponse(result))
    .catch((error) => {
      console.error(`SightFlow: Handler for ${message.type} failed`, error);
      sendResponse({ success: false, error: error.message });
    });
  return true;
});

async function handleExecuteCommand(message) {
  const tabId = message.tabId ?? (await getActiveTabId());
  if (!tabId) {
    throw new Error('No active tab found');
  }
  await dispatchCommand(tabId, message.command, message.payload ?? {});
  return { success: true };
}

async function handleSpeechToText(message) {
  if (!message.audio?.base64) {
    throw new Error('Missing audio payload');
  }
  const config = await loadAssistantConfig();
  const openaiConfig = config.provider === 'openai' ? config.openai : null;
  if (!openaiConfig?.apiKey) {
    return {
      success: false,
      error: 'Speech-to-text provider not configured. Add an API key in Settings.'
    };
  }
  const transcript = await callOpenAiForTranscription(message.audio, openaiConfig);
  return { success: true, transcript };
}

async function handleRunLlmAnalysis(message) {
  const transcript = message.transcript ?? '';
  const rawContext = message.context ?? '';
  const sectionKeys = Array.isArray(message.sections) && message.sections.length
    ? message.sections
    : SECTION_DEFINITIONS.map((section) => section.key);
  const planResult = await generatePlan({ transcript, rawContext, sectionKeys });
  return {
    success: true,
    plan: planResult.plan,
    metadata: {
      provider: planResult.metadata.provider,
      model: planResult.metadata.model,
      patientId: planResult.metadata.patientId,
      warnings: planResult.metadata.warnings ?? [],
      generatedAt: planResult.metadata.generatedAt
    }
  };
}

async function handleApplyPendingActions(message) {
  const tabId = message.tabId ?? (await getActiveTabId());
  if (!tabId) {
    throw new Error('No active tab found');
  }
  if (!message.plan?.sections) {
    throw new Error('Invalid plan payload');
  }

  const applied = [];
  const warnings = [];

  for (const [sectionKey, sectionPlan] of Object.entries(message.plan.sections)) {
    if (!Array.isArray(sectionPlan?.commands) || sectionPlan.commands.length === 0) {
      continue;
    }
    const handlers = SUPPORTED_SECTION_COMMANDS[sectionKey];
    if (!handlers) {
      warnings.push(`No automation handler configured for section "${sectionKey}".`);
      continue;
    }
    for (const command of sectionPlan.commands) {
      const commandHandler = handlers[command.type];
      if (!commandHandler) {
        warnings.push(`Unsupported command "${command.type}" for section "${sectionKey}".`);
        continue;
      }
      try {
        await commandHandler({
          tabId,
          payload: command.payload ?? {},
          command,
          sectionPlan
        });
        applied.push({ section: sectionKey, command: command.type });
      } catch (error) {
        console.error(
          `SightFlow: Failed to execute command ${command.type} for section ${sectionKey}`,
          error
        );
        warnings.push(`Failed to run ${sectionKey}:${command.type} - ${error.message}`);
      }
    }
  }

  return { success: true, applied, warnings };
}

async function handleGetAssistantConfig() {
  const config = await loadAssistantConfig();
  return { success: true, config };
}

async function handleSaveAssistantConfig(message) {
  const savedConfig = await saveAssistantConfig(message.config ?? {});
  return { success: true, config: savedConfig };
}

async function dispatchCommand(tabId, command, payload) {
  const messageType = COMMAND_TO_MESSAGE_TYPE[command];
  if (!messageType) {
    throw new Error(`Unknown command "${command}"`);
  }

  const mergedPayload = mergeCommandPayload(command, payload ?? {});
  const message = {
    type: messageType,
    payload: mergedPayload
  };

  if (messageType === 'INSERT_HPI') {
    message.extendedhpi_text = mergedPayload.extendedHpi ?? mergedPayload.extendedhpi_text ?? '';
  }

  if (messageType === 'INSERT_PSFHROS') {
    message.psfhros_text = mergedPayload.note ?? '';
    message.conditionsToSelect = mergedPayload.conditions?.select ?? [];
  }

  await sendTabMessage(tabId, message);
}

function mergeCommandPayload(command, payload) {
  const defaults = deepClone(DEFAULT_COMMAND_PAYLOADS[command] ?? {});

  if (command === 'sf-insert-hpi') {
    return {
      ...defaults,
      ...payload,
      extendedHpi:
        payload.extendedHpi ??
        payload.extendedhpi ??
        payload.text ??
        defaults.extendedHpi ??
        defaults.extendedhpi
    };
  }

  if (command === 'sf-insert-psfhros') {
    const baseConditions = defaults.conditions ?? { select: [], freeText: [] };
    const payloadConditions = payload.conditions ?? {};
    return {
      ...defaults,
      ...payload,
      conditions: {
        select:
          payloadConditions.select ??
          payload.select ??
          deepClone(baseConditions.select ?? []),
        freeText:
          payloadConditions.freeText ??
          payload.freeText ??
          deepClone(baseConditions.freeText ?? [])
      },
      note: payload.note ?? defaults.note ?? ''
    };
  }

  return { ...defaults, ...payload };
}

async function generatePlan({ transcript, rawContext, sectionKeys }) {
  const { patientId } = await getOrCreatePatientId(rawContext);
  const config = await loadAssistantConfig();
  const useOpenAi = config.provider === 'openai' && Boolean(config.openai?.apiKey);
  const trimmedTranscript = transcript?.trim() ?? '';
  const sanitizedTranscript = sanitizeTranscript(trimmedTranscript, rawContext);

  if (!trimmedTranscript) {
    const emptyPlan = normalizePlan({});
    emptyPlan.summary = 'No content provided.';
    return {
      plan: emptyPlan,
      metadata: {
        provider: useOpenAi ? 'openai' : 'heuristic',
        model: useOpenAi ? config.openai?.llmModel : 'heuristic-v1',
        patientId,
        warnings: ['Transcript was empty'],
        generatedAt: Date.now()
      }
    };
  }

  if (useOpenAi) {
    try {
      const openAiResult = await callOpenAiForPlan({
        transcript: sanitizedTranscript,
        patientId,
        sectionKeys,
        config: config.openai
      });
      return {
        plan: openAiResult.plan,
        metadata: {
          provider: 'openai',
          model: openAiResult.model ?? config.openai.llmModel,
          patientId,
          warnings: openAiResult.warnings ?? [],
          generatedAt: Date.now()
        }
      };
    } catch (error) {
      console.error('SightFlow: OpenAI plan generation failed; falling back to heuristics.', error);
      const fallback = generateHeuristicPlan(trimmedTranscript);
      fallback.plan.warnings.push(`LLM error: ${error.message}`);
      return {
        plan: fallback.plan,
        metadata: {
          provider: 'heuristic',
          model: 'heuristic-v1',
          patientId,
          warnings: fallback.plan.warnings,
          generatedAt: Date.now()
        }
      };
    }
  }

  const heuristic = generateHeuristicPlan(trimmedTranscript);
  heuristic.plan.warnings.push('LLM provider not configured; using heuristic parsing.');
  return {
    plan: heuristic.plan,
    metadata: {
      provider: 'heuristic',
      model: 'heuristic-v1',
      patientId,
      warnings: heuristic.plan.warnings,
      generatedAt: Date.now()
    }
  };
}

function normalizePlan(partialPlan) {
  const normalized = {
    summary: partialPlan.summary ?? '',
    warnings: Array.isArray(partialPlan.warnings) ? [...partialPlan.warnings] : [],
    sections: {}
  };

  for (const definition of SECTION_DEFINITIONS) {
    const sectionData = partialPlan.sections?.[definition.key] ?? {};
    const commands = Array.isArray(sectionData.commands)
      ? sectionData.commands.filter(Boolean)
      : [];
    const pending = Boolean(sectionData.pending) && commands.length > 0;
    normalized.sections[definition.key] = {
      pending,
      status: pending ? 'pending' : 'idle',
      summary: sectionData.summary ?? '',
      rationale: sectionData.rationale ?? '',
      description: sectionData.description ?? '',
      commands
    };
  }

  return normalized;
}

function generateHeuristicPlan(transcript) {
  const partial = { sections: {} };
  partial.summary = 'Suggested updates derived from heuristic parsing.';
  partial.sections.history = {
    pending: true,
    summary: 'Update Extended HPI with captured narrative.',
    rationale: 'Free-text encounter narrative supplied by clinician.',
    commands: [
      {
        type: 'updateExtendedHpi',
        description: 'Insert revised Extended HPI notes.',
        payload: { text: transcript }
      }
    ]
  };

  const conditionExtraction = extractConditionsFromTranscript(transcript);
  if (conditionExtraction.select.length || conditionExtraction.freeText.length) {
    partial.sections.psfhros = {
      pending: true,
      summary: 'Add identified conditions to PMHx.',
      rationale: 'Detected phrases indicating past medical history.',
      commands: [
        {
          type: 'updatePmHxConditions',
          description: 'Update PMHx list with detected terms.',
          payload: conditionExtraction
        }
      ]
    };
  }

  return { plan: normalizePlan(partial) };
}

function extractConditionsFromTranscript(transcript) {
  const select = new Set();
  const freeText = new Set();

  if (!transcript) {
    return { select: [], freeText: [] };
  }

  const patterns = [
    /history of ([^.;,\n]+)/gi,
    /hx of ([^.;,\n]+)/gi,
    /diagnosed with ([^.;,\n]+)/gi,
    /past medical history includes ([^.;,\n]+)/gi
  ];

  for (const pattern of patterns) {
    const matches = transcript.matchAll(pattern);
    for (const match of matches) {
      const rawValue = match[1];
      if (!rawValue) {
        continue;
      }
      const pieces = splitConditionString(rawValue);
      for (const piece of pieces) {
        const normalized = normalizeCondition(piece);
        if (!normalized) continue;
        const knownMatch = KNOWN_PMH_CONDITIONS.find(
          (known) => known.toLowerCase() === normalized.toLowerCase()
        );
        if (knownMatch) {
          select.add(knownMatch);
        } else {
          freeText.add(normalized);
        }
      }
    }
  }

  return {
    select: Array.from(select),
    freeText: Array.from(freeText)
  };
}

async function callOpenAiForPlan({ transcript, patientId, sectionKeys, config }) {
  const model = config.llmModel || DEFAULT_ASSISTANT_CONFIG.openai.llmModel;
  const availableSections = SECTION_DEFINITIONS.filter((section) =>
    sectionKeys.includes(section.key)
  )
    .map((section) => `${section.label} (${section.key})`)
    .join(', ');

  const commandInstructions = [
    'Supported automation commands:',
    '- history: updateExtendedHpi -> payload.text (string), payload.cc (string optional), payload.location (string optional), payload.autoCheckMentalStatus (boolean optional), payload.mentalStatusLabel (string optional)',
    '- psfhros: updatePmHxConditions -> payload.select (string[] of existing PMHx options), payload.freeText (string[] for new conditions), payload.note (string optional)',
    'Sections without automation must set pending=false but can include rationale for manual follow-up.'
  ].join('\n');

  const body = {
    model,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content:
          'You are a medical charting copilot that produces structured JSON plans for updating Nextech chart sections. Use only the supported command types. If no update is needed set pending to false.'
      },
      {
        role: 'user',
        content: [
          `Deidentified chart id: ${patientId ?? 'UNKNOWN'}`,
          `Available sections: ${availableSections}`,
          commandInstructions,
          'Encounter narrative:',
          `"""${transcript}"""`
        ].join('\n\n')
      }
    ],
    response_format: OPENAI_PLAN_SCHEMA,
    max_tokens: 1200
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json?.error?.message || `OpenAI request failed (${response.status})`);
  }

  const content = json.choices?.[0]?.message?.content;
  const parsed = parsePlanOutput(content);
  if (!parsed) {
    throw new Error('Failed to parse plan output from LLM.');
  }

  const normalized = normalizePlan(parsed);
  return {
    plan: normalized,
    warnings: normalized.warnings ?? [],
    model
  };
}

function parsePlanOutput(content) {
  if (!content) {
    return null;
  }

  if (Array.isArray(content)) {
    const text = content
      .map((part) => (typeof part === 'string' ? part : part?.text ?? ''))
      .join('');
    return safeJsonParse(text);
  }

  if (typeof content === 'string') {
    return safeJsonParse(content);
  }

  if (typeof content === 'object' && typeof content.text === 'string') {
    return safeJsonParse(content.text);
  }

  return null;
}

async function callOpenAiForTranscription(audio, config) {
  const model = config.sttModel || DEFAULT_ASSISTANT_CONFIG.openai.sttModel;
  const blob = base64ToBlob(audio.base64, audio.mimeType);
  const formData = new FormData();
  formData.append('file', blob, `audio.${guessExtension(audio.mimeType)}`);
  formData.append('model', model);
  formData.append('response_format', 'json');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`
    },
    body: formData
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json?.error?.message || `OpenAI transcription failed (${response.status})`);
  }

  return json.text ?? json.result ?? '';
}

async function getActiveTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id ?? null;
}

function sendTabMessage(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

function storageGet(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, resolve);
  });
}

function storageSet(values) {
  return new Promise((resolve) => {
    chrome.storage.local.set(values, resolve);
  });
}

async function loadAssistantConfig() {
  const stored = await storageGet(['assistantConfig']);
  const saved = stored.assistantConfig ?? {};
  const provider = saved.provider ?? DEFAULT_ASSISTANT_CONFIG.provider;
  const config = { provider };

  if (provider === 'openai') {
    config.openai = {
      llmModel: saved.openai?.llmModel ?? DEFAULT_ASSISTANT_CONFIG.openai.llmModel,
      sttModel: saved.openai?.sttModel ?? DEFAULT_ASSISTANT_CONFIG.openai.sttModel,
      apiKey: saved.openai?.apiKey ?? DEFAULT_ASSISTANT_CONFIG.openai.apiKey
    };
  }

  return config;
}

async function saveAssistantConfig(config) {
  const sanitized = sanitizeAssistantConfig(config);
  await storageSet({ assistantConfig: sanitized });
  return loadAssistantConfig();
}

function sanitizeAssistantConfig(config) {
  const provider = config.provider ?? DEFAULT_ASSISTANT_CONFIG.provider;
  const sanitized = { provider };

  if (provider === 'openai') {
    sanitized.openai = {
      apiKey: config.openai?.apiKey?.trim() ?? '',
      llmModel: config.openai?.llmModel || DEFAULT_ASSISTANT_CONFIG.openai.llmModel,
      sttModel: config.openai?.sttModel || DEFAULT_ASSISTANT_CONFIG.openai.sttModel
    };
  }

  return sanitized;
}

async function getOrCreatePatientId(rawContext) {
  const trimmed = typeof rawContext === 'string' ? rawContext.trim() : '';
  if (!trimmed) {
    return { patientId: null };
  }

  const stored = await storageGet(['contextMap']);
  const contextMap = stored.contextMap ?? {};

  for (const [id, entry] of Object.entries(contextMap)) {
    if (entry.context === trimmed) {
      return { patientId: id };
    }
  }

  const patientId = await generateChartId(trimmed);
  contextMap[patientId] = {
    context: trimmed,
    createdAt: Date.now()
  };
  await storageSet({ contextMap });
  return { patientId };
}

async function generateChartId(input) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(digest);
  let hex = '';
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, '0');
  }
  const base36 = BigInt(`0x${hex}`).toString(36).toUpperCase();
  return `SF-${base36.slice(0, 12)}`;
}

function splitConditionString(value) {
  return value
    .split(/,| and |\/|;|\band\b/gi)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeCondition(condition) {
  const tokens = condition
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  const normalizedTokens = tokens.map((token) => {
    if (/^[ivxlcdm]+$/i.test(token) || token.length <= 2) {
      return token.toUpperCase();
    }
    return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
  });

  return normalizedTokens.join(' ').replace(/\s+/g, ' ').trim();
}

function base64ToBlob(base64, mimeType = 'audio/webm') {
  const cleaned = base64.includes(',') ? base64.split(',')[1] : base64;
  const binary = atob(cleaned);
  const len = binary.length;
  const buffer = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    buffer[i] = binary.charCodeAt(i);
  }
  return new Blob([buffer], { type: mimeType || 'audio/webm' });
}

function guessExtension(mimeType = '') {
  if (mimeType.includes('wav')) return 'wav';
  if (mimeType.includes('mpeg')) return 'mp3';
  if (mimeType.includes('ogg')) return 'ogg';
  return 'webm';
}

function deepClone(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return value ? JSON.parse(JSON.stringify(value)) : value;
}

function safeJsonParse(input) {
  try {
    return JSON.parse(input);
  } catch (error) {
    console.warn('SightFlow: Failed to parse JSON output', error);
    return null;
  }
}

function sanitizeTranscript(transcript, rawContext) {
  if (!transcript || !rawContext) {
    return transcript;
  }
  const tokens = extractContextTokens(rawContext);
  if (!tokens.length) {
    return transcript;
  }
  let sanitized = transcript;
  tokens.forEach((token) => {
    const regex = new RegExp(`\\b${escapeRegExp(token)}\\b`, 'gi');
    sanitized = sanitized.replace(regex, '[REDACTED]');
  });
  return sanitized;
}

function extractContextTokens(context) {
  return context
    .split(/[\s,\-|()\/]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && /^[A-Za-z]+$/.test(token))
    .slice(0, 12);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

