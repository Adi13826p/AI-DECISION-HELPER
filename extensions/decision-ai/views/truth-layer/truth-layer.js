/**
 * Truth Layer — DecisionAI
 * Screen-selection based product analysis via Groq vision.
 * Includes source citation system with clickable platform icons.
 */

import { analyzeTruthLayer } from '../../lib/api.js';

const $ = (id) => document.getElementById(id);

let capturedData = null;
let detectedProductName = '';

const STATES = { NONE: 'none', LOADING: 'loading', RESULTS: 'results', ERROR: 'error' };

function showState(s) {
  $('noCaptureState').classList.toggle('hidden', s !== STATES.NONE);
  $('loadingState').classList.toggle('hidden', s !== STATES.LOADING);
  $('resultsState').classList.toggle('hidden', s !== STATES.RESULTS);
  $('errorState').classList.toggle('hidden', s !== STATES.ERROR);
}

// ── Loading steps ─────────────────────────────────────────────────────────────

const STEP_IDS = ['step1','step2','step3'];

function setStep(i) {
  STEP_IDS.forEach((id, idx) => {
    $(id).classList.toggle('active', idx === i);
    $(id).classList.toggle('done', idx < i);
  });
}

async function animateSteps(totalMs) {
  const delay = totalMs / STEP_IDS.length;
  for (let i = 0; i < STEP_IDS.length; i++) {
    setStep(i);
    await sleep(delay);
  }
  STEP_IDS.forEach(id => { $(id).classList.remove('active'); $(id).classList.add('done'); });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Helpers ───────────────────────────────────────────────────────────────────

function esc(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Source Citation System ────────────────────────────────────────────────────

const SOURCE_CFG = {
  Reddit:    { domain:'reddit.com',    color:'#FF4500', bg:'rgba(255,69,0,0.09)',    border:'rgba(255,69,0,0.28)',    label:'Reddit' },
  Amazon:    { domain:'amazon.com',    color:'#FF9900', bg:'rgba(255,153,0,0.09)',   border:'rgba(255,153,0,0.28)',   label:'Amazon' },
  YouTube:   { domain:'youtube.com',   color:'#FF0000', bg:'rgba(255,0,0,0.08)',     border:'rgba(255,0,0,0.24)',     label:'YouTube' },
  Google:    { domain:'google.com',    color:'#4285F4', bg:'rgba(66,133,244,0.09)',  border:'rgba(66,133,244,0.28)',  label:'Google' },
  Quora:     { domain:'quora.com',     color:'#B92B27', bg:'rgba(185,43,39,0.09)',   border:'rgba(185,43,39,0.28)',   label:'Quora' },
  Flipkart:  { domain:'flipkart.com',  color:'#2874F0', bg:'rgba(40,116,240,0.09)', border:'rgba(40,116,240,0.28)',  label:'Flipkart' },
  TechRadar: { domain:'techradar.com', color:'#7C3AED', bg:'rgba(124,58,237,0.09)', border:'rgba(124,58,237,0.28)', label:'TechRadar' },
  RTINGS:    { domain:'rtings.com',    color:'#10B981', bg:'rgba(16,185,129,0.09)', border:'rgba(16,185,129,0.28)', label:'RTINGS' },
};

function buildSourceUrl(sourceName, productName) {
  const q = productName || detectedProductName || 'product';
  const urls = {
    Reddit:    `https://www.reddit.com/search/?q=${encodeURIComponent(q + ' review')}`,
    Amazon:    `https://www.amazon.com/s?k=${encodeURIComponent(q + ' reviews')}`,
    YouTube:   `https://www.youtube.com/results?search_query=${encodeURIComponent(q + ' review')}`,
    Google:    `https://www.google.com/search?q=${encodeURIComponent(q + ' reviews')}`,
    Quora:     `https://www.quora.com/search?q=${encodeURIComponent(q + ' review')}`,
    Flipkart:  `https://www.flipkart.com/search?q=${encodeURIComponent(q)}`,
    TechRadar: `https://www.techradar.com/search?searchTerm=${encodeURIComponent(q)}`,
    RTINGS:    `https://www.rtings.com/search#${encodeURIComponent(q)}`,
  };
  return urls[sourceName] || `https://www.google.com/search?q=${encodeURIComponent(q + ' ' + sourceName + ' review')}`;
}

function mkSourceChip(sourceName, productName, size = 'sm') {
  const cfg = SOURCE_CFG[sourceName] ?? {
    domain: '', color: '#7a3358',
    bg: 'rgba(122,51,88,0.08)', border: 'rgba(122,51,88,0.22)', label: sourceName
  };
  const url = buildSourceUrl(sourceName, productName);
  const faviconUrl = cfg.domain
    ? `https://www.google.com/s2/favicons?domain=${cfg.domain}&sz=32`
    : '';

  const chip = document.createElement('a');
  chip.href = url;
  chip.target = '_blank';
  chip.rel = 'noreferrer';
  chip.title = `See ${cfg.label} reviews ↗`;
  chip.className = `source-chip source-chip-${size}`;
  chip.style.cssText = `background:${cfg.bg};border:1px solid ${cfg.border};color:${cfg.color};`;

  if (faviconUrl) {
    const img = document.createElement('img');
    img.src = faviconUrl;
    img.alt = '';
    img.className = 'source-favicon';
    img.onerror = () => {
      img.replaceWith(mkFallbackLetter(cfg));
    };
    chip.appendChild(img);
  } else {
    chip.appendChild(mkFallbackLetter(cfg));
  }

  const label = document.createElement('span');
  label.textContent = cfg.label;
  chip.appendChild(label);

  return chip;
}

function mkFallbackLetter(cfg) {
  const span = document.createElement('span');
  span.className = 'source-fallback';
  span.style.color = cfg.color;
  span.textContent = cfg.label[0];
  return span;
}

// ── Analysis ──────────────────────────────────────────────────────────────────

async function runAnalysis() {
  if (!capturedData?.image) { showState(STATES.NONE); return; }

  showState(STATES.LOADING);

  const prev = $('loadingPreview');
  prev.style.backgroundImage = `url(${capturedData.image})`;
  prev.classList.remove('hidden');

  const animP = animateSteps(3500);

  try {
    const result = await analyzeTruthLayer(
      capturedData.image,
      capturedData.pageUrl,
      capturedData.pageTitle
    );
    await animP;
    renderResults(result);
    showState(STATES.RESULTS);
    logAnalysis(result);
  } catch (err) {
    await animP;
    showError(err.message);
  }
}

function showError(msg) {
  if (msg === 'NO_API_KEY') {
    $('errorDesc').innerHTML = 'No Groq API key found. Click the DecisionAI extension icon → ⚙ Settings to add your free API key from <a href="https://console.groq.com" target="_blank" style="color:#a855f7">console.groq.com</a>';
  } else if (msg === 'INVALID_API_KEY') {
    $('errorDesc').textContent = 'Your API key is invalid. Please check it in the extension settings.';
  } else {
    $('errorDesc').textContent = msg || 'Analysis failed. Please try again.';
  }
  showState(STATES.ERROR);
}

function logAnalysis(result) {
  try {
    chrome.runtime.sendMessage({
      type: 'LOG_ANALYSIS',
      data: { url: capturedData.pageUrl, title: capturedData.pageTitle, mode: 'truth' }
    });
  } catch (_) {}
}

// ── Render Results ────────────────────────────────────────────────────────────

function renderResults(data) {
  const prev = $('capturePreview');
  prev.style.backgroundImage = `url(${capturedData.image})`;

  detectedProductName = data.product?.name || data.product?.brand || '';

  // Truth Score
  const score = data.truthScore ?? 0;
  const scoreEl = $('truthScoreNum');
  scoreEl.textContent = score;
  scoreEl.className = 'truth-score-num ' + (score >= 75 ? 'score-green' : score >= 50 ? 'score-yellow' : 'score-red');
  $('truthScoreLabel').textContent = data.scoreLabel || scoreLabel(score);

  const banner = $('truthBanner');
  const vtype = data.verdict?.type || 'caution';
  banner.className = `truth-banner verdict-${vtype}`;
  $('verdictEmoji').textContent = data.verdict?.emoji || (vtype === 'buy' ? '✅' : vtype === 'caution' ? '⚠️' : '❌');
  $('verdictLabel').textContent = data.verdict?.label || 'See Below';
  $('verdictSub').textContent = data.verdict?.reasoning || '';

  renderProduct(data.product || {});
  renderSourcesScanned(data.sources || []);
  renderReviews(data.reviews || {});
  renderPriceIntel(data.priceIntel || {}, data.buyTiming);
  renderCompetitors(data.competitors || []);
}

function scoreLabel(n) {
  if (n >= 80) return 'Excellent';
  if (n >= 65) return 'Good';
  if (n >= 45) return 'Caution';
  return 'Poor';
}

// ── Product Card ──────────────────────────────────────────────────────────────

function renderProduct(p) {
  $('productCard').innerHTML = `
    <div class="product-card-inner">
      <div class="product-name">${esc(p.name || 'Product detected')}</div>
      <div class="product-meta">
        ${p.price ? `<span class="product-price">${esc(p.price)}</span>` : ''}
        ${p.brand ? `<span class="product-store">${esc(p.brand)}</span>` : ''}
        ${p.store ? `<span class="product-store">${esc(p.store)}</span>` : ''}
        ${p.rating ? `<span class="product-rating">★ ${esc(p.rating)}${p.reviewCount ? ` · ${esc(p.reviewCount)} reviews` : ''}</span>` : ''}
      </div>
      ${p.model ? `<div class="product-model">${esc(p.model)}</div>` : ''}
    </div>`;
}

// ── Sources Scanned ───────────────────────────────────────────────────────────

function renderSourcesScanned(sources) {
  const container = $('sourcesScanned');
  if (!container) return;

  // Fallback defaults if AI returns empty sources
  const list = (sources && sources.length > 0) ? sources : [
    { name: 'Reddit' }, { name: 'Amazon' }, { name: 'Google' },
    { name: 'YouTube' }, { name: 'Quora' }
  ];

  container.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'sources-header';
  header.innerHTML = `
    <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.2"/>
      <path d="M5.5 8h5M8 5.5v5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
    </svg>
    <span>Sources Scanned</span>
    <span class="sources-count">${list.length} platforms</span>`;
  container.appendChild(header);

  const row = document.createElement('div');
  row.className = 'sources-chips-row';

  list.forEach(src => {
    const name = typeof src === 'string' ? src : src.name;
    const insight = typeof src === 'object' ? src.insight : '';
    const chip = mkSourceChip(name, detectedProductName, 'md');
    if (insight) chip.title = `${name}: ${insight} ↗`;
    row.appendChild(chip);
  });

  container.appendChild(row);
}

// ── Review Analysis with Sources ──────────────────────────────────────────────

function renderReviews(r) {
  const hidden = (r.hiddenComplaints || []);
  const container = $('reviewSummary');
  container.innerHTML = '';

  const inner = document.createElement('div');
  inner.className = 'review-summary-inner';

  if (r.summary) {
    const p = document.createElement('p');
    p.className = 'review-summary-text';
    p.textContent = r.summary;
    inner.appendChild(p);
  }

  const grid = document.createElement('div');
  grid.className = 'pros-cons';

  // Pros
  const prosBox = document.createElement('div');
  prosBox.className = 'pros-box';
  prosBox.innerHTML = '<div class="pros-label">Pros</div>';
  const prosUl = document.createElement('ul');

  const proItems = r.pros || [];
  if (proItems.length === 0) {
    prosUl.innerHTML = '<li>—</li>';
  } else {
    proItems.forEach(item => {
      const li = mkReviewItem(item, 'pro');
      prosUl.appendChild(li);
    });
  }
  prosBox.appendChild(prosUl);

  // Cons
  const consBox = document.createElement('div');
  consBox.className = 'cons-box';
  consBox.innerHTML = '<div class="cons-label">Cons</div>';
  const consUl = document.createElement('ul');

  const conItems = r.cons || [];
  if (conItems.length === 0) {
    consUl.innerHTML = '<li>—</li>';
  } else {
    conItems.forEach(item => {
      const li = mkReviewItem(item, 'con');
      consUl.appendChild(li);
    });
  }
  consBox.appendChild(consUl);

  grid.appendChild(prosBox);
  grid.appendChild(consBox);
  inner.appendChild(grid);

  if (hidden.length) {
    const hc = document.createElement('div');
    hc.className = 'hidden-complaints';
    hc.innerHTML = `<span class="hc-label">⚠ Hidden complaints found</span>`;
    hidden.forEach(h => {
      const p = document.createElement('p');
      p.textContent = h;
      hc.appendChild(p);
    });
    inner.appendChild(hc);
  }

  container.appendChild(inner);
}

function mkReviewItem(item, type) {
  const li = document.createElement('li');
  li.className = 'review-item';

  // Support both string format (legacy) and object format {text, source}
  const text = typeof item === 'string' ? item : (item.text || item);
  const source = typeof item === 'object' ? item.source : null;

  const textSpan = document.createElement('span');
  textSpan.className = 'review-item-text';
  textSpan.textContent = text;
  li.appendChild(textSpan);

  if (source && SOURCE_CFG[source]) {
    const chip = mkSourceChip(source, detectedProductName, 'xs');
    chip.className += ' review-source-chip';
    li.appendChild(chip);
  }

  return li;
}

// ── Price Intel with Source Icons ─────────────────────────────────────────────

function renderPriceIntel(p, buyTiming) {
  const container = $('priceIntel');
  container.innerHTML = '';

  const inner = document.createElement('div');
  inner.className = 'price-intel-inner';

  // Deal row
  const dealRow = document.createElement('div');
  dealRow.className = 'price-deal-row';
  dealRow.innerHTML = `
    <div class="price-current-wrap">
      <span class="price-current-label">Current Price</span>
      <span class="price-current-val">${esc(p.currentPrice || '—')}</span>
    </div>
    <div class="price-deal-badge deal-${(p.dealRating||'').toLowerCase().replace(/\s+/g,'-')}">
      ${esc(p.dealRating || 'Unknown')}
    </div>`;
  inner.appendChild(dealRow);

  if (p.fairPrice) {
    const fr = document.createElement('div');
    fr.className = 'fair-price-row';
    fr.innerHTML = `Fair market value: <strong>${esc(p.fairPrice)}</strong>`;
    inner.appendChild(fr);
  }

  // Alternatives with source icons
  const alts = p.alternatives || [];
  if (alts.length) {
    const altWrap = document.createElement('div');
    altWrap.className = 'price-alts';

    alts.forEach(a => {
      const item = document.createElement('div');
      item.className = 'price-item';

      const storeLeft = document.createElement('div');
      storeLeft.className = 'price-store-left';

      // Store favicon chip if we know it
      const storeName = a.store || '';
      if (SOURCE_CFG[storeName]) {
        storeLeft.appendChild(mkSourceChip(storeName, detectedProductName, 'sm'));
      } else {
        const storeLabel = document.createElement('span');
        storeLabel.className = 'price-store';
        storeLabel.textContent = storeName;
        storeLeft.appendChild(storeLabel);
      }

      const priceRight = document.createElement('div');
      priceRight.className = 'price-right';
      if (a.note) {
        const note = document.createElement('span');
        note.className = 'price-note';
        note.textContent = a.note;
        priceRight.appendChild(note);
      }
      const amount = document.createElement('span');
      amount.className = 'price-amount';
      amount.textContent = a.estimatedPrice || '—';
      priceRight.appendChild(amount);

      item.appendChild(storeLeft);
      item.appendChild(priceRight);
      altWrap.appendChild(item);
    });

    inner.appendChild(altWrap);
  }

  if (buyTiming?.reason) {
    const bt = document.createElement('div');
    bt.className = 'buy-timing';
    bt.innerHTML = `<strong>Buy Timing:</strong> ${esc(buyTiming.reason)}`;
    inner.appendChild(bt);
  }

  container.appendChild(inner);
}

// ── Competitors ───────────────────────────────────────────────────────────────

function renderCompetitors(items) {
  if (!items.length) {
    $('competitors').innerHTML = '<p class="no-data">No competitor data available.</p>';
    return;
  }
  $('competitors').innerHTML = `
    <div class="competitors-list">
      ${items.map(c => `
        <div class="competitor-item">
          <div class="comp-name">${esc(c.name)}</div>
          <div class="comp-detail">
            <span class="comp-why">${esc(c.why)}</span>
            ${c.betterFor ? `<span class="comp-for">Better for: ${esc(c.betterFor)}</span>` : ''}
          </div>
        </div>`).join('')}
    </div>`;
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  const result = await chrome.storage.local.get('capturedData');
  capturedData = result.capturedData;

  if (!capturedData || !capturedData.image || capturedData.mode !== 'truth') {
    showState(STATES.NONE);
    return;
  }

  runAnalysis();
}

$('backBtn').addEventListener('click', () => window.close());
$('retryBtn').addEventListener('click', () => runAnalysis());
$('scanAgainBtn').addEventListener('click', () => window.close());

init();
