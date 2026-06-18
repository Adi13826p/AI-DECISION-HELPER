/**
 * DecisionAI — Content Script
 * Handles page data extraction, Groq API calls, and in-page overlay UI.
 * All AI analysis happens here — no round-trips back to the service worker.
 */

(function () {
  'use strict';

  if (window.__decisionAiInjected) return;
  window.__decisionAiInjected = true;

  chrome.runtime.sendMessage({ type: 'CONTENT_READY' }).catch(() => {});

  // ══════════════════════════════════════════════════════════════════════════
  // GROQ API (inlined — content scripts cannot use ES module imports)
  // ══════════════════════════════════════════════════════════════════════════

  const GROQ_ENDPOINT  = 'https://api.groq.com/openai/v1/chat/completions';
  const VISION_MODEL   = 'meta-llama/llama-4-scout-17b-16e-instruct';

  function getApiKey() {
    return new Promise((resolve) => {
      chrome.storage.local.get('groqApiKey', (d) => resolve(d.groqApiKey || null));
    });
  }

  async function groqCall(messages, model) {
    const apiKey = await getApiKey();
    if (!apiKey) throw new Error('NO_API_KEY');

    const resp = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.3,
        max_tokens: 2048,
        response_format: { type: 'json_object' }
      })
    });

    if (!resp.ok) {
      const err = await resp.text().catch(() => resp.statusText);
      if (resp.status === 401) throw new Error('INVALID_API_KEY');
      throw new Error('Groq API error ' + resp.status + ': ' + err);
    }

    const data = await resp.json();
    const text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!text) throw new Error('Empty response from AI');

    try { return JSON.parse(text); }
    catch (_) { throw new Error('AI returned invalid JSON. Please try again.'); }
  }

  function analyzeTruthLayer(imageDataUrl, pageUrl, pageTitle) {
    return groqCall([
      { role: 'system', content: 'You are DecisionAI Truth Layer — an expert product analyst AI. Analyze product screenshots and return comprehensive, honest assessments. Always return valid JSON only, no markdown.' },
      { role: 'user', content: [
        { type: 'image_url', image_url: { url: imageDataUrl } },
        { type: 'text', text: 'Analyze this screenshot from: ' + (pageUrl || 'unknown page') + '\nTitle: ' + (pageTitle || 'unknown') + '\n\nReturn ONLY this JSON:\n{"product":{"name":"full product name","brand":"brand","model":"model if visible","price":"price as shown","currency":"currency","rating":"rating e.g. 4.2/5","reviewCount":"reviews count","store":"store name","inStock":true},"truthScore":75,"scoreLabel":"Good","verdict":{"type":"buy","label":"Recommended Buy","reasoning":"3-4 sentence explanation","emoji":"✅"},"reviews":{"summary":"2-3 sentence customer summary","pros":["Pro 1","Pro 2","Pro 3"],"cons":["Con 1","Con 2"],"hiddenComplaints":["Common hidden issue"]},"priceIntel":{"currentPrice":"visible price","fairPrice":"fair market value","dealRating":"Great Deal|Fair|Overpriced","alternatives":[{"store":"Amazon","estimatedPrice":"$XX","note":"note"}]},"buyTiming":{"recommendation":"buy-now","reason":"short reason"},"competitors":[{"name":"Competitor","why":"comparison","betterFor":"use case"}]}' }
      ]}
    ], VISION_MODEL);
  }

  function analyzeMasterScan(imageDataUrl, pageUrl, pageTitle) {
    return groqCall([
      { role: 'system', content: 'You are MasterScan — a premium AI analyst by DecisionAI. Your output is used by professionals who need deep, substantive analysis. Every field must be thorough, analytical, and written in a confident expert voice. No fluff, no vague statements. Always return valid JSON only, no markdown.' },
      { role: 'user', content: [
        { type: 'image_url', image_url: { url: imageDataUrl } },
        { type: 'text', text:
          'Analyze this screenshot from: ' + (pageUrl || 'unknown') + '\nTitle: ' + (pageTitle || 'unknown') + '\n\n' +
          'Detect content type then return ONLY this JSON (fill ALL fields thoroughly — summaries must be 4-6 analytical sentences minimum):\n' +
          '{"contentType":"article|research_paper|math|job_posting|video|product|code|social_post|other",' +
          '"contentLabel":"Human-readable type label","title":"Full detected title","confidence":90,"topics":["topic1","topic2","topic3"],' +
          '"quickOverview":"2-sentence executive teaser — the most important thing to know right now",' +
          '"article":{"executiveSummary":"4-6 sentence analytical expert summary covering the core argument, evidence presented, and implications — no vague language","keyTakeaways":["Specific actionable takeaway with concrete detail","Another precise insight","Another precise insight","Another precise insight","Another precise insight"],"coreConcepts":[{"term":"Key concept","definition":"Precise definition in context"}],"expertPerspective":"What a domain expert would observe or critique about this piece — 2-3 sentences","actionItems":["What the reader should specifically do with this info","Another concrete next step"],"flashcards":[{"q":"Precise conceptual question?","a":"Thorough answer with context"},{"q":"Another question?","a":"Answer"}]},' +
          '"research":{"abstract":"4-5 sentence summary of the study","methodology":"Research method and sample/data used","keyFindings":["Specific quantitative or qualitative finding","Another specific finding","Another finding"],"conclusions":"2-3 sentence synthesis of what this research means","simplifiedExplanation":"Plain-English explanation for a non-expert — 3-4 sentences","limitations":"1-2 sentences on study limitations","flashcards":[{"q":"What did this study find about X?","a":"Specific answer"},{"q":"How was this studied?","a":"Method answer"}]},' +
          '"math":{"problem":"The exact problem as stated","solution":"Final answer with units","steps":[{"step":1,"description":"What was done","result":"Intermediate result"}],"difficulty":"Easy|Medium|Hard|Expert","concepts":["Concept used"]},' +
          '"job":{"company":"Company name","role":"Exact job title","location":"Location or Remote","salary":"Salary range if shown","overview":"2-3 sentence role overview","requirements":["Specific requirement"],"skills":["Skill"],"applicationTips":["Specific strategic tip to stand out","Another tip"],"redFlags":["Specific concern if any"],"fitScore":"Strong|Moderate|Niche"},' +
          '"video":{"channel":"Channel name","summary":"4-5 sentence overview of content","keyTopics":["Topic with brief detail"],"studyNotes":["Important note to remember"],"quotableInsights":["Memorable or important statement from the content"]},' +
          '"code":{"language":"Language","explanation":"3-4 sentence explanation of what this code does and why","timeComplexity":"If applicable","improvements":["Specific improvement with reason"],"bugs":["Specific bug or risk"],"bestPractices":["Best practice being used or violated"]},' +
          '"general":{"executiveSummary":"4-6 analytical sentences covering what this is, why it matters, and key context","keyInsights":["Specific substantive insight","Another insight","Another insight"],"actionItems":["Concrete action","Another action"]}}'
        }
      ]}
    ], VISION_MODEL);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE DATA EXTRACTION
  // ══════════════════════════════════════════════════════════════════════════

  function extractProductData() {
    const data = {
      url: window.location.href, domain: window.location.hostname.replace('www.', ''),
      title: document.title, price: null, currency: null, rating: null, reviewCount: null,
      description: null, brand: null, category: null, inStock: null, images: [], breadcrumbs: []
    };
    trySchemaOrg(data);
    if (!data.price) data.price = getContent('[itemprop="price"]') || getText('.a-price .a-offscreen, #priceblock_ourprice') || getText('.price, .product-price, [data-price]') || null;
    if (!data.rating) data.rating = getContent('[itemprop="ratingValue"]') || getText('.a-icon-alt')?.match(/[\d.]+/)?.[0] || null;
    if (!data.reviewCount) data.reviewCount = getContent('[itemprop="reviewCount"]') || getText('#acrCustomerReviewText')?.replace(/[^0-9,]/g, '') || null;
    if (!data.description) data.description = getMeta('description') || getContent('[itemprop="description"]') || null;
    if (!data.brand) data.brand = getContent('[itemprop="brand"] [itemprop="name"], [itemprop="brand"]') || null;
    document.querySelectorAll('[itemprop="image"], .product-image img, #landingImage').forEach(img => { const src = img.src || img.getAttribute('data-src'); if (src && !data.images.includes(src)) data.images.push(src); });
    document.querySelectorAll('[aria-label="breadcrumb"] a, .breadcrumb a').forEach(el => data.breadcrumbs.push(el.textContent.trim()));
    data.bodyText = document.body.innerText?.substring(0, 3000) || '';
    return data;
  }

  function trySchemaOrg(data) {
    try {
      document.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
        const items = [].concat(JSON.parse(s.textContent));
        items.forEach(item => {
          if (item['@type'] === 'Product') {
            data.title = item.name || data.title;
            data.brand = item.brand?.name || data.brand;
            const offer = item.offers; if (offer) { const f = Array.isArray(offer) ? offer[0] : offer; data.price = f.price ? (f.priceCurrency||'') + f.price : data.price; }
            const agg = item.aggregateRating; if (agg) { data.rating = agg.ratingValue || data.rating; data.reviewCount = agg.reviewCount || data.reviewCount; }
          }
        });
      });
    } catch (_) {}
  }

  function getText(sel) { return document.querySelector(sel)?.textContent?.trim() || null; }
  function getContent(sel) { const el = document.querySelector(sel); return el?.content?.trim() || el?.getAttribute('content')?.trim() || null; }
  function getMeta(n) { return document.querySelector('meta[name="' + n + '"], meta[property="' + n + '"]')?.getAttribute('content')?.trim() || null; }

  // ══════════════════════════════════════════════════════════════════════════
  // MESSAGE LISTENER
  // ══════════════════════════════════════════════════════════════════════════

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    switch (message.type) {
      case 'EXTRACT_PRODUCT_DATA':
        sendResponse({ success: true, data: extractProductData() });
        return false;
      case 'GET_PAGE_META':
        sendResponse({ success: true, url: window.location.href, title: document.title, favicon: document.querySelector('link[rel~="icon"]')?.href || null });
        return false;
      case 'SHOW_OVERLAY':
        handleShowOverlay(message);
        return false;
      case 'SMARTY_SEARCH':
        handleSmartySearch(message);
        return false;
      default:
        return false;
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // OVERLAY — main entry point
  // ══════════════════════════════════════════════════════════════════════════

  // ══════════════════════════════════════════════════════════════════════════
  // YOUTUBE INTELLIGENCE
  // ══════════════════════════════════════════════════════════════════════════

  function extractYouTubeId(str) {
    const patterns = [
      /(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
      /^([A-Za-z0-9_-]{11})$/
    ];
    for (const p of patterns) {
      const m = str.match(p);
      if (m) return m[1];
    }
    return null;
  }

  async function fetchYouTubeData(videoId) {
    const resp = await fetch('https://www.youtube.com/watch?v=' + videoId, {
      headers: { 'Accept-Language': 'en-US,en;q=0.9' }
    });
    if (!resp.ok) throw new Error('Could not fetch YouTube page (status ' + resp.status + ')');
    const html = await resp.text();

    // Pull fields via targeted regex (avoids parsing multi-MB JSON)
    function rget(pattern) {
      const m = html.match(pattern);
      if (!m) return '';
      try { return JSON.parse('"' + m[1] + '"'); } catch(_) { return m[1]; }
    }

    const title       = rget(/"videoDetails":\{"videoId":"[A-Za-z0-9_-]{11}","title":"((?:[^"\\]|\\.)*)"/);
    const author      = rget(/"author":"((?:[^"\\]|\\.)*?)"/);
    const desc        = rget(/"shortDescription":"((?:[^"\\]|\\.){0,800})"/);
    const durSecs     = rget(/"lengthSeconds":"(\d+)"/);
    const viewCount   = rget(/"viewCount":"(\d+)"/);
    const duration    = durSecs ? Math.floor(parseInt(durSecs) / 60) + ' min' : '';
    const views       = viewCount ? parseInt(viewCount).toLocaleString() + ' views' : '';

    // Caption track URL
    let transcript = '';
    const captMatch = html.match(/"captionTracks":\[.*?"baseUrl":"([^"]+)"/);
    if (captMatch) {
      try {
        const captUrl = captMatch[1].replace(/\\u0026/g, '&').replace(/\\u003d/g, '=').replace(/\\/g, '');
        const captResp = await fetch(captUrl + '&fmt=json3');
        if (captResp.ok) {
          const captData = await captResp.json();
          const parts = [];
          for (const ev of (captData.events || [])) {
            if (!ev.segs) continue;
            for (const seg of ev.segs) {
              if (seg.utf8 && seg.utf8 !== '\n') parts.push(seg.utf8.trim());
            }
          }
          transcript = parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
        }
      } catch (_) {}
    }

    // Timestamps from description
    const timestamps = [];
    const tsRegex = /(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+)/g;
    let tsMatch;
    const descFull = rget(/"shortDescription":"((?:[^"\\]|\\.){0,3000})"/);
    while ((tsMatch = tsRegex.exec(descFull)) !== null && timestamps.length < 20) {
      timestamps.push({ time: tsMatch[1], label: tsMatch[2].trim() });
    }

    return {
      title: title || 'YouTube Video',
      author,
      description: desc,
      transcript: transcript.slice(0, 18000),
      hasTranscript: transcript.length > 0,
      duration,
      views,
      timestamps,
      videoId
    };
  }

  async function analyzeYouTubeContent(ytData) {
    const hasTranscript = ytData.hasTranscript && ytData.transcript.length > 100;
    const contentSource = hasTranscript
      ? 'FULL TRANSCRIPT:\n' + ytData.transcript
      : 'VIDEO DESCRIPTION:\n' + ytData.description;

    const tsSection = ytData.timestamps.length
      ? '\nTIMESTAMPS:\n' + ytData.timestamps.map(t => t.time + ' — ' + t.label).join('\n')
      : '';

    return groqCall([
      { role: 'system', content:
        'You are DecisionAI YouTube Intelligence — a world-class lecture analyst. ' +
        'Given a YouTube video transcript or description, you generate comprehensive, professional study notes. ' +
        'Your notes must cover ALL concepts discussed — do not skip anything important. ' +
        'Write in a clear, expert voice. Every chapter must have real explanations, not vague summaries. ' +
        'Always return valid JSON only, no markdown.'
      },
      { role: 'user', content:
        'VIDEO: ' + ytData.title + '\n' +
        'CHANNEL: ' + ytData.author + '\n' +
        (ytData.duration ? 'DURATION: ' + ytData.duration + '\n' : '') +
        tsSection + '\n\n' +
        contentSource + '\n\n' +
        'Generate comprehensive study notes. Return ONLY this JSON:\n' +
        '{"contentType":"youtube","contentLabel":"YouTube ' + (hasTranscript ? 'Lecture' : 'Video') + '",' +
        '"title":"' + (ytData.title||'').replace(/"/g,'\\"') + '",' +
        '"channel":"' + (ytData.author||'').replace(/"/g,'\\"') + '",' +
        '"duration":"' + (ytData.duration||'') + '",' +
        '"views":"' + (ytData.views||'') + '",' +
        '"topics":["topic1","topic2","topic3"],' +
        '"quickOverview":"2-sentence executive overview of what this video covers and why it matters",' +
        '"hasTranscript":' + hasTranscript + ',' +
        '"youtube":{"introduction":"3-4 sentence introduction covering the video\'s purpose and scope",' +
        '"chapters":[{"title":"Chapter title based on content","explanation":"Detailed paragraph — minimum 4 sentences — covering the main explanation given in this section. No vague language. Capture the actual concepts taught.","concepts":["Concept 1 with brief context","Concept 2"],"definitions":[{"term":"Term","definition":"Precise definition as given"}],"examples":["Specific example explained in the video"],"formulas":["Formula if present, else omit"]}],' +
        '"importantPoints":["Specific point 1 — not vague","Point 2","Point 3","Point 4","Point 5"],' +
        '"quickRevision":["Short bullet 1","Short bullet 2","Short bullet 3","Short bullet 4","Short bullet 5","Short bullet 6"],' +
        '"conclusion":"3-4 sentence final conclusion covering the key lesson and takeaway"}}'
      }
    ], 'llama-3.3-70b-versatile');
  }

  // ══════════════════════════════════════════════════════════════════════════
  // INTENT DETECTION
  // ══════════════════════════════════════════════════════════════════════════

  function detectIntent(query) {
    const q = query.trim();
    const ql = q.toLowerCase();

    if (extractYouTubeId(q)) return 'youtube';

    if (/^https?:\/\//i.test(q)) return 'article_url';

    if (/startup|build\s+(a\s+)?company|business\s+plan|founder|entrepreneurship|launch\s+(a\s+)?(product|startup|business)|mvp\s+(development|build|plan)|go.to.market|monetiz/i.test(ql))
      return 'startup_roadmap';

    if (/study\s+(plan|roadmap|schedule)|learn(ing)?\s+(roadmap|path|plan|schedule|guide)|roadmap\s+(for|to)\s+learn|how\s+to\s+(learn|master|become)\s+\w|course\s+plan|curriculum/i.test(ql))
      return 'study_roadmap';

    return 'problem';
  }

  // ── Article / URL fetcher ──────────────────────────────────────────────────

  async function fetchArticleContent(url) {
    const resp = await fetch(url, {
      headers: { 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9' }
    });
    if (!resp.ok) throw new Error('Could not fetch URL (HTTP ' + resp.status + ')');

    const contentType = resp.headers.get('content-type') || '';
    if (contentType.includes('application/pdf')) {
      throw new Error('PDF_NO_PARSE');
    }

    const html = await resp.text();

    // Title
    const titleM = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleM ? titleM[1].trim().replace(/&amp;/g,'&').replace(/&#39;/g,"'") : url;

    // Prefer article/main body content
    let body = html;
    const articleM = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
      || html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)
      || html.match(/<div[^>]+(?:class|id)="[^"]*(?:post|article|content|story|body)[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    if (articleM) body = articleM[1];

    const text = body
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<aside[\s\S]*?<\/aside>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
      .trim()
      .slice(0, 16000);

    return { title, text, url };
  }

  // ── Specialized AI callers ────────────────────────────────────────────────

  function analyzeArticle(articleData) {
    return groqCall([
      { role: 'system', content: 'You are DecisionAI Article Intelligence — a professional content analyst. Extract only the most valuable information. Be thorough yet concise. No filler. Always return valid JSON only, no markdown.' },
      { role: 'user', content:
        'ARTICLE URL: ' + articleData.url + '\n' +
        'TITLE: ' + articleData.title + '\n\n' +
        'CONTENT:\n' + articleData.text + '\n\n' +
        'Analyze this article. Return ONLY this JSON:\n' +
        '{"contentType":"article_url","contentLabel":"Article Analysis","title":' + JSON.stringify(articleData.title) + ',' +
        '"topics":["topic1","topic2"],' +
        '"quickOverview":"2-sentence executive summary of the core message",' +
        '"articleData":{"mainIdea":"2-3 sentences capturing the central argument or thesis",' +
        '"importantHighlights":["Most valuable point — specific, not vague","Another high-value insight","Another","Another","Another"],' +
        '"keyFacts":["Concrete fact or data point stated in the article","Another fact"],' +
        '"importantData":["Any numbers, percentages, statistics, or measurements — exact values","Another data point"],' +
        '"pros":["If the article reviews or compares — pros"],' +
        '"cons":["Cons if applicable, or empty array"],' +
        '"finalSummary":"3-4 sentence synthesis — what the reader should take away and why this matters"}}'
      }
    ], 'llama-3.3-70b-versatile');
  }

  function analyzeProblem(query) {
    return groqCall([
      { role: 'system', content: 'You are DecisionAI Problem Solver — an expert analytical mind. Break down any problem clearly and solve it step by step. Write in a direct, confident, expert voice. Always return valid JSON only, no markdown.' },
      { role: 'user', content:
        'PROBLEM / QUESTION:\n' + query + '\n\n' +
        'Solve this thoroughly. Return ONLY this JSON:\n' +
        '{"contentType":"problem","contentLabel":"Problem Solver",' +
        '"title":"Concise problem title (8 words max)",' +
        '"topics":["relevant topic"],' +
        '"quickOverview":"One sentence: what this problem is and what the solution reveals",' +
        '"problem":{"understanding":"2-3 sentences explaining what the problem is asking and what context matters",' +
        '"solution":[{"step":1,"title":"Step title","explanation":"Full explanation of this step — minimum 2 sentences. Be specific."}],' +
        '"reasoning":"2-3 sentences explaining the underlying logic of why this solution works",' +
        '"example":"A concrete example that illustrates the solution — skip if not helpful",' +
        '"finalAnswer":"The clear, direct, complete answer in 1-3 sentences",' +
        '"relatedConcepts":["Related concept worth knowing","Another"]}}'
      }
    ], 'llama-3.3-70b-versatile');
  }

  function analyzeStartupRoadmap(query) {
    return groqCall([
      { role: 'system', content: 'You are DecisionAI Startup Advisor — a seasoned founder and VC advisor. Create practical, actionable startup roadmaps. Think like YC. Be specific with tasks, timelines, and tools. Always return valid JSON only, no markdown.' },
      { role: 'user', content:
        'STARTUP REQUEST:\n' + query + '\n\n' +
        'Create a complete, practical startup roadmap. Return ONLY this JSON:\n' +
        '{"contentType":"startup_roadmap","contentLabel":"Startup Roadmap",' +
        '"title":"Startup Roadmap: [extract the startup idea/domain]",' +
        '"topics":["topic1","topic2"],' +
        '"quickOverview":"2-sentence summary of the startup goal and path to market",' +
        '"roadmap":{"startupGoal":"Clear 2-3 sentence definition of what is being built, for whom, and what problem it solves",' +
        '"phases":[{"name":"Phase 1: Foundation","duration":"Weeks 1–4","tasks":["Specific task 1","Task 2","Task 3"],"milestone":"What success looks like at end of this phase"},{"name":"Phase 2: Build MVP","duration":"Weeks 5–10","tasks":["Task 1","Task 2","Task 3"],"milestone":"MVP milestone"},{"name":"Phase 3: Launch","duration":"Weeks 11–14","tasks":["Task 1","Task 2"],"milestone":"Launch milestone"},{"name":"Phase 4: Growth","duration":"Month 4+","tasks":["Task 1","Task 2"],"milestone":"Growth milestone"}],' +
        '"skillsNeeded":["Specific skill with context"],' +
        '"toolsNeeded":["Tool — what it is used for"],' +
        '"weeklySchedule":["Mon–Tue: specific focus","Wed–Thu: specific focus","Fri: specific focus","Weekend: optional"],' +
        '"nextAction":"The single most important first step — concrete and specific",' +
        '"watchOutFor":["Common mistake or pitfall for this type of startup"]}}'
      }
    ], 'llama-3.3-70b-versatile');
  }

  function analyzeStudyRoadmap(query) {
    return groqCall([
      { role: 'system', content: 'You are DecisionAI Learning Advisor — a world-class curriculum designer and educator. Create personalized, structured study plans. Be specific with resources, timelines, and daily schedules. Always return valid JSON only, no markdown.' },
      { role: 'user', content:
        'STUDY REQUEST:\n' + query + '\n\n' +
        'Create a complete personalized study roadmap. Return ONLY this JSON:\n' +
        '{"contentType":"study_roadmap","contentLabel":"Study Roadmap",' +
        '"title":"Learning Path: [extract the subject]",' +
        '"topics":["topic1","topic2"],' +
        '"quickOverview":"2-sentence summary of what will be learned and the estimated timeline",' +
        '"studyPlan":{"goal":"Clear 2-3 sentence learning goal — what the learner will be able to do",' +
        '"currentLevel":"Assumed starting level based on the request",' +
        '"targetLevel":"Where the learner will be after completing this plan",' +
        '"totalDuration":"Estimated total time (e.g. 3 months)",' +
        '"learningPath":[{"phase":"Week/Month 1","title":"Phase title","focus":"What this phase covers","topics":["Specific topic"],"resources":[{"name":"Resource name","type":"Book|Course|YouTube|Docs|Practice Site","url":"URL if known","note":"Why this resource"}],"dailyHours":"X hours/day","weekGoal":"What to accomplish by end of week"}],' +
        '"dailySchedule":["Morning: specific activity","Afternoon: specific activity","Evening: specific activity"],' +
        '"practicePlan":"2-3 sentences on how to practice — projects, exercises, challenges",' +
        '"nextAction":"The single most important first step today — specific",' +
        '"tips":["Practical learning tip specific to this subject"]}}'
      }
    ], 'llama-3.3-70b-versatile');
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SMARTY SEARCH — intent-aware dispatcher
  // ══════════════════════════════════════════════════════════════════════════

  async function handleSmartySearch({ query, pageUrl, pageTitle }) {
    showOverlay('masterscan', null);
    try {
      const intent = detectIntent(query);

      if (intent === 'youtube') {
        updateOverlayLoadingText('Fetching YouTube data…');
        const ytData = await fetchYouTubeData(extractYouTubeId(query.trim()));
        updateOverlayLoadingText(ytData.hasTranscript
          ? 'Transcript found (' + ytData.transcript.split(' ').length + ' words) — generating study notes…'
          : 'Generating notes from video metadata…');
        const result = await analyzeYouTubeContent(ytData);
        overlayShowResult(result, 'masterscan');
        return;
      }

      if (intent === 'article_url') {
        updateOverlayLoadingText('Fetching article content…');
        let articleData;
        try {
          articleData = await fetchArticleContent(query.trim());
        } catch (e) {
          if (e.message === 'PDF_NO_PARSE') {
            overlayShowError('PDF files cannot be read directly. Try copying the text and pasting it into Smarty, or use a PDF-to-text tool first.');
            return;
          }
          throw e;
        }
        updateOverlayLoadingText('Analyzing article — extracting key insights…');
        const result = await analyzeArticle(articleData);
        overlayShowResult(result, 'masterscan');
        return;
      }

      if (intent === 'startup_roadmap') {
        updateOverlayLoadingText('Building your startup roadmap…');
        const result = await analyzeStartupRoadmap(query);
        overlayShowResult(result, 'masterscan');
        return;
      }

      if (intent === 'study_roadmap') {
        updateOverlayLoadingText('Creating your personalized study plan…');
        const result = await analyzeStudyRoadmap(query);
        overlayShowResult(result, 'masterscan');
        return;
      }

      // Default: problem solver
      updateOverlayLoadingText('Solving your problem step by step…');
      const result = await analyzeProblem(query);
      overlayShowResult(result, 'masterscan');

    } catch (err) {
      overlayShowError(err.message);
    }
  }

  function updateOverlayLoadingText(msg) {
    const content = document.getElementById('__dai-content');
    if (!content) return;
    const descEl = content.querySelector('div[style*="Running"]');
    if (descEl) descEl.textContent = msg;
  }

  async function handleShowOverlay(message) {
    const { mode, imageDataUrl, pageUrl, pageTitle, error } = message;

    // Show overlay in loading state immediately
    showOverlay(mode || 'truth', imageDataUrl || null);

    // If background sent an error (e.g. capture failed), show it right away
    if (error) {
      overlayShowError(error);
      return;
    }

    if (!imageDataUrl) {
      overlayShowError('No image captured. Please try again.');
      return;
    }

    // Run AI analysis directly from content script
    try {
      let result;
      if (mode === 'masterscan') {
        result = await analyzeMasterScan(imageDataUrl, pageUrl, pageTitle);
      } else {
        result = await analyzeTruthLayer(imageDataUrl, pageUrl, pageTitle);
      }
      overlayShowResult(result, mode);
    } catch (err) {
      overlayShowError(err.message);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // OVERLAY UI
  // ══════════════════════════════════════════════════════════════════════════

  let overlayRoot  = null;
  let overlayPanel = null;

  function sp(el, styles) {
    for (const [k, v] of Object.entries(styles)) el.style.setProperty(k, String(v), 'important');
  }

  function esc(s) {
    if (s == null) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function removeOverlay() {
    if (overlayRoot) { overlayRoot.remove(); overlayRoot = null; overlayPanel = null; }
    document.removeEventListener('keydown', handleEsc, true);
  }

  function handleEsc(e) {
    if (e.key === 'Escape') { e.stopPropagation(); removeOverlay(); }
  }

  function showOverlay(mode, imageDataUrl) {
    removeOverlay();

    const isScan  = mode === 'masterscan';
    const accent  = isScan ? '#06b6d4' : '#a855f7';
    const label   = isScan ? 'MasterScan' : 'Truth Layer';

    // Inject keyframe styles once
    if (!document.getElementById('__dai-styles')) {
      const style = document.createElement('style');
      style.id = '__dai-styles';
      style.textContent = [
        '@keyframes __dai-slidein{from{opacity:0;transform:translateX(40px) scale(0.97)}to{opacity:1;transform:translateX(0) scale(1)}}',
        '@keyframes __dai-spin{to{transform:rotate(360deg)}}',
        '@keyframes __dai-fadein{from{opacity:0}to{opacity:1}}',
        '#__dai-overlay-panel::-webkit-scrollbar{width:4px}',
        '#__dai-overlay-panel::-webkit-scrollbar-track{background:rgba(255,255,255,0.04)}',
        '#__dai-overlay-panel::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.15);border-radius:4px}'
      ].join('');
      document.head.appendChild(style);
    }

    overlayRoot = document.createElement('div');
    overlayRoot.id = '__dai-overlay-root';
    sp(overlayRoot, { position:'fixed', inset:'0', 'z-index':'2147483646', 'pointer-events':'none', 'font-family':'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' });

    overlayPanel = document.createElement('div');
    overlayPanel.id = '__dai-overlay-panel';
    sp(overlayPanel, {
      position:'fixed', top:'18px', right:'18px', width:'540px',
      'max-height':'calc(100vh - 36px)',
      background:'#0e0b1a',
      border:'1px solid ' + accent + '44',
      'border-radius':'18px',
      'box-shadow':'0 8px 48px rgba(0,0,0,0.7),0 0 0 1px ' + accent + '22,0 24px 64px ' + accent + '18',
      display:'flex', 'flex-direction':'column', overflow:'hidden',
      animation:'__dai-slidein 0.35s cubic-bezier(0.16,1,0.3,1) both',
      'pointer-events':'all',
      'user-select':'none', '-webkit-user-select':'none'
    });

    // Header
    const header = document.createElement('div');
    sp(header, {
      display:'flex', 'align-items':'center', gap:'10px',
      padding:'14px 16px 12px',
      background:'linear-gradient(135deg,rgba(255,255,255,0.04) 0%,rgba(255,255,255,0.01) 100%)',
      'border-bottom':'1px solid ' + accent + '22',
      cursor:'grab', 'flex-shrink':'0'
    });

    const logoMark = document.createElement('div');
    sp(logoMark, { width:'30px', height:'30px', background:'linear-gradient(135deg,' + accent + '30,' + accent + '10)', border:'1px solid ' + accent + '55', 'border-radius':'9px', display:'flex', 'align-items':'center', 'justify-content':'center', 'flex-shrink':'0', 'box-shadow':'0 0 14px ' + accent + '30' });
    logoMark.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" style="color:' + accent + '"><path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';

    const titleWrap = document.createElement('div');
    sp(titleWrap, { flex:'1', 'min-width':'0' });
    titleWrap.innerHTML = '<div style="display:flex;align-items:center;gap:7px"><span style="font-size:13px;font-weight:700;color:#f0eeff;letter-spacing:-0.3px">Decision<span style="color:' + accent + '">AI</span></span><span style="color:rgba(240,238,255,0.3);font-size:12px">·</span><span style="font-size:12px;font-weight:600;color:rgba(240,238,255,0.8)">' + label + '</span><span style="font-size:9px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;background:rgba(16,185,129,0.15);color:#10b981;border:1px solid rgba(16,185,129,0.3);border-radius:100px;padding:2px 7px;margin-left:2px">LIVE</span></div>';

    const closeBtn = document.createElement('button');
    sp(closeBtn, { width:'28px', height:'28px', 'border-radius':'8px', border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.06)', color:'rgba(240,238,255,0.6)', cursor:'pointer', display:'flex', 'align-items':'center', 'justify-content':'center', 'flex-shrink':'0' });
    closeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
    closeBtn.addEventListener('mouseenter', () => sp(closeBtn, { background:'rgba(255,255,255,0.12)' }));
    closeBtn.addEventListener('mouseleave', () => sp(closeBtn, { background:'rgba(255,255,255,0.06)' }));
    closeBtn.addEventListener('click', removeOverlay);

    header.append(logoMark, titleWrap, closeBtn);

    // Content
    const content = document.createElement('div');
    content.id = '__dai-content';
    sp(content, { flex:'1', 'overflow-y':'auto', 'overflow-x':'hidden', 'min-height':'0' });
    content.innerHTML = buildLoadingHTML(imageDataUrl, accent, label);

    // Bottom bar (hidden until results)
    const bottomBar = document.createElement('div');
    bottomBar.id = '__dai-bottom';
    sp(bottomBar, { display:'none', gap:'8px', padding:'12px 16px', 'border-top':'1px solid rgba(255,255,255,0.07)', 'flex-shrink':'0', background:'rgba(255,255,255,0.02)' });

    overlayPanel.append(header, content, bottomBar);
    overlayRoot.appendChild(overlayPanel);
    document.documentElement.appendChild(overlayRoot);
    document.addEventListener('keydown', handleEsc, true);
    makeDraggable(header, overlayPanel);
  }

  // ── Dragging ──────────────────────────────────────────────────────────────

  function makeDraggable(handle, panel) {
    let ox = 0, oy = 0, startX = 0, startY = 0, dragging = false;
    handle.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return;
      e.preventDefault(); dragging = true;
      const r = panel.getBoundingClientRect();
      startX = e.clientX; startY = e.clientY; ox = r.left; oy = r.top;
      sp(handle, { cursor:'grabbing' });
    });
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const nx = Math.max(0, Math.min(window.innerWidth  - panel.offsetWidth,  ox + e.clientX - startX));
      const ny = Math.max(0, Math.min(window.innerHeight - panel.offsetHeight, oy + e.clientY - startY));
      sp(panel, { left:nx+'px', top:ny+'px', right:'auto', bottom:'auto' });
    }, true);
    document.addEventListener('mouseup', () => { if (dragging) { dragging = false; sp(handle, { cursor:'grab' }); } }, true);
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  function buildLoadingHTML(imageDataUrl, accent, label) {
    const preview = imageDataUrl ? '<div style="width:100%;height:120px;background:url(\'' + imageDataUrl + '\') center/cover no-repeat;border-radius:10px;border:1px solid rgba(255,255,255,0.08);margin-bottom:4px;opacity:0.85"></div>' : '';
    return '<div style="padding:28px 20px;display:flex;flex-direction:column;gap:20px;animation:__dai-fadein 0.25s ease both">' +
      preview +
      '<div style="display:flex;flex-direction:column;align-items:center;gap:16px;padding:8px 0">' +
      '<div style="position:relative;width:52px;height:52px"><svg style="animation:__dai-spin 1s linear infinite" width="52" height="52" viewBox="0 0 52 52" fill="none"><circle cx="26" cy="26" r="22" stroke="rgba(255,255,255,0.07)" stroke-width="3"/><circle cx="26" cy="26" r="22" stroke="' + accent + '" stroke-width="3" stroke-linecap="round" stroke-dasharray="35 104"/></svg><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="color:' + accent + '"><path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg></div></div>' +
      '<div style="text-align:center"><div style="font-size:15px;font-weight:700;color:#f0eeff;margin-bottom:5px">Analyzing with AI…</div><div style="font-size:12px;color:rgba(240,238,255,0.45)">Running ' + label + ' on your selection</div></div>' +
      '<div style="display:flex;flex-direction:column;gap:8px;width:100%;max-width:280px">' +
      loadingStep(1, 'Capturing your selection', accent) +
      loadingStep(2, 'Processing with vision AI', accent) +
      loadingStep(3, 'Generating insights', accent) +
      '</div></div></div>';
  }

  function loadingStep(n, text, accent) {
    return '<div style="display:flex;align-items:center;gap:10px;animation:__dai-fadein 0.3s ease ' + (0.3*(n-1)) + 's both"><div style="width:22px;height:22px;border-radius:50%;background:' + accent + '20;border:1px solid ' + accent + '44;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:10px;font-weight:700;color:' + accent + '">' + n + '</div><span style="font-size:12px;color:rgba(240,238,255,0.6)">' + text + '</span></div>';
  }

  // ── Results ───────────────────────────────────────────────────────────────

  function overlayShowResult(result, mode) {
    const content = document.getElementById('__dai-content');
    if (!content) return;
    const isScan = mode === 'masterscan';
    const accent = isScan ? '#06b6d4' : '#a855f7';
    const div = document.createElement('div');
    sp(div, { animation:'__dai-fadein 0.3s ease both' });
    div.innerHTML = isScan ? buildMasterScanHTML(result, accent) : buildTruthLayerHTML(result, accent);
    content.innerHTML = '';
    content.appendChild(div);
    const bar = document.getElementById('__dai-bottom');
    if (bar) { sp(bar, { display:'flex' }); bar.innerHTML = buildBottomBarHTML(accent); wireBottomBar(bar, result, mode); }
  }

  // ── Error ─────────────────────────────────────────────────────────────────

  function overlayShowError(errMsg) {
    const content = document.getElementById('__dai-content');
    if (!content) return;
    let title = 'Analysis failed';
    let desc  = errMsg || 'Something went wrong. Please try again.';
    if (errMsg === 'NO_API_KEY') {
      title = 'No API key found';
      desc  = 'Click the DecisionAI extension icon → ⚙ Settings → paste your free Groq API key from console.groq.com';
    } else if (errMsg === 'INVALID_API_KEY') {
      title = 'Invalid API key';
      desc  = 'Your Groq API key is invalid. Please check it in extension Settings (⚙).';
    }
    content.innerHTML = '<div style="padding:32px 20px;display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center;animation:__dai-fadein 0.25s ease both"><div style="width:52px;height:52px;border-radius:50%;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);display:flex;align-items:center;justify-content:center"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 8v4M12 16h.01" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="10" stroke="#ef4444" stroke-width="1.5"/></svg></div><div><div style="font-size:15px;font-weight:700;color:#f0eeff;margin-bottom:6px">' + esc(title) + '</div><div style="font-size:12px;color:rgba(240,238,255,0.5);line-height:1.6;max-width:340px">' + esc(desc) + '</div></div></div>';
  }

  // ── Truth Layer results HTML ──────────────────────────────────────────────

  function buildTruthLayerHTML(d, accent) {
    const p  = d.product || {};
    const sc = d.truthScore ?? 0;
    const scColor = sc >= 75 ? '#10b981' : sc >= 50 ? '#f59e0b' : '#ef4444';
    const v  = d.verdict || {};
    const vt = v.type || 'caution';
    const vc = { buy:{ bg:'rgba(16,185,129,0.12)', border:'rgba(16,185,129,0.25)', text:'#10b981' }, caution:{ bg:'rgba(245,158,11,0.12)', border:'rgba(245,158,11,0.25)', text:'#f59e0b' }, avoid:{ bg:'rgba(239,68,68,0.12)', border:'rgba(239,68,68,0.25)', text:'#ef4444' } }[vt] || { bg:'rgba(245,158,11,0.12)', border:'rgba(245,158,11,0.25)', text:'#f59e0b' };
    const r  = d.reviews || {};
    const pi = d.priceIntel || {};
    const comps = d.competitors || [];

    const prosHTML   = (r.pros||[]).map(x => li(x,'#10b981')).join('');
    const consHTML   = (r.cons||[]).map(x => li(x,'#ef4444')).join('');
    const hiddenHTML = (r.hiddenComplaints||[]).map(x => '<div style="font-size:11.5px;color:rgba(240,238,255,0.6);padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05)">' + esc(x) + '</div>').join('');
    const altsHTML   = (pi.alternatives||[]).map(a => '<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.05)"><span style="font-size:12px;color:rgba(240,238,255,0.7)">' + esc(a.store) + '</span><div style="display:flex;align-items:center;gap:8px">' + (a.note ? '<span style="font-size:11px;color:rgba(240,238,255,0.4)">' + esc(a.note) + '</span>' : '') + '<span style="font-size:13px;font-weight:700;color:#f0eeff">' + esc(a.estimatedPrice) + '</span></div></div>').join('');
    const compsHTML  = comps.map(c => '<div style="padding:10px 12px;background:rgba(255,255,255,0.03);border-radius:10px;border:1px solid rgba(255,255,255,0.06)"><div style="font-size:12.5px;font-weight:600;color:#f0eeff;margin-bottom:3px">' + esc(c.name) + '</div><div style="font-size:11.5px;color:rgba(240,238,255,0.5)">' + esc(c.why) + (c.betterFor ? ' · Better for: ' + esc(c.betterFor) : '') + '</div></div>').join('');

    return '<div style="padding:16px 16px 20px;display:flex;flex-direction:column;gap:14px">' +

      // Score + verdict
      '<div style="display:flex;gap:12px;align-items:flex-start">' +
        '<div style="display:flex;flex-direction:column;align-items:center;padding:12px 16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;flex-shrink:0;min-width:80px">' +
          '<div style="font-size:36px;font-weight:800;color:' + scColor + ';line-height:1">' + sc + '</div>' +
          '<div style="font-size:10px;font-weight:600;color:' + scColor + ';letter-spacing:0.5px;margin-top:3px;text-transform:uppercase">' + esc(d.scoreLabel||'') + '</div>' +
          '<div style="font-size:9.5px;color:rgba(240,238,255,0.35);margin-top:2px">Truth Score</div>' +
        '</div>' +
        '<div style="flex:1;background:' + vc.bg + ';border:1px solid ' + vc.border + ';border-radius:14px;padding:12px 14px">' +
          '<div style="font-size:18px;margin-bottom:4px">' + esc(v.emoji||'') + '</div>' +
          '<div style="font-size:13px;font-weight:700;color:' + vc.text + ';margin-bottom:5px">' + esc(v.label||'See below') + '</div>' +
          '<div style="font-size:11.5px;color:rgba(240,238,255,0.55);line-height:1.55">' + esc(v.reasoning||'') + '</div>' +
        '</div>' +
      '</div>' +

      // Product info
      (p.name ? sec('Product', accent, '<div style="font-size:14px;font-weight:700;color:#f0eeff;margin-bottom:6px">' + esc(p.name) + '</div><div style="display:flex;flex-wrap:wrap;gap:6px">' + (p.price ? badge(p.price, accent) : '') + (p.brand ? badge(p.brand, 'rgba(255,255,255,0.2)') : '') + (p.store ? badge(p.store, 'rgba(255,255,255,0.15)') : '') + (p.rating ? badge('★ '+p.rating+(p.reviewCount?' · '+p.reviewCount+' reviews':''), '#f59e0b') : '') + '</div>') : '') +

      // Pros & Cons
      ((r.pros&&r.pros.length)||(r.cons&&r.cons.length) ? sec('Pros & Cons', accent,
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
          '<div><div style="font-size:10px;font-weight:700;color:#10b981;letter-spacing:0.6px;text-transform:uppercase;margin-bottom:6px">Pros</div><ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px">' + (prosHTML||'<li style="font-size:11.5px;color:rgba(240,238,255,0.35)">—</li>') + '</ul></div>' +
          '<div><div style="font-size:10px;font-weight:700;color:#ef4444;letter-spacing:0.6px;text-transform:uppercase;margin-bottom:6px">Cons</div><ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px">' + (consHTML||'<li style="font-size:11.5px;color:rgba(240,238,255,0.35)">—</li>') + '</ul></div>' +
        '</div>' +
        (r.summary ? '<p style="font-size:11.5px;color:rgba(240,238,255,0.5);line-height:1.55;margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.07)">' + esc(r.summary) + '</p>' : '') +
        (hiddenHTML ? '<div style="margin-top:10px;padding:10px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:10px"><div style="font-size:10px;font-weight:700;color:#f59e0b;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:6px">⚠ Hidden Complaints</div>' + hiddenHTML + '</div>' : '')
      ) : '') +

      // Price intel
      ((pi.currentPrice||altsHTML) ? sec('Price Intelligence', accent,
        '<div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.07)">' +
          '<div><div style="font-size:10.5px;color:rgba(240,238,255,0.4);text-transform:uppercase;letter-spacing:0.5px">Current Price</div><div style="font-size:20px;font-weight:800;color:#f0eeff">' + esc(pi.currentPrice||'—') + '</div>' + (pi.fairPrice ? '<div style="font-size:11px;color:rgba(240,238,255,0.4)">Fair value: ' + esc(pi.fairPrice) + '</div>' : '') + '</div>' +
          (pi.dealRating ? '<div style="padding:5px 12px;background:' + (pi.dealRating==='Great Deal'?'rgba(16,185,129,0.15)':pi.dealRating==='Overpriced'?'rgba(239,68,68,0.15)':'rgba(245,158,11,0.15)') + ';border:1px solid ' + (pi.dealRating==='Great Deal'?'rgba(16,185,129,0.3)':pi.dealRating==='Overpriced'?'rgba(239,68,68,0.3)':'rgba(245,158,11,0.3)') + ';border-radius:100px;font-size:11.5px;font-weight:700;color:' + (pi.dealRating==='Great Deal'?'#10b981':pi.dealRating==='Overpriced'?'#ef4444':'#f59e0b') + '">' + esc(pi.dealRating) + '</div>' : '') +
        '</div>' + altsHTML +
        (d.buyTiming ? '<div style="margin-top:8px;font-size:11.5px;color:rgba(240,238,255,0.5)"><span style="color:rgba(240,238,255,0.7);font-weight:600">Buy timing:</span> ' + esc(d.buyTiming.reason) + '</div>' : '')
      ) : '') +

      // Competitors
      (comps.length ? sec('Better Alternatives', accent, '<div style="display:flex;flex-direction:column;gap:7px">' + compsHTML + '</div>') : '') +

      '</div>';
  }

  // ── MasterScan results HTML ───────────────────────────────────────────────

  function buildMasterScanHTML(d, accent) {
    const ct = d.contentType || 'general';

    // ── Header block: type badge + title + topics + quick overview ────────
    const topicsHTML = (d.topics && d.topics.length)
      ? '<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:10px">' +
          d.topics.map(t => '<span style="font-size:10.5px;font-weight:500;color:rgba(240,238,255,0.55);background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:100px;padding:3px 9px">' + esc(t) + '</span>').join('') +
        '</div>'
      : '';

    const overviewHTML = d.quickOverview
      ? '<div style="margin:12px 16px 0;padding:11px 14px;background:linear-gradient(135deg,' + accent + '14,' + accent + '06);border:1px solid ' + accent + '30;border-radius:12px">' +
          '<div style="font-size:9.5px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:' + accent + ';margin-bottom:5px;opacity:0.8">⚡ Quick Overview</div>' +
          '<p style="font-size:12.5px;color:rgba(240,238,255,0.85);line-height:1.65;margin:0">' + esc(d.quickOverview) + '</p>' +
        '</div>'
      : '';

    const header =
      '<div style="padding:14px 16px 0">' +
        '<div style="display:flex;align-items:center;gap:7px">' +
          '<span style="font-size:9.5px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:' + accent + ';background:' + accent + '18;border:1px solid ' + accent + '35;border-radius:100px;padding:3px 10px">' + esc(d.contentLabel || 'Content') + '</span>' +
          (d.confidence ? '<span style="font-size:10px;color:rgba(240,238,255,0.3)">' + d.confidence + '% match</span>' : '') +
        '</div>' +
        (d.title ? '<div style="font-size:15px;font-weight:800;color:#f0eeff;line-height:1.3;margin-top:7px;letter-spacing:-0.3px">' + esc(d.title) + '</div>' : '') +
        topicsHTML +
      '</div>' +
      overviewHTML;

    // ── Per-content-type body ─────────────────────────────────────────────
    let bodyHTML = '';

    // ── MODE 2: Article / URL Analyzer ───────────────────────────────────
    if (ct === 'article_url' && d.articleData) {
      const a = d.articleData;

      bodyHTML =
        (a.mainIdea ? sec('💡 Main Idea', accent,
          '<p style="font-size:12.5px;color:rgba(240,238,255,0.82);line-height:1.72">' + esc(a.mainIdea) + '</p>'
        ) : '') +

        ((a.importantHighlights && a.importantHighlights.length) ? sec('⭐ Important Highlights', accent,
          '<ol style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:7px">' +
          a.importantHighlights.map((x, i) =>
            '<li style="display:flex;align-items:flex-start;gap:9px">' +
              '<span style="flex-shrink:0;width:20px;height:20px;border-radius:50%;background:' + accent + '20;border:1px solid ' + accent + '40;display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:800;color:' + accent + '">' + (i+1) + '</span>' +
              '<span style="font-size:12.5px;color:rgba(240,238,255,0.78);line-height:1.5;padding-top:2px">' + esc(x) + '</span>' +
            '</li>'
          ).join('') + '</ol>'
        ) : '') +

        ((a.keyFacts && a.keyFacts.length) ? sec('📌 Key Facts', '#10b981',
          '<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px">' +
          a.keyFacts.map(x => li(x, '#10b981')).join('') + '</ul>'
        ) : '') +

        ((a.importantData && a.importantData.length) ? sec('📊 Important Numbers & Data', '#06b6d4',
          '<div style="display:flex;flex-direction:column;gap:6px">' +
          a.importantData.map(x =>
            '<div style="display:flex;align-items:flex-start;gap:8px;padding:8px 11px;background:rgba(6,182,212,0.07);border:1px solid rgba(6,182,212,0.2);border-radius:9px">' +
              '<span style="color:#06b6d4;font-size:14px;font-weight:800;flex-shrink:0;line-height:1">›</span>' +
              '<span style="font-size:12px;color:rgba(240,238,255,0.75);line-height:1.5">' + esc(x) + '</span>' +
            '</div>'
          ).join('') + '</div>'
        ) : '') +

        ((a.pros && a.pros.length && a.pros[0]) || (a.cons && a.cons.length && a.cons[0])
          ? '<div style="padding:12px 16px 0"><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
              ((a.pros && a.pros.length && a.pros[0]) ?
                '<div style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.2);border-radius:10px;padding:10px 12px"><div style="font-size:9.5px;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:7px">✓ Pros</div>' +
                '<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px">' + a.pros.map(x => '<li style="display:flex;gap:6px"><span style="color:#10b981;flex-shrink:0">+</span><span style="font-size:11.5px;color:rgba(240,238,255,0.72);line-height:1.4">' + esc(x) + '</span></li>').join('') + '</ul></div>'
              : '<div></div>') +
              ((a.cons && a.cons.length && a.cons[0]) ?
                '<div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:10px;padding:10px 12px"><div style="font-size:9.5px;font-weight:700;color:#ef4444;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:7px">✗ Cons</div>' +
                '<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px">' + a.cons.map(x => '<li style="display:flex;gap:6px"><span style="color:#ef4444;flex-shrink:0">–</span><span style="font-size:11.5px;color:rgba(240,238,255,0.72);line-height:1.4">' + esc(x) + '</span></li>').join('') + '</ul></div>'
              : '<div></div>') +
            '</div></div>'
          : '') +

        (a.finalSummary ? sec('📝 Final Summary', '#f59e0b',
          '<p style="font-size:12.5px;color:rgba(240,238,255,0.82);line-height:1.72">' + esc(a.finalSummary) + '</p>'
        ) : '');

    // ── MODE 3: Problem Solver ────────────────────────────────────────────
    } else if (ct === 'problem' && d.problem) {
      const p = d.problem;

      bodyHTML =
        (p.understanding ? sec('🔍 Understanding the Problem', accent,
          '<p style="font-size:12.5px;color:rgba(240,238,255,0.82);line-height:1.72">' + esc(p.understanding) + '</p>'
        ) : '') +

        ((p.solution && p.solution.length) ? sec('⚙️ Step-by-Step Solution', accent,
          '<div style="display:flex;flex-direction:column;gap:8px">' +
          p.solution.map((s, i) =>
            '<div style="background:rgba(255,255,255,0.03);border:1px solid ' + accent + '22;border-radius:11px;overflow:hidden">' +
              '<div style="display:flex;align-items:center;gap:9px;padding:8px 13px;background:linear-gradient(90deg,' + accent + '15,transparent)">' +
                '<span style="flex-shrink:0;width:22px;height:22px;border-radius:50%;background:' + accent + '25;border:1px solid ' + accent + '45;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:' + accent + '">' + (i+1) + '</span>' +
                '<span style="font-size:12px;font-weight:700;color:#f0eeff">' + esc(s.title || ('Step ' + (i+1))) + '</span>' +
              '</div>' +
              '<div style="padding:9px 13px">' +
                '<p style="font-size:12.5px;color:rgba(240,238,255,0.76);line-height:1.68;margin:0">' + esc(s.explanation) + '</p>' +
              '</div>' +
            '</div>'
          ).join('') + '</div>'
        ) : '') +

        (p.reasoning ? sec('🧠 Why This Works', '#10b981',
          '<p style="font-size:12.5px;color:rgba(240,238,255,0.78);line-height:1.7">' + esc(p.reasoning) + '</p>'
        ) : '') +

        (p.example ? sec('📌 Example', '#f59e0b',
          '<div style="padding:11px 14px;border-left:3px solid #f59e0b50;background:rgba(245,158,11,0.06);border-radius:0 10px 10px 0">' +
            '<p style="font-size:12.5px;color:rgba(240,238,255,0.76);line-height:1.65;margin:0">' + esc(p.example) + '</p>' +
          '</div>'
        ) : '') +

        (p.finalAnswer ? '<div style="padding:12px 16px 0">' +
          '<div style="padding:13px 16px;background:linear-gradient(135deg,' + accent + '18,' + accent + '08);border:1.5px solid ' + accent + '40;border-radius:13px">' +
            '<div style="font-size:9.5px;font-weight:800;color:' + accent + ';text-transform:uppercase;letter-spacing:0.7px;margin-bottom:6px">✅ Final Answer</div>' +
            '<p style="font-size:13px;font-weight:500;color:#f0eeff;line-height:1.65;margin:0">' + esc(p.finalAnswer) + '</p>' +
          '</div>' +
        '</div>' : '') +

        ((p.relatedConcepts && p.relatedConcepts.length) ? sec('🔗 Related Concepts', 'rgba(255,255,255,0.25)',
          '<div style="display:flex;flex-wrap:wrap;gap:5px">' +
          p.relatedConcepts.map(c => '<span style="font-size:11px;color:rgba(240,238,255,0.6);background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:100px;padding:3px 10px">' + esc(c) + '</span>').join('') +
          '</div>'
        ) : '');

    // ── MODE 4: Startup Roadmap ───────────────────────────────────────────
    } else if (ct === 'startup_roadmap' && d.roadmap) {
      const r = d.roadmap;

      const phaseColors = ['#7c3aed', '#2563eb', '#0891b2', '#059669'];

      bodyHTML =
        (r.startupGoal ? sec('🚀 Startup Goal', accent,
          '<p style="font-size:12.5px;color:rgba(240,238,255,0.82);line-height:1.72">' + esc(r.startupGoal) + '</p>'
        ) : '') +

        ((r.phases && r.phases.length) ? sec('🗺️ Roadmap Phases', accent,
          '<div style="display:flex;flex-direction:column;gap:9px">' +
          r.phases.map((ph, idx) => {
            const pc = phaseColors[idx] || accent;
            return '<div style="border:1px solid ' + pc + '30;border-radius:12px;overflow:hidden">' +
              '<div style="padding:9px 14px;background:linear-gradient(90deg,' + pc + '20,transparent);display:flex;align-items:center;justify-content:space-between">' +
                '<div style="font-size:12px;font-weight:700;color:#f0eeff">' + esc(ph.name) + '</div>' +
                (ph.duration ? '<div style="font-size:10px;color:rgba(240,238,255,0.4);background:rgba(255,255,255,0.06);border-radius:100px;padding:2px 9px">' + esc(ph.duration) + '</div>' : '') +
              '</div>' +
              '<div style="padding:10px 14px;display:flex;flex-direction:column;gap:6px">' +
                '<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px">' +
                  ph.tasks.map(t => '<li style="display:flex;gap:7px;font-size:12px;color:rgba(240,238,255,0.72)"><span style="color:' + pc + ';flex-shrink:0;font-weight:700">›</span>' + esc(t) + '</li>').join('') +
                '</ul>' +
                (ph.milestone ? '<div style="margin-top:4px;font-size:11px;color:' + pc + ';background:' + pc + '12;border:1px solid ' + pc + '25;border-radius:7px;padding:5px 9px">🎯 ' + esc(ph.milestone) + '</div>' : '') +
              '</div>' +
            '</div>';
          }).join('') + '</div>'
        ) : '') +

        ((r.skillsNeeded && r.skillsNeeded.length) ? sec('🧩 Skills Needed', '#f59e0b',
          '<div style="display:flex;flex-wrap:wrap;gap:5px">' +
          r.skillsNeeded.map(s => '<span style="font-size:11.5px;color:rgba(240,238,255,0.7);background:rgba(245,158,11,0.09);border:1px solid rgba(245,158,11,0.25);border-radius:100px;padding:3px 10px">' + esc(s) + '</span>').join('') +
          '</div>'
        ) : '') +

        ((r.toolsNeeded && r.toolsNeeded.length) ? sec('🛠️ Tools Needed', '#06b6d4',
          '<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px">' +
          r.toolsNeeded.map(t => li(t, '#06b6d4')).join('') + '</ul>'
        ) : '') +

        ((r.weeklySchedule && r.weeklySchedule.length) ? sec('📅 Weekly Schedule', '#10b981',
          '<div style="display:flex;flex-direction:column;gap:4px">' +
          r.weeklySchedule.map(s =>
            '<div style="font-size:12px;color:rgba(240,238,255,0.72);padding:5px 9px;background:rgba(16,185,129,0.06);border-radius:7px">' + esc(s) + '</div>'
          ).join('') + '</div>'
        ) : '') +

        ((r.watchOutFor && r.watchOutFor.length) ? sec('⚠️ Watch Out For', '#ef4444',
          '<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px">' +
          r.watchOutFor.map(x => li(x, '#ef4444')).join('') + '</ul>'
        ) : '') +

        (r.nextAction ? '<div style="padding:12px 16px 0">' +
          '<div style="padding:13px 16px;background:linear-gradient(135deg,rgba(124,58,237,0.18),rgba(124,58,237,0.06));border:1.5px solid rgba(124,58,237,0.4);border-radius:13px">' +
            '<div style="font-size:9.5px;font-weight:800;color:#7c3aed;text-transform:uppercase;letter-spacing:0.7px;margin-bottom:6px">⚡ Next Immediate Action</div>' +
            '<p style="font-size:13px;font-weight:500;color:#f0eeff;line-height:1.6;margin:0">' + esc(r.nextAction) + '</p>' +
          '</div>' +
        '</div>' : '');

    // ── MODE 5: Study Roadmap ─────────────────────────────────────────────
    } else if (ct === 'study_roadmap' && d.studyPlan) {
      const sp = d.studyPlan;

      const levelBadge = (label, val, color) => val
        ? '<div style="flex:1;padding:9px 11px;background:' + color + '0a;border:1px solid ' + color + '30;border-radius:10px;text-align:center">' +
            '<div style="font-size:9px;font-weight:700;color:' + color + ';text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px">' + label + '</div>' +
            '<div style="font-size:12px;font-weight:600;color:rgba(240,238,255,0.8)">' + esc(val) + '</div>' +
          '</div>'
        : '';

      bodyHTML =
        (sp.goal ? sec('🎯 Learning Goal', accent,
          '<p style="font-size:12.5px;color:rgba(240,238,255,0.82);line-height:1.72">' + esc(sp.goal) + '</p>'
        ) : '') +

        ((sp.currentLevel || sp.targetLevel || sp.totalDuration) ?
          '<div style="padding:10px 16px 0"><div style="display:flex;gap:7px">' +
          levelBadge('Current Level', sp.currentLevel, '#ef4444') +
          levelBadge('Target Level', sp.targetLevel, '#10b981') +
          levelBadge('Total Time', sp.totalDuration, '#f59e0b') +
          '</div></div>'
        : '') +

        ((sp.learningPath && sp.learningPath.length) ? sec('📚 Learning Path', accent,
          '<div style="display:flex;flex-direction:column;gap:9px">' +
          sp.learningPath.map((phase, idx) => {
            const pc = ['#7c3aed','#2563eb','#0891b2','#059669','#d97706'][idx % 5];
            return '<div style="border:1px solid ' + pc + '30;border-radius:12px;overflow:hidden">' +
              '<div style="padding:8px 14px;background:linear-gradient(90deg,' + pc + '1a,transparent);display:flex;align-items:center;justify-content:space-between">' +
                '<div style="font-size:12px;font-weight:700;color:#f0eeff">' + esc(phase.phase) + (phase.title ? ' — ' + esc(phase.title) : '') + '</div>' +
                (phase.dailyHours ? '<div style="font-size:10px;color:rgba(240,238,255,0.4);background:rgba(255,255,255,0.06);border-radius:100px;padding:2px 9px">⏱ ' + esc(phase.dailyHours) + '</div>' : '') +
              '</div>' +
              '<div style="padding:10px 14px;display:flex;flex-direction:column;gap:7px">' +
                (phase.focus ? '<p style="font-size:12px;color:rgba(240,238,255,0.72);margin:0;line-height:1.5">' + esc(phase.focus) + '</p>' : '') +
                ((phase.topics && phase.topics.length) ?
                  '<div style="display:flex;flex-wrap:wrap;gap:5px">' + phase.topics.map(t => '<span style="font-size:11px;color:rgba(240,238,255,0.65);background:' + pc + '0f;border:1px solid ' + pc + '28;border-radius:6px;padding:2px 8px">' + esc(t) + '</span>').join('') + '</div>'
                : '') +
                ((phase.resources && phase.resources.length) ?
                  '<div style="display:flex;flex-direction:column;gap:3px">' + phase.resources.map(res =>
                    '<div style="display:flex;align-items:flex-start;gap:7px;font-size:11.5px;color:rgba(240,238,255,0.65)">' +
                      '<span style="color:' + pc + ';flex-shrink:0;font-weight:700;font-size:10px;margin-top:2px">▶</span>' +
                      '<span>' + esc(typeof res === 'string' ? res : (res.name + (res.type ? ' [' + res.type + ']' : '') + (res.note ? ' — ' + res.note : ''))) + '</span>' +
                    '</div>'
                  ).join('') + '</div>'
                : '') +
                (phase.weekGoal ? '<div style="font-size:11px;color:' + pc + ';background:' + pc + '10;border-radius:7px;padding:5px 9px">✓ ' + esc(phase.weekGoal) + '</div>' : '') +
              '</div>' +
            '</div>';
          }).join('') + '</div>'
        ) : '') +

        ((sp.dailySchedule && sp.dailySchedule.length) ? sec('⏰ Daily Schedule', '#06b6d4',
          '<div style="display:flex;flex-direction:column;gap:4px">' +
          sp.dailySchedule.map(s =>
            '<div style="font-size:12px;color:rgba(240,238,255,0.72);padding:5px 9px;background:rgba(6,182,212,0.07);border-radius:7px">' + esc(s) + '</div>'
          ).join('') + '</div>'
        ) : '') +

        (sp.practicePlan ? sec('💪 Practice Plan', '#10b981',
          '<p style="font-size:12.5px;color:rgba(240,238,255,0.78);line-height:1.7">' + esc(sp.practicePlan) + '</p>'
        ) : '') +

        ((sp.tips && sp.tips.length) ? sec('💡 Pro Tips', '#f59e0b',
          '<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px">' +
          sp.tips.map(t => liAction(t)).join('') + '</ul>'
        ) : '') +

        (sp.nextAction ? '<div style="padding:12px 16px 0">' +
          '<div style="padding:13px 16px;background:linear-gradient(135deg,' + accent + '18,' + accent + '08);border:1.5px solid ' + accent + '40;border-radius:13px">' +
            '<div style="font-size:9.5px;font-weight:800;color:' + accent + ';text-transform:uppercase;letter-spacing:0.7px;margin-bottom:6px">⚡ Start Here Today</div>' +
            '<p style="font-size:13px;font-weight:500;color:#f0eeff;line-height:1.6;margin:0">' + esc(sp.nextAction) + '</p>' +
          '</div>' +
        '</div>' : '');

    } else if (ct === 'article' && d.article) {
      const a = d.article;
      bodyHTML =
        (a.executiveSummary ? sec('Executive Summary', accent,
          '<p style="font-size:12.5px;color:rgba(240,238,255,0.78);line-height:1.7">' + esc(a.executiveSummary) + '</p>'
        ) : '') +

        ((a.keyTakeaways && a.keyTakeaways.length) ? sec('Key Takeaways', accent,
          '<ol style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:7px">' +
          a.keyTakeaways.map((x, i) =>
            '<li style="display:flex;align-items:flex-start;gap:9px">' +
              '<span style="flex-shrink:0;width:20px;height:20px;border-radius:50%;background:' + accent + '20;border:1px solid ' + accent + '40;display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:800;color:' + accent + '">' + (i+1) + '</span>' +
              '<span style="font-size:12.5px;color:rgba(240,238,255,0.78);line-height:1.5;padding-top:2px">' + esc(x) + '</span>' +
            '</li>'
          ).join('') + '</ol>'
        ) : '') +

        ((a.coreConcepts && a.coreConcepts.length) ? sec('Core Concepts', accent,
          '<div style="display:flex;flex-direction:column;gap:7px">' +
          a.coreConcepts.map(c =>
            '<div style="padding:9px 12px;background:rgba(255,255,255,0.04);border-radius:10px;border:1px solid rgba(255,255,255,0.07)">' +
              '<div style="font-size:12px;font-weight:700;color:' + accent + ';margin-bottom:3px">' + esc(c.term) + '</div>' +
              '<div style="font-size:11.5px;color:rgba(240,238,255,0.6);line-height:1.5">' + esc(c.definition) + '</div>' +
            '</div>'
          ).join('') + '</div>'
        ) : '') +

        (a.expertPerspective ? sec('Expert Perspective', '#f59e0b',
          '<div style="display:flex;gap:10px;align-items:flex-start">' +
            '<div style="flex-shrink:0;font-size:20px;margin-top:-2px">🎓</div>' +
            '<p style="font-size:12.5px;color:rgba(240,238,255,0.75);line-height:1.65;font-style:italic;margin:0">' + esc(a.expertPerspective) + '</p>' +
          '</div>'
        ) : '') +

        ((a.actionItems && a.actionItems.length) ? sec('Action Items', '#10b981',
          '<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px">' +
          a.actionItems.map(x => liAction(x)).join('') + '</ul>'
        ) : '') +

        ((a.flashcards && a.flashcards.length) ? sec('Study Flashcards', accent,
          flashcardsHTML(a.flashcards, accent)
        ) : '');

    } else if (ct === 'research_paper' && d.research) {
      const r = d.research;
      bodyHTML =
        (r.abstract ? sec('Abstract', accent,
          '<p style="font-size:12.5px;color:rgba(240,238,255,0.78);line-height:1.7">' + esc(r.abstract) + '</p>'
        ) : '') +

        (r.simplifiedExplanation ? sec('Plain English', '#10b981',
          '<div style="display:flex;gap:10px;align-items:flex-start">' +
            '<div style="flex-shrink:0;font-size:18px">💡</div>' +
            '<p style="font-size:12.5px;color:rgba(240,238,255,0.78);line-height:1.65;margin:0">' + esc(r.simplifiedExplanation) + '</p>' +
          '</div>'
        ) : '') +

        ((r.keyFindings && r.keyFindings.length) ? sec('Key Findings', accent,
          '<ol style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:7px">' +
          r.keyFindings.map((x, i) =>
            '<li style="display:flex;align-items:flex-start;gap:9px">' +
              '<span style="flex-shrink:0;width:20px;height:20px;border-radius:50%;background:' + accent + '20;border:1px solid ' + accent + '40;display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:800;color:' + accent + '">' + (i+1) + '</span>' +
              '<span style="font-size:12.5px;color:rgba(240,238,255,0.78);line-height:1.5;padding-top:2px">' + esc(x) + '</span>' +
            '</li>'
          ).join('') + '</ol>'
        ) : '') +

        (r.methodology ? sec('Methodology', accent,
          '<p style="font-size:12.5px;color:rgba(240,238,255,0.7);line-height:1.6">' + esc(r.methodology) + '</p>'
        ) : '') +

        (r.conclusions ? sec('Conclusions', accent,
          '<p style="font-size:12.5px;color:rgba(240,238,255,0.78);line-height:1.65">' + esc(r.conclusions) + '</p>'
        ) : '') +

        (r.limitations ? sec('Limitations', '#f59e0b',
          '<p style="font-size:12.5px;color:rgba(240,238,255,0.65);line-height:1.6">' + esc(r.limitations) + '</p>'
        ) : '') +

        ((r.flashcards && r.flashcards.length) ? sec('Study Flashcards', accent,
          flashcardsHTML(r.flashcards, accent)
        ) : '');

    } else if (ct === 'math' && d.math) {
      const m = d.math;
      const diffColor = { Easy:'#10b981', Medium:'#f59e0b', Hard:'#f97316', Expert:'#ef4444' }[m.difficulty] || accent;
      bodyHTML =
        (m.problem ? sec('Problem', accent,
          '<p style="font-size:13px;color:rgba(240,238,255,0.85);font-family:ui-monospace,monospace;line-height:1.6;background:rgba(255,255,255,0.04);padding:10px;border-radius:8px">' + esc(m.problem) + '</p>'
        ) : '') +

        (m.solution ? '<div style="margin:0 16px;padding:16px;background:linear-gradient(135deg,' + accent + '20,' + accent + '08);border:1.5px solid ' + accent + '40;border-radius:14px;text-align:center">' +
          '<div style="font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:' + accent + ';opacity:0.7;margin-bottom:6px">Final Answer</div>' +
          '<div style="font-size:26px;font-weight:900;color:#f0eeff;letter-spacing:-0.5px">' + esc(m.solution) + '</div>' +
        '</div>' : '') +

        ((m.steps && m.steps.length) ? sec('Step-by-Step Solution', accent,
          '<div style="display:flex;flex-direction:column;gap:10px">' +
          m.steps.map(s =>
            '<div style="display:flex;gap:10px;align-items:flex-start">' +
              '<div style="width:24px;height:24px;border-radius:50%;background:' + accent + '20;border:1px solid ' + accent + '44;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:' + accent + ';flex-shrink:0;margin-top:1px">' + s.step + '</div>' +
              '<div style="flex:1">' +
                '<div style="font-size:12.5px;color:rgba(240,238,255,0.8);line-height:1.5">' + esc(s.description) + '</div>' +
                (s.result ? '<div style="font-size:12px;font-weight:700;color:' + accent + ';margin-top:3px;font-family:ui-monospace,monospace">= ' + esc(s.result) + '</div>' : '') +
              '</div>' +
            '</div>'
          ).join('') + '</div>'
        ) : '') +

        ((m.concepts && m.concepts.length) ? sec('Concepts Used', accent,
          '<div style="display:flex;flex-wrap:wrap;gap:6px">' +
          m.concepts.map(c => '<span style="font-size:11px;font-weight:600;color:' + accent + ';background:' + accent + '15;border:1px solid ' + accent + '30;border-radius:100px;padding:3px 10px">' + esc(c) + '</span>').join('') + '</div>'
        ) : '') +

        (m.difficulty ? '<div style="margin:0 16px 4px;display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:rgba(255,255,255,0.04);border-radius:10px">' +
          '<span style="font-size:11.5px;color:rgba(240,238,255,0.4)">Difficulty</span>' +
          '<span style="font-size:12px;font-weight:700;color:' + diffColor + '">' + esc(m.difficulty) + '</span>' +
        '</div>' : '');

    } else if (ct === 'job_posting' && d.job) {
      const j = d.job;
      const fitColor = { Strong:'#10b981', Moderate:'#f59e0b', Niche:'#f97316' }[j.fitScore] || accent;
      bodyHTML =
        '<div style="padding:14px 16px 0;display:flex;flex-wrap:wrap;gap:6px">' +
          (j.company ? badge(j.company, accent) : '') +
          (j.location ? badge('📍 ' + j.location, 'rgba(255,255,255,0.12)') : '') +
          (j.salary ? badge('💰 ' + j.salary, '#10b981') : '') +
          (j.fitScore ? badge('Fit: ' + j.fitScore, fitColor) : '') +
        '</div>' +

        (j.overview ? sec('Role Overview', accent,
          '<p style="font-size:12.5px;color:rgba(240,238,255,0.78);line-height:1.65">' + esc(j.overview) + '</p>'
        ) : '') +

        ((j.requirements && j.requirements.length) ? sec('Requirements', accent,
          '<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px">' +
          j.requirements.map(x => li(x, accent)).join('') + '</ul>'
        ) : '') +

        ((j.skills && j.skills.length) ? sec('Key Skills', accent,
          '<div style="display:flex;flex-wrap:wrap;gap:6px">' +
          j.skills.map(s => '<span style="font-size:11px;font-weight:600;color:' + accent + ';background:' + accent + '15;border:1px solid ' + accent + '30;border-radius:100px;padding:3px 10px">' + esc(s) + '</span>').join('') + '</div>'
        ) : '') +

        ((j.applicationTips && j.applicationTips.length) ? sec('How to Stand Out', '#10b981',
          '<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px">' +
          j.applicationTips.map(x => liAction(x)).join('') + '</ul>'
        ) : '') +

        ((j.redFlags && j.redFlags.length) ? sec('⚠ Red Flags', '#ef4444',
          '<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px">' +
          j.redFlags.map(x => li(x, '#ef4444')).join('') + '</ul>'
        ) : '');

    } else if (ct === 'youtube' && d.youtube) {
      const y = d.youtube;
      const transcriptBadge = d.hasTranscript
        ? '<span style="font-size:9.5px;font-weight:700;color:#10b981;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.25);border-radius:100px;padding:2px 8px">✓ Full Transcript</span>'
        : '<span style="font-size:9.5px;font-weight:700;color:#f59e0b;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.25);border-radius:100px;padding:2px 8px">Metadata only</span>';

      const metaBar = '<div style="padding:10px 16px 0;display:flex;flex-wrap:wrap;align-items:center;gap:6px">' +
        (d.channel ? badge('📺 ' + d.channel, accent) : '') +
        (d.duration ? badge('⏱ ' + d.duration, 'rgba(255,255,255,0.1)') : '') +
        (d.views ? badge('👁 ' + d.views, 'rgba(255,255,255,0.1)') : '') +
        transcriptBadge +
      '</div>';

      const chaptersHTML = (y.chapters && y.chapters.length)
        ? y.chapters.map((ch, idx) =>
            '<div style="background:rgba(255,255,255,0.03);border:1px solid ' + accent + '25;border-radius:12px;overflow:hidden">' +
              '<div style="padding:9px 14px;background:linear-gradient(90deg,' + accent + '18,transparent);border-bottom:1px solid ' + accent + '20;display:flex;align-items:center;gap:8px">' +
                '<span style="font-size:9.5px;font-weight:800;color:' + accent + ';background:' + accent + '25;border-radius:50%;width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0">' + (idx+1) + '</span>' +
                '<span style="font-size:12px;font-weight:700;color:#f0eeff">' + esc(ch.title) + '</span>' +
              '</div>' +
              '<div style="padding:11px 14px;display:flex;flex-direction:column;gap:9px">' +
                (ch.explanation ? '<p style="font-size:12.5px;color:rgba(240,238,255,0.78);line-height:1.7;margin:0">' + esc(ch.explanation) + '</p>' : '') +
                ((ch.concepts && ch.concepts.length) ?
                  '<div><div style="font-size:9.5px;font-weight:700;color:' + accent + ';text-transform:uppercase;letter-spacing:0.6px;margin-bottom:5px">Key Concepts</div>' +
                  '<div style="display:flex;flex-wrap:wrap;gap:5px">' + ch.concepts.map(c => '<span style="font-size:11px;color:rgba(240,238,255,0.7);background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:3px 9px">' + esc(c) + '</span>').join('') + '</div></div>'
                : '') +
                ((ch.definitions && ch.definitions.filter(d=>d.term).length) ?
                  '<div><div style="font-size:9.5px;font-weight:700;color:#f59e0b;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:5px">Definitions</div>' +
                  '<div style="display:flex;flex-direction:column;gap:4px">' + ch.definitions.filter(d=>d.term).map(d =>
                    '<div style="display:flex;gap:6px"><span style="font-size:11.5px;font-weight:700;color:#f59e0b;white-space:nowrap">' + esc(d.term) + ':</span><span style="font-size:11.5px;color:rgba(240,238,255,0.65);line-height:1.5">' + esc(d.definition) + '</span></div>'
                  ).join('') + '</div></div>'
                : '') +
                ((ch.examples && ch.examples.length) ?
                  '<div><div style="font-size:9.5px;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:5px">Examples</div>' +
                  '<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:3px">' + ch.examples.map(x => li(x, '#10b981')).join('') + '</ul></div>'
                : '') +
                ((ch.formulas && ch.formulas.length) ?
                  '<div><div style="font-size:9.5px;font-weight:700;color:#a78bfa;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:5px">Formulas</div>' +
                  '<div style="display:flex;flex-direction:column;gap:3px">' + ch.formulas.map(f => '<div style="font-size:12px;font-family:ui-monospace,monospace;color:#a78bfa;background:rgba(167,139,250,0.08);border:1px solid rgba(167,139,250,0.2);border-radius:7px;padding:5px 10px">' + esc(f) + '</div>').join('') + '</div></div>'
                : '') +
              '</div>' +
            '</div>'
          ).join('')
        : '';

      bodyHTML = metaBar +

        (y.introduction ? sec('📝 Introduction', accent,
          '<p style="font-size:12.5px;color:rgba(240,238,255,0.78);line-height:1.7">' + esc(y.introduction) + '</p>'
        ) : '') +

        (chaptersHTML ? '<div style="display:flex;flex-direction:column;gap:8px">' + chaptersHTML + '</div>' : '') +

        ((y.importantPoints && y.importantPoints.length) ? sec('🎯 Important Points', '#f59e0b',
          '<ol style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:7px">' +
          y.importantPoints.map((x, i) =>
            '<li style="display:flex;align-items:flex-start;gap:9px">' +
              '<span style="flex-shrink:0;width:20px;height:20px;border-radius:50%;background:rgba(245,158,11,0.18);border:1px solid rgba(245,158,11,0.35);display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:800;color:#f59e0b">' + (i+1) + '</span>' +
              '<span style="font-size:12.5px;color:rgba(240,238,255,0.78);line-height:1.5;padding-top:2px">' + esc(x) + '</span>' +
            '</li>'
          ).join('') + '</ol>'
        ) : '') +

        ((y.quickRevision && y.quickRevision.length) ? sec('⚡ Quick Revision Notes', '#06b6d4',
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:5px">' +
          y.quickRevision.map(x =>
            '<div style="display:flex;align-items:flex-start;gap:6px;padding:6px 8px;background:rgba(6,182,212,0.06);border:1px solid rgba(6,182,212,0.15);border-radius:8px">' +
              '<span style="color:#06b6d4;font-size:10px;font-weight:800;flex-shrink:0;margin-top:2px">›</span>' +
              '<span style="font-size:11.5px;color:rgba(240,238,255,0.7);line-height:1.4">' + esc(x) + '</span>' +
            '</div>'
          ).join('') + '</div>'
        ) : '') +

        (y.conclusion ? sec('📚 Final Conclusion', '#10b981',
          '<p style="font-size:12.5px;color:rgba(240,238,255,0.78);line-height:1.7">' + esc(y.conclusion) + '</p>'
        ) : '');

    } else if (ct === 'video' && d.video) {
      const v = d.video;
      bodyHTML =
        '<div style="padding:14px 16px 0;display:flex;flex-wrap:wrap;gap:6px">' +
          (v.channel ? badge('📺 ' + v.channel, accent) : '') +
        '</div>' +

        (v.summary ? sec('Video Summary', accent,
          '<p style="font-size:12.5px;color:rgba(240,238,255,0.78);line-height:1.7">' + esc(v.summary) + '</p>'
        ) : '') +

        ((v.keyTopics && v.keyTopics.length) ? sec('Key Topics Covered', accent,
          '<ol style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:7px">' +
          v.keyTopics.map((x, i) =>
            '<li style="display:flex;align-items:flex-start;gap:9px">' +
              '<span style="flex-shrink:0;width:20px;height:20px;border-radius:50%;background:' + accent + '20;border:1px solid ' + accent + '40;display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:800;color:' + accent + '">' + (i+1) + '</span>' +
              '<span style="font-size:12.5px;color:rgba(240,238,255,0.78);line-height:1.5;padding-top:2px">' + esc(x) + '</span>' +
            '</li>'
          ).join('') + '</ol>'
        ) : '') +

        ((v.studyNotes && v.studyNotes.length) ? sec('Study Notes', '#10b981',
          '<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px">' +
          v.studyNotes.map(x => liAction(x)).join('') + '</ul>'
        ) : '') +

        ((v.quotableInsights && v.quotableInsights.length) ? sec('Quotable Insights', '#f59e0b',
          '<div style="display:flex;flex-direction:column;gap:8px">' +
          v.quotableInsights.map(q =>
            '<div style="padding:10px 13px;border-left:3px solid #f59e0b40;background:rgba(245,158,11,0.06);border-radius:0 10px 10px 0">' +
              '<p style="font-size:12px;color:rgba(240,238,255,0.7);font-style:italic;line-height:1.55;margin:0">"' + esc(q) + '"</p>' +
            '</div>'
          ).join('') + '</div>'
        ) : '');

    } else if (ct === 'code' && d.code) {
      const c = d.code;
      bodyHTML =
        '<div style="padding:14px 16px 0;display:flex;flex-wrap:wrap;gap:6px">' +
          (c.language ? badge(c.language, accent) : '') +
          (c.timeComplexity ? badge('⏱ ' + c.timeComplexity, 'rgba(255,255,255,0.12)') : '') +
        '</div>' +

        (c.explanation ? sec('What It Does', accent,
          '<p style="font-size:12.5px;color:rgba(240,238,255,0.78);line-height:1.65">' + esc(c.explanation) + '</p>'
        ) : '') +

        ((c.improvements && c.improvements.length) ? sec('Suggested Improvements', '#10b981',
          '<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px">' +
          c.improvements.map(x => liAction(x)).join('') + '</ul>'
        ) : '') +

        ((c.bugs && c.bugs.length) ? sec('Potential Bugs / Risks', '#ef4444',
          '<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px">' +
          c.bugs.map(x => li(x, '#ef4444')).join('') + '</ul>'
        ) : '') +

        ((c.bestPractices && c.bestPractices.length) ? sec('Best Practices', accent,
          '<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px">' +
          c.bestPractices.map(x => li(x, accent)).join('') + '</ul>'
        ) : '');

    } else {
      const g = d.general || {};
      bodyHTML =
        ((g.executiveSummary || g.summary) ? sec('Executive Summary', accent,
          '<p style="font-size:12.5px;color:rgba(240,238,255,0.78);line-height:1.7">' + esc(g.executiveSummary || g.summary) + '</p>'
        ) : '') +

        ((g.keyInsights && g.keyInsights.length) ? sec('Key Insights', accent,
          '<ol style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:7px">' +
          g.keyInsights.map((x, i) =>
            '<li style="display:flex;align-items:flex-start;gap:9px">' +
              '<span style="flex-shrink:0;width:20px;height:20px;border-radius:50%;background:' + accent + '20;border:1px solid ' + accent + '40;display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:800;color:' + accent + '">' + (i+1) + '</span>' +
              '<span style="font-size:12.5px;color:rgba(240,238,255,0.78);line-height:1.5;padding-top:2px">' + esc(x) + '</span>' +
            '</li>'
          ).join('') + '</ol>'
        ) : '') +

        ((g.actionItems && g.actionItems.length) ? sec('Action Items', '#10b981',
          '<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px">' +
          g.actionItems.map(x => liAction(x)).join('') + '</ul>'
        ) : '');
    }

    return header + '<div style="display:flex;flex-direction:column;gap:10px;padding:12px 16px 20px">' + bodyHTML + '</div>';
  }

  // ── Shared helpers ────────────────────────────────────────────────────────

  function sec(title, accent, inner) {
    return '<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;overflow:hidden"><div style="padding:9px 14px 7px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;gap:7px"><div style="width:3px;height:12px;background:' + accent + ';border-radius:4px;flex-shrink:0"></div><span style="font-size:10.5px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:rgba(240,238,255,0.5)">' + esc(title) + '</span></div><div style="padding:11px 14px">' + inner + '</div></div>';
  }

  function li(text, color) {
    return '<li style="display:flex;align-items:flex-start;gap:7px;font-size:12px;color:rgba(240,238,255,0.7);line-height:1.5"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="flex-shrink:0;margin-top:2px"><path d="M3 8l3 3 7-7" stroke="' + color + '" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg><span>' + esc(text) + '</span></li>';
  }

  function liAction(text) {
    return '<li style="display:flex;align-items:flex-start;gap:8px;font-size:12px;color:rgba(240,238,255,0.75);line-height:1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;margin-top:2px"><path d="M13 7l5 5-5 5M6 7l5 5-5 5" stroke="#10b981" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><span>' + esc(text) + '</span></li>';
  }

  function badge(text, color) {
    const isWhite = color.includes('255,255,255');
    return '<span style="font-size:11px;font-weight:600;padding:3px 9px;border-radius:100px;background:' + color + '20;border:1px solid ' + color + '40;color:' + (isWhite ? 'rgba(240,238,255,0.7)' : color) + '">' + esc(text) + '</span>';
  }

  function infoRow(label, value) {
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-top:1px solid rgba(255,255,255,0.05)"><span style="font-size:11.5px;color:rgba(240,238,255,0.4)">' + esc(label) + '</span><span style="font-size:12px;font-weight:600;color:rgba(240,238,255,0.8)">' + esc(value) + '</span></div>';
  }

  function flashcardsHTML(cards, accent) {
    return '<div style="display:flex;flex-direction:column;gap:7px">' + (cards||[]).map(c => '<div style="border:1px solid rgba(255,255,255,0.08);border-radius:10px;overflow:hidden"><div style="padding:7px 11px;background:' + accent + '12;border-bottom:1px solid rgba(255,255,255,0.06);font-size:11.5px;font-weight:600;color:' + accent + '">' + esc(c.q) + '</div><div style="padding:7px 11px;font-size:12px;color:rgba(240,238,255,0.65);line-height:1.5">' + esc(c.a) + '</div></div>').join('') + '</div>';
  }

  // ── Bottom bar ────────────────────────────────────────────────────────────

  function buildBottomBarHTML(accent) {
    const b = 'display:inline-flex;align-items:center;gap:5px;padding:7px 13px;border-radius:9px;font-size:11.5px;font-weight:600;cursor:pointer;border:1px solid;transition:opacity 0.15s';
    return '<button id="__dai-copy" style="' + b + ';background:' + accent + '18;border-color:' + accent + '44;color:' + accent + '"><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="1.8"/></svg>Copy</button>' +
      '<button id="__dai-rescan" style="' + b + ';background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.12);color:rgba(240,238,255,0.6)"><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>Scan again</button>' +
      '<div style="flex:1"></div>' +
      '<button id="__dai-close2" style="' + b + ';background:rgba(255,255,255,0.04);border-color:rgba(255,255,255,0.1);color:rgba(240,238,255,0.4)">Close</button>';
  }

  function wireBottomBar(bar, result, mode) {
    const copyBtn   = bar.querySelector('#__dai-copy');
    const rescanBtn = bar.querySelector('#__dai-rescan');
    const closeBtn  = bar.querySelector('#__dai-close2');

    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const text = toClipboard(result, mode);
        navigator.clipboard.writeText(text).then(() => {
          copyBtn.textContent = '✓ Copied!';
          setTimeout(() => { copyBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="1.8"/></svg>Copy'; }, 2000);
        }).catch(() => {});
      });
    }
    if (rescanBtn) {
      rescanBtn.addEventListener('click', () => {
        removeOverlay();
        chrome.runtime.sendMessage({ type: 'GET_ACTIVE_TAB' }, (resp) => {
          if (resp && resp.tab && resp.tab.id) {
            chrome.runtime.sendMessage({ type: 'LAUNCH_SELECTOR', mode, tabId: resp.tab.id });
          }
        });
      });
    }
    if (closeBtn) closeBtn.addEventListener('click', removeOverlay);
  }

  function toClipboard(result, mode) {
    if (mode === 'masterscan') {
      const g = result.general || result.article || result.research || {};
      return [result.title ? 'Title: ' + result.title : '', result.contentLabel ? 'Type: ' + result.contentLabel : '', g.summary ? '\nSummary:\n' + g.summary : '', (g.keyPoints||g.findings) ? '\nKey Points:\n' + (g.keyPoints||g.findings||[]).map(p=>'• '+p).join('\n') : ''].filter(Boolean).join('\n');
    }
    const p = result.product || {}, v = result.verdict || {}, r = result.reviews || {}, pi = result.priceIntel || {};
    return ['DecisionAI Truth Layer', p.name ? 'Product: '+p.name : '', 'Truth Score: '+result.truthScore+'/100 ('+(result.scoreLabel||')'), v.label ? 'Verdict: '+v.label : '', v.reasoning ? '\n'+v.reasoning : '', (r.pros&&r.pros.length) ? '\nPros:\n'+r.pros.map(x=>'• '+x).join('\n') : '', (r.cons&&r.cons.length) ? '\nCons:\n'+r.cons.map(x=>'• '+x).join('\n') : '', pi.currentPrice ? '\nPrice: '+pi.currentPrice+' · '+(pi.dealRating||'') : ''].filter(Boolean).join('\n');
  }

})();
