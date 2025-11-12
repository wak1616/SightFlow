// SightFlow Options Page Script

document.addEventListener('DOMContentLoaded', async () => {
  const apiKeyInput = document.getElementById('api-key');
  const saveButton = document.getElementById('save-button');
  const statusDiv = document.getElementById('status');
  
  // Load existing API key
  try {
    const result = await chrome.storage.sync.get(['openai_api_key']);
    if (result.openai_api_key) {
      // Show masked version of the key
      const key = result.openai_api_key;
      const masked = key.substring(0, 7) + '...' + key.substring(key.length - 4);
      apiKeyInput.placeholder = masked;
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
  
  // Save settings
  saveButton.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
      showStatus('Please enter an API key', 'error');
      return;
    }
    
    if (!apiKey.startsWith('sk-')) {
      showStatus('Invalid API key format', 'error');
      return;
    }
    
    try {
      await chrome.storage.sync.set({ openai_api_key: apiKey });
      showStatus('Settings saved successfully!', 'success');
      
      // Clear the input and update placeholder
      apiKeyInput.value = '';
      const masked = apiKey.substring(0, 7) + '...' + apiKey.substring(apiKey.length - 4);
      apiKeyInput.placeholder = masked;
    } catch (error) {
      console.error('Failed to save settings:', error);
      showStatus('Failed to save settings', 'error');
    }
  });
  
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
    
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
  }
});
