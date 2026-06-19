/**
 * MasterScan — DecisionAI
 * Universal AI content analysis via Groq vision.
 */

import { analyzeMasterScan } from '../../lib/api.js';

const $ = (id) => document.getElementById(id);

let capturedData = null;
let extractedText = '';

const STATES = { NONE: 'none', LOADING: 'loading', RESULTS: 'results', ERROR: 'error' };

function showState(s) {
  $('noCaptureState').classList.toggle('hidden', s !== STATES.NONE);
  $('loadingState').classList.toggle('hidden', s !== STATES.LOADING);
  $('resultsState').classList.toggle('hidden', s !== STATES.RESULTS);
  $('errorState').classList.toggle('hidden', s !== STATES.ERROR);
}

const STEP_IDS = ['step1','step2','step3','step4','step5'];
function setStep(i) {
  STEP_IDS.forEach((id, idx) => {
    $(id).classList.toggle('active', idx === i);
    $(id).classList.toggle('done', idx < i);
  });
}
async function animateSteps(ms) {
  const d = ms / STEP_IDS.length;
  for (let i = 0; i < STEP_IDS.length; i++) { setStep(i); await sleep(d); }
  STEP_IDS.forEach(id => { $(id).classList.remove('active'); $(id).classList.add('done'); });
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function esc(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Content type config ───────────────────────────────────────────────────────

const CONTENT_TYPES = {
  article:        { label: 'Article / Blog', icon: '📰', color: '#6c8dfa', cls: 'ct-blue' },
  research_paper: { label: 'Research Paper', icon: '🔬', color: '#a855f7', cls: 'ct-purple' },
  math:           { label: 'Math / Equation', icon: '📐', color: '#fbbf24', cls: 'ct-yellow' },
  job_posting:    { label: 'Job Posting', icon: '💼', color: '#34d399', cls: 'ct-green' },
  video:          { label: 'Video / YouTube', icon: '🎬', color: '#f87171', cls: 'ct-red' },
  product:        { label: 'Product Listing', icon: '🛍️', color: '#06b6d4', cls: 'ct-cyan' },
  code:           { label: 'Code Snippet', icon: '💻', color: '#4ade80', cls: 'ct-green' },
  social_post:    { label: 'Social Post', icon: '💬', color: '#e879f9', cls: 'ct-pink' },
  recipe:         { label: 'Recipe', icon: '🍳', color: '#fb923c', cls: 'ct-orange' },
  study_material: { label: 'Study Material', icon: '📚', color: '#818cf8', cls: 'ct-indigo' },
  other:          { label: 'Web Content',    icon: '🌐', color: '#8891aa', cls: 'ct-gray' }
};

// ── Analysis ──────────────────────────────────────────────────────────────────

async function runAnalysis() {
  if (!capturedData?.image) { showState(STATES.NONE); return; }

  showState(STATES.LOADING);
  const prev = $('loadingPreview');
  prev.classList.add('hidden');

  const animP = animateSteps(3200);
  try {
    const result = await analyzeMasterScan(
      capturedData.image,
      capturedData.pageUrl,
      capturedData.pageTitle
    );
    await animP;
    renderResults(result);
    showState(STATES.RESULTS);
  } catch (err) {
    await animP;
    showError(err.message);
  }
}

function showError(msg) {
  if (msg === 'NO_API_KEY') {
    $('errorDesc').innerHTML = 'No API key set. Click the DecisionAI extension icon → ⚙ Settings to add your free key from <a href="https://console.groq.com" target="_blank" style="color:#06b6d4">console.groq.com</a>';
  } else if (msg === 'INVALID_API_KEY') {
    $('errorDesc').textContent = 'Invalid API key. Please check the extension settings.';
  } else {
    $('errorDesc').textContent = msg || 'Scan failed. Please try again.';
  }
  showState(STATES.ERROR);
}

// ── Render Results ────────────────────────────────────────────────────────────

function renderResults(data) {
  $('capturePreview').style.display = 'none';

  const ct = data.contentType || 'other';
  const cfg = CONTENT_TYPES[ct] || CONTENT_TYPES.other;
  extractedText = data.extractedText || '';

  // Header badge
  const badge = $('headerTypeBadge');
  badge.textContent = cfg.label;
  badge.className = `header-type-badge ${cfg.cls}`;
  badge.classList.remove('hidden');

  // Content type bar
  $('ctIcon').textContent = cfg.icon;
  $('ctIcon').className = `ct-icon ${cfg.cls}`;
  $('ctLabel').textContent = 'Content Type Detected';
  $('ctTitle').textContent = data.contentLabel || cfg.label;
  $('ctBadge').textContent = `${data.confidence || 90}% confident`;
  $('ctBadge').className = `ct-badge ${cfg.cls}`;

  // Render type-specific sections
  const scroll = $('resultsScroll');
  scroll.innerHTML = '';

  // Always show title if available
  if (data.title) {
    scroll.appendChild(mkSection('Detected Title', data.title, cfg.color, '📌'));
  }

  switch (ct) {
    case 'article':    renderArticle(scroll, data.article || {}, cfg);    break;
    case 'research_paper': renderResearch(scroll, data.research || {}, cfg); break;
    case 'math':       renderMath(scroll, data.math || {}, cfg);          break;
    case 'job_posting': renderJob(scroll, data.job || {}, cfg);           break;
    case 'video':      renderVideo(scroll, data.video || {}, cfg);        break;
    case 'product':    renderProduct(scroll, data, cfg);                  break;
    case 'code':       renderCode(scroll, data.code || {}, cfg);          break;
    case 'social_post': renderSocial(scroll, data.social_post || {}, cfg); break;
    case 'recipe':     renderRecipe(scroll, data.recipe || {}, cfg);      break;
    case 'study_material': renderStudy(scroll, data.study_material || {}, cfg); break;
    default:           renderGeneral(scroll, data.general || {}, cfg);    break;
  }

  // Always show extracted text if available
  if (data.extractedText) {
    const sec = mkSectionEl('Extracted Text', cfg.color, '📋');
    const pre = document.createElement('div');
    pre.className = 'extracted-text';
    pre.textContent = data.extractedText;
    sec.querySelector('.section-body').appendChild(pre);
    scroll.appendChild(sec);
  }
}

// ── Section builders ──────────────────────────────────────────────────────────

function mkSectionEl(title, color, icon) {
  const div = document.createElement('div');
  div.className = 'result-section';
  div.innerHTML = `
    <div class="section-header">
      <span class="section-emoji">${icon}</span>
      <h3 class="section-title">${esc(title)}</h3>
    </div>
    <div class="section-body"></div>`;
  return div;
}

function mkSection(title, content, color, icon) {
  const sec = mkSectionEl(title, color, icon);
  const body = sec.querySelector('.section-body');
  const p = document.createElement('p');
  p.className = 'section-text';
  p.textContent = content;
  body.appendChild(p);
  return sec;
}

function mkBulletList(items) {
  const ul = document.createElement('ul');
  ul.className = 'bullet-list';
  items.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    ul.appendChild(li);
  });
  return ul;
}

