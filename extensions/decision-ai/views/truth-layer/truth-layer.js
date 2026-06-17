/**
 * Truth Layer — DecisionAI
 *
 * Architecture note: This module is structured for AI API integration.
 * Replace the MOCK_* functions with real API calls to your AI backend.
 * The AIAnalyzer class handles all analysis logic; swap its methods to integrate live AI.
 */

import { DecisionAIApi } from '../../lib/api.js';

const api = new DecisionAIApi();

const $ = (id) => document.getElementById(id);

// ── State ────────────────────────────────────────────────────────────────────

let currentTab = null;
let analysisResult = null;

const STATES = {
  IDLE:    'idle',
  LOADING: 'loading',
  RESULTS: 'results',
  ERROR:   'error'
};

function showState(state) {
  $('idleState').classList.add('hidden');
  $('loadingState').classList.add('hidden');
  $('resultsState').classList.add('hidden');
  $('errorState').classList.add('hidden');

  switch (state) {
    case STATES.IDLE:    $('idleState').classList.remove('hidden');    break;
    case STATES.LOADING: $('loadingState').classList.remove('hidden'); break;
    case STATES.RESULTS: $('resultsState').classList.remove('hidden'); break;
    case STATES.ERROR:   $('errorState').classList.remove('hidden');   break;
  }
}

// ── Loading step animation ────────────────────────────────────────────────────

const STEPS = ['step1', 'step2', 'step3', 'step4', 'step5'];

function resetSteps() {
  STEPS.forEach(id => {
    const el = $(id);
    el.classList.remove('active', 'done');
  });
}

function setStep(index) {
  STEPS.forEach((id, i) => {
    const el = $(id);
    el.classList.remove('active', 'done');
    if (i < index) el.classList.add('done');
    else if (i === index) el.classList.add('active');
  });
}

async function runLoadingAnimation(durationMs) {
  resetSteps();
  const stepDelay = durationMs / STEPS.length;
  for (let i = 0; i < STEPS.length; i++) {
    setStep(i);
    await sleep(stepDelay);
  }
  STEPS.forEach(id => $(id).classList.add('done'));
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Page detection ───────────────────────────────────────────────────────────

async function detectCurrentPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;
    const url = new URL(tab.url);
    $('pageUrl').textContent = url.hostname + (url.pathname !== '/' ? url.pathname.substring(0, 40) + '…' : '');
  } catch {
    $('pageUrl').textContent = 'Navigate to a product page';
  }
}

// ── Analysis pipeline ────────────────────────────────────────────────────────

async function runAnalysis() {
  if (!currentTab) {
    showError('Could not detect the current page. Please try again.');
    return;
  }

  showState(STATES.LOADING);
  resetSteps();

  const animPromise = runLoadingAnimation(3200);

  try {
    // 1. Extract product data from the page via content script
    const pageData = await extractPageData(currentTab.id);

    // 2. Run AI analysis (mocked — replace with real API calls)
    const result = await api.analyzePage(pageData, currentTab.url);

    await animPromise;

    analysisResult = result;
    renderResults(result);
    showState(STATES.RESULTS);

  } catch (err) {
    await animPromise;
    showError(err.message || 'Analysis failed. Please try again.');
  }
}

async function extractPageData(tabId) {
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        return {
          title: document.title,
          url: window.location.href,
          price: document.querySelector('[itemprop="price"]')?.content ||
                 document.querySelector('.price, .product-price, [data-price]')?.textContent?.trim() || null,
          description: document.querySelector('[itemprop="description"], .product-description')?.textContent?.trim()?.substring(0, 500) || null,
          rating: document.querySelector('[itemprop="ratingValue"]')?.content || null,
          reviewCount: document.querySelector('[itemprop="reviewCount"]')?.content || null,
          bodyText: document.body.innerText?.substring(0, 2000) || ''
        };
      }
    });
    return result?.result || { title: currentTab.title, url: currentTab.url };
  } catch {
    return { title: currentTab?.title || '', url: currentTab?.url || '' };
  }
}

function showError(message) {
  $('errorDesc').textContent = message;
  showState(STATES.ERROR);
}

// ── Render results ───────────────────────────────────────────────────────────

function renderResults(data) {
  renderVerdict(data.verdict);
  renderProduct(data.product);
  renderReviews(data.reviews);
  renderFakeDetection(data.fakeDetection);
  renderSentiment(data.sentiment);
  renderPrices(data.prices);
  renderSimilar(data.similar);
}

