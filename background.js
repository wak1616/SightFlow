// SightFlow Chrome Extension - Background Service Worker
// Orchestrates keyboard shortcuts, AI analysis, and Nextech command execution

const DEFAULT_EXTENDED_HPI =
  'Patient reports blurred vision OU with increased glare, progressive over the past 6 months. Denies associated pain.';

chrome.commands.onCommand.addListener(async (command) => {
  console.log('SightFlow Background: Command received', command);
  const tab = await getActiveChartTab();
  if (!tab) return;

  if (command === 'sf-insert-hpi') {
    await sendTabMessage(tab.id, {
      type: 'INSERT_HPI',
      extendedhpi_text: DEFAULT_EXTENDED_HPI
    });
  }

  if (command === 'sf-insert-psfhros') {
    await sendTabMessage(tab.id, {
      type: 'INSERT_PSFHROS',
      conditionsToSelect: ['Diverticulosis']
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message?.type) return;
  console.log('SightFlow Background: Message received', message.type);

  switch (message.type) {
    case 'EXECUTE_COMMAND':
      handleExecuteCommand(message, sendResponse);
      return true;
    case 'LLM_ANALYZE':
      handleLlmAnalyze(message.payload).then(sendResponse);
      return true;
    case 'EXECUTE_ACTIONS':
      handleExecuteActions(message.payload).then(sendResponse);
      return true;
    default:
      console.warn('SightFlow Background: Unhandled message type', message.type);
      break;
  }
});

async function handleExecuteCommand(message, sendResponse) {
  const { command, tabId } = message;
  if (!tabId) {
    sendResponse({ success: false, error: 'Missing tabId' });
    return;
  }

  if (command === 'sf-insert-hpi') {
    await sendTabMessage(tabId, {
      type: 'INSERT_HPI',
      extendedhpi_text: DEFAULT_EXTENDED_HPI
    });
    sendResponse({ success: true });
    return;
  }

  if (command === 'sf-insert-psfhros') {
    await sendTabMessage(tabId, {
      type: 'INSERT_PSFHROS',
      conditionsToSelect: ['Diverticulosis']
    });
    sendResponse({ success: true });
    return;
  }

  sendResponse({ success: false, error: `Unknown command: ${command}` });
}

async function handleLlmAnalyze(payload) {
  if (!payload?.transcript) {
    return { success: false, error: 'Transcript is required.' };
  }

  try {
    const settings = await loadAssistantSettings();
    if (!settings?.openAiApiKey) {
      console.warn('SightFlow Background: OpenAI API key missing, using heuristics.');
      const plan = buildHeuristicPlan(payload.transcript);
      return { success: true, plan, mode: 'heuristic' };
    }

    const plan = await callOpenAiPlanner(payload, settings);
    return { success: true, plan, mode: 'llm' };
  } catch (error) {
    console.error('SightFlow Background: LLM analysis failed', error);
    return { success: false, error: error.message || 'AI analysis failed.' };
  }
}

async function handleExecuteActions(payload) {
  if (!payload?.tabId) {
    return { success: false, error: 'Missing active tab.' };
  }

  const actions = payload.actions || [];
  if (!actions.length) {
    return { success: false, error: 'No actions to execute.' };
  }

  const results = [];
  for (const action of actions) {
    try {
      if (action.command === 'sf-insert-hpi') {
        await sendTabMessage(payload.tabId, {
          type: 'INSERT_HPI',
          extendedhpi_text: action.payload?.extendedhpi_text || DEFAULT_EXTENDED_HPI
        });
        results.push({ command: action.command, status: 'ok' });
        continue;
      }

      if (action.command === 'sf-insert-psfhros') {
        await sendTabMessage(payload.tabId, {
          type: 'INSERT_PSFHROS',
          conditionsToSelect: action.payload?.conditionsToSelect || [],
          freeTextEntries: action.payload?.freeTextEntries || []
        });
        results.push({ command: action.command, status: 'ok' });
        continue;
      }

      results.push({ command: action.command, status: 'unsupported' });
    } catch (error) {
      console.error('SightFlow Background: Action failed', action, error);
      results.push({ command: action.command, status: 'error', error: error.message });
    }
  }

  const hasError = results.some(r => r.status === 'error');
  return {
    success: !hasError,
    results
  };
}

async function getActiveChartTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    console.warn('SightFlow Background: No active tab.');
    return null;
  }

  if (!tab.url || !tab.url.includes('app1.intellechart.net')) {
    console.warn('SightFlow Background: Active tab is not Intellechart.');
    return null;
  }

  return tab;
}