function mkFlashcards(cards, color) {
  const wrap = document.createElement('div');
  wrap.className = 'flashcards';
  cards.slice(0, 6).forEach((c, i) => {
    const card = document.createElement('div');
    card.className = 'flashcard';
    card.innerHTML = `
      <div class="fc-q">${esc(c.q)}</div>
      <div class="fc-a hidden">${esc(c.a)}</div>
      <button class="fc-toggle">Reveal answer</button>`;
    card.querySelector('.fc-toggle').addEventListener('click', function() {
      const ans = card.querySelector('.fc-a');
      ans.classList.toggle('hidden');
      this.textContent = ans.classList.contains('hidden') ? 'Reveal answer' : 'Hide answer';
    });
    wrap.appendChild(card);
  });
  return wrap;
}

// ── Content-type renderers ────────────────────────────────────────────────────

function renderArticle(scroll, a, cfg) {
  if (a.summary) scroll.appendChild(mkSection('Summary', a.summary, cfg.color, '📝'));
  if (a.keyPoints?.length) {
    const sec = mkSectionEl('Key Points', cfg.color, '🔑');
    sec.querySelector('.section-body').appendChild(mkBulletList(a.keyPoints));
    scroll.appendChild(sec);
  }
  if (a.sentiment) {
    const moodIcon = a.sentiment === 'Positive' ? '😊' : a.sentiment === 'Negative' ? '😟' : '😐';
    const sec = mkSectionEl('Sentiment & Topics', cfg.color, moodIcon);
    const body = sec.querySelector('.section-body');
    body.innerHTML = `<div class="mood-row"><span class="mood-badge mood-${a.sentiment?.toLowerCase()}">${a.sentiment}</span>${a.readingTime ? `<span class="reading-time">~${a.readingTime} read</span>` : ''}</div>`;
    if (a.topics?.length) {
      const tags = document.createElement('div');
      tags.className = 'topic-tags';
      a.topics.forEach(t => { const s = document.createElement('span'); s.className='topic-tag'; s.textContent=t; tags.appendChild(s); });
      body.appendChild(tags);
    }
    scroll.appendChild(sec);
  }
  if (a.flashcards?.length) {
    const sec = mkSectionEl('Flashcards', cfg.color, '🃏');
    sec.querySelector('.section-body').appendChild(mkFlashcards(a.flashcards, cfg.color));
    scroll.appendChild(sec);
  }
}

