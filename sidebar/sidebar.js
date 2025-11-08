// SightFlow Sidebar Script
// Handles button clicks and communication with background script

console.log('SightFlow Sidebar: Script loaded');

// Get button elements
const hpiButton = document.getElementById('hpi-button');
const psfhrosButton = document.getElementById('psfhros-button');
const statusMessage = document.getElementById('status-message');

// Status message helper
function showStatus(message, type = 'success') {
  statusMessage.textContent = message;
  statusMessage.className = `status-message show ${type}`;
  
  // Hide after 3 seconds
  setTimeout(() => {
    statusMessage.classList.remove('show');
  }, 3000);
}

// HPI Button Click Handler
hpiButton.addEventListener('click', async () => {
  console.log('SightFlow Sidebar: HPI button clicked');
  
  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      showStatus('No active tab found', 'error');
      return;
    }

    // Check if we're on the correct domain
    if (!tab.url.includes('app1.intellechart.net')) {
      showStatus('Please navigate to Intellechart first', 'error');
      return;
    }

    // Send message to background script to execute the HPI command
    chrome.runtime.sendMessage({ 
      type: 'EXECUTE_COMMAND', 
      command: 'sf-insert-hpi',
      tabId: tab.id 
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error:', chrome.runtime.lastError);
        showStatus('Failed to execute command', 'error');
      } else {
        showStatus('HPI insertion triggered!', 'success');
      }
    });
    
  } catch (error) {
    console.error('SightFlow Sidebar: Error executing HPI command', error);
    showStatus('Error: ' + error.message, 'error');
  }
});

// PSFHROS Button Click Handler
psfhrosButton.addEventListener('click', async () => {
  console.log('SightFlow Sidebar: PSFHROS button clicked');
  
  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      showStatus('No active tab found', 'error');
      return;
    }

    // Check if we're on the correct domain
    if (!tab.url.includes('app1.intellechart.net')) {
      showStatus('Please navigate to Intellechart first', 'error');
      return;
    }

    // Send message to background script to execute the PSFHROS command
    chrome.runtime.sendMessage({ 
      type: 'EXECUTE_COMMAND', 
      command: 'sf-insert-psfhros',
      tabId: tab.id 
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error:', chrome.runtime.lastError);
        showStatus('Failed to execute command', 'error');
      } else {
        showStatus('PMH selection triggered!', 'success');
      }
    });
    
  } catch (error) {
    console.error('SightFlow Sidebar: Error executing PSFHROS command', error);
    showStatus('Error: ' + error.message, 'error');
  }
});

// Add keyboard shortcut hints
document.addEventListener('DOMContentLoaded', () => {
  console.log('SightFlow Sidebar: DOM loaded, sidebar ready');
});

