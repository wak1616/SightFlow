// LLM Service for OpenAI API integration
// Handles communication with OpenAI GPT-4 for medical chart analysis

class LLMService {
  constructor() {
    this.apiKey = null;
    this.apiEndpoint = 'https://api.openai.com/v1/chat/completions';
  }

  /**
   * Sets the OpenAI API key
   * @param {string} apiKey - OpenAI API key
   */
  async setApiKey(apiKey) {
    this.apiKey = apiKey;
    // Store securely in chrome.storage
    await chrome.storage.local.set({ openaiApiKey: apiKey });
  }

  /**
   * Loads API key from storage
   */
  async loadApiKey() {
    try {
      const result = await chrome.storage.local.get(['openaiApiKey']);
      if (result.openaiApiKey) {
        this.apiKey = result.openaiApiKey;
      }
    } catch (error) {
      console.error('Error loading API key:', error);
    }
  }

  /**
   * Analyzes medical text and generates structured commands for chart sections
   * @param {string} text - Deidentified medical text to analyze
   * @param {string} deidentifiedId - Deidentified chart number for context
   * @returns {Promise<object>} Structured plan with commands for each section
   */
  async analyzeMedicalText(text, deidentifiedId) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not set. Please configure it in settings.');
    }

    const systemPrompt = `You are a medical assistant that helps parse free-text medical notes and convert them into structured commands for an electronic health record (EHR) system.

Your task is to analyze medical text and determine:
1. Which chart sections need to be modified (History, PSFH/ROS, V&P, Exam, Imp/Plan, Follow Up)
2. What specific actions/commands need to be executed for each section
3. What parameters/values need to be set

Available sections:
- History: Includes HPI (History of Present Illness), CC (Chief Complaint), Mental Status Exam, and Extended HPI
- PSFH/ROS: Includes PMHx (Past Medical History) - can add conditions or select from list
- V&P: Vital signs and Physical exam data
- Exam: Physical examination findings
- Imp/Plan: Impression and Plan
- Follow Up: Follow-up instructions

For PSFH/ROS section, you can specify conditions to add (they will be matched against available list or free-typed if not found).

Return your response as a JSON object with this structure:
{
  "sections": {
    "History": {
      "needsUpdate": true/false,
      "commands": [
        {
          "type": "insertExtendedHPI" | "setCC" | "setMentalStatus",
          "value": "text content"
        }
      ]
    },
    "PSFH/ROS": {
      "needsUpdate": true/false,
      "commands": [
        {
          "type": "addCondition",
          "conditions": ["condition1", "condition2"]
        }
      ]
    },
    "V&P": {
      "needsUpdate": true/false,
      "commands": []
    },
    "Exam": {
      "needsUpdate": true/false,
      "commands": []
    },
    "Imp/Plan": {
      "needsUpdate": true/false,
      "commands": []
    },
    "Follow Up": {
      "needsUpdate": true/false,
      "commands": []
    }
  }
}

Only include sections that need updates (needsUpdate: true).`;

    const userPrompt = `Analyze the following deidentified medical text and generate commands for the appropriate chart sections:

Deidentified Chart ID: ${deidentifiedId}

Medical Text:
${text}

Return only valid JSON, no additional text.`;

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No response from OpenAI API');
      }

      // Parse JSON response
      const plan = JSON.parse(content);
      
      // Validate structure
      if (!plan.sections) {
        throw new Error('Invalid response structure from LLM');
      }

      return plan;
    } catch (error) {
      console.error('LLM Service Error:', error);
      throw error;
    }
  }
}

// Export singleton instance
const llmService = new LLMService();
llmService.loadApiKey();
