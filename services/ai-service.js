// SightFlow AI Service
// Handles communication with OpenAI APIs for speech-to-text and intelligent parsing

class AIService {
  constructor() {
    this.config = null;
    this.loadConfig();
  }

  /**
   * Loads API configuration
   */
  async loadConfig() {
    // In a Chrome extension, we need to load the config from storage
    return new Promise((resolve) => {
      chrome.storage.local.get(['openai_api_key'], (result) => {
        if (result.openai_api_key) {
          this.config = {
            apiKey: result.openai_api_key,
            whisperModel: 'whisper-1',
            gptModel: 'gpt-4-turbo-preview',
          };
        }
        resolve();
      });
    });
  }

  /**
   * Sets the API key
   * @param {string} apiKey - OpenAI API key
   */
  async setApiKey(apiKey) {
    this.config = {
      apiKey: apiKey,
      whisperModel: 'whisper-1',
      gptModel: 'gpt-4-turbo-preview',
    };
    
    return new Promise((resolve) => {
      chrome.storage.local.set({ openai_api_key: apiKey }, resolve);
    });
  }

  /**
   * Checks if API is configured
   * @returns {boolean} True if API key is set
   */
  isConfigured() {
    return !!(this.config && this.config.apiKey && this.config.apiKey !== 'YOUR_OPENAI_API_KEY_HERE');
  }

  /**
   * Transcribes audio to text using OpenAI Whisper
   * @param {Blob} audioBlob - Audio blob to transcribe
   * @returns {Promise<string>} Transcribed text
   */
  async transcribeAudio(audioBlob) {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key not configured');
    }

    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', this.config.whisperModel);
    formData.append('language', 'en');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Whisper API error: ${error.error?.message || response.statusText}`);
    }

    const result = await response.json();
    return result.text;
  }

  /**
   * Analyzes medical text and generates structured commands
   * @param {string} text - Medical text to analyze
   * @param {string} deidentifiedId - De-identified patient ID for context
   * @returns {Promise<Object>} Parsed commands and actions
   */
  async analyzeMedicalText(text, deidentifiedId) {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key not configured');
    }

    const systemPrompt = `You are a medical charting assistant that parses clinical notes and generates structured commands for an EHR system.

AVAILABLE SECTIONS:
1. History (includes HPI, CC, Mental Status Exam, Extended HPI)
2. PSFH/ROS (includes PMHx - Past Medical History)
3. V & P (Vision and Plan)
4. Exam (Physical Examination)
5. Imp/Plan (Impression and Plan)
6. Follow Up

AVAILABLE COMMANDS:
- For PMHx: Add conditions to Past Medical History (use exact condition names)
- For HPI: Add Chief Complaint (CC), location, and Extended HPI text
- For other sections: Add free text

RESPONSE FORMAT (JSON):
{
  "sections": [
    {
      "section": "PSFH/ROS" | "History" | "V & P" | "Exam" | "Imp/Plan" | "Follow Up",
      "commands": [
        {
          "action": "add_condition" | "add_hpi" | "add_text",
          "parameters": {
            // For add_condition:
            "conditions": ["Condition1", "Condition2"],
            // For add_hpi:
            "cc": "Chief Complaint",
            "location": "OU" | "OD" | "OS",
            "extended_hpi": "detailed text",
            "mental_status": true | false,
            // For add_text:
            "text": "free text content"
          }
        }
      ]
    }
  ],
  "confidence": "high" | "medium" | "low",
  "notes": "Any clarifications or ambiguities"
}

Extract medical information accurately and map to appropriate sections and commands.`;

    const userPrompt = `Patient ID: ${deidentifiedId}

Clinical Note:
${text}

Parse this clinical note and generate the appropriate commands.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.gptModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`GPT API error: ${error.error?.message || response.statusText}`);
    }

    const result = await response.json();
    const content = result.choices[0].message.content;
    
    return JSON.parse(content);
  }

  /**
   * Test the API connection
   * @returns {Promise<boolean>} True if connection successful
   */
  async testConnection() {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
    });

    return response.ok;
  }
}

// Create singleton instance
const aiService = new AIService();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = aiService;
}
