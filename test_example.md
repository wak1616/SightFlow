# SightFlow AI Assistant Test Examples

## Test Case 1: Diverticulosis (Simple condition)

### Input
When user says or types: "patient has a history of Diverticulosis"

### Expected AI Response (Plan JSON)
```json
{
  "source": "speech",
  "raw_input": "patient has a history of Diverticulosis",
  "items": [
    {
      "target_section": "PSFH/ROS",
      "subsection": "PMHx",
      "actions": [
        {
          "type": "add_condition",
          "condition": "Diverticulosis"
        }
      ],
      "commands": [
        {
          "name": "sf-insert-psfhros",
          "params": {
            "conditionsToSelect": ["Diverticulosis"]
          }
        }
      ],
      "selected": true
    }
  ]
}
```

### Expected Behavior
1. PSFH/ROS section highlighted green
2. Plan card shows "Add condition: Diverticulosis"
3. "Send ALL to Nextech" button enabled and flashing
4. When executed, should add Diverticulosis to PMHx

## Test Case 2: Multiple Sections

### Input
"Patient complains of blurry vision for 6 months. History of diabetes type 2. BP 130/80, heart rate 72. Plan cataract surgery in 2 weeks."

### Expected AI Response (Plan JSON)
```json
{
  "source": "text",
  "raw_input": "Patient complains of blurry vision for 6 months. History of diabetes type 2. BP 130/80, heart rate 72. Plan cataract surgery in 2 weeks.",
  "items": [
    {
      "target_section": "History",
      "subsection": "HPI",
      "actions": [
        {
          "type": "insert_text",
          "field": "HPI",
          "value": "Patient complains of blurry vision for 6 months"
        }
      ],
      "commands": [
        {
          "name": "sf-insert-extended-hpi",
          "params": {
            "text": "Patient complains of blurry vision for 6 months"
          }
        }
      ],
      "selected": true
    },
    {
      "target_section": "PSFH/ROS",
      "subsection": "PMHx",
      "actions": [
        {
          "type": "add_condition",
          "condition": "Diabetes Type 2"
        }
      ],
      "commands": [
        {
          "name": "sf-insert-psfhros",
          "params": {
            "conditionsToSelect": ["Diabetes Type 2"]
          }
        }
      ],
      "selected": true
    },
    {
      "target_section": "V & P",
      "actions": [
        {
          "type": "set_vital",
          "vital": "BP",
          "value": "130/80"
        },
        {
          "type": "set_vital",
          "vital": "HR",
          "value": "72"
        }
      ],
      "commands": [],
      "selected": true
    },
    {
      "target_section": "Imp/Plan",
      "actions": [
        {
          "type": "insert_text",
          "field": "Imp/Plan",
          "value": "Plan cataract surgery in 2 weeks"
        }
      ],
      "commands": [
        {
          "name": "sf-insert-impplan",
          "params": {
            "text": "Plan cataract surgery in 2 weeks"
          }
        }
      ],
      "selected": true
    }
  ]
}
```

## Setup Instructions

1. **Install the Extension**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the SightFlow directory

2. **Configure API Key**
   - In the extension, you'll need to set your OpenAI API key
   - The extension will use chrome.storage.sync to save it securely
   - You can add a settings page or use the console to set it:
   ```javascript
   chrome.storage.sync.set({ openai_api_key: 'YOUR_API_KEY_HERE' });
   ```

3. **Test the Extension**
   - Navigate to Nextech EMR: https://app1.intellechart.net/Eye2MVC/Chart/Chart/Index/
   - Open the SightFlow side panel (click the extension icon)
   - Try the test cases above

## Debugging Tips

- Open Chrome DevTools (F12) to see console logs
- Check the side panel console for AI-related messages
- Check the content script console for DOM manipulation messages
- All SightFlow messages are prefixed with "SightFlow:" for easy filtering
