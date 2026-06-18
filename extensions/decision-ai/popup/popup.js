document.addEventListener('DOMContentLoaded', async () => {

  // ── Element refs ────────────────────────────────────────────────────────────
  const homeView      = document.getElementById('homeView');
  const masterScanView= document.getElementById('masterScanView');
  const settingsBtn   = document.getElementById('settingsBtn');
  const settingsPanel = document.getElementById('settingsPanel');
  const apiKeyInput   = document.getElementById('apiKeyInput');
  const saveKeyBtn    = document.getElementById('saveKeyBtn');
  const keyStatus     = document.getElementById('keyStatus');
  const indicatorDot  = document.getElementById('indicatorDot');
  const indicatorLabel= document.getElementById('indicatorLabel');
  const backBtn       = document.getElementById('backBtn');
  const smartyInput   = document.getElementById('smartyInput');
  const smartySearchBtn = document.getElementById('smartySearchBtn');
  const scanScreenBtn   = document.getElementById('scanScreenBtn');

  // ── API key status ───────────────────────────────────────────────────────────
  async function refreshKeyStatus() {
    const resp = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    if (resp.hasApiKey) {
      indicatorDot.className    = 'indicator-dot dot-ok';
      indicatorLabel.textContent = 'API key configured';
    } else {
      indicatorDot.className    = 'indicator-dot dot-warn';
      indicatorLabel.textContent = 'No API key — click ⚙ to set up';
    }
  }

  await refreshKeyStatus();

  chrome.storage.local.get('groqApiKey', (d) => {
    if (d.groqApiKey) apiKeyInput.placeholder = '••••••••' + d.groqApiKey.slice(-4);
  });

  // ── Settings ─────────────────────────────────────────────────────────────────
  settingsBtn.addEventListener('click', () => {
    settingsPanel.classList.toggle('hidden');
    if (!settingsPanel.classList.contains('hidden')) apiKeyInput.focus();
  });

  saveKeyBtn.addEventListener('click', async () => {
    const val = apiKeyInput.value.trim();
    if (!val || val.length < 10) { showKeyStatus('Enter a valid Groq API key', 'error'); return; }
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

  apiKeyInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveKeyBtn.click(); });

  function showKeyStatus(msg, type) {
    keyStatus.textContent = msg;
    keyStatus.className = `key-status key-status-${type}`;
    setTimeout(() => { keyStatus.className = 'key-status hidden'; }, 2500);
  }

  // ── View switching ────────────────────────────────────────────────────────────
  function showMasterScanWorkspace() {
    homeView.classList.add('hidden');
    masterScanView.classList.remove('hidden');
    setTimeout(() => smartyInput.focus(), 120);
  }

  function showHome() {
    masterScanView.classList.add('hidden');
    homeView.classList.remove('hidden');
  }

  backBtn.addEventListener('click', showHome);

  // ── Example chips ─────────────────────────────────────────────────────────────
  const CHIP_EXAMPLES = {
    youtube:  'https://www.youtube.com/watch?v=',
    research: 'https://arxiv.org/abs/',
    blog:     'https://medium.com/@',
    ask:      'Explain to me like I\'m 5: '
  };

  document.querySelectorAll('.ws-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const key = chip.dataset.example;
      smartyInput.value = CHIP_EXAMPLES[key] || '';
      smartyInput.focus();
      smartyInput.setSelectionRange(smartyInput.value.length, smartyInput.value.length);
    });
  });

  // ── Screen selector launcher ──────────────────────────────────────────────────
  async function launchSelector(mode) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;
    if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://') || tab.url?.startsWith('edge://')) {
      alert('DecisionAI cannot run on browser internal pages. Please navigate to a website first.');
      return;
    }
    const resp = await chrome.runtime.sendMessage({ type: 'LAUNCH_SELECTOR', mode, tabId: tab.id });
    if (resp?.success === false) console.error('[DecisionAI] Failed to launch selector:', resp.error);
    window.close();
  }

  // ── Truth Layer ───────────────────────────────────────────────────────────────
  document.getElementById('truthLayerBtn').addEventListener('click', () => launchSelector('truth'));

  // ── MasterScan → show workspace ────────────────────────────────────────────────
  document.getElementById('masterScanBtn').addEventListener('click', showMasterScanWorkspace);

  // ── Scan Screen from workspace ────────────────────────────────────────────────
  scanScreenBtn.addEventListener('click', () => launchSelector('masterscan'));

  // ── Search with Smarty ────────────────────────────────────────────────────────
  smartySearchBtn.addEventListener('click', async () => {
    const query = smartyInput.value.trim();
    if (!query) {
      smartyInput.focus();
      smartyInput.style.borderColor = 'rgba(244,63,94,0.6)';
      setTimeout(() => { smartyInput.style.borderColor = ''; }, 1500);
      return;
    }

    // Show loading state on button
    const btnTitle = smartySearchBtn.querySelector('.ws-action-title');
    const btnDesc  = smartySearchBtn.querySelector('.ws-action-desc');
    const origTitle = btnTitle.textContent;
    const origDesc  = btnDesc.textContent;
    btnTitle.textContent = 'Analyzing…';
    btnDesc.textContent  = 'Sending to Smarty AI';
    smartySearchBtn.classList.add('loading');

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) throw new Error('No active tab found');

      if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://')) {
        alert('DecisionAI cannot run on browser internal pages. Please navigate to a website first.');
        return;
      }

      // First ensure content script is injected
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/content.js']
      }).catch(() => {});

      // Send SMARTY_SEARCH to content script — it shows the overlay and runs the AI call
      await chrome.tabs.sendMessage(tab.id, {
        type: 'SMARTY_SEARCH',
        query,
        pageUrl: tab.url || '',
        pageTitle: tab.title || ''
      });

      window.close();
    } catch (err) {
      console.error('[DecisionAI] Smarty search error:', err);
      btnTitle.textContent = origTitle;
      btnDesc.textContent  = origDesc;
      smartySearchBtn.classList.remove('loading');
    }
  });

  // Allow Enter key (without shift) to trigger Smarty search
  smartyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      smartySearchBtn.click();
    }
  });
});
