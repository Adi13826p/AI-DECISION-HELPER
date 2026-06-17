/**
 * Truth Layer — DecisionAI
 * Screen-selection based product analysis via Groq vision.
 */

import { analyzeTruthLayer } from '../../lib/api.js';

const $ = (id) => document.getElementById(id);

let capturedData = null;

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

// ── Analysis ──────────────────────────────────────────────────────────────────

async function runAnalysis() {
  if (!capturedData?.image) { showState(STATES.NONE); return; }

  showState(STATES.LOADING);

  // Show preview in loading screen
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
  // Captured image
  const prev = $('capturePreview');
  prev.style.backgroundImage = `url(${capturedData.image})`;

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
  renderReviews(data.reviews || {});
  renderPriceIntel(data.priceIntel || {});
  renderCompetitors(data.competitors || []);
}

function scoreLabel(n) {
  if (n >= 80) return 'Excellent';
  if (n >= 65) return 'Good';
  if (n >= 45) return 'Caution';
  return 'Poor';
}

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

function renderReviews(r) {
  const pros = (r.pros || []).map(p => `<li>${esc(p)}</li>`).join('');
  const cons = (r.cons || []).map(c => `<li>${esc(c)}</li>`).join('');
  const hidden = (r.hiddenComplaints || []);

  $('reviewSummary').innerHTML = `
    <div class="review-summary-inner">
      ${r.summary ? `<p class="review-summary-text">${esc(r.summary)}</p>` : ''}
      <div class="pros-cons">
        <div class="pros-box"><div class="pros-label">Pros</div><ul>${pros || '<li>—</li>'}</ul></div>
        <div class="cons-box"><div class="cons-label">Cons</div><ul>${cons || '<li>—</li>'}</ul></div>
      </div>
      ${hidden.length ? `<div class="hidden-complaints"><span class="hc-label">⚠ Hidden complaints found</span>${hidden.map(h=>`<p>${esc(h)}</p>`).join('')}</div>` : ''}
    </div>`;
}

function renderPriceIntel(p) {
  const alts = (p.alternatives || []).map(a => `
    <div class="price-item">
      <span class="price-store">${esc(a.store)}</span>
      <div class="price-right">
        ${a.note ? `<span class="price-note">${esc(a.note)}</span>` : ''}
        <span class="price-amount">${esc(a.estimatedPrice)}</span>
      </div>
    </div>`).join('');

  $('priceIntel').innerHTML = `
    <div class="price-intel-inner">
      <div class="price-deal-row">
        <div class="price-current-wrap">
          <span class="price-current-label">Current Price</span>
          <span class="price-current-val">${esc(p.currentPrice || '—')}</span>
        </div>
        <div class="price-deal-badge deal-${(p.dealRating||'').toLowerCase().replace(/\s+/g,'-')}">
          ${esc(p.dealRating || 'Unknown')}
        </div>
      </div>
      ${p.fairPrice ? `<div class="fair-price-row">Fair market value: <strong>${esc(p.fairPrice)}</strong></div>` : ''}
      ${alts ? `<div class="price-alts">${alts}</div>` : ''}
      ${p.buyTiming ? `<div class="buy-timing"><strong>Buy Timing:</strong> ${esc(p.buyTiming.reason)}</div>` : ''}
    </div>`;
}

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