function renderVerdict(v) {
  const banner = $('verdictBanner');
  banner.className = `verdict-banner verdict-${v.type}`;
  $('verdictIcon').textContent = v.emoji;
  $('verdictLabel').textContent = v.label;
  $('verdictSub').textContent = v.summary;
  $('verdictScore').textContent = v.score + '/10';
}

function renderProduct(p) {
  $('productCard').innerHTML = `
    <div class="product-card-inner">
      <div class="product-name">${esc(p.name)}</div>
      <div class="product-meta">
        <span class="product-price">${esc(p.price)}</span>
        <span class="product-store">${esc(p.store)}</span>
        ${p.rating ? `<span class="product-rating">★ ${esc(p.rating)} (${esc(p.reviewCount)} reviews)</span>` : ''}
      </div>
    </div>
  `;
}

function renderReviews(r) {
  const stars = '★'.repeat(Math.round(r.rating)) + '☆'.repeat(5 - Math.round(r.rating));
  $('reviewSummary').innerHTML = `
    <div class="review-summary-inner">
      <div class="rating-row">
        <span class="rating-big">${r.rating}</span>
        <div>
          <div class="rating-stars">${stars}</div>
          <div class="rating-count">${r.totalReviews} reviews analyzed</div>
        </div>
      </div>
      <p class="review-summary-text">${esc(r.summary)}</p>
      <div class="pros-cons">
        <div class="pros-box">
          <div class="pros-label">Pros</div>
          <ul>${r.pros.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
        </div>
        <div class="cons-box">
          <div class="cons-label">Cons</div>
          <ul>${r.cons.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
        </div>
      </div>
    </div>
  `;
}

function renderFakeDetection(f) {
  const levelClass = f.riskLevel === 'Low' ? 'low' : f.riskLevel === 'Medium' ? 'med' : 'high';
  const badgeClass = `fake-badge fake-badge-${levelClass}`;
  const signals = f.signals.map(s => `
    <div class="fake-signal">
      <div class="fake-signal-dot signal-${s.type}"></div>
      <span>${esc(s.text)}</span>
    </div>
  `).join('');

  $('fakeResult').innerHTML = `
    <div class="fake-result-inner">
      <div class="fake-score-row">
        <span class="fake-label">Fake review risk</span>
        <span class="${badgeClass}">${esc(f.riskLevel)} Risk</span>
      </div>
      <div class="fake-bar-track">
        <div class="fake-bar-fill ${levelClass}" style="width:${f.riskPercent}%"></div>
      </div>
      <div class="fake-signals">${signals}</div>
    </div>
  `;
}

function renderSentiment(items) {
  $('sentimentItems').innerHTML = items.map(s => `
    <div class="sentiment-item">
      <div class="sentiment-source">
        <span class="source-badge source-${s.source.toLowerCase()}">${esc(s.source)}</span>
        <span class="sentiment-mood">${s.mood}</span>
      </div>
      <p class="sentiment-text">${esc(s.text)}</p>
    </div>
  `).join('');
}

function renderPrices(prices) {
  const sorted = [...prices].sort((a, b) => a.numericPrice - b.numericPrice);
  const bestIdx = 0;

  $('priceItems').innerHTML = sorted.map((p, i) => {
    const cls = i === bestIdx ? 'best-price' : p.isCurrent ? 'current' : 'higher';
    const tag = i === bestIdx ? '<span class="price-tag">Best</span>' : '';
    const diff = i > 0 && sorted[0].numericPrice
      ? `<span class="price-diff">+${((p.numericPrice - sorted[0].numericPrice) / sorted[0].numericPrice * 100).toFixed(0)}%</span>`
      : '';
    return `
      <div class="price-item">
        <span class="price-store">${esc(p.store)}${p.isCurrent ? ' (current)' : ''}</span>
        <div class="price-right">
          ${diff}
          <span class="price-amount ${cls}">${esc(p.price)}</span>
          ${tag}
        </div>
      </div>
    `;
  }).join('');
}

function renderSimilar(items) {
  $('similarItems').innerHTML = `
    <div class="similar-items-inner">
      ${items.map(s => `
        <div class="similar-item">
          <span class="similar-name">${esc(s.name)}</span>
          <div class="similar-meta">
            <span class="similar-price">${esc(s.price)}</span>
            <span class="similar-note">${esc(s.note)}</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Event listeners ──────────────────────────────────────────────────────────

$('analyzeBtn').addEventListener('click', runAnalysis);
$('retryBtn').addEventListener('click', () => { showState(STATES.IDLE); });
$('reAnalyzeBtn').addEventListener('click', runAnalysis);
$('backBtn').addEventListener('click', () => { window.close(); });

// ── Init ─────────────────────────────────────────────────────────────────────

detectCurrentPage();
showState(STATES.IDLE);
