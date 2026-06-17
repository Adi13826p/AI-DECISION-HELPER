/**
 * DecisionAI — Background Service Worker
 */

let pendingMode = 'truth';

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.storage.local.set({
      installedAt: Date.now(),
      settings: { theme: 'dark' }
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {

    case 'LAUNCH_SELECTOR': {
      pendingMode = message.mode || 'truth';
      const tabId = message.tabId;
      if (!tabId) { sendResponse({ success: false, error: 'No tab ID' }); return false; }

      (async () => {
        try {
          await chrome.scripting.executeScript({
            target: { tabId },
            func: (m) => { window.__decisionAiSelectorMode = m; },
            args: [pendingMode]
          });
          await chrome.scripting.executeScript({
            target: { tabId },
            files: ['content/selector.js']
          });
          sendResponse({ success: true });
        } catch (err) {
          sendResponse({ success: false, error: err.message });
        }
      })();
      return true;
    }

    case 'SELECTION_MADE': {
      const { rect, dpr, pageUrl, pageTitle } = message;
      const windowId = sender.tab?.windowId;

      chrome.tabs.captureVisibleTab(windowId, { format: 'png' }, async (dataUrl) => {
        if (chrome.runtime.lastError || !dataUrl) {
          console.error('[DecisionAI] captureVisibleTab error:', chrome.runtime.lastError?.message);
          return;
        }
        try {
          const croppedDataUrl = await cropImage(dataUrl, rect, dpr);
          await chrome.storage.local.set({
            capturedData: {
              image: croppedDataUrl,
              mode: pendingMode,
              pageUrl: pageUrl || '',
              pageTitle: pageTitle || '',
              timestamp: Date.now()
            }
          });
          const viewPath = pendingMode === 'masterscan'
            ? 'views/masterscan/masterscan.html'
            : 'views/truth-layer/truth-layer.html';
          chrome.tabs.create({ url: chrome.runtime.getURL(viewPath) });
        } catch (err) {
          console.error('[DecisionAI] Processing failed:', err);
        }
      });
      return false;
    }

    case 'SELECTION_CANCELLED':
      sendResponse({ success: true });
      return false;

    case 'GET_SETTINGS':
      chrome.storage.local.get(['settings', 'groqApiKey'], (data) => {
        sendResponse({
          success: true,
          settings: data.settings || {},
          hasApiKey: !!(data.groqApiKey && data.groqApiKey.length > 10)
        });
      });
      return true;

    case 'SET_API_KEY':
      if (!message.apiKey) { sendResponse({ success: false, error: 'No key provided' }); return false; }
      chrome.storage.local.set({ groqApiKey: message.apiKey.trim() }, () => {
        sendResponse({ success: true });
      });
      return true;

    case 'GET_ACTIVE_TAB':
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        sendResponse({ success: true, tab: tabs[0] || null });
      });
      return true;

    case 'LOG_ANALYSIS':
      logAnalysis(message.data);
      sendResponse({ success: true });
      return false;

    default:
      return false;
  }
});

async function cropImage(dataUrl, rect, dpr) {
  const resp = await fetch(dataUrl);
  const blob = await resp.blob();
  const bitmap = await createImageBitmap(blob);

  const sx = Math.max(0, Math.round(rect.x * dpr));
  const sy = Math.max(0, Math.round(rect.y * dpr));
  const sw = Math.min(Math.round(rect.width  * dpr), bitmap.width  - sx);
  const sh = Math.min(Math.round(rect.height * dpr), bitmap.height - sy);

  const MAX = 1280;
  const scale = Math.min(1, MAX / Math.max(sw, sh));
  const ow = Math.round(sw * scale);
  const oh = Math.round(sh * scale);

  const canvas = new OffscreenCanvas(ow, oh);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, ow, oh);

  const outBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.88 });
  return blobToDataUrl(outBlob);
}

async function blobToDataUrl(blob) {
  const ab = await blob.arrayBuffer();
  const bytes = new Uint8Array(ab);
  let binary = '';
  const CHUNK = 65536;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + CHUNK, bytes.length)));
  }
  return `data:${blob.type || 'image/jpeg'};base64,` + btoa(binary);
}

async function logAnalysis(data) {
  const result = await chrome.storage.local.get('analysisHistory');
  const history = (result.analysisHistory || []);
  history.unshift({ url: data.url, title: data.title, mode: data.mode, timestamp: Date.now() });
  chrome.storage.local.set({ analysisHistory: history.slice(0, 50) });
}

chrome.tabs.onActivated.addListener(() => chrome.action.setBadgeText({ text: '' }));
chrome.tabs.onUpdated.addListener((_, c) => { if (c.status === 'loading') chrome.action.setBadgeText({ text: '' }); });