function sendTabMessage(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}

function loadAssistantSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      {
        openAiApiKey: null,
        openAiModel: 'gpt-4o-mini',
        plannerSystemPrompt: null
      },
      resolve
    );
  });
}

async function callOpenAiPlanner(payload, settings) {
  const apiKey = settings.openAiApiKey;
  if (!apiKey) throw new Error('OpenAI API key missing.');

  const model = settings.openAiModel || 'gpt-4o-mini';
  const body = {
    model,
    input: buildPlannerPrompt(payload, settings)
  };

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed: ${errorText}`);
  }

  const data = await response.json();
  const jsonOutput = parseJsonFromOpenAiResponse(data);
  return normalizePlannerOutput(jsonOutput);
}

function buildPlannerPrompt(payload, settings) {
  const basePrompt = settings.plannerSystemPrompt || `
You are SightFlow, an assistant that translates clinician free-text notes into actionable Nextech commands.
Return JSON with keys: actions[]. Each action must include sectionId (history|psfhros|vp|exam|impPlan|followUp), command (Chrome command id), summary, details {target}, payload (object passed to content script).
Only include actions you are confident about. If no actions, return {"actions":[]}.

Available commands:
- sf-insert-hpi: payload.extendedhpi_text (string)
- sf-insert-psfhros: payload.conditionsToSelect (string array), payload.freeTextEntries (string array)
`;

  const contextParts = [];
  if (payload.alias) {
    contextParts.push(`De-identified chart #: ${payload.alias}`);
  }
  if (payload.chartContext) {
    contextParts.push(`Chart context: ${payload.chartContext}`);
  }

  return [
    {
      role: 'system',
      content: basePrompt.trim()
    },
    {
      role: 'user',
      content: `Clinician note:\n${payload.transcript}\n${contextParts.join('\n')}`
    }
  ];
}

function parseJsonFromOpenAiResponse(response) {
  const outputs = response?.output || response?.choices || [];

  if (Array.isArray(outputs)) {
    for (const choice of outputs) {
      const content = choice?.content || choice?.message?.content;
      if (typeof content === 'string') {
        try {
          return JSON.parse(content);
        } catch {
          continue;
        }
      }

      if (Array.isArray(content)) {
        for (const block of content) {
          if (block?.type === 'output_text' || block?.type === 'text' || block?.type === 'message') {
            try {
              return JSON.parse(block.text || block.content || '');
            } catch {
              continue;
            }
          }
        }
      }
    }
  }

  throw new Error('OpenAI response did not contain valid JSON output.');
}

function normalizePlannerOutput(raw) {
  if (!raw || typeof raw !== 'object') {
    return { actions: [] };
  }

  const actions = Array.isArray(raw.actions) ? raw.actions : [];
  return {
    actions: actions
      .map((action) => ({
        sectionId: action.sectionId,
        command: action.command,
        summary: action.summary || '',
        details: action.details || {},
        payload: action.payload || {}
      }))
      .filter(
        (action) =>
          SECTION_IDS.includes(action.sectionId) &&
          SUPPORTED_COMMANDS.includes(action.command)
      )
  };
}

function buildHeuristicPlan(transcript) {
  const actions = [];
  const text = transcript.toLowerCase();

  if (/\bblurred? vision\b/.test(text) || /\bblurry vision\b/.test(text)) {
    actions.push({
      sectionId: 'history',
      command: 'sf-insert-hpi',
      summary: 'Update Extended HPI with blurred vision details.',
      details: { target: 'Extended HPI' },
      payload: {
        extendedhpi_text: DEFAULT_EXTENDED_HPI
      }
    });
  }

  if (/\bdiverticulosis\b/.test(text)) {
    actions.push({
      sectionId: 'psfhros',
      command: 'sf-insert-psfhros',
      summary: 'Add Diverticulosis to PMHx.',
      details: { target: 'Medical History' },
      payload: {
        conditionsToSelect: ['Diverticulosis']
      }
    });
  }

  return { actions };
}

const SECTION_IDS = ['history', 'psfhros', 'vp', 'exam', 'impPlan', 'followUp'];
const SUPPORTED_COMMANDS = ['sf-insert-hpi', 'sf-insert-psfhros'];
