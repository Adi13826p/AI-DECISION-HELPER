/**
 * DecisionAI — Screen Selector
 * Injected on demand. Creates a full-page drag-to-select overlay.
 */
(function () {
  if (window.__decisionAiSelectorActive) return;
  window.__decisionAiSelectorActive = true;

  const mode = window.__decisionAiSelectorMode || 'truth';
  const modeLabel = mode === 'masterscan' ? 'MasterScan' : 'Truth Layer';
  const accentColor = mode === 'masterscan' ? '#06b6d4' : '#a855f7';

  let startX = 0, startY = 0, currX = 0, currY = 0;
  let dragging = false;

  function sp(el, prop, val) {
    el.style.setProperty(prop, val, 'important');
  }

  function applyStyles(el, styles) {
    for (const [k, v] of Object.entries(styles)) {
      sp(el, k, v);
    }
  }

  const root = document.createElement('div');
  applyStyles(root, {
    position: 'fixed', inset: '0',
    'z-index': '2147483647',
    cursor: 'crosshair',
    'user-select': 'none',
    '-webkit-user-select': 'none',
    'pointer-events': 'all',
    overflow: 'hidden'
  });

  const mkDark = () => {
    const d = document.createElement('div');
    applyStyles(d, {
      position: 'absolute',
      background: 'rgba(0,0,0,0.52)',
      'pointer-events': 'none'
    });
    return d;
  };

  const dTop = mkDark(), dBottom = mkDark(), dLeft = mkDark(), dRight = mkDark();

  applyStyles(dTop,    { top: '0', left: '0', right: '0', height: '100%' });
  applyStyles(dBottom, { display: 'none' });
  applyStyles(dLeft,   { display: 'none' });
  applyStyles(dRight,  { display: 'none' });

  const selBox = document.createElement('div');
  applyStyles(selBox, {
    position: 'absolute',
    border: `2px dashed ${accentColor}`,
    'box-shadow': `0 0 0 1px ${accentColor}44, inset 0 0 0 9999px rgba(255,255,255,0.03)`,
    'pointer-events': 'none',
    display: 'none',
    'border-radius': '2px'
  });

  const tooltip = document.createElement('div');
  applyStyles(tooltip, {
    position: 'absolute',
    background: accentColor,
    color: 'white',
    font: '600 11px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    padding: '3px 8px',
    'border-radius': '4px',
    'pointer-events': 'none',
    display: 'none',
    'white-space': 'nowrap',
    'letter-spacing': '0.02em'
  });

  const banner = document.createElement('div');
  banner.innerHTML = `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style="flex-shrink:0">
      <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="${accentColor}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="${accentColor}" stroke-width="2" stroke-linejoin="round"/>
    </svg>
    <strong style="color:${accentColor}">DecisionAI</strong>
    <span style="color:rgba(255,255,255,0.35)">·</span>
    <span style="color:rgba(255,255,255,0.9)">Drag to select area for <strong style="color:white">${modeLabel}</strong></span>
    <span style="color:rgba(255,255,255,0.35);font-size:10px;margin-left:4px">ESC to cancel</span>
  `;
  applyStyles(banner, {
    position: 'absolute',
    top: '18px', left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(8,4,20,0.95)',
    color: 'white',
    font: '500 13px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    padding: '10px 18px',
    'border-radius': '100px',
    'pointer-events': 'none',
    display: 'flex',
    'align-items': 'center',
    gap: '7px',
    border: `1px solid ${accentColor}55`,
    'box-shadow': '0 4px 24px rgba(0,0,0,0.6)',
    'white-space': 'nowrap',
    'z-index': '1'
  });

  root.append(dTop, dBottom, dLeft, dRight, selBox, tooltip, banner);
  (document.documentElement || document.body).appendChild(root);

  function getRect() {
    const x = Math.min(startX, currX);
    const y = Math.min(startY, currY);
    const w = Math.abs(currX - startX);
    const h = Math.abs(currY - startY);
    return { x, y, w, h };
  }

  function updateUI() {
    const { x, y, w, h } = getRect();
    const vw = window.innerWidth, vh = window.innerHeight;

    sp(dTop,    'height', y + 'px'); sp(dTop, 'display', 'block');
    sp(dTop,    'left', '0'); sp(dTop, 'right', '0'); sp(dTop, 'top', '0');
    sp(dBottom, 'top', (y + h) + 'px'); sp(dBottom, 'left', '0'); sp(dBottom, 'right', '0'); sp(dBottom, 'bottom', '0'); sp(dBottom, 'display', 'block');
    sp(dLeft,   'left', '0'); sp(dLeft, 'top', y + 'px'); sp(dLeft, 'width', x + 'px'); sp(dLeft, 'height', h + 'px'); sp(dLeft, 'display', 'block');
    sp(dRight,  'left', (x + w) + 'px'); sp(dRight, 'top', y + 'px'); sp(dRight, 'right', '0'); sp(dRight, 'height', h + 'px'); sp(dRight, 'display', 'block');

    if (w > 4 && h > 4) {
      sp(selBox, 'left', x + 'px'); sp(selBox, 'top', y + 'px');
      sp(selBox, 'width', w + 'px'); sp(selBox, 'height', h + 'px');
      sp(selBox, 'display', 'block');
    }

    if (w > 30 && h > 30) {
      tooltip.textContent = `${Math.round(w)} × ${Math.round(h)}`;
      sp(tooltip, 'left', Math.min(x + w + 8, vw - 95) + 'px');
      sp(tooltip, 'top',  Math.max(y - 26, 8) + 'px');
      sp(tooltip, 'display', 'block');
    } else {
      sp(tooltip, 'display', 'none');
    }
  }

  root.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    dragging = true;
    startX = currX = e.clientX;
    startY = currY = e.clientY;
  }, true);

  root.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    e.preventDefault();
    currX = e.clientX; currY = e.clientY;
    updateUI();
  }, true);

  root.addEventListener('mouseup', (e) => {
    if (!dragging) return;
    e.preventDefault(); e.stopPropagation();
    dragging = false;
    currX = e.clientX; currY = e.clientY;

    const { x, y, w, h } = getRect();
    if (w < 20 || h < 20) { updateUI(); return; }

    sp(selBox, 'border', `2px solid ${accentColor}`);
    sp(selBox, 'background', `${accentColor}18`);
    sp(tooltip, 'display', 'none');

    setTimeout(() => {
      cleanup();
      try {
        chrome.runtime.sendMessage({
          type: 'SELECTION_MADE',
          rect: { x: Math.round(x), y: Math.round(y), width: Math.round(w), height: Math.round(h) },
          dpr: window.devicePixelRatio || 1,
          pageUrl: window.location.href,
          pageTitle: document.title
        });
      } catch (_) {}
    }, 130);
  }, true);

  document.addEventListener('keydown', onKey, true);

  function onKey(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      cleanup();
      try { chrome.runtime.sendMessage({ type: 'SELECTION_CANCELLED' }); } catch (_) {}
    }
  }

  function cleanup() {
    root.remove();
    document.removeEventListener('keydown', onKey, true);
    window.__decisionAiSelectorActive = false;
  }
})();
