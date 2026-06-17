/**
 * DecisionAI — Background Service Worker
 *
 * Handles:
 *  - Extension lifecycle events
 *  - Message routing between popup/views and content scripts
 *  - API key storage management
 *  - (Future) Scheduled background scans
 */

// ── Extension install / update ────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    console.log('[DecisionAI] Extension installed');
    chrome.storage.local.set({
      installedAt: Date.now(),
      settings: {
        theme: 'dark',
        autoAnalyze: false,
        notificationsEnabled: true
      }
    });
  }

  if (reason === 'update') {
    console.log('[DecisionAI] Extension updated');
  }
});

// ── Message routing ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {

    case 'GET_SETTINGS':
      chrome.storage.local.get('settings', (data) => {
        sendResponse({ success: true, settings: data.settings || {} });
      });
      return true; // async response

    case 'SET_API_KEY':
      if (!message.apiKey) {
        sendResponse({ success: false, error: 'No API key provided' });
        return;
      }
      chrome.storage.local.set({ aiApiKey: message.apiKey }, () => {
        sendResponse({ success: true });
      });
      return true;

    case 'SET_AI_BASE_URL':
      chrome.storage.local.set({ aiBaseUrl: message.baseUrl }, () => {
        sendResponse({ success: true });
      });
      return true;

    case 'GET_ACTIVE_TAB':
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        sendResponse({ success: true, tab: tabs[0] || null });
      });
      return true;

    case 'CONTENT_READY':
      // Content script signals it's ready on a new page
      console.log('[DecisionAI] Content script ready on:', sender.tab?.url);
      sendResponse({ success: true });
      return false;

    case 'LOG_ANALYSIS':
      // Store analysis history for future reference
      logAnalysis(message.data);
      sendResponse({ success: true });
      return false;

    default:
      sendResponse({ success: false, error: `Unknown message type: ${message.type}` });
      return false;
  }
});

// ── Analysis history ──────────────────────────────────────────────────────────

async function logAnalysis(data) {
  const result = await chrome.storage.local.get('analysisHistory');
  const history = result.analysisHistory || [];

  history.unshift({
    url:       data.url,
    title:     data.title,
    verdict:   data.verdict,
    score:     data.score,
    timestamp: Date.now()
  });

  // Keep last 50 analyses
  const trimmed = history.slice(0, 50);
  chrome.storage.local.set({ analysisHistory: trimmed });
}

// ── Toolbar badge ─────────────────────────────────────────────────────────────

function setBadge(text, color) {
  chrome.action.setBadgeText({ text });
  if (color) chrome.action.setBadgeBackgroundColor({ color });
}

// Clear badge when tab changes
chrome.tabs.onActivated.addListener(() => {
  setBadge('');
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    setBadge('');
  }
});