function renderResearch(scroll, r, cfg) {
  if (r.abstract)   scroll.appendChild(mkSection('Abstract', r.abstract, cfg.color, '📄'));
  if (r.simplifiedExplanation) scroll.appendChild(mkSection('Plain English Explanation', r.simplifiedExplanation, cfg.color, '💡'));
  if (r.methodology) scroll.appendChild(mkSection('Methodology', r.methodology, cfg.color, '🔬'));
  if (r.findings?.length) {
    const sec = mkSectionEl('Key Findings', cfg.color, '🔍');
    sec.querySelector('.section-body').appendChild(mkBulletList(r.findings));
    scroll.appendChild(sec);
  }
  if (r.conclusions) scroll.appendChild(mkSection('Conclusions', r.conclusions, cfg.color, '🎯'));
  if (r.flashcards?.length) {
    const sec = mkSectionEl('Study Flashcards', cfg.color, '🃏');
    sec.querySelector('.section-body').appendChild(mkFlashcards(r.flashcards, cfg.color));
    scroll.appendChild(sec);
  }
}

function renderMath(scroll, m, cfg) {
  if (m.problem) scroll.appendChild(mkSection('Problem', m.problem, cfg.color, '❓'));
  if (m.solution) {
    const sec = mkSectionEl('Solution', cfg.color, '✅');
    sec.querySelector('.section-body').innerHTML = `<div class="math-solution">${esc(m.solution)}</div>`;
    scroll.appendChild(sec);
  }
  if (m.steps?.length) {
    const sec = mkSectionEl('Step-by-Step Solution', cfg.color, '📐');
    const body = sec.querySelector('.section-body');
    m.steps.forEach((s, i) => {
      const step = document.createElement('div');
      step.className = 'math-step';
      step.innerHTML = `<div class="step-num">${i+1}</div><div class="step-body"><div class="step-desc">${esc(s.description)}</div>${s.result ? `<div class="step-result">${esc(s.result)}</div>` : ''}</div>`;
      body.appendChild(step);
    });
    scroll.appendChild(sec);
  }
  if (m.concepts?.length) {
    const sec = mkSectionEl('Concepts Used', cfg.color, '📚');
    sec.querySelector('.section-body').appendChild(mkBulletList(m.concepts));
    scroll.appendChild(sec);
  }
  if (m.difficulty) {
    const sec = mkSectionEl('Difficulty', cfg.color, '📊');
    sec.querySelector('.section-body').innerHTML = `<span class="diff-badge diff-${m.difficulty?.toLowerCase()}">${esc(m.difficulty)}</span>`;
    scroll.appendChild(sec);
  }
}

function renderJob(scroll, j, cfg) {
  if (j.role || j.company) {
    const sec = mkSectionEl('Position', cfg.color, '💼');
    sec.querySelector('.section-body').innerHTML = `
      <div class="job-header">
        <div class="job-role">${esc(j.role || 'Role')}</div>
        <div class="job-meta">${esc(j.company || '')}${j.location ? ` · ${esc(j.location)}` : ''}${j.salary ? ` · ${esc(j.salary)}` : ''}</div>
      </div>`;
    scroll.appendChild(sec);
  }
  if (j.requirements?.length) {
    const sec = mkSectionEl('Requirements', cfg.color, '✅');
    sec.querySelector('.section-body').appendChild(mkBulletList(j.requirements));
    scroll.appendChild(sec);
  }
  if (j.skills?.length) {
    const sec = mkSectionEl('Skills Needed', cfg.color, '🛠');
    const body = sec.querySelector('.section-body');
    const tags = document.createElement('div'); tags.className = 'skill-tags';
    j.skills.forEach(s => { const sp = document.createElement('span'); sp.className='skill-tag'; sp.textContent=s; tags.appendChild(sp); });
    body.appendChild(tags);
    scroll.appendChild(sec);
  }
  if (j.applicationTips?.length) {
    const sec = mkSectionEl('Application Tips', cfg.color, '💡');
    sec.querySelector('.section-body').appendChild(mkBulletList(j.applicationTips));
    scroll.appendChild(sec);
  }
  if (j.redFlags?.length) {
    const sec = mkSectionEl('Red Flags', '#f87171', '⚠️');
    sec.querySelector('.section-body').appendChild(mkBulletList(j.redFlags));
    scroll.appendChild(sec);
  }
}

