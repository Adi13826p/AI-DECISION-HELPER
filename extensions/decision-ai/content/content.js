/**
 * DecisionAI — Content Script
 * Handles page data extraction and renders the in-page AI overlay popup.
 */

(function () {
  'use strict';

  if (window.__decisionAiInjected) return;
  window.__decisionAiInjected = true;

  chrome.runtime.sendMessage({ type: 'CONTENT_READY' }).catch(() => {});

  // ── Product data extraction ─────────────────────────────────────────────────

  function extractProductData() {
    const data = {
      url: window.location.href,
      domain: window.location.hostname.replace('www.', ''),
      title: document.title,
      price: null, currency: null, rating: null, reviewCount: null,
      description: null, brand: null, category: null, inStock: null,
      images: [], breadcrumbs: []
    };
    trySchemaOrg(data);
    if (!data.title || data.title === document.title) data.ogTitle = getMeta('og:title');
    data.ogImage = getMeta('og:image');
    if (!data.price) data.price =
      getContent('[itemprop="price"]') ||
      getText('.a-price .a-offscreen, #priceblock_ourprice, #priceblock_dealprice') ||
      getText('.price, .product-price, [data-price], .offer-price, .sale-price, .js-price') || null;
    if (!data.rating) data.rating =
      getContent('[itemprop="ratingValue"]') ||
      getAttr('[data-rating]', 'data-rating') ||
      getText('.a-icon-alt')?.match(/[\d.]+/)?.[0] || null;
    if (!data.reviewCount) data.reviewCount =
      getContent('[itemprop="reviewCount"]') ||
      getText('[data-hook="total-review-count"], #acrCustomerReviewText')?.replace(/[^0-9,]/g, '') || null;
    if (!data.description) data.description =
      getMeta('description') ||
      getContent('[itemprop="description"]') ||
      getText('.product-description, #productDescription, .overview')?.substring(0, 600) || null;
    if (!data.brand) data.brand =
      getContent('[itemprop="brand"] [itemprop="name"], [itemprop="brand"]') ||
      getText('.brand, .product-brand, [data-brand]') || null;
    const imgs = document.querySelectorAll('[itemprop="image"], .product-image img, #imgBlkFront, #landingImage');
    imgs.forEach(img => { const src = img.src || img.getAttribute('data-src'); if (src && !data.images.includes(src)) data.images.push(src); });
    const bc = document.querySelectorAll('[aria-label="breadcrumb"] a, .breadcrumb a, nav[class*="breadcrumb"] a');
    bc.forEach(el => data.breadcrumbs.push(el.textContent.trim()));
    const stockEl = document.querySelector('[itemprop="availability"]');
    if (stockEl) data.inStock = (stockEl.content || stockEl.textContent || '').toLowerCase().includes('instock');
    data.bodyText = document.body.innerText?.substring(0, 3000) || '';
    return data;
  }

  function trySchemaOrg(data) {
    try {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of scripts) {
        const json  = JSON.parse(script.textContent);
        const items = Array.isArray(json) ? json : [json];
        for (const item of items) {
          const type = item['@type'];
          if (type === 'Product' || type === 'https://schema.org/Product') {
            data.title       = item.name || data.title;
            data.description = item.description || data.description;
            data.brand       = item.brand?.name || data.brand;
            const offer = item.offers || item.Offers;
            if (offer) {
              const first = Array.isArray(offer) ? offer[0] : offer;
              data.price    = first.price ? `${first.priceCurrency || ''}${first.price}` : data.price;
              data.currency = first.priceCurrency || null;
              data.inStock  = (first.availability || '').toLowerCase().includes('instock');
            }
            const agg = item.aggregateRating;
            if (agg) { data.rating = agg.ratingValue || data.rating; data.reviewCount = agg.reviewCount || agg.ratingCount || data.reviewCount; }
            return;
          }
        }
      }
    } catch { /* ignore */ }
  }

  function getText(selector) { return document.querySelector(selector)?.textContent?.trim() || null; }
  function getContent(selector) { const el = document.querySelector(selector); return el?.content?.trim() || el?.getAttribute('content')?.trim() || null; }
  function getAttr(selector, attr) { return document.querySelector(selector)?.getAttribute(attr)?.trim() || null; }
  function getMeta(name) { return document.querySelector(`meta[name="${name}"], meta[property="${name}"]`)?.getAttribute('content')?.trim() || null; }

  // ── Message listener ────────────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    switch (message.type) {

      case 'EXTRACT_PRODUCT_DATA':
        sendResponse({ success: true, data: extractProductData() });
        return false;

      case 'GET_PAGE_META':
        sendResponse({ success: true, url: window.location.href, title: document.title, favicon: document.querySelector('link[rel~="icon"]')?.href || null });
        return false;

      case 'SHOW_OVERLAY':
        showOverlay(message.mode, message.imageDataUrl, message.pageUrl, message.pageTitle);
        return false;

      case 'OVERLAY_RESULT':
        overlayShowResult(message.result, message.mode);
        return false;

      case 'OVERLAY_ERROR':
        overlayShowError(message.error);
        return false;

      default:
        return false;
    }
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // OVERLAY UI
  // ══════════════════════════════════════════════════════════════════════════════

  let overlayRoot   = null;
  let overlayPanel  = null;
  let currentMode   = 'truth';
  let currentImage  = null;
  let dragState     = null;

  // Apply style using !important to beat page styles
  function sp(el, styles) {
    for (const [k, v] of Object.entries(styles)) {
      el.style.setProperty(k, String(v), 'important');
    }
  }

  function esc(s) {
    if (s == null) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Create / destroy ──────────────────────────────────────────────────────

  function removeOverlay() {
    if (overlayRoot) { overlayRoot.remove(); overlayRoot = null; overlayPanel = null; }
    document.removeEventListener('keydown', handleEsc, true);
  }

  function handleEsc(e) {
    if (e.key === 'Escape') { e.stopPropagation(); removeOverlay(); }
  }

  function showOverlay(mode, imageDataUrl, pageUrl, pageTitle) {
    removeOverlay();
    currentMode  = mode || 'truth';
    currentImage = imageDataUrl;

    const isScanner = currentMode === 'masterscan';
    const accent    = isScanner ? '#06b6d4' : '#a855f7';
    const label     = isScanner ? 'MasterScan' : 'Truth Layer';

    // ── Root container (acts as drag layer) ─────────────────────────────────
    overlayRoot = document.createElement('div');
    overlayRoot.id = '__dai-overlay-root';
    sp(overlayRoot, {
      position: 'fixed', inset: '0',
      'z-index': '2147483646',
      'pointer-events': 'none',
      'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    });

    // Inject keyframes once
    if (!document.getElementById('__dai-styles')) {
      const style = document.createElement('style');
      style.id = '__dai-styles';
      style.textContent = `
        @keyframes __dai-slidein { from { opacity:0; transform:translateX(40px) scale(0.97); } to { opacity:1; transform:translateX(0) scale(1); } }
        @keyframes __dai-spin    { to { transform: rotate(360deg); } }
        @keyframes __dai-pulse   { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes __dai-fadein  { from { opacity:0; } to { opacity:1; } }
        #__dai-overlay-panel::-webkit-scrollbar { width: 4px; }
        #__dai-overlay-panel::-webkit-scrollbar-track { background: rgba(255,255,255,0.04); }
        #__dai-overlay-panel::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
      `;
      document.head.appendChild(style);
    }

    // ── Panel ────────────────────────────────────────────────────────────────
    overlayPanel = document.createElement('div');
    overlayPanel.id = '__dai-overlay-panel';
    sp(overlayPanel, {
      position: 'fixed',
      top: '18px',
      right: '18px',
      width: '540px',
      'max-height': 'calc(100vh - 36px)',
      background: '#0e0b1a',
      border: `1px solid ${accent}44`,
      'border-radius': '18px',
      'box-shadow': `0 8px 48px rgba(0,0,0,0.7), 0 0 0 1px ${accent}22, 0 24px 64px ${accent}18`,
      display: 'flex',
      'flex-direction': 'column',
      overflow: 'hidden',
      animation: '__dai-slidein 0.35s cubic-bezier(0.16,1,0.3,1) both',
      'pointer-events': 'all',
      'user-select': 'none',
      '-webkit-user-select': 'none'
    });

    // ── Header (drag handle) ─────────────────────────────────────────────────
    const header = document.createElement('div');
    sp(header, {
      display: 'flex', 'align-items': 'center', gap: '10px',
      padding: '14px 16px 12px',
      background: `linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)`,
      'border-bottom': `1px solid ${accent}22`,
      cursor: 'grab',
      'flex-shrink': '0'
    });

    // Logo mark
    const logoMark = document.createElement('div');
    sp(logoMark, {
      width: '30px', height: '30px',
      background: `linear-gradient(135deg, ${accent}30, ${accent}10)`,
      border: `1px solid ${accent}55`,
      'border-radius': '9px',
      display: 'flex', 'align-items': 'center', 'justify-content': 'center',
      'flex-shrink': '0',
      'box-shadow': `0 0 14px ${accent}30`
    });
    logoMark.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" style="color:${accent}"><path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`;

    // Title
    const titleWrap = document.createElement('div');
    sp(titleWrap, { flex: '1', 'min-width': '0' });
    titleWrap.innerHTML = `
      <div style="display:flex;align-items:center;gap:7px">
        <span style="font-size:13px;font-weight:700;color:#f0eeff;letter-spacing:-0.3px">Decision<span style="color:${accent}">AI</span></span>
        <span style="color:rgba(240,238,255,0.3);font-size:12px">·</span>
        <span style="font-size:12px;font-weight:600;color:rgba(240,238,255,0.8)">${label}</span>
        <span style="font-size:9px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;background:rgba(16,185,129,0.15);color:#10b981;border:1px solid rgba(16,185,129,0.3);border-radius:100px;padding:2px 7px;margin-left:2px">LIVE</span>
      </div>`;

    // Close button
    const closeBtn = document.createElement('button');
    sp(closeBtn, {
      width: '28px', height: '28px', 'border-radius': '8px',
      border: '1px solid rgba(255,255,255,0.1)',
      background: 'rgba(255,255,255,0.06)',
      color: 'rgba(240,238,255,0.6)',
      cursor: 'pointer', display: 'flex', 'align-items': 'center', 'justify-content': 'center',
      'flex-shrink': '0', transition: 'background 0.15s'
    });
    closeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
    closeBtn.addEventListener('mouseenter', () => { sp(closeBtn, { background: 'rgba(255,255,255,0.12)' }); });
    closeBtn.addEventListener('mouseleave', () => { sp(closeBtn, { background: 'rgba(255,255,255,0.06)' }); });
    closeBtn.addEventListener('click', removeOverlay);

    header.append(logoMark, titleWrap, closeBtn);

    // ── Content area ─────────────────────────────────────────────────────────
    const content = document.createElement('div');
    content.id = '__dai-content';
    sp(content, {
      flex: '1', 'overflow-y': 'auto', 'overflow-x': 'hidden',
      'min-height': '0'
    });

    // Loading state
    const loadingEl = document.createElement('div');
    loadingEl.id = '__dai-loading';
    sp(loadingEl, { padding: '28px 20px', display: 'flex', 'flex-direction': 'column', gap: '20px', animation: '__dai-fadein 0.25s ease both' });
    loadingEl.innerHTML = buildLoadingHTML(imageDataUrl, accent, label);

    content.appendChild(loadingEl);

    // ── Bottom bar ───────────────────────────────────────────────────────────
    const bottomBar = document.createElement('div');
    bottomBar.id = '__dai-bottom';
    sp(bottomBar, {
      display: 'none',
      gap: '8px', padding: '12px 16px',
      'border-top': 'rgba(255,255,255,0.07) solid 1px',
      'flex-shrink': '0',
      background: 'rgba(255,255,255,0.02)'
    });

    overlayPanel.append(header, content, bottomBar);
    overlayRoot.appendChild(overlayPanel);
    document.documentElement.appendChild(overlayRoot);
    document.addEventListener('keydown', handleEsc, true);

    // Dragging
    makeDraggable(header, overlayPanel);
  }

  // ── Dragging ──────────────────────────────────────────────────────────────

  function makeDraggable(handle, panel) {
    let ox = 0, oy = 0, startX = 0, startY = 0, isDragging = false;

    handle.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return;
      e.preventDefault();
      isDragging = true;
      const rect = panel.getBoundingClientRect();
      startX = e.clientX; startY = e.clientY;
      ox = rect.left;     oy = rect.top;
      sp(handle, { cursor: 'grabbing' });
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const nx = Math.max(0, Math.min(window.innerWidth  - panel.offsetWidth,  ox + dx));
      const ny = Math.max(0, Math.min(window.innerHeight - panel.offsetHeight, oy + dy));
      sp(panel, { left: nx + 'px', top: ny + 'px', right: 'auto', bottom: 'auto' });
    }, true);

    document.addEventListener('mouseup', () => {
      if (isDragging) { isDragging = false; sp(handle, { cursor: 'grab' }); }
    }, true);
  }

  // ── Loading HTML ─────────────────────────────────────────────────────────

  function buildLoadingHTML(imageDataUrl, accent, label) {
    const previewHTML = imageDataUrl
      ? `<div style="width:100%;height:120px;background:url('${imageDataUrl}') center/cover no-repeat;border-radius:10px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;margin-bottom:4px;opacity:0.85"></div>`
      : '';
    return `
      ${previewHTML}
      <div style="display:flex;flex-direction:column;align-items:center;gap:16px;padding:8px 0">
        <div style="position:relative;width:52px;height:52px">
          <svg style="animation:__dai-spin 1s linear infinite" width="52" height="52" viewBox="0 0 52 52" fill="none">
            <circle cx="26" cy="26" r="22" stroke="rgba(255,255,255,0.07)" stroke-width="3"/>
            <circle cx="26" cy="26" r="22" stroke="${accent}" stroke-width="3" stroke-linecap="round" stroke-dasharray="35 104" stroke-dashoffset="0"/>
          </svg>
          <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="color:${accent}"><path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>
          </div>
        </div>
        <div style="text-align:center">
          <div style="font-size:15px;font-weight:700;color:#f0eeff;margin-bottom:5px">Analyzing with AI…</div>
          <div style="font-size:12px;color:rgba(240,238,255,0.45)">Running ${label} on your selection</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;width:100%;max-width:280px">
          ${buildStep(1, 'Capturing selection', accent)}
          ${buildStep(2, 'Processing with vision AI', accent)}
          ${buildStep(3, 'Generating insights', accent)}
        </div>
      </div>`;
  }

  function buildStep(n, text, accent) {
    return `
      <div style="display:flex;align-items:center;gap:10px;animation:__dai-fadein ${0.15 * n}s ease ${0.3 * (n-1)}s both">
        <div style="width:22px;height:22px;border-radius:50%;background:${accent}20;border:1px solid ${accent}44;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:10px;font-weight:700;color:${accent}">${n}</div>
        <span style="font-size:12px;color:rgba(240,238,255,0.6)">${text}</span>
      </div>`;
  }

  // ── Show result ───────────────────────────────────────────────────────────

  function overlayShowResult(result, mode) {
    if (!overlayPanel) return;
    const content = document.getElementById('__dai-content');
    if (!content) return;

    const isScanner = mode === 'masterscan';
    const accent    = isScanner ? '#06b6d4' : '#a855f7';

    const resultsEl = document.createElement('div');
    sp(resultsEl, { animation: '__dai-fadein 0.3s ease both' });

    if (isScanner) {
      resultsEl.innerHTML = buildMasterScanHTML(result, accent);
    } else {
      resultsEl.innerHTML = buildTruthLayerHTML(result, accent);
    }

    content.innerHTML = '';
    content.appendChild(resultsEl);

    // Show bottom bar
    const bottomBar = document.getElementById('__dai-bottom');
    if (bottomBar) {
      sp(bottomBar, { display: 'flex' });
      bottomBar.innerHTML = buildBottomBarHTML(accent);
      wireBottomBar(bottomBar, result, mode);
    }
  }

  // ── Show error ────────────────────────────────────────────────────────────

  function overlayShowError(errMsg) {
    if (!overlayPanel) return;
    const content = document.getElementById('__dai-content');
    if (!content) return;

    let title = 'Analysis failed';
    let desc  = errMsg || 'Something went wrong. Please try again.';

    if (errMsg === 'NO_API_KEY') {
      title = 'No API key found';
      desc  = 'Add your free Groq API key via the DecisionAI extension icon → ⚙ Settings. Get one free at console.groq.com';
    } else if (errMsg === 'INVALID_API_KEY') {
      title = 'Invalid API key';
      desc  = 'Your Groq API key is invalid. Check it in extension settings (⚙).';
    }

    content.innerHTML = `
      <div style="padding:32px 20px;display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center;animation:__dai-fadein 0.25s ease both">
        <div style="width:52px;height:52px;border-radius:50%;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);display:flex;align-items:center;justify-content:center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 8v4M12 16h.01" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="10" stroke="#ef4444" stroke-width="1.5"/></svg>
        </div>
        <div>
          <div style="font-size:15px;font-weight:700;color:#f0eeff;margin-bottom:6px">${esc(title)}</div>
          <div style="font-size:12px;color:rgba(240,238,255,0.5);line-height:1.6;max-width:340px">${esc(desc)}</div>
        </div>
        <button onclick="window.__daiScanAgain && window.__daiScanAgain()" style="margin-top:4px;padding:9px 20px;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);border-radius:10px;color:#ef4444;font-size:12px;font-weight:600;cursor:pointer">Try again</button>
      </div>`;
  }

  // ── Truth Layer HTML ──────────────────────────────────────────────────────

  function buildTruthLayerHTML(d, accent) {
    const p      = d.product || {};
    const score  = d.truthScore ?? 0;
    const scoreColor = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
    const v      = d.verdict || {};
    const vtype  = v.type || 'caution';
    const vColors = { buy: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)', text: '#10b981' }, caution: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', text: '#f59e0b' }, avoid: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)', text: '#ef4444' } };
    const vc     = vColors[vtype] || vColors.caution;
    const r      = d.reviews || {};
    const pi     = d.priceIntel || {};
    const comps  = d.competitors || [];

    const prosHTML    = (r.pros || []).map(x => listItem(x, '#10b981')).join('');
    const consHTML    = (r.cons || []).map(x => listItem(x, '#ef4444')).join('');
    const hiddenHTML  = (r.hiddenComplaints || []).map(x => `<div style="font-size:11.5px;color:rgba(240,238,255,0.6);padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05)">${esc(x)}</div>`).join('');
    const altsHTML    = (pi.alternatives || []).map(a => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
        <span style="font-size:12px;color:rgba(240,238,255,0.7)">${esc(a.store)}</span>
        <div style="display:flex;align-items:center;gap:8px">
          ${a.note ? `<span style="font-size:11px;color:rgba(240,238,255,0.4)">${esc(a.note)}</span>` : ''}
          <span style="font-size:13px;font-weight:700;color:#f0eeff">${esc(a.estimatedPrice)}</span>
        </div>
      </div>`).join('');
    const compsHTML   = comps.map(c => `
      <div style="padding:10px 12px;background:rgba(255,255,255,0.03);border-radius:10px;border:1px solid rgba(255,255,255,0.06)">
        <div style="font-size:12.5px;font-weight:600;color:#f0eeff;margin-bottom:3px">${esc(c.name)}</div>
        <div style="font-size:11.5px;color:rgba(240,238,255,0.5)">${esc(c.why)}${c.betterFor ? ` · Better for: ${esc(c.betterFor)}` : ''}</div>
      </div>`).join('');

    return `
      <div style="padding:16px 16px 20px;display:flex;flex-direction:column;gap:16px">

        <!-- Score + Verdict -->
        <div style="display:flex;gap:12px;align-items:flex-start">
          <div style="display:flex;flex-direction:column;align-items:center;padding:12px 16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;flex-shrink:0;min-width:80px">
            <div style="font-size:36px;font-weight:800;color:${scoreColor};line-height:1">${score}</div>
            <div style="font-size:10px;font-weight:600;color:${scoreColor};letter-spacing:0.5px;margin-top:3px;text-transform:uppercase">${esc(d.scoreLabel || '')}</div>
            <div style="font-size:9.5px;color:rgba(240,238,255,0.35);margin-top:2px">Truth Score</div>
          </div>
          <div style="flex:1;background:${vc.bg};border:1px solid ${vc.border};border-radius:14px;padding:12px 14px">
            <div style="font-size:18px;margin-bottom:4px">${esc(v.emoji || '')}</div>
            <div style="font-size:13px;font-weight:700;color:${vc.text};margin-bottom:5px">${esc(v.label || 'See below')}</div>
            <div style="font-size:11.5px;color:rgba(240,238,255,0.55);line-height:1.55">${esc(v.reasoning || '')}</div>
          </div>
        </div>

        <!-- Product info -->
        ${p.name ? section('Product', accent, `
          <div style="display:flex;flex-direction:column;gap:4px">
            <div style="font-size:14px;font-weight:700;color:#f0eeff">${esc(p.name)}</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">
              ${p.price    ? badge(p.price, accent) : ''}
              ${p.brand    ? badge(p.brand, 'rgba(255,255,255,0.2)') : ''}
              ${p.store    ? badge(p.store, 'rgba(255,255,255,0.2)') : ''}
              ${p.rating   ? badge('★ ' + p.rating + (p.reviewCount ? ' · ' + p.reviewCount + ' reviews' : ''), '#f59e0b') : ''}
              ${p.model    ? badge(p.model, 'rgba(255,255,255,0.15)') : ''}
            </div>
          </div>`) : ''}

        <!-- Pros & Cons -->
        ${(r.pros?.length || r.cons?.length) ? section('Pros & Cons', accent, `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div>
              <div style="font-size:10px;font-weight:700;color:#10b981;letter-spacing:0.6px;text-transform:uppercase;margin-bottom:6px">Pros</div>
              <ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px">${prosHTML || '<li style="font-size:11.5px;color:rgba(240,238,255,0.35)">—</li>'}</ul>
            </div>
            <div>
              <div style="font-size:10px;font-weight:700;color:#ef4444;letter-spacing:0.6px;text-transform:uppercase;margin-bottom:6px">Cons</div>
              <ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px">${consHTML || '<li style="font-size:11.5px;color:rgba(240,238,255,0.35)">—</li>'}</ul>
            </div>
          </div>
          ${r.summary ? `<p style="font-size:11.5px;color:rgba(240,238,255,0.5);line-height:1.55;margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.07)">${esc(r.summary)}</p>` : ''}
          ${hiddenHTML ? `<div style="margin-top:10px;padding:10px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:10px"><div style="font-size:10px;font-weight:700;color:#f59e0b;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:6px">⚠ Hidden Complaints</div>${hiddenHTML}</div>` : ''}
        `) : ''}

        <!-- Price intelligence -->
        ${(pi.currentPrice || pi.alternatives?.length) ? section('Price Intelligence', accent, `
          <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.07)">
            <div>
              <div style="font-size:10.5px;color:rgba(240,238,255,0.4);text-transform:uppercase;letter-spacing:0.5px">Current Price</div>
              <div style="font-size:20px;font-weight:800;color:#f0eeff">${esc(pi.currentPrice || '—')}</div>
              ${pi.fairPrice ? `<div style="font-size:11px;color:rgba(240,238,255,0.4)">Fair value: ${esc(pi.fairPrice)}</div>` : ''}
            </div>
            ${pi.dealRating ? `<div style="padding:5px 12px;background:${pi.dealRating === 'Great Deal' ? 'rgba(16,185,129,0.15)' : pi.dealRating === 'Overpriced' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)'};border:1px solid ${pi.dealRating === 'Great Deal' ? 'rgba(16,185,129,0.3)' : pi.dealRating === 'Overpriced' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'};border-radius:100px;font-size:11.5px;font-weight:700;color:${pi.dealRating === 'Great Deal' ? '#10b981' : pi.dealRating === 'Overpriced' ? '#ef4444' : '#f59e0b'}">${esc(pi.dealRating)}</div>` : ''}
          </div>
          ${altsHTML}
          ${d.buyTiming ? `<div style="margin-top:8px;font-size:11.5px;color:rgba(240,238,255,0.5)"><span style="color:rgba(240,238,255,0.7);font-weight:600">Buy timing:</span> ${esc(d.buyTiming.reason)}</div>` : ''}
        `) : ''}

        <!-- Competitors -->
        ${comps.length ? section('Better Alternatives', accent, `<div style="display:flex;flex-direction:column;gap:7px">${compsHTML}</div>`) : ''}

      </div>`;
  }

  // ── MasterScan HTML ───────────────────────────────────────────────────────

  function buildMasterScanHTML(d, accent) {
    const ct       = d.contentType || 'general';
    const ctLabel  = d.contentLabel || 'Content';
    const previewHTML = currentImage
      ? `<div style="width:100%;height:100px;background:url('${currentImage}') center/cover no-repeat;border-bottom:1px solid rgba(255,255,255,0.07);opacity:0.75;flex-shrink:0"></div>`
      : '';

    let bodyHTML = '';

    if (ct === 'article' && d.article) {
      const a = d.article;
      bodyHTML = `
        ${a.summary ? section('Summary', accent, `<p style="font-size:12.5px;color:rgba(240,238,255,0.7);line-height:1.65">${esc(a.summary)}</p>`) : ''}
        ${(a.keyPoints?.length) ? section('Key Points', accent, `<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px">${(a.keyPoints||[]).map(x => listItem(x, accent)).join('')}</ul>`) : ''}
        ${(a.flashcards?.length) ? section('Flashcards', accent, flashcardsHTML(a.flashcards, accent)) : ''}
        ${a.sentiment ? infoRow('Sentiment', a.sentiment, accent) : ''}
        ${a.readingTime ? infoRow('Reading time', a.readingTime, accent) : ''}
      `;
    } else if (ct === 'research_paper' && d.research) {
      const r = d.research;
      bodyHTML = `
        ${r.abstract ? section('Abstract', accent, `<p style="font-size:12.5px;color:rgba(240,238,255,0.7);line-height:1.65">${esc(r.abstract)}</p>`) : ''}
        ${r.simplifiedExplanation ? section('Plain English', accent, `<p style="font-size:12.5px;color:rgba(240,238,255,0.7);line-height:1.65">${esc(r.simplifiedExplanation)}</p>`) : ''}
        ${(r.findings?.length) ? section('Key Findings', accent, `<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px">${(r.findings||[]).map(x => listItem(x, accent)).join('')}</ul>`) : ''}
        ${r.methodology ? infoRow('Methodology', r.methodology, accent) : ''}
        ${r.conclusions ? section('Conclusions', accent, `<p style="font-size:12px;color:rgba(240,238,255,0.6);line-height:1.6">${esc(r.conclusions)}</p>`) : ''}
        ${(r.flashcards?.length) ? section('Flashcards', accent, flashcardsHTML(r.flashcards, accent)) : ''}
      `;
    } else if (ct === 'math' && d.math) {
      const m = d.math;
      bodyHTML = `
        ${m.problem ? section('Problem', accent, `<p style="font-size:13px;color:rgba(240,238,255,0.8);font-family:monospace;line-height:1.6">${esc(m.problem)}</p>`) : ''}
        ${m.solution ? section('Solution', accent, `<div style="font-size:20px;font-weight:800;color:${accent};text-align:center;padding:8px 0">${esc(m.solution)}</div>`) : ''}
        ${(m.steps?.length) ? section('Step-by-Step', accent, `<div style="display:flex;flex-direction:column;gap:8px">${(m.steps||[]).map(s => `<div style="display:flex;gap:10px;align-items:flex-start"><div style="width:22px;height:22px;border-radius:50%;background:${accent}20;border:1px solid ${accent}44;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:${accent};flex-shrink:0">${s.step}</div><div><div style="font-size:12.5px;color:rgba(240,238,255,0.8)">${esc(s.description)}</div>${s.result ? `<div style="font-size:11.5px;color:${accent};margin-top:2px">= ${esc(s.result)}</div>` : ''}</div></div>`).join('')}</div>`) : ''}
        ${m.difficulty ? infoRow('Difficulty', m.difficulty, accent) : ''}
      `;
    } else if (ct === 'job_posting' && d.job) {
      const j = d.job;
      bodyHTML = `
        <div style="padding:14px 16px 0">
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">
            ${j.company  ? badge(j.company, accent) : ''}
            ${j.role     ? badge(j.role, 'rgba(255,255,255,0.15)') : ''}
            ${j.location ? badge('📍 ' + j.location, 'rgba(255,255,255,0.1)') : ''}
            ${j.salary   ? badge('💰 ' + j.salary, 'rgba(16,185,129,0.2)') : ''}
          </div>
        </div>
        ${(j.requirements?.length) ? section('Requirements', accent, `<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px">${(j.requirements||[]).map(x => listItem(x, accent)).join('')}</ul>`) : ''}
        ${(j.skills?.length) ? section('Key Skills', accent, `<div style="display:flex;flex-wrap:wrap;gap:6px">${(j.skills||[]).map(s => `<span style="font-size:11px;font-weight:600;color:${accent};background:${accent}15;border:1px solid ${accent}30;border-radius:100px;padding:3px 10px">${esc(s)}</span>`).join('')}</div>`) : ''}
        ${(j.applicationTips?.length) ? section('Tips to Apply', accent, `<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px">${(j.applicationTips||[]).map(x => listItem(x, '#10b981')).join('')}</ul>`) : ''}
        ${(j.redFlags?.length) ? section('⚠ Red Flags', '#ef4444', `<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px">${(j.redFlags||[]).map(x => listItem(x, '#ef4444')).join('')}</ul>`) : ''}
      `;
    } else if (ct === 'video' && d.video) {
      const v = d.video;
      bodyHTML = `
        ${v.summary ? section('Summary', accent, `<p style="font-size:12.5px;color:rgba(240,238,255,0.7);line-height:1.65">${esc(v.summary)}</p>`) : ''}
        ${(v.keyTopics?.length) ? section('Key Topics', accent, `<div style="display:flex;flex-wrap:wrap;gap:6px">${(v.keyTopics||[]).map(t => `<span style="font-size:11px;font-weight:600;color:${accent};background:${accent}15;border:1px solid ${accent}30;border-radius:100px;padding:3px 10px">${esc(t)}</span>`).join('')}</div>`) : ''}
        ${(v.studyNotes?.length) ? section('Study Notes', accent, `<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px">${(v.studyNotes||[]).map(x => listItem(x, accent)).join('')}</ul>`) : ''}
        ${v.estimatedDuration ? infoRow('Duration', v.estimatedDuration, accent) : ''}
        ${v.channel ? infoRow('Channel', v.channel, accent) : ''}
      `;
    } else if (ct === 'code' && d.code) {
      const c = d.code;
      bodyHTML = `
        ${c.explanation ? section('What it does', accent, `<p style="font-size:12.5px;color:rgba(240,238,255,0.7);line-height:1.65">${esc(c.explanation)}</p>`) : ''}
        ${c.codeSnippet ? section('Code', accent, `<pre style="font-size:11px;color:rgba(240,238,255,0.75);background:rgba(255,255,255,0.04);border-radius:8px;padding:10px;overflow-x:auto;white-space:pre-wrap;word-break:break-all;border:1px solid rgba(255,255,255,0.08)">${esc(c.codeSnippet)}</pre>`) : ''}
        ${(c.improvements?.length) ? section('Improvements', accent, `<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px">${(c.improvements||[]).map(x => listItem(x, accent)).join('')}</ul>`) : ''}
        ${(c.bugs?.length) ? section('⚠ Potential Bugs', '#ef4444', `<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px">${(c.bugs||[]).map(x => listItem(x, '#ef4444')).join('')}</ul>`) : ''}
        ${c.language ? infoRow('Language', c.language, accent) : ''}
      `;
    } else {
      const g = d.general || {};
      bodyHTML = `
        ${g.summary ? section('Summary', accent, `<p style="font-size:12.5px;color:rgba(240,238,255,0.7);line-height:1.65">${esc(g.summary)}</p>`) : ''}
        ${(g.keyInsights?.length) ? section('Key Insights', accent, `<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px">${(g.keyInsights||[]).map(x => listItem(x, accent)).join('')}</ul>`) : ''}
        ${(g.actionItems?.length) ? section('Action Items', accent, `<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px">${(g.actionItems||[]).map(x => listItem(x, '#10b981')).join('')}</ul>`) : ''}
      `;
    }

    return `
      ${previewHTML}
      <div style="padding:14px 16px 4px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <span style="font-size:10px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:${accent};background:${accent}18;border:1px solid ${accent}30;border-radius:100px;padding:3px 9px">${esc(ctLabel)}</span>
          ${d.confidence ? `<span style="font-size:10px;color:rgba(240,238,255,0.4)">${d.confidence}% confident</span>` : ''}
        </div>
        ${d.title ? `<div style="font-size:14px;font-weight:700;color:#f0eeff;line-height:1.35;margin-top:6px">${esc(d.title)}</div>` : ''}
      </div>
      ${bodyHTML}
      <div style="height:12px"></div>`;
  }

  // ── Shared HTML helpers ───────────────────────────────────────────────────

  function section(title, accent, inner) {
    return `
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;overflow:hidden">
        <div style="padding:9px 14px 7px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;gap:7px">
          <div style="width:3px;height:12px;background:${accent};border-radius:4px;flex-shrink:0"></div>
          <span style="font-size:10.5px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:rgba(240,238,255,0.5)">${esc(title)}</span>
        </div>
        <div style="padding:11px 14px">${inner}</div>
      </div>`;
  }

  function listItem(text, color) {
    return `<li style="display:flex;align-items:flex-start;gap:7px;font-size:12px;color:rgba(240,238,255,0.7);line-height:1.4">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="flex-shrink:0;margin-top:1px"><path d="M3 8l3 3 7-7" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      ${esc(text)}</li>`;
  }

  function badge(text, color) {
    return `<span style="font-size:11px;font-weight:600;padding:3px 9px;border-radius:100px;background:${color}20;border:1px solid ${color}40;color:${color === 'rgba(255,255,255,0.2)' ? 'rgba(240,238,255,0.7)' : color === 'rgba(255,255,255,0.15)' || color === 'rgba(255,255,255,0.1)' ? 'rgba(240,238,255,0.65)' : color}">${esc(text)}</span>`;
  }

  function infoRow(label, value, accent) {
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-top:1px solid rgba(255,255,255,0.05)"><span style="font-size:11.5px;color:rgba(240,238,255,0.4)">${esc(label)}</span><span style="font-size:12px;font-weight:600;color:rgba(240,238,255,0.8)">${esc(value)}</span></div>`;
  }

  function flashcardsHTML(cards, accent) {
    return `<div style="display:flex;flex-direction:column;gap:7px">${(cards||[]).map(c => `
      <div style="border:1px solid rgba(255,255,255,0.08);border-radius:10px;overflow:hidden">
        <div style="padding:7px 11px;background:${accent}12;border-bottom:1px solid rgba(255,255,255,0.06);font-size:11.5px;font-weight:600;color:${accent}">${esc(c.q)}</div>
        <div style="padding:7px 11px;font-size:12px;color:rgba(240,238,255,0.65);line-height:1.5">${esc(c.a)}</div>
      </div>`).join('')}</div>`;
  }

  // ── Bottom action bar ─────────────────────────────────────────────────────

  function buildBottomBarHTML(accent) {
    const btnBase = `display:inline-flex;align-items:center;gap:5px;padding:7px 13px;border-radius:9px;font-size:11.5px;font-weight:600;cursor:pointer;border:1px solid;transition:opacity 0.15s`;
    return `
      <button id="__dai-copy-btn" style="${btnBase};background:${accent}18;border-color:${accent}44;color:${accent}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="1.8"/></svg>
        Copy
      </button>
      <button id="__dai-rescan-btn" style="${btnBase};background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.12);color:rgba(240,238,255,0.6)">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Scan again
      </button>
      <div style="flex:1"></div>
      <button id="__dai-close-btn" style="${btnBase};background:rgba(255,255,255,0.04);border-color:rgba(255,255,255,0.1);color:rgba(240,238,255,0.4)">
        Close
      </button>`;
  }

  function wireBottomBar(bar, result, mode) {
    const copyBtn   = bar.querySelector('#__dai-copy-btn');
    const rescanBtn = bar.querySelector('#__dai-rescan-btn');
    const closeBtn2 = bar.querySelector('#__dai-close-btn');

    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const text = summarizeForClipboard(result, mode);
        navigator.clipboard.writeText(text).then(() => {
          copyBtn.textContent = '✓ Copied!';
          setTimeout(() => { copyBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="1.8"/></svg> Copy`; }, 2000);
        }).catch(() => {});
      });
    }

    if (rescanBtn) {
      rescanBtn.addEventListener('click', () => {
        removeOverlay();
        // Re-launch selector
        chrome.runtime.sendMessage({ type: 'GET_ACTIVE_TAB' }, (resp) => {
          if (resp?.tab?.id) {
            chrome.runtime.sendMessage({ type: 'LAUNCH_SELECTOR', mode, tabId: resp.tab.id });
          }
        });
      });
    }

    if (closeBtn2) closeBtn2.addEventListener('click', removeOverlay);
  }

  function summarizeForClipboard(result, mode) {
    if (mode === 'masterscan') {
      const d = result;
      const g = d.general || d.article || d.research || {};
      return [
        d.title ? `Title: ${d.title}` : '',
        d.contentLabel ? `Type: ${d.contentLabel}` : '',
        g.summary ? `\nSummary:\n${g.summary}` : '',
        (g.keyPoints || g.findings) ? `\nKey Points:\n${(g.keyPoints || g.findings || []).map(p => `• ${p}`).join('\n')}` : ''
      ].filter(Boolean).join('\n');
    }
    const p  = result.product || {};
    const v  = result.verdict || {};
    const r  = result.reviews || {};
    const pi = result.priceIntel || {};
    return [
      `DecisionAI Truth Layer Analysis`,
      p.name ? `Product: ${p.name}` : '',
      `Truth Score: ${result.truthScore}/100 (${result.scoreLabel || ''})`,
      v.label ? `Verdict: ${v.label}` : '',
      v.reasoning ? `\n${v.reasoning}` : '',
      (r.pros?.length) ? `\nPros:\n${r.pros.map(x => `• ${x}`).join('\n')}` : '',
      (r.cons?.length) ? `\nCons:\n${r.cons.map(x => `• ${x}`).join('\n')}` : '',
      pi.currentPrice ? `\nCurrent Price: ${pi.currentPrice} · ${pi.dealRating || ''}` : '',
      pi.fairPrice    ? `Fair value: ${pi.fairPrice}` : ''
    ].filter(Boolean).join('\n');
  }

})();
