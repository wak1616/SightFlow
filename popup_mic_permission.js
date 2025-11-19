// Microphone Permission Request Page Script

const grantBtn = document.getElementById('grant-btn');
const status = document.getElementById('status');

grantBtn.addEventListener('click', async () => {
  status.textContent = 'Look at the top of Chrome for the permission dialog...';
  status.className = '';
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Stop the stream
    stream.getTracks().forEach(track => track.stop());
    
    status.textContent = '✓ Success! Microphone permission granted. You can close this window.';
    status.className = 'success';
    
    // Auto-close after 2 seconds
    setTimeout(() => {
      window.close();
    }, 2000);
  } catch (error) {
    console.error('Permission error:', error);
    status.className = 'error';
    
    if (error.name === 'NotAllowedError') {
      if (error.message.includes('dismissed')) {
        status.textContent = '⚠️ You dismissed the dialog. Try again and click ALLOW.';
      } else {
        status.textContent = '⚠️ Permission denied. Check chrome://settings/content/microphone';
      }
    } else if (error.name === 'NotFoundError') {
      status.textContent = '⚠️ No microphone found. Please connect a microphone.';
    } else {
      status.textContent = '⚠️ Error: ' + error.message;
    }
  }
});
