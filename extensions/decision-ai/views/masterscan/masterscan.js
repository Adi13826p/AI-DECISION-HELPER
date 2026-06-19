/**
 * MasterScan — DecisionAI
 * Universal AI content analysis via Groq vision.
 * Includes TTS (Text-to-Speech) with best-accent voice selection.
 */

import { analyzeMasterScan } from '../../lib/api.js';

const $ = (id) => document.getElementById(id);

let capturedData   = null;
let extractedText  = '';
let summaryText    = '';   // built from rendered results for TTS

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

// ── TTS Engine ────────────────────────────────────────────────────────────────

const tts = (() => {
  let speaking = false;
  let paused   = false;

  function getBestVoice() {
    const voices = window.speechSynthesis?.getVoices() ?? [];
    const priority = [
      'Google UK English Female',
      'Google US English Female',
      'Microsoft Jenny Online (Natural) - English (United States)',
      'Microsoft Aria Online (Natural) - English (United States)',
      'Microsoft Zira - English (United States)',
      'Samantha',
      'Karen',
      'Moira',
      'Victoria',
    ];
    for (const name of priority) {
      const v = voices.find(v => v.name === name);
      if (v) return v;
    }
    return (
      voices.find(v => v.lang.startsWith('en') && /female|woman/i.test(v.name)) ||
      voices.find(v => v.lang === 'en-GB') ||
      voices.find(v => v.lang.startsWith('en')) ||
      voices[0] || null
    );
  }

  function updateBar(label) {
    const bar = $('ttsBar');
    const lbl = $('ttsBarLabel');
    const sts = $('ttsBarStatus');
    if (!bar) return;
    bar.classList.toggle('hidden', !speaking);
    bar.classList.toggle('paused', paused);
    if (lbl) lbl.textContent = label || '';
    if (sts) sts.textContent = paused ? 'Paused' : 'Speaking…';
    const listenBtn = $('listenBtn');
    if (listenBtn) listenBtn.classList.toggle('speaking', speaking && !paused);
    const toggleBtn = $('ttsToggleBtn');
    if (toggleBtn) toggleBtn.textContent = paused ? '▶' : '⏸';
  }

  function speak(text, label) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    speaking = false; paused = false;

    const utt = new SpeechSynthesisUtterance(text);
    utt.rate   = 0.91;
    utt.pitch  = 1.02;
    utt.volume = 1.0;

    const doSpeak = () => {
      const voice = getBestVoice();
      if (voice) utt.voice = voice;
      utt.onstart  = () => { speaking = true; paused = false; updateBar(label || text.slice(0, 52) + (text.length > 52 ? '…' : '')); };
      utt.onend    = () => { speaking = false; paused = false; updateBar(''); };
      utt.onerror  = () => { speaking = false; paused = false; updateBar(''); };
      utt.onpause  = () => { paused = true;  updateBar(label || ''); };
      utt.onresume = () => { paused = false; updateBar(label || ''); };
      window.speechSynthesis.speak(utt);
    };

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.addEventListener('voiceschanged', doSpeak, { once: true });
    } else {
      doSpeak();
    }
  }

  function toggle() {
    if (!speaking) return;
    if (paused) { window.speechSynthesis?.resume(); paused = false; }
    else        { window.speechSynthesis?.pause();  paused = true;  }
    updateBar($('ttsBarLabel')?.textContent || '');
  }

  function stop() {
    window.speechSynthesis?.cancel();
    speaking = false; paused = false;
    updateBar('');
  }

  return { speak, toggle, stop, isSpeaking: () => speaking };
})();

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

  const ct  = data.contentType || 'other';
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
  const textParts = [data.contentLabel || cfg.label];

  if (data.title) {
    scroll.appendChild(mkSection('Detected Title', data.title, cfg.color, '📌'));
    textParts.push(data.title);
  }

  switch (ct) {
    case 'article':        renderArticle(scroll, data.article || {}, cfg, textParts);        break;
    case 'research_paper': renderResearch(scroll, data.research || {}, cfg, textParts);      break;
    case 'math':           renderMath(scroll, data.math || {}, cfg, textParts);              break;
    case 'job_posting':    renderJob(scroll, data.job || {}, cfg, textParts);                break;
    case 'video':          renderVideo(scroll, data.video || {}, cfg, textParts);            break;
    case 'product':        renderProduct(scroll, data, cfg, textParts);                      break;
    case 'code':           renderCode(scroll, data.code || {}, cfg, textParts);              break;
    case 'social_post':    renderSocial(scroll, data.social_post || {}, cfg, textParts);    break;
    case 'recipe':         renderRecipe(scroll, data.recipe || {}, cfg, textParts);          break;
    case 'study_material': renderStudy(scroll, data.study_material || {}, cfg, textParts);  break;
    default:               renderGeneral(scroll, data.general || {}, cfg, textParts);        break;
  }

  if (data.extractedText) {
    const sec = mkSectionEl('Extracted Text', cfg.color, '📋');
    const pre = document.createElement('div');
    pre.className = 'extracted-text';
    pre.textContent = data.extractedText;
    sec.querySelector('.section-body').appendChild(pre);
    scroll.appendChild(sec);
  }

  // Build full summary text for TTS
  summaryText = textParts.join('. ').replace(/\s+/g, ' ').trim();
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
  cards.slice(0, 6).forEach((c) => {
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

function renderArticle(scroll, a, cfg, tp) {
  if (a.summary) { scroll.appendChild(mkSection('Summary', a.summary, cfg.color, '📝')); tp.push(a.summary); }
  if (a.keyPoints?.length) {
    const sec = mkSectionEl('Key Points', cfg.color, '🔑');
    sec.querySelector('.section-body').appendChild(mkBulletList(a.keyPoints));
    scroll.appendChild(sec);
    tp.push('Key points: ' + a.keyPoints.join('. '));
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
    tp.push('Sentiment: ' + a.sentiment);
  }
  if (a.flashcards?.length) {
    const sec = mkSectionEl('Flashcards', cfg.color, '🃏');
    sec.querySelector('.section-body').appendChild(mkFlashcards(a.flashcards, cfg.color));
    scroll.appendChild(sec);
  }
}

function renderResearch(scroll, r, cfg, tp) {
  if (r.abstract)                { scroll.appendChild(mkSection('Abstract', r.abstract, cfg.color, '📄')); tp.push(r.abstract); }
  if (r.simplifiedExplanation)   { scroll.appendChild(mkSection('Plain English Explanation', r.simplifiedExplanation, cfg.color, '💡')); tp.push(r.simplifiedExplanation); }
  if (r.methodology)             { scroll.appendChild(mkSection('Methodology', r.methodology, cfg.color, '🔬')); tp.push(r.methodology); }
  if (r.findings?.length) {
    const sec = mkSectionEl('Key Findings', cfg.color, '🔍');
    sec.querySelector('.section-body').appendChild(mkBulletList(r.findings));
    scroll.appendChild(sec);
    tp.push('Key findings: ' + r.findings.join('. '));
  }
  if (r.conclusions) { scroll.appendChild(mkSection('Conclusions', r.conclusions, cfg.color, '🎯')); tp.push(r.conclusions); }
  if (r.flashcards?.length) {
    const sec = mkSectionEl('Study Flashcards', cfg.color, '🃏');
    sec.querySelector('.section-body').appendChild(mkFlashcards(r.flashcards, cfg.color));
    scroll.appendChild(sec);
  }
}

function renderMath(scroll, m, cfg, tp) {
  if (m.problem) { scroll.appendChild(mkSection('Problem', m.problem, cfg.color, '❓')); tp.push('Problem: ' + m.problem); }
  if (m.solution) {
    const sec = mkSectionEl('Solution', cfg.color, '✅');
    sec.querySelector('.section-body').innerHTML = `<div class="math-solution">${esc(m.solution)}</div>`;
    scroll.appendChild(sec);
    tp.push('Solution: ' + m.solution);
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
    tp.push('Steps: ' + m.steps.map(s => s.description).join('. '));
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
    tp.push('Difficulty: ' + m.difficulty);
  }
}

function renderJob(scroll, j, cfg, tp) {
  if (j.role || j.company) {
    const sec = mkSectionEl('Position', cfg.color, '💼');
    sec.querySelector('.section-body').innerHTML = `
      <div class="job-header">
        <div class="job-role">${esc(j.role || 'Role')}</div>
        <div class="job-meta">${esc(j.company || '')}${j.location ? ` · ${esc(j.location)}` : ''}${j.salary ? ` · ${esc(j.salary)}` : ''}</div>
      </div>`;
    scroll.appendChild(sec);
    tp.push(`Job: ${j.role || ''} at ${j.company || ''}`);
  }
  if (j.requirements?.length) {
    const sec = mkSectionEl('Requirements', cfg.color, '✅');
    sec.querySelector('.section-body').appendChild(mkBulletList(j.requirements));
    scroll.appendChild(sec);
    tp.push('Requirements: ' + j.requirements.join('. '));
  }
  if (j.skills?.length) {
    const sec = mkSectionEl('Skills Needed', cfg.color, '🛠');
    const body = sec.querySelector('.section-body');
    const tags = document.createElement('div'); tags.className = 'skill-tags';
    j.skills.forEach(s => { const sp = document.createElement('span'); sp.className='skill-tag'; sp.textContent=s; tags.appendChild(sp); });
    body.appendChild(tags);
    scroll.appendChild(sec);
    tp.push('Skills: ' + j.skills.join(', '));
  }
  if (j.applicationTips?.length) {
    const sec = mkSectionEl('Application Tips', cfg.color, '💡');
    sec.querySelector('.section-body').appendChild(mkBulletList(j.applicationTips));
    scroll.appendChild(sec);
    tp.push('Application tips: ' + j.applicationTips.join('. '));
  }
  if (j.redFlags?.length) {
    const sec = mkSectionEl('Red Flags', '#f87171', '⚠️');
    sec.querySelector('.section-body').appendChild(mkBulletList(j.redFlags));
    scroll.appendChild(sec);
    tp.push('Red flags: ' + j.redFlags.join('. '));
  }
}

function renderVideo(scroll, v, cfg, tp) {
  if (v.summary) { scroll.appendChild(mkSection('Summary', v.summary, cfg.color, '📺')); tp.push(v.summary); }
  if (v.keyTopics?.length) {
    const sec = mkSectionEl('Key Topics', cfg.color, '🎯');
    sec.querySelector('.section-body').appendChild(mkBulletList(v.keyTopics));
    scroll.appendChild(sec);
    tp.push('Key topics: ' + v.keyTopics.join('. '));
  }
  if (v.studyNotes?.length) {
    const sec = mkSectionEl('Study Notes', cfg.color, '📝');
    sec.querySelector('.section-body').appendChild(mkBulletList(v.studyNotes));
    scroll.appendChild(sec);
    tp.push('Study notes: ' + v.studyNotes.join('. '));
  }
}

function renderProduct(scroll, data, cfg, tp) {
  const msg = 'This is a product listing. Use Truth Layer for detailed product analysis including fake review detection and price comparison.';
  scroll.appendChild(mkSection('Product Detected', msg, cfg.color, '🛍️'));
  tp.push(msg);
}

function renderCode(scroll, c, cfg, tp) {
  if (c.language) {
    const sec = mkSectionEl('Language', cfg.color, '💻');
    sec.querySelector('.section-body').innerHTML = `<span class="lang-badge">${esc(c.language)}</span>`;
    scroll.appendChild(sec);
    tp.push('Language: ' + c.language);
  }
  if (c.explanation) { scroll.appendChild(mkSection('What This Code Does', c.explanation, cfg.color, '💡')); tp.push(c.explanation); }
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
    tp.push('Improvements: ' + c.improvements.join('. '));
  }
  if (c.bugs?.length) {
    const sec = mkSectionEl('Potential Bugs', '#f87171', '🐛');
    sec.querySelector('.section-body').appendChild(mkBulletList(c.bugs));
    scroll.appendChild(sec);
    tp.push('Potential bugs: ' + c.bugs.join('. '));
  }
}

function renderSocial(scroll, s, cfg, tp) {
  if (s.content)     { scroll.appendChild(mkSection('Post Content', s.content, cfg.color, '💬')); tp.push(s.content); }
  if (s.keyTakeaway) { scroll.appendChild(mkSection('Key Takeaway', s.keyTakeaway, cfg.color, '💡')); tp.push(s.keyTakeaway); }
  if (s.context)     { scroll.appendChild(mkSection('Context', s.context, cfg.color, '🌍')); tp.push(s.context); }
  if (s.sentiment) {
    const sec = mkSectionEl('Sentiment', cfg.color, '😊');
    sec.querySelector('.section-body').innerHTML = `<span class="mood-badge mood-${s.sentiment?.toLowerCase()}">${esc(s.sentiment)}</span>`;
    scroll.appendChild(sec);
    tp.push('Sentiment: ' + s.sentiment);
  }
}

function renderRecipe(scroll, r, cfg, tp) {
  if (r.name) { scroll.appendChild(mkSection('Recipe', r.name, cfg.color, '🍳')); tp.push('Recipe: ' + r.name); }
  if (r.ingredients?.length) {
    const sec = mkSectionEl('Ingredients', cfg.color, '🧂');
    sec.querySelector('.section-body').appendChild(mkBulletList(r.ingredients));
    scroll.appendChild(sec);
    tp.push('Ingredients: ' + r.ingredients.join(', '));
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
    tp.push('Steps: ' + r.steps.join('. '));
  }
  const meta = [r.prepTime && `Prep: ${r.prepTime}`, r.servings && `Serves: ${r.servings}`].filter(Boolean).join(' · ');
  if (meta) { scroll.appendChild(mkSection('Info', meta, cfg.color, '⏱')); tp.push(meta); }
}

function renderStudy(scroll, s, cfg, tp) {
  if (s.subject) { scroll.appendChild(mkSection('Subject', s.subject, cfg.color, '📚')); tp.push('Subject: ' + s.subject); }
  if (s.summary) { scroll.appendChild(mkSection('Overview', s.summary, cfg.color, '📝')); tp.push(s.summary); }
  if (s.keyTerms?.length) {
    const sec = mkSectionEl('Key Terms', cfg.color, '📖');
    const body = sec.querySelector('.section-body');
    body.innerHTML = s.keyTerms.map(t => `<div class="key-term"><span class="kt-term">${esc(t.term)}</span><span class="kt-def">${esc(t.definition)}</span></div>`).join('');
    scroll.appendChild(sec);
    tp.push('Key terms: ' + s.keyTerms.map(t => `${t.term}: ${t.definition}`).join('. '));
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
    tp.push('Practice questions: ' + s.practiceQuestions.join('. '));
  }
  if (s.studyPlan) { scroll.appendChild(mkSection('Suggested Study Plan', s.studyPlan, cfg.color, '🗓')); tp.push(s.studyPlan); }
}

function renderGeneral(scroll, g, cfg, tp) {
  if (g.summary) { scroll.appendChild(mkSection('Summary', g.summary, cfg.color, '📝')); tp.push(g.summary); }
  if (g.keyInsights?.length) {
    const sec = mkSectionEl('Key Insights', cfg.color, '💡');
    sec.querySelector('.section-body').appendChild(mkBulletList(g.keyInsights));
    scroll.appendChild(sec);
    tp.push('Key insights: ' + g.keyInsights.join('. '));
  }
  if (g.actionItems?.length) {
    const sec = mkSectionEl('Action Items', cfg.color, '✅');
    sec.querySelector('.section-body').appendChild(mkBulletList(g.actionItems));
    scroll.appendChild(sec);
    tp.push('Action items: ' + g.actionItems.join('. '));
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
  const scroll  = $('resultsScroll');
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
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `masterscan-${Date.now()}.html`;
  a.click();
  URL.revokeObjectURL(url);

  const btn  = $('downloadPdfBtn');
  const orig = btn.innerHTML;
  btn.textContent = '✓ Downloaded!';
  setTimeout(() => { btn.innerHTML = orig; }, 1800);
}

// ── Selection Tooltip ─────────────────────────────────────────────────────────

let selText = '';

function hideSelTooltip() {
  $('selTooltip').classList.add('hidden');
  selText = '';
}

document.addEventListener('mouseup', (e) => {
  setTimeout(() => {
    const sel  = window.getSelection();
    const text = sel?.toString().trim() ?? '';
    if (text.length >= 8 && !$('selTooltip').contains(e.target)) {
      selText = text;
      const tip = $('selTooltip');
      tip.classList.remove('hidden');
      const x = Math.max(4, Math.min(e.clientX - 80, window.innerWidth - 200));
      const y = Math.max(4, e.clientY - 52);
      tip.style.left = x + 'px';
      tip.style.top  = y + 'px';
    } else if (!$('selTooltip').contains(e.target)) {
      hideSelTooltip();
    }
  }, 20);
});

$('selListenBtn').addEventListener('click', () => {
  if (selText) { tts.speak(selText, 'Selected text'); }
  hideSelTooltip();
  window.getSelection()?.removeAllRanges();
});

$('selCopyBtn').addEventListener('click', () => {
  if (selText) navigator.clipboard.writeText(selText).catch(() => {});
  hideSelTooltip();
});

$('selCloseBtn').addEventListener('click', hideSelTooltip);

// ── TTS Bar controls ──────────────────────────────────────────────────────────

$('ttsToggleBtn').addEventListener('click', () => tts.toggle());
$('ttsStopBtn').addEventListener('click', () => tts.stop());

// ── Listen button (results) ───────────────────────────────────────────────────

$('listenBtn').addEventListener('click', () => {
  if (tts.isSpeaking()) { tts.stop(); return; }
  const text = summaryText || extractedText;
  if (text) tts.speak(text, $('ctTitle')?.textContent || 'Summary');
});

// ── TTS Speak Panel (no-capture state) ───────────────────────────────────────

const ttsInput    = $('ttsTextInput');
const ttsListenBtn = $('ttsListenBtn');
const ttsClearBtn  = $('ttsClearBtn');
const ttsCharCount = $('ttsCharCount');

ttsInput.addEventListener('input', () => {
  const len = ttsInput.value.trim().length;
  ttsListenBtn.disabled = len < 3;
  ttsClearBtn.classList.toggle('hidden', len === 0);
  if (len > 0) {
    const words = ttsInput.value.trim().split(/\s+/).length;
    ttsCharCount.textContent = `${len} chars · ~${Math.ceil(words / 150)} min read`;
    ttsCharCount.classList.remove('hidden');
  } else {
    ttsCharCount.classList.add('hidden');
  }
});

ttsListenBtn.addEventListener('click', () => {
  const text = ttsInput.value.trim();
  if (text.length >= 3) tts.speak(text, 'Selected text');
});

ttsClearBtn.addEventListener('click', () => {
  ttsInput.value = '';
  ttsListenBtn.disabled = true;
  ttsClearBtn.classList.add('hidden');
  ttsCharCount.classList.add('hidden');
  tts.stop();
});

// ── Standard button wires ─────────────────────────────────────────────────────

$('backBtn').addEventListener('click', () => { tts.stop(); window.close(); });
$('retryBtn').addEventListener('click', () => runAnalysis());
$('scanAgainBtn').addEventListener('click', () => { tts.stop(); window.close(); });
$('downloadPdfBtn').addEventListener('click', downloadPDF);
$('copyTextBtn').addEventListener('click', () => {
  if (extractedText) {
    navigator.clipboard.writeText(extractedText).then(() => {
      const btn  = $('copyTextBtn');
      btn.textContent = '✓ Copied!';
      setTimeout(() => { btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> Copy text'; }, 1500);
    });
  }
});

init();
