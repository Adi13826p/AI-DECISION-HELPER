document.addEventListener('DOMContentLoaded', async () => {

  // ── Element refs ────────────────────────────────────────────────────────────
  const homeView       = document.getElementById('homeView');
  const masterScanView = document.getElementById('masterScanView');
  const settingsBtn    = document.getElementById('settingsBtn');
  const settingsPanel  = document.getElementById('settingsPanel');
  const apiKeyInput    = document.getElementById('apiKeyInput');
  const saveKeyBtn     = document.getElementById('saveKeyBtn');
  const keyStatus      = document.getElementById('keyStatus');
  const indicatorDot   = document.getElementById('indicatorDot');
  const indicatorLabel = document.getElementById('indicatorLabel');
  const backBtn        = document.getElementById('backBtn');
  const smartyInput    = document.getElementById('smartyInput');
  const smartySearchBtn  = document.getElementById('smartySearchBtn');
  const scanScreenBtn    = document.getElementById('scanScreenBtn');
  const tabSmarty        = document.getElementById('tabSmarty');
  const tabProfile       = document.getElementById('tabProfile');
  const panelSmarty      = document.getElementById('panelSmarty');
  const panelProfile     = document.getElementById('panelProfile');
  const profileTabBadge  = document.getElementById('profileTabBadge');
  const profileSaveBtn   = document.getElementById('profileSaveBtn');
  const scanPageBtn      = document.getElementById('scanPageBtn');
  const pasteResumeBtn   = document.getElementById('pasteResumeBtn');
  const pasteArea        = document.getElementById('pasteArea');
  const resumePasteInput = document.getElementById('resumePasteInput');
  const parseResumeBtn   = document.getElementById('parseResumeBtn');
  const cancelPasteBtn   = document.getElementById('cancelPasteBtn');
  const autofillFormBtn  = document.getElementById('autofillFormBtn');
  const profScanStatus   = document.getElementById('profScanStatus');
  const profScanMsg      = document.getElementById('profScanMsg');
  const profPercent      = document.getElementById('profPercent');
  const profProgressFill = document.getElementById('profProgressFill');
  const profMissingMsg   = document.getElementById('profMissingMsg');
  const profToast        = document.getElementById('profToast');
  const serverUrlInput   = document.getElementById('serverUrlInput');
  const saveServerBtn    = document.getElementById('saveServerBtn');
  const serverStatus     = document.getElementById('serverStatus');

  // ── API key + server status ──────────────────────────────────────────────────
  async function refreshKeyStatus() {
    const resp = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    if (resp.hasServerUrl && resp.hasApiKey) {
      indicatorDot.className     = 'indicator-dot dot-ok';
      indicatorLabel.textContent = 'Server API + personal key fallback';
    } else if (resp.hasServerUrl) {
      indicatorDot.className     = 'indicator-dot dot-ok';
      indicatorLabel.textContent = 'Using server API';
    } else if (resp.hasApiKey) {
      indicatorDot.className     = 'indicator-dot dot-ok';
      indicatorLabel.textContent = 'API key configured';
    } else {
      indicatorDot.className     = 'indicator-dot dot-warn';
      indicatorLabel.textContent = 'No API key — click ⚙ to set up';
    }
  }
  await refreshKeyStatus();
  chrome.storage.local.get(['groqApiKey', 'serverUrl'], (d) => {
    if (d.groqApiKey) apiKeyInput.placeholder = '••••••••' + d.groqApiKey.slice(-4);
    if (d.serverUrl)  serverUrlInput.value = d.serverUrl;
  });

  settingsBtn.addEventListener('click', () => {
    settingsPanel.classList.toggle('hidden');
    if (!settingsPanel.classList.contains('hidden')) apiKeyInput.focus();
  });
  saveKeyBtn.addEventListener('click', async () => {
    const val = apiKeyInput.value.trim();
    if (!val || val.length < 10) { showKeyStatus('Enter a valid Groq API key', 'error'); return; }
    saveKeyBtn.textContent = 'Saving…';
    saveKeyBtn.disabled = true;
    const resp = await chrome.runtime.sendMessage({ type: 'SET_API_KEY', apiKey: val });
    saveKeyBtn.disabled = false;
    saveKeyBtn.textContent = 'Save';
    if (resp.success) {
      showKeyStatus('✓ Key saved!', 'ok');
      apiKeyInput.value = '';
      apiKeyInput.placeholder = '••••••••' + val.slice(-4);
      await refreshKeyStatus();
      setTimeout(() => settingsPanel.classList.add('hidden'), 1200);
    } else {
      showKeyStatus('Failed to save key', 'error');
    }
  });
  apiKeyInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveKeyBtn.click(); });
  function showKeyStatus(msg, type) {
    keyStatus.textContent = msg;
    keyStatus.className = `key-status key-status-${type}`;
    setTimeout(() => { keyStatus.className = 'key-status hidden'; }, 2500);
  }

  saveServerBtn.addEventListener('click', () => {
    const val = serverUrlInput.value.trim();
    if (val && !val.startsWith('http')) { showServerStatus('Enter a valid URL (starts with http)', 'error'); return; }
    saveServerBtn.textContent = 'Saving…';
    saveServerBtn.disabled = true;
    chrome.storage.local.set({ serverUrl: val || null }, async () => {
      saveServerBtn.disabled = false;
      saveServerBtn.textContent = 'Save';
      showServerStatus(val ? '✓ Server URL saved!' : '✓ Cleared', 'ok');
      await refreshKeyStatus();
    });
  });
  serverUrlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveServerBtn.click(); });
  function showServerStatus(msg, type) {
    serverStatus.textContent = msg;
    serverStatus.className = `key-status key-status-${type}`;
    setTimeout(() => { serverStatus.className = 'key-status hidden'; }, 2500);
  }

  // ── View switching ────────────────────────────────────────────────────────────
  function showView(view) {
    homeView.classList.add('hidden');
    masterScanView.classList.add('hidden');
    view.classList.remove('hidden');
  }

  // ── MasterScan tab switching ───────────────────────────────────────────────
  function switchTab(tab) {
    const isSmarty = tab === 'smarty';
    tabSmarty.classList.toggle('ws-tab-active', isSmarty);
    tabProfile.classList.toggle('ws-tab-active', !isSmarty);
    panelSmarty.classList.toggle('hidden', !isSmarty);
    panelProfile.classList.toggle('hidden', isSmarty);
    if (!isSmarty) {
      loadProfile();
    }
  }

  tabSmarty.addEventListener('click', () => switchTab('smarty'));
  tabProfile.addEventListener('click', () => switchTab('profile'));

  backBtn.addEventListener('click', () => {
    if (!panelProfile.classList.contains('hidden')) saveProfile();
    switchTab('smarty');
    showView(homeView);
  });

  document.getElementById('truthLayerBtn').addEventListener('click', () => launchSelector('truth'));
  document.getElementById('masterScanBtn').addEventListener('click', () => {
    switchTab('smarty');
    showView(masterScanView);
    setTimeout(() => smartyInput.focus(), 120);
  });

  // ── Helpers ───────────────────────────────────────────────────────────────────
  function isInternalUrl(url) {
    if (!url) return true;
    return url.startsWith('chrome://') ||
           url.startsWith('chrome-extension://') ||
           url.startsWith('edge://') ||
           url.startsWith('about:') ||
           url.startsWith('moz-extension://');
  }

  // ── Screen selector launcher ──────────────────────────────────────────────────
  async function launchSelector(mode) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;
    if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://') || tab.url?.startsWith('edge://')) {
      alert('DecisionAI cannot run on browser internal pages. Please navigate to a website first.');
      return;
    }
    await chrome.runtime.sendMessage({ type: 'LAUNCH_SELECTOR', mode, tabId: tab.id });
    window.close();
  }

  scanScreenBtn.addEventListener('click', () => launchSelector('masterscan'));

  // ── Smarty search ──────────────────────────────────────────────────────────────
  smartySearchBtn.addEventListener('click', async () => {
    const query = smartyInput.value.trim();
    if (!query) {
      smartyInput.focus();
      smartyInput.style.borderColor = 'rgba(244,63,94,0.6)';
      setTimeout(() => { smartyInput.style.borderColor = ''; }, 1500);
      return;
    }
    const btnTitle = smartySearchBtn.querySelector('.ms-btn-title');
    const btnDesc  = smartySearchBtn.querySelector('.ms-btn-desc');
    const origTitle = btnTitle.textContent, origDesc = btnDesc.textContent;
    btnTitle.textContent = 'Analyzing…'; btnDesc.textContent = 'Sending to Smarty AI';
    smartySearchBtn.classList.add('loading');
    try {
      let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) throw new Error('No active tab');

      // If active tab is an internal page, find any valid web tab
      if (isInternalUrl(tab.url)) {
        const allTabs = await chrome.tabs.query({ currentWindow: true });
        const validTab = allTabs.find(t => !isInternalUrl(t.url));
        if (validTab) {
          tab = validTab;
          // Switch to that tab so the user sees the overlay
          await chrome.tabs.update(validTab.id, { active: true });
        } else {
          alert('Please open any website in a tab first, then try again.');
          return;
        }
      }

      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content/content.js'] }).catch(() => {});
      await chrome.tabs.sendMessage(tab.id, { type: 'SMARTY_SEARCH', query, pageUrl: tab.url || '', pageTitle: tab.title || '' });
      window.close();
    } catch (err) {
      btnTitle.textContent = origTitle; btnDesc.textContent = origDesc;
      smartySearchBtn.classList.remove('loading');
    }
  });
  smartyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); smartySearchBtn.click(); }
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // PROFILE SYSTEM
  // ══════════════════════════════════════════════════════════════════════════════

  // ── Default empty profile ─────────────────────────────────────────────────────
  const EMPTY_PROFILE = () => ({
    name: '', email: '', phone: '', location: '', linkedin: '', github: '', website: '',
    dob: '', nationality: '', postalCode: '', photo: '',
    summary: '',
    skills: { tech: '', tools: '', langs: '', soft: '' },
    education:      [{ inst: '', degree: '', field: '', years: '', gpa: '' }],
    experience:     [{ company: '', role: '', period: '', bullets: '' }],
    projects:       [{ name: '', desc: '', tech: '', url: '' }],
    certifications: [{ name: '', issuer: '', date: '' }],
    prefs: { role: '', industry: '', workType: '', salary: '', availability: '' }
  });

  let profile = EMPTY_PROFILE();

  // ── Dynamic entry lists ───────────────────────────────────────────────────────

  function makeEduEntry(idx, data) {
    const d = data || {};
    return `
      <div class="prof-entry" id="edu-${idx}">
        <div class="prof-entry-header">
          <span class="prof-entry-num">Education ${idx + 1}</span>
          <button class="prof-entry-remove" data-type="edu" data-idx="${idx}" title="Remove">×</button>
        </div>
        <div class="prof-field-row">
          <label class="prof-label">Institution</label>
          <input class="prof-input" data-field="edu-inst-${idx}" placeholder="MIT, Stanford…" value="${esc(d.inst||'')}" autocomplete="off"/>
        </div>
        <div class="prof-field-2col">
          <div class="prof-field-row">
            <label class="prof-label">Degree</label>
            <input class="prof-input" data-field="edu-degree-${idx}" placeholder="B.Sc, M.Sc…" value="${esc(d.degree||'')}" autocomplete="off"/>
          </div>
          <div class="prof-field-row">
            <label class="prof-label">Field</label>
            <input class="prof-input" data-field="edu-field-${idx}" placeholder="Computer Science" value="${esc(d.field||'')}" autocomplete="off"/>
          </div>
        </div>
        <div class="prof-field-2col">
          <div class="prof-field-row">
            <label class="prof-label">Years</label>
            <input class="prof-input" data-field="edu-years-${idx}" placeholder="2019–2023" value="${esc(d.years||'')}" autocomplete="off"/>
          </div>
          <div class="prof-field-row">
            <label class="prof-label">GPA</label>
            <input class="prof-input" data-field="edu-gpa-${idx}" placeholder="3.8 / 4.0" value="${esc(d.gpa||'')}" autocomplete="off"/>
          </div>
        </div>
      </div>`;
  }

  function makeExpEntry(idx, data) {
    const d = data || {};
    return `
      <div class="prof-entry" id="exp-${idx}">
        <div class="prof-entry-header">
          <span class="prof-entry-num">Experience ${idx + 1}</span>
          <button class="prof-entry-remove" data-type="exp" data-idx="${idx}" title="Remove">×</button>
        </div>
        <div class="prof-field-2col">
          <div class="prof-field-row">
            <label class="prof-label">Company <span class="prof-required">*</span></label>
            <input class="prof-input" data-field="exp-company-${idx}" placeholder="Google" value="${esc(d.company||'')}" autocomplete="off"/>
          </div>
          <div class="prof-field-row">
            <label class="prof-label">Role <span class="prof-required">*</span></label>
            <input class="prof-input" data-field="exp-role-${idx}" placeholder="SWE II" value="${esc(d.role||'')}" autocomplete="off"/>
          </div>
        </div>
        <div class="prof-field-row">
          <label class="prof-label">Period</label>
          <input class="prof-input" data-field="exp-period-${idx}" placeholder="Jan 2021 – Jun 2023" value="${esc(d.period||'')}" autocomplete="off"/>
        </div>
        <div class="prof-field-row">
          <label class="prof-label">Key Achievements <span class="prof-hint">(one per line)</span></label>
          <textarea class="prof-input prof-textarea" data-field="exp-bullets-${idx}" placeholder="Reduced API latency by 40%&#10;Led a team of 6 engineers…" rows="3" spellcheck="false">${esc(d.bullets||'')}</textarea>
        </div>
      </div>`;
  }

  function makeProjEntry(idx, data) {
    const d = data || {};
    return `
      <div class="prof-entry" id="proj-${idx}">
        <div class="prof-entry-header">
          <span class="prof-entry-num">Project ${idx + 1}</span>
          <button class="prof-entry-remove" data-type="proj" data-idx="${idx}" title="Remove">×</button>
        </div>
        <div class="prof-field-row">
          <label class="prof-label">Project Name</label>
          <input class="prof-input" data-field="proj-name-${idx}" placeholder="DecisionAI Chrome Extension" value="${esc(d.name||'')}" autocomplete="off"/>
        </div>
        <div class="prof-field-row">
          <label class="prof-label">Description</label>
          <textarea class="prof-input prof-textarea" data-field="proj-desc-${idx}" placeholder="What it does and why you built it…" rows="2" spellcheck="false">${esc(d.desc||'')}</textarea>
        </div>
        <div class="prof-field-2col">
          <div class="prof-field-row">
            <label class="prof-label">Tech Stack</label>
            <input class="prof-input" data-field="proj-tech-${idx}" placeholder="React, Node.js…" value="${esc(d.tech||'')}" autocomplete="off"/>
          </div>
          <div class="prof-field-row">
            <label class="prof-label">URL / GitHub</label>
            <input class="prof-input" data-field="proj-url-${idx}" placeholder="https://…" value="${esc(d.url||'')}" autocomplete="off"/>
          </div>
        </div>
      </div>`;
  }

  function makeCertEntry(idx, data) {
    const d = data || {};
    return `
      <div class="prof-entry" id="cert-${idx}">
        <div class="prof-entry-header">
          <span class="prof-entry-num">Certification ${idx + 1}</span>
          <button class="prof-entry-remove" data-type="cert" data-idx="${idx}" title="Remove">×</button>
        </div>
        <div class="prof-field-row">
          <label class="prof-label">Certification Name</label>
          <input class="prof-input" data-field="cert-name-${idx}" placeholder="AWS Solutions Architect" value="${esc(d.name||'')}" autocomplete="off"/>
        </div>
        <div class="prof-field-2col">
          <div class="prof-field-row">
            <label class="prof-label">Issuing Body</label>
            <input class="prof-input" data-field="cert-issuer-${idx}" placeholder="Amazon, Google…" value="${esc(d.issuer||'')}" autocomplete="off"/>
          </div>
          <div class="prof-field-row">
            <label class="prof-label">Date</label>
            <input class="prof-input" data-field="cert-date-${idx}" placeholder="Mar 2024" value="${esc(d.date||'')}" autocomplete="off"/>
          </div>
        </div>
      </div>`;
  }

  function esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Render dynamic lists ──────────────────────────────────────────────────────

  function renderEntries() {
    document.getElementById('edu-entries').innerHTML  = profile.education.map((d,i)      => makeEduEntry(i,d)).join('');
    document.getElementById('exp-entries').innerHTML  = profile.experience.map((d,i)     => makeExpEntry(i,d)).join('');
    document.getElementById('proj-entries').innerHTML = profile.projects.map((d,i)       => makeProjEntry(i,d)).join('');
    document.getElementById('cert-entries').innerHTML = profile.certifications.map((d,i) => makeCertEntry(i,d)).join('');
    bindEntryRemove();
  }

  function bindEntryRemove() {
    document.querySelectorAll('.prof-entry-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        collectFromDOM();
        const type = btn.dataset.type, idx = parseInt(btn.dataset.idx);
        if (type === 'edu'  && profile.education.length > 1)      { profile.education.splice(idx,1); }
        else if (type === 'exp'  && profile.experience.length > 1)    { profile.experience.splice(idx,1); }
        else if (type === 'proj' && profile.projects.length > 1)      { profile.projects.splice(idx,1); }
        else if (type === 'cert' && profile.certifications.length > 1){ profile.certifications.splice(idx,1); }
        renderEntries();
        updateCompleteness();
      });
    });
  }

  document.getElementById('addEduBtn').addEventListener('click', () => {
    collectFromDOM();
    profile.education.push({ inst:'', degree:'', field:'', years:'', gpa:'' });
    renderEntries();
    openSection('education');
    updateCompleteness();
  });
  document.getElementById('addExpBtn').addEventListener('click', () => {
    collectFromDOM();
    profile.experience.push({ company:'', role:'', period:'', bullets:'' });
    renderEntries();
    openSection('experience');
    updateCompleteness();
  });
  document.getElementById('addProjBtn').addEventListener('click', () => {
    collectFromDOM();
    profile.projects.push({ name:'', desc:'', tech:'', url:'' });
    renderEntries();
    openSection('projects');
    updateCompleteness();
  });
  document.getElementById('addCertBtn').addEventListener('click', () => {
    collectFromDOM();
    profile.certifications.push({ name:'', issuer:'', date:'' });
    renderEntries();
    openSection('certs');
    updateCompleteness();
  });

  // ── Section collapse logic ────────────────────────────────────────────────────

  document.querySelectorAll('.prof-sec-header').forEach(btn => {
    btn.addEventListener('click', () => {
      const sec = btn.dataset.sec;
      const body = document.getElementById('body-' + sec);
      const arrow = btn.querySelector('.prof-sec-arrow');
      const isOpen = !body.classList.contains('hidden');
      body.classList.toggle('hidden', isOpen);
      arrow.classList.toggle('open', !isOpen);
    });
  });

  function openSection(sec) {
    const body = document.getElementById('body-' + sec);
    const header = document.querySelector(`.prof-sec-header[data-sec="${sec}"]`);
    if (body) body.classList.remove('hidden');
    if (header) header.querySelector('.prof-sec-arrow')?.classList.add('open');
  }

  // ── Collect values from DOM into profile object ───────────────────────────────

  function collectFromDOM() {
    profile.name        = document.getElementById('p-name').value.trim();
    profile.email       = document.getElementById('p-email').value.trim();
    profile.phone       = document.getElementById('p-phone').value.trim();
    profile.location    = document.getElementById('p-location').value.trim();
    profile.linkedin    = document.getElementById('p-linkedin').value.trim();
    profile.github      = document.getElementById('p-github').value.trim();
    profile.website     = document.getElementById('p-website').value.trim();
    profile.dob         = document.getElementById('p-dob').value.trim();
    profile.nationality = document.getElementById('p-nationality').value.trim();
    profile.address     = document.getElementById('p-address').value.trim();
    profile.zipCode     = document.getElementById('p-zipcode').value.trim();
    profile.postalCode  = document.getElementById('p-postalCode').value.trim();
    profile.photo       = document.getElementById('p-photo').value.trim();
    profile.summary  = document.getElementById('p-summary').value.trim();
    profile.skills.tech  = document.getElementById('p-skills-tech').value.trim();
    profile.skills.tools = document.getElementById('p-skills-tools').value.trim();
    profile.skills.langs = document.getElementById('p-skills-langs').value.trim();
    profile.skills.soft  = document.getElementById('p-skills-soft').value.trim();
    profile.prefs.role         = document.getElementById('p-pref-role').value.trim();
    profile.prefs.industry     = document.getElementById('p-pref-industry').value.trim();
    profile.prefs.workType     = document.getElementById('p-pref-worktype').value;
    profile.prefs.salary       = document.getElementById('p-pref-salary').value.trim();
    profile.prefs.availability = document.getElementById('p-pref-avail').value.trim();

    profile.education = profile.education.map((_, i) => ({
      inst:   (document.querySelector(`[data-field="edu-inst-${i}"]`)?.value||'').trim(),
      degree: (document.querySelector(`[data-field="edu-degree-${i}"]`)?.value||'').trim(),
      field:  (document.querySelector(`[data-field="edu-field-${i}"]`)?.value||'').trim(),
      years:  (document.querySelector(`[data-field="edu-years-${i}"]`)?.value||'').trim(),
      gpa:    (document.querySelector(`[data-field="edu-gpa-${i}"]`)?.value||'').trim(),
    }));
    profile.experience = profile.experience.map((_, i) => ({
      company: (document.querySelector(`[data-field="exp-company-${i}"]`)?.value||'').trim(),
      role:    (document.querySelector(`[data-field="exp-role-${i}"]`)?.value||'').trim(),
      period:  (document.querySelector(`[data-field="exp-period-${i}"]`)?.value||'').trim(),
      bullets: (document.querySelector(`[data-field="exp-bullets-${i}"]`)?.value||'').trim(),
    }));
    profile.projects = profile.projects.map((_, i) => ({
      name: (document.querySelector(`[data-field="proj-name-${i}"]`)?.value||'').trim(),
      desc: (document.querySelector(`[data-field="proj-desc-${i}"]`)?.value||'').trim(),
      tech: (document.querySelector(`[data-field="proj-tech-${i}"]`)?.value||'').trim(),
      url:  (document.querySelector(`[data-field="proj-url-${i}"]`)?.value||'').trim(),
    }));
    profile.certifications = profile.certifications.map((_, i) => ({
      name:   (document.querySelector(`[data-field="cert-name-${i}"]`)?.value||'').trim(),
      issuer: (document.querySelector(`[data-field="cert-issuer-${i}"]`)?.value||'').trim(),
      date:   (document.querySelector(`[data-field="cert-date-${i}"]`)?.value||'').trim(),
    }));
  }

  // ── Populate DOM from profile object ─────────────────────────────────────────

  function populateDOM() {
    document.getElementById('p-name').value        = profile.name || '';
    document.getElementById('p-email').value       = profile.email || '';
    document.getElementById('p-phone').value       = profile.phone || '';
    document.getElementById('p-location').value    = profile.location || '';
    document.getElementById('p-linkedin').value    = profile.linkedin || '';
    document.getElementById('p-github').value      = profile.github || '';
    document.getElementById('p-website').value     = profile.website || '';
    document.getElementById('p-dob').value         = profile.dob || '';
    document.getElementById('p-nationality').value = profile.nationality || '';
    document.getElementById('p-address').value     = profile.address || '';
    document.getElementById('p-zipcode').value     = profile.zipCode || '';
    document.getElementById('p-postalCode').value  = profile.postalCode || '';
    document.getElementById('p-photo').value       = profile.photo || '';
    document.getElementById('p-summary').value     = profile.summary || '';
    document.getElementById('p-skills-tech').value  = profile.skills?.tech || '';
    document.getElementById('p-skills-tools').value = profile.skills?.tools || '';
    document.getElementById('p-skills-langs').value = profile.skills?.langs || '';
    document.getElementById('p-skills-soft').value  = profile.skills?.soft || '';
    document.getElementById('p-pref-role').value         = profile.prefs?.role || '';
    document.getElementById('p-pref-industry').value     = profile.prefs?.industry || '';
    document.getElementById('p-pref-worktype').value     = profile.prefs?.workType || '';
    document.getElementById('p-pref-salary').value       = profile.prefs?.salary || '';
    document.getElementById('p-pref-avail').value        = profile.prefs?.availability || '';
    renderEntries();
  }

  // ── Completeness calculation ──────────────────────────────────────────────────

  const REQUIRED_FIELDS = [
    { key: 'name',    label: 'Full Name',   id: 'p-name',      sec: 'personal' },
    { key: 'email',   label: 'Email',       id: 'p-email',     sec: 'personal' },
    { key: 'summary', label: 'Summary',     id: 'p-summary',   sec: 'summary'  },
    { key: 'skills.tech', label: 'Technical Skills', id: 'p-skills-tech', sec: 'skills' },
  ];

  function updateCompleteness() {
    collectFromDOM();

    const checks = [
      profile.name, profile.email, profile.summary,
      profile.skills.tech,
      profile.education.some(e => e.inst || e.degree),
      profile.experience.some(e => e.company || e.role),
      profile.skills.tools || profile.skills.langs,
      profile.prefs.role || profile.prefs.industry,
      profile.projects.some(p => p.name || p.desc),
      profile.phone || profile.location,
    ];
    const filled = checks.filter(Boolean).length;
    const pct = Math.round((filled / checks.length) * 100);

    profPercent.textContent     = pct + '%';
    profProgressFill.style.width = pct + '%';

    const missing = [];
    if (!profile.name)        missing.push('Full Name');
    if (!profile.email)       missing.push('Email');
    if (!profile.summary)     missing.push('Professional Summary');
    if (!profile.skills.tech) missing.push('Technical Skills');

    // Highlight missing required inputs
    REQUIRED_FIELDS.forEach(f => {
      const el = document.getElementById(f.id);
      if (!el) return;
      const val = f.key.includes('.') ? profile[f.key.split('.')[0]][f.key.split('.')[1]] : profile[f.key];
      el.classList.toggle('field-missing', !val);
    });

    // Section dots
    updateDot('personal',  !!(profile.name && profile.email));
    updateDot('summary',   !!profile.summary);
    updateDot('skills',    !!profile.skills.tech);
    updateDot('education', profile.education.some(e => e.inst || e.degree));
    updateDot('experience',profile.experience.some(e => e.company || e.role));
    updateDot('projects',  profile.projects.some(p => p.name || p.desc));
    updateDot('certs',     profile.certifications.some(c => c.name));
    updateDot('prefs',     !!(profile.prefs.role || profile.prefs.industry));

    if (missing.length > 0) {
      profMissingMsg.textContent = '⚠ Missing: ' + missing.join(', ');
      profMissingMsg.classList.remove('hidden');
    } else {
      profMissingMsg.classList.add('hidden');
    }

    // Profile tab badge
    if (pct >= 70) {
      profileTabBadge.textContent = pct + '%';
      profileTabBadge.classList.add('complete');
    } else if (pct > 0) {
      profileTabBadge.textContent = pct + '%';
      profileTabBadge.classList.remove('complete');
    } else {
      profileTabBadge.textContent = 'Setup';
      profileTabBadge.classList.remove('complete');
    }
  }

  function updateDot(sec, hasContent) {
    const dot = document.getElementById('dot-' + sec);
    if (!dot) return;
    if (hasContent) {
      dot.className = 'prof-sec-dot dot-complete';
    } else {
      const required = ['personal','summary','skills'];
      dot.className = 'prof-sec-dot ' + (required.includes(sec) ? 'dot-missing' : '');
    }
  }

  // ── Load / Save ───────────────────────────────────────────────────────────────

  function loadProfile() {
    chrome.storage.local.get('userProfile', (data) => {
      if (data.userProfile) {
        profile = Object.assign(EMPTY_PROFILE(), data.userProfile);
        if (!profile.education?.length)      profile.education      = [{ inst:'', degree:'', field:'', years:'', gpa:'' }];
        if (!profile.experience?.length)     profile.experience     = [{ company:'', role:'', period:'', bullets:'' }];
        if (!profile.projects?.length)       profile.projects       = [{ name:'', desc:'', tech:'', url:'' }];
        if (!profile.certifications?.length) profile.certifications = [{ name:'', issuer:'', date:'' }];
      } else {
        profile = EMPTY_PROFILE();
      }
      populateDOM();
      // Open first incomplete required section
      if (!profile.name || !profile.email) openSection('personal');
      else if (!profile.summary)           openSection('summary');
      else if (!profile.skills.tech)       openSection('skills');
      else                                 openSection('personal');
      updateCompleteness();
    });
  }

  function saveProfile() {
    collectFromDOM();
    chrome.storage.local.set({ userProfile: profile });
  }

  profileSaveBtn.addEventListener('click', () => {
    saveProfile();
    showToast('✓ Profile saved!');
    updateCompleteness();
  });

  // Auto-save on input change
  let autoSaveTimer;
  document.getElementById('profBody').addEventListener('input', () => {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => { updateCompleteness(); }, 600);
  });

  // ── Paste resume ──────────────────────────────────────────────────────────────

  pasteResumeBtn.addEventListener('click', () => {
    pasteArea.classList.toggle('hidden');
    if (!pasteArea.classList.contains('hidden')) resumePasteInput.focus();
  });
  cancelPasteBtn.addEventListener('click', () => pasteArea.classList.add('hidden'));

  // ── Auto-fill form on current page ────────────────────────────────────────────

  autofillFormBtn.addEventListener('click', async () => {
    saveProfile();
    const origHTML = autofillFormBtn.innerHTML;
    autofillFormBtn.disabled = true;
    autofillFormBtn.querySelector('.prof-autofill-text').textContent = 'Filling form…';

    try {
      let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) { showToast('No active tab found'); return; }

      if (isInternalUrl(tab.url)) {
        const all = await chrome.tabs.query({ currentWindow: true });
        const valid = all.find(t => !isInternalUrl(t.url));
        if (valid) {
          tab = valid;
          await chrome.tabs.update(valid.id, { active: true });
        } else {
          showToast('Open any webpage with a form first.');
          return;
        }
      }

      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content/content.js'] }).catch(() => {});
      const result = await chrome.tabs.sendMessage(tab.id, { type: 'AUTOFILL_FORM' });

      if (result?.success) {
        if (result.filled > 0) {
          showToast('✓ Auto-filled ' + result.filled + ' field' + (result.filled > 1 ? 's' : '') + ' on the page!');
        } else {
          showToast('No empty matching fields found on that page.');
        }
        window.close();
      } else if (result?.error === 'NO_PROFILE') {
        showToast('Add your name & email to your profile first.');
      } else {
        showToast('Could not fill form. Try again.');
      }
    } catch (err) {
      showToast('Error: ' + (err.message || 'unknown'));
    } finally {
      autofillFormBtn.disabled = false;
      autofillFormBtn.innerHTML = origHTML;
    }
  });

  parseResumeBtn.addEventListener('click', async () => {
    const text = resumePasteInput.value.trim();
    if (!text || text.length < 50) { resumePasteInput.focus(); return; }
    parseResumeBtn.textContent = 'Extracting…';
    parseResumeBtn.disabled = true;
    setScanStatus('Parsing resume with AI…');
    try {
      let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || isInternalUrl(tab.url)) {
        const all = await chrome.tabs.query({ currentWindow: true });
        const valid = all.find(t => !isInternalUrl(t.url));
        if (valid) { tab = valid; }
        else { showToast('Open any webpage first, then try again.'); return; }
      }
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content/content.js'] }).catch(() => {});
      const result = await chrome.tabs.sendMessage(tab.id, { type: 'PARSE_RESUME_TEXT', text });
      if (result?.profile) {
        applyExtractedProfile(result.profile, 'resume text');
      } else {
        showToast('Could not parse resume. Try again.');
      }
    } catch (err) {
      showToast('Error: ' + err.message);
    } finally {
      parseResumeBtn.textContent = 'Extract with AI';
      parseResumeBtn.disabled = false;
      hideScanStatus();
      pasteArea.classList.add('hidden');
      resumePasteInput.value = '';
    }
  });

  // ── Scan current page ─────────────────────────────────────────────────────────

  scanPageBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) { showToast('No active tab found'); return; }
    if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://')) {
      showToast('Cannot scan browser internal pages');
      return;
    }
    scanPageBtn.disabled = true;
    const isLinkedIn = tab.url?.includes('linkedin.com/in/');
    setScanStatus(isLinkedIn ? 'Scanning LinkedIn profile…' : 'Scanning page for resume info…');
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content/content.js'] }).catch(() => {});
      const result = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_PROFILE', url: tab.url, isLinkedIn });
      if (result?.profile) {
        applyExtractedProfile(result.profile, isLinkedIn ? 'LinkedIn' : 'page');
      } else {
        showToast('Could not extract profile data from this page.');
      }
    } catch (err) {
      showToast('Scan failed: ' + err.message);
    } finally {
      scanPageBtn.disabled = false;
      hideScanStatus();
    }
  });

  // ── Apply extracted profile data ──────────────────────────────────────────────

  function applyExtractedProfile(extracted, source) {
    const before = JSON.stringify(profile);

    // Merge: only fill empty fields, don't overwrite user-entered data
    if (extracted.name     && !profile.name)     profile.name     = extracted.name;
    if (extracted.email    && !profile.email)    profile.email    = extracted.email;
    if (extracted.phone    && !profile.phone)    profile.phone    = extracted.phone;
    if (extracted.location && !profile.location) profile.location = extracted.location;
    if (extracted.linkedin && !profile.linkedin) profile.linkedin = extracted.linkedin;
    if (extracted.github   && !profile.github)   profile.github   = extracted.github;
    if (extracted.website  && !profile.website)  profile.website  = extracted.website;
    if (extracted.summary  && !profile.summary)  profile.summary  = extracted.summary;

    if (extracted.skills) {
      if (extracted.skills.tech  && !profile.skills.tech)  profile.skills.tech  = extracted.skills.tech;
      if (extracted.skills.tools && !profile.skills.tools) profile.skills.tools = extracted.skills.tools;
      if (extracted.skills.langs && !profile.skills.langs) profile.skills.langs = extracted.skills.langs;
      if (extracted.skills.soft  && !profile.skills.soft)  profile.skills.soft  = extracted.skills.soft;
    }
    if (extracted.education?.length) {
      const hasEdu = profile.education.some(e => e.inst || e.degree);
      if (!hasEdu) profile.education = extracted.education;
      else profile.education = [...profile.education, ...extracted.education.filter(e => e.inst || e.degree)];
    }
    if (extracted.experience?.length) {
      const hasExp = profile.experience.some(e => e.company || e.role);
      if (!hasExp) profile.experience = extracted.experience;
      else profile.experience = [...profile.experience, ...extracted.experience.filter(e => e.company || e.role)];
    }
    if (extracted.projects?.length) {
      const hasProj = profile.projects.some(p => p.name || p.desc);
      if (!hasProj) profile.projects = extracted.projects;
    }
    if (extracted.certifications?.length) {
      const hasCert = profile.certifications.some(c => c.name);
      if (!hasCert) profile.certifications = extracted.certifications;
    }
    if (extracted.prefs) {
      if (extracted.prefs.role     && !profile.prefs.role)     profile.prefs.role     = extracted.prefs.role;
      if (extracted.prefs.industry && !profile.prefs.industry) profile.prefs.industry = extracted.prefs.industry;
    }

    // Ensure minimum 1 entry in each list
    if (!profile.education.length)      profile.education      = [{ inst:'', degree:'', field:'', years:'', gpa:'' }];
    if (!profile.experience.length)     profile.experience     = [{ company:'', role:'', period:'', bullets:'' }];
    if (!profile.projects.length)       profile.projects       = [{ name:'', desc:'', tech:'', url:'' }];
    if (!profile.certifications.length) profile.certifications = [{ name:'', issuer:'', date:'' }];

    const changed = JSON.stringify(profile) !== before;
    populateDOM();
    saveProfile();
    updateCompleteness();

    if (changed) showToast('✓ Profile auto-filled from ' + source + '!');
    else showToast('Nothing new to extract from ' + source + '.');
  }

  // ── UI helpers ────────────────────────────────────────────────────────────────

  function setScanStatus(msg) {
    profScanMsg.textContent = msg;
    profScanStatus.classList.remove('hidden');
  }
  function hideScanStatus() {
    profScanStatus.classList.add('hidden');
  }

  let toastTimer;
  function showToast(msg) {
    profToast.textContent = msg;
    profToast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => profToast.classList.add('hidden'), 2800);
  }

  // ── Init: check stored profile and update home badge ──────────────────────────
  chrome.storage.local.get('userProfile', (data) => {
    if (data.userProfile) {
      const p = data.userProfile;
      const filled = [p.name, p.email, p.summary, p.skills?.tech,
        p.education?.some?.(e => e.inst || e.degree),
        p.experience?.some?.(e => e.company || e.role)].filter(Boolean).length;
      const pct = Math.round((filled / 6) * 100);
      if (pct > 0) {
        profileTabBadge.textContent = pct + '%';
        if (pct >= 70) profileTabBadge.classList.add('complete');
      }
    }
  });

});