function renderVideo(scroll, v, cfg) {
  if (v.summary) scroll.appendChild(mkSection('Summary', v.summary, cfg.color, '📺'));
  if (v.keyTopics?.length) {
    const sec = mkSectionEl('Key Topics', cfg.color, '🎯');
    sec.querySelector('.section-body').appendChild(mkBulletList(v.keyTopics));
    scroll.appendChild(sec);
  }
  if (v.studyNotes?.length) {
    const sec = mkSectionEl('Study Notes', cfg.color, '📝');
    sec.querySelector('.section-body').appendChild(mkBulletList(v.studyNotes));
    scroll.appendChild(sec);
  }
}

function renderProduct(scroll, data, cfg) {
  scroll.appendChild(mkSection('Product Detected', 'This is a product listing. Use Truth Layer for detailed product analysis including fake review detection and price comparison.', cfg.color, '🛍️'));
}

function renderCode(scroll, c, cfg) {
  if (c.language) {
    const sec = mkSectionEl('Language', cfg.color, '💻');
    sec.querySelector('.section-body').innerHTML = `<span class="lang-badge">${esc(c.language)}</span>`;
    scroll.appendChild(sec);
  }
  if (c.explanation) scroll.appendChild(mkSection('What This Code Does', c.explanation, cfg.color, '💡'));
  if (c.codeSnippet) {
    const sec = mkSectionEl('Code', cfg.color, '📋');
    const pre = document.createElement('pre');
    pre.className = 'code-block';
    pre.textContent = c.codeSnippet;
    sec.querySelector('.section-body').appendChild(pre);
    scroll.appendChild(sec);
  }
  if (c.improvements?.length) {
    const sec = mkSectionEl('Suggested Improvements', cfg.color, '✨');
    sec.querySelector('.section-body').appendChild(mkBulletList(c.improvements));
    scroll.appendChild(sec);
  }
  if (c.bugs?.length) {
    const sec = mkSectionEl('Potential Bugs', '#f87171', '🐛');
    sec.querySelector('.section-body').appendChild(mkBulletList(c.bugs));
    scroll.appendChild(sec);
  }
}

function renderSocial(scroll, s, cfg) {
  if (s.content) scroll.appendChild(mkSection('Post Content', s.content, cfg.color, '💬'));
  if (s.keyTakeaway) scroll.appendChild(mkSection('Key Takeaway', s.keyTakeaway, cfg.color, '💡'));
  if (s.context) scroll.appendChild(mkSection('Context', s.context, cfg.color, '🌍'));
  if (s.sentiment) {
    const sec = mkSectionEl('Sentiment', cfg.color, '😊');
    sec.querySelector('.section-body').innerHTML = `<span class="mood-badge mood-${s.sentiment?.toLowerCase()}">${esc(s.sentiment)}</span>`;
    scroll.appendChild(sec);
  }
}

function renderRecipe(scroll, r, cfg) {
  if (r.name) scroll.appendChild(mkSection('Recipe', r.name, cfg.color, '🍳'));
  if (r.ingredients?.length) {
    const sec = mkSectionEl('Ingredients', cfg.color, '🧂');
    sec.querySelector('.section-body').appendChild(mkBulletList(r.ingredients));
    scroll.appendChild(sec);
  }
  if (r.steps?.length) {
    const sec = mkSectionEl('Steps', cfg.color, '📋');
    const body = sec.querySelector('.section-body');
    r.steps.forEach((s, i) => {
      const el = document.createElement('div');
      el.className = 'recipe-step';
      el.innerHTML = `<span class="step-num">${i+1}</span><span>${esc(s)}</span>`;
      body.appendChild(el);
    });
    scroll.appendChild(sec);
  }
  const meta = [r.prepTime && `Prep: ${r.prepTime}`, r.servings && `Serves: ${r.servings}`].filter(Boolean).join(' · ');
  if (meta) scroll.appendChild(mkSection('Info', meta, cfg.color, '⏱'));
}

