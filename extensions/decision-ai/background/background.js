/**
 * DecisionAI — Background Service Worker
 * Responsibilities: screenshot capture, cropping, messaging to content script.
 * AI analysis is handled directly by the content script.
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
      const tabId    = sender.tab?.id;
      const windowId = sender.tab?.windowId;

      if (!tabId || !windowId) return false;

      // Capture the visible tab (selector overlay is already removed by this point)
      chrome.tabs.captureVisibleTab(windowId, { format: 'png' }, async (dataUrl) => {
        if (chrome.runtime.lastError || !dataUrl) {
          chrome.tabs.sendMessage(tabId, {
            type: 'SHOW_OVERLAY',
            mode: pendingMode,
            error: chrome.runtime.lastError?.message || 'Screen capture failed'
          });
          return;
        }

        try {
          const croppedDataUrl = await cropImage(dataUrl, rect, dpr);

          // Ensure content script is injected before messaging it
          await chrome.scripting.executeScript({
            target: { tabId },
            files: ['content/content.js']
          }).catch(() => {});

          // Send cropped image to content script — it handles the AI call and UI
          chrome.tabs.sendMessage(tabId, {
            type: 'SHOW_OVERLAY',
            mode: pendingMode,
            imageDataUrl: croppedDataUrl,
            pageUrl: pageUrl || '',
            pageTitle: pageTitle || ''
          });

          logAnalysis({ url: pageUrl, title: pageTitle, mode: pendingMode });
        } catch (err) {
          chrome.tabs.sendMessage(tabId, {
            type: 'SHOW_OVERLAY',
            mode: pendingMode,
            error: err.message
          });
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

    case 'FETCH_URL': {
      // Generic URL fetcher — routes from content script to bypass CORS
      (async () => {
        try {
          const resp = await fetch(message.url, {
            headers: {
              'Accept': message.acceptJson
                ? 'application/json,text/javascript,*/*;q=0.9'
                : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              'Cache-Control': 'no-cache'
            }
          });
          const contentType = resp.headers.get('content-type') || '';
          if (contentType.includes('application/pdf')) {
            sendResponse({ success: false, error: 'PDF_NO_PARSE' });
            return;
          }
          if (!resp.ok) {
            sendResponse({ success: false, error: 'HTTP ' + resp.status });
            return;
          }
          const html = await resp.text();
          sendResponse({ success: true, html, contentType });
        } catch (err) {
          sendResponse({ success: false, error: err.message });
        }
      })();
      return true;
    }

    case 'FETCH_YOUTUBE': {
      (async () => {
        try {
          if (message.captUrl) {
            // Fetch caption track JSON — also needs background context to avoid CORS
            const resp = await fetch(message.captUrl + '&fmt=json3');
            if (!resp.ok) { sendResponse({ success: false, error: 'Caption fetch failed: ' + resp.status }); return; }
            const data = await resp.json();
            sendResponse({ success: true, data });
          } else {
            // Fetch YouTube page HTML
            const resp = await fetch('https://www.youtube.com/watch?v=' + message.videoId, {
              headers: {
                'Accept-Language': 'en-US,en;q=0.9',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
              }
            });
            if (!resp.ok) { sendResponse({ success: false, error: 'YouTube fetch failed: ' + resp.status }); return; }
            const html = await resp.text();
            sendResponse({ success: true, html });
          }
        } catch (err) {
          sendResponse({ success: false, error: err.message });
        }
      })();
      return true;
    }

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

// ── Image utilities ────────────────────────────────────────────────────────────

async function cropImage(dataUrl, rect, dpr) {
  const resp   = await fetch(dataUrl);
  const blob   = await resp.blob();
  const bitmap = await createImageBitmap(blob);

  const sx = Math.max(0, Math.round(rect.x * dpr));
  const sy = Math.max(0, Math.round(rect.y * dpr));
  const sw = Math.min(Math.round(rect.width  * dpr), bitmap.width  - sx);
  const sh = Math.min(Math.round(rect.height * dpr), bitmap.height - sy);

  const MAX   = 1280;
  const scale = Math.min(1, MAX / Math.max(sw, sh));
  const ow    = Math.round(sw * scale);
  const oh    = Math.round(sh * scale);

  const canvas = new OffscreenCanvas(ow, oh);
  const ctx    = canvas.getContext('2d');
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, ow, oh);

  const outBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.88 });
  return blobToDataUrl(outBlob);
}

async function blobToDataUrl(blob) {
  const ab    = await blob.arrayBuffer();
  const bytes = new Uint8Array(ab);
  const parts = [];
  const CHUNK = 4096;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    parts.push(String.fromCharCode(...bytes.subarray(i, Math.min(i + CHUNK, bytes.length))));
  }
  return `data:${blob.type || 'image/jpeg'};base64,` + btoa(parts.join(''));
}

async function logAnalysis(data) {
  const result  = await chrome.storage.local.get('analysisHistory');
  const history = result.analysisHistory || [];
  history.unshift({ url: data.url, title: data.title, mode: data.mode, timestamp: Date.now() });
  chrome.storage.local.set({ analysisHistory: history.slice(0, 50) });
}

chrome.tabs.onActivated.addListener(() => chrome.action.setBadgeText({ text: '' }));
chrome.tabs.onUpdated.addListener((_, c) => { if (c.status === 'loading') chrome.action.setBadgeText({ text: '' }); });
