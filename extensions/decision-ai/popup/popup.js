document.addEventListener('DOMContentLoaded', async () => {
  const settingsBtn   = document.getElementById('settingsBtn');
  const settingsPanel = document.getElementById('settingsPanel');
  const apiKeyInput   = document.getElementById('apiKeyInput');
  const saveKeyBtn    = document.getElementById('saveKeyBtn');
  const keyStatus     = document.getElementById('keyStatus');
  const indicatorDot  = document.getElementById('indicatorDot');
  const indicatorLabel= document.getElementById('indicatorLabel');

  // Check API key status
  async function refreshKeyStatus() {
    const resp = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    if (resp.hasApiKey) {
      indicatorDot.className   = 'indicator-dot dot-ok';
      indicatorLabel.textContent = 'API key configured';
    } else {
      indicatorDot.className   = 'indicator-dot dot-warn';
      indicatorLabel.textContent = 'No API key — click ⚙ to set up';
    }
  }

  await refreshKeyStatus();

  // Pre-fill masked key if exists
  chrome.storage.local.get('groqApiKey', (d) => {
    if (d.groqApiKey) {
      apiKeyInput.placeholder = '••••••••' + d.groqApiKey.slice(-4);
    }
  });

  // Settings toggle
  settingsBtn.addEventListener('click', () => {
    settingsPanel.classList.toggle('hidden');
    if (!settingsPanel.classList.contains('hidden')) apiKeyInput.focus();
  });

  // Save API key
  saveKeyBtn.addEventListener('click', async () => {
    const val = apiKeyInput.value.trim();
    if (!val || val.length < 10) {
      showKeyStatus('Enter a valid Groq API key', 'error');
      return;
    }
    saveKeyBtn.textContent = 'Saving…';
    saveKeyBtn.disabled = true;
    const resp = await chrome.runtime.sendMessage({ type: 'SET_API_KEY', apiKey: val });
    saveKeyBtn.disabled = false;
    saveKeyBtn.textContent = 'Save';
    if (resp.success) {
      showKeyStatus('✓ Key saved!', 'ok');
      apiKeyInput.value = '';
      apiKeyInput.placeholder = '••••••••' + val.slice(-4);
      await refreshKeyStatus();
      setTimeout(() => settingsPanel.classList.add('hidden'), 1200);
    } else {
      showKeyStatus('Failed to save key', 'error');
    }
  });

  apiKeyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveKeyBtn.click();
  });

  function showKeyStatus(msg, type) {
    keyStatus.textContent = msg;
    keyStatus.className = `key-status key-status-${type}`;
    setTimeout(() => { keyStatus.className = 'key-status hidden'; }, 2500);
  }

  // Launch selector
  async function launchSelector(mode) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    // Check restricted URLs
    if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://') || tab.url?.startsWith('edge://')) {
      alert('DecisionAI cannot run on browser internal pages. Please navigate to a website first.');
      return;
    }

    const resp = await chrome.runtime.sendMessage({ type: 'LAUNCH_SELECTOR', mode, tabId: tab.id });
    if (resp?.success === false) {
      console.error('[DecisionAI] Failed to launch selector:', resp.error);
    }
    window.close();
  }

  document.getElementById('truthLayerBtn').addEventListener('click', () => launchSelector('truth'));
  document.getElementById('masterScanBtn').addEventListener('click', () => launchSelector('masterscan'));
});