function renderStudy(scroll, s, cfg) {
  if (s.subject) scroll.appendChild(mkSection('Subject', s.subject, cfg.color, '📚'));
  if (s.summary) scroll.appendChild(mkSection('Overview', s.summary, cfg.color, '📝'));
  if (s.keyTerms?.length) {
    const sec = mkSectionEl('Key Terms', cfg.color, '📖');
    const body = sec.querySelector('.section-body');
    body.innerHTML = s.keyTerms.map(t => `<div class="key-term"><span class="kt-term">${esc(t.term)}</span><span class="kt-def">${esc(t.definition)}</span></div>`).join('');
    scroll.appendChild(sec);
  }
  if (s.flashcards?.length) {
    const sec = mkSectionEl('Flashcards', cfg.color, '🃏');
    sec.querySelector('.section-body').appendChild(mkFlashcards(s.flashcards, cfg.color));
    scroll.appendChild(sec);
  }
  if (s.practiceQuestions?.length) {
    const sec = mkSectionEl('Practice Questions', cfg.color, '❓');
    sec.querySelector('.section-body').appendChild(mkBulletList(s.practiceQuestions));
    scroll.appendChild(sec);
  }
  if (s.studyPlan) scroll.appendChild(mkSection('Suggested Study Plan', s.studyPlan, cfg.color, '🗓'));
}

function renderGeneral(scroll, g, cfg) {
  if (g.summary) scroll.appendChild(mkSection('Summary', g.summary, cfg.color, '📝'));
  if (g.keyInsights?.length) {
    const sec = mkSectionEl('Key Insights', cfg.color, '💡');
    sec.querySelector('.section-body').appendChild(mkBulletList(g.keyInsights));
    scroll.appendChild(sec);
  }
  if (g.actionItems?.length) {
    const sec = mkSectionEl('Action Items', cfg.color, '✅');
    sec.querySelector('.section-body').appendChild(mkBulletList(g.actionItems));
    scroll.appendChild(sec);
  }
  if (g.categories?.length) {
    const sec = mkSectionEl('Tags', cfg.color, '🏷');
    const body = sec.querySelector('.section-body');
    const tags = document.createElement('div'); tags.className = 'topic-tags';
    g.categories.forEach(c => { const sp = document.createElement('span'); sp.className='topic-tag'; sp.textContent=c; tags.appendChild(sp); });
    body.appendChild(tags);
    scroll.appendChild(sec);
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  const result = await chrome.storage.local.get('capturedData');
  capturedData = result.capturedData;
  if (!capturedData || !capturedData.image || capturedData.mode !== 'masterscan') {
    showState(STATES.NONE);
    return;
  }
  runAnalysis();
}

// ── PDF Download ──────────────────────────────────────────────────────────────

function downloadPDF() {
  const scroll = $('resultsScroll');
  const ctTitle = $('ctTitle')?.textContent || 'MasterScan Analysis';

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>${ctTitle}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 40px; color: #1a1a2e; font-size: 14px; line-height: 1.6; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .sub { color: #666; font-size: 12px; margin-bottom: 24px; }
  .section-header { display: flex; align-items: center; gap: 8px; margin-top: 20px; margin-bottom: 6px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
  .section-title { font-size: 14px; font-weight: 600; color: #1a1a2e; }
  .section-emoji { font-size: 16px; }
  .section-body { margin-left: 24px; color: #374151; font-size: 13px; }
  ul { padding-left: 18px; margin: 6px 0; }
  li { margin-bottom: 4px; }
  pre { background: #f3f4f6; padding: 10px; border-radius: 6px; font-size: 12px; overflow-wrap: break-word; white-space: pre-wrap; }
  .extracted-text { background: #f9fafb; padding: 10px; border-radius: 6px; font-size: 12px; white-space: pre-wrap; }
  @media print { body { margin: 20px; } }
</style>
</head>
<body>
<h1>DecisionAI — MasterScan</h1>
<div class="sub">Generated ${new Date().toLocaleString()}</div>
${scroll ? scroll.innerHTML : ''}
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `masterscan-${Date.now()}.html`;
  a.click();
  URL.revokeObjectURL(url);

  const btn = $('downloadPdfBtn');
  const orig = btn.innerHTML;
  btn.textContent = '✓ Downloaded!';
  setTimeout(() => { btn.innerHTML = orig; }, 1800);
}

$('backBtn').addEventListener('click', () => window.close());
$('retryBtn').addEventListener('click', () => runAnalysis());
$('scanAgainBtn').addEventListener('click', () => window.close());
$('downloadPdfBtn').addEventListener('click', downloadPDF);
$('copyTextBtn').addEventListener('click', () => {
  if (extractedText) {
    navigator.clipboard.writeText(extractedText).then(() => {
      const btn = $('copyTextBtn');
      btn.textContent = '✓ Copied!';
      setTimeout(() => { btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> Copy extracted text'; }, 1500);
    });
  }
});

init();
