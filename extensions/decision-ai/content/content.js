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

  async function groqCall(messages, model, maxTokens) {
    const apiKey = await getApiKey();
    if (!apiKey) throw new Error('NO_API_KEY');

    const isVision = model === VISION_MODEL;
    const body = {
      model,
      messages,
      temperature: 0.3,
      max_tokens: maxTokens || (isVision ? 2048 : 7000),
    };
    // Vision models do NOT support response_format — text models do
    if (!isVision) {
      body.response_format = { type: 'json_object' };
    }

    const resp = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => resp.statusText);
      if (resp.status === 401) throw new Error('INVALID_API_KEY');
      throw new Error('Groq API error ' + resp.status + ': ' + errText);
    }

    const data = await resp.json();
    const choice = data.choices && data.choices[0];
    const rawText = choice && choice.message && choice.message.content;
    if (!rawText) throw new Error('Empty response from AI');

    // If the model was cut off due to token limit, attempt auto-repair before giving up
    const wasTruncated = choice.finish_reason === 'length';

    // Strip markdown code fences if present (```json ... ``` or ``` ... ```)
    const stripped = rawText.trim();
    const fenceMatch = stripped.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/);
    let jsonStr = fenceMatch ? fenceMatch[1].trim() : stripped;

    // Try direct parse first
    try { return JSON.parse(jsonStr); }
    catch (_) {}

    // Extract the outermost { … } block
    const objStart = jsonStr.indexOf('{');
    const objEnd   = jsonStr.lastIndexOf('}');
    if (objStart !== -1 && objEnd > objStart) {
      try { return JSON.parse(jsonStr.slice(objStart, objEnd + 1)); }
      catch (_) {}
    }

    // If truncated, try to auto-close open brackets/braces so we still get usable data
    if (wasTruncated && objStart !== -1) {
      try {
        let partial = jsonStr.slice(objStart);
        // Count unmatched open brackets
        let depth = 0, inStr = false, escape = false;
        for (let i = 0; i < partial.length; i++) {
          const c = partial[i];
          if (escape) { escape = false; continue; }
          if (c === '\\' && inStr) { escape = true; continue; }
          if (c === '"') { inStr = !inStr; continue; }
          if (inStr) continue;
          if (c === '{' || c === '[') depth++;
          else if (c === '}' || c === ']') depth--;
        }
        // Strip trailing incomplete token (comma, colon, partial string)
        partial = partial.replace(/,\s*$/, '').replace(/:\s*$/, ':null');
        // Close any open string
        if (inStr) partial += '"';
        // Close open arrays/objects in reverse order
        // We do a second pass to close correctly
        let depth2 = 0; const stack = [];
        for (let i = 0; i < partial.length; i++) {
          const c = partial[i];
          if (c === '{') stack.push('}');
          else if (c === '[') stack.push(']');
          else if (c === '}' || c === ']') stack.pop();
        }
        partial += stack.reverse().join('');
        return JSON.parse(partial);
      } catch (_) {}
    }

    throw new Error('AI returned invalid JSON. Please try again.');
  }

  function analyzeTruthLayer(imageDataUrl, pageUrl, pageTitle) {
    return groqCall([
      { role: 'system', content: 'You are DecisionAI Truth Layer — an expert product analyst AI. Analyze product screenshots and return comprehensive, honest assessments. Always return valid JSON only, no markdown. Do NOT wrap in markdown code fences.' },
      { role: 'user', content: [
        { type: 'image_url', image_url: { url: imageDataUrl } },
        { type: 'text', text: 'Analyze this screenshot from: ' + (pageUrl || 'unknown page') + '\nTitle: ' + (pageTitle || 'unknown') + '\n\nReturn ONLY this JSON:\n{"product":{"name":"full product name","brand":"brand","model":"model if visible","price":"price as shown","currency":"currency","rating":"rating e.g. 4.2/5","reviewCount":"reviews count","store":"store name","inStock":true},"truthScore":75,"scoreLabel":"Good","verdict":{"type":"buy","label":"Recommended Buy","reasoning":"3-4 sentence explanation","emoji":"✅"},"reviews":{"summary":"2-3 sentence customer summary","pros":["Pro 1","Pro 2","Pro 3"],"cons":["Con 1","Con 2"],"hiddenComplaints":["Common hidden issue"]},"priceIntel":{"currentPrice":"visible price","fairPrice":"fair market value","dealRating":"Great Deal|Fair|Overpriced","alternatives":[{"store":"Amazon","estimatedPrice":"$XX","note":"note"}]},"buyTiming":{"recommendation":"buy-now","reason":"short reason"},"competitors":[{"name":"Competitor","why":"comparison","betterFor":"use case"}]}' }
      ]}
    ], VISION_MODEL, 3000);
  }

  function analyzeMasterScan(imageDataUrl, pageUrl, pageTitle) {
    return groqCall([
      { role: 'system', content: 'You are MasterScan — a premium AI analyst by DecisionAI. Return ONLY raw JSON. No markdown. No code fences. No extra text. Start your response with { and end with }.' },
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
    ], VISION_MODEL, 6000);
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
      case 'EXTRACT_PROFILE':
        handleExtractProfile(message, sendResponse);
        return true;
      case 'PARSE_RESUME_TEXT':
        handleParseResumeText(message, sendResponse);
        return true;
      case 'AUTOFILL_FORM':
        handleAutofillForm(sendResponse);
        return true;
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
    // Route through background service worker — content script fetch() is CORS-blocked by YouTube
    const pageResp = await chrome.runtime.sendMessage({ type: 'FETCH_YOUTUBE', videoId });
    if (!pageResp || !pageResp.success) {
      throw new Error(pageResp?.error || 'Could not fetch YouTube page');
    }
    const html = pageResp.html;

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

    // Caption track URL — also fetched via background to avoid CORS
    let transcript = '';
    const captMatch = html.match(/"captionTracks":\[.*?"baseUrl":"([^"]+)"/);
    if (captMatch) {
      try {
        const captUrl = captMatch[1].replace(/\\u0026/g, '&').replace(/\\u003d/g, '=').replace(/\\/g, '');
        const captResp = await chrome.runtime.sendMessage({ type: 'FETCH_YOUTUBE', captUrl });
        if (captResp && captResp.success && captResp.data) {
          const captData = captResp.data;
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
    ], 'llama-3.3-70b-versatile', 7000);
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
    // Route through background service worker to bypass CORS restrictions
    const bgResp = await chrome.runtime.sendMessage({ type: 'FETCH_URL', url });
    if (!bgResp || !bgResp.success) {
      if (bgResp?.error === 'PDF_NO_PARSE') throw new Error('PDF_NO_PARSE');
      throw new Error(bgResp?.error || 'Could not fetch URL');
    }
    const html = bgResp.html;

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
    const descEl = document.getElementById('__dai-loading-desc');
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
        '@keyframes __dai-popin{from{opacity:0;transform:scale(0.92) translateY(6px)}to{opacity:1;transform:scale(1) translateY(0)}}',
        '@keyframes __dai-shimmer{0%{background-position:200% center}100%{background-position:-200% center}}',
        '@keyframes __dai-pulse-dot{0%,100%{opacity:0.5;transform:scale(1)}50%{opacity:1;transform:scale(1.35)}}',
        '#__dai-overlay-panel::-webkit-scrollbar{width:4px}',
        '#__dai-overlay-panel::-webkit-scrollbar-track{background:rgba(236,72,153,0.06)}',
        '#__dai-overlay-panel::-webkit-scrollbar-thumb{background:rgba(236,72,153,0.22);border-radius:4px}',
        '#__dai-inline-trans::-webkit-scrollbar{width:3px}',
        '#__dai-inline-trans::-webkit-scrollbar-thumb{background:rgba(6,182,212,0.25);border-radius:4px}',
        '#__dai-trans-copy:hover,#__dai-trans-replace:hover{opacity:0.82}',
        '#__dai-trans-close:hover{background:rgba(6,182,212,0.16)!important}',
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
      background:'#fff0f7',
      border:'1px solid ' + accent + '44',
      'border-radius':'18px',
      'box-shadow':'0 8px 40px rgba(236,72,153,0.12),0 2px 12px rgba(0,0,0,0.06),0 0 0 1px ' + accent + '22',
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
      background:'linear-gradient(160deg,#ffffff 60%,#fff5fb 100%)',
      'border-bottom':'1px solid ' + accent + '22',
      cursor:'grab', 'flex-shrink':'0'
    });

    const logoMark = document.createElement('div');
    sp(logoMark, { width:'30px', height:'30px', background:'linear-gradient(135deg,' + accent + '30,' + accent + '10)', border:'1px solid ' + accent + '55', 'border-radius':'9px', display:'flex', 'align-items':'center', 'justify-content':'center', 'flex-shrink':'0', 'box-shadow':'0 0 14px ' + accent + '30' });
    logoMark.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" style="color:' + accent + '"><path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';

    const titleWrap = document.createElement('div');
    sp(titleWrap, { flex:'1', 'min-width':'0' });
    titleWrap.innerHTML = '<div style="display:flex;align-items:center;gap:7px"><span style="font-size:13px;font-weight:700;color:#1a0810;letter-spacing:-0.3px">Decision<span style="color:' + accent + '">AI</span></span><span style="color:rgba(26,8,16,0.3);font-size:12px">·</span><span style="font-size:12px;font-weight:600;color:rgba(26,8,16,0.8)">' + label + '</span><span style="font-size:9px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;background:rgba(16,185,129,0.15);color:#10b981;border:1px solid rgba(16,185,129,0.3);border-radius:100px;padding:2px 7px;margin-left:2px">LIVE</span></div>';

    const closeBtn = document.createElement('button');
    sp(closeBtn, { width:'28px', height:'28px', 'border-radius':'8px', border:'1px solid rgba(236,72,153,0.18)', background:'rgba(236,72,153,0.08)', color:'rgba(26,8,16,0.6)', cursor:'pointer', display:'flex', 'align-items':'center', 'justify-content':'center', 'flex-shrink':'0' });
    closeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
    closeBtn.addEventListener('mouseenter', () => sp(closeBtn, { background:'rgba(236,72,153,0.18)' }));
    closeBtn.addEventListener('mouseleave', () => sp(closeBtn, { background:'rgba(236,72,153,0.08)' }));
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
    sp(bottomBar, { display:'none', gap:'8px', padding:'12px 16px', 'border-top':'1px solid rgba(236,72,153,0.15)', 'flex-shrink':'0', background:'#fff8fc' });

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
    return '<div style="padding:28px 20px;display:flex;flex-direction:column;gap:20px;animation:__dai-fadein 0.25s ease both">' +
      '<div style="display:flex;flex-direction:column;align-items:center;gap:16px;padding:8px 0">' +
      '<div style="position:relative;width:52px;height:52px"><svg style="animation:__dai-spin 1s linear infinite" width="52" height="52" viewBox="0 0 52 52" fill="none"><circle cx="26" cy="26" r="22" stroke="rgba(236,72,153,0.12)" stroke-width="3"/><circle cx="26" cy="26" r="22" stroke="' + accent + '" stroke-width="3" stroke-linecap="round" stroke-dasharray="35 104"/></svg><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="color:' + accent + '"><path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg></div></div>' +
      '<div style="text-align:center"><div style="font-size:15px;font-weight:700;color:#1a0810;margin-bottom:5px">Analyzing with AI…</div><div id="__dai-loading-desc" style="font-size:12px;color:rgba(26,8,16,0.45)">Running ' + label + ' on your selection</div></div>' +
      '<div style="display:flex;flex-direction:column;gap:8px;width:100%;max-width:280px">' +
      loadingStep(1, 'Capturing your selection', accent) +
      loadingStep(2, 'Processing with vision AI', accent) +
      loadingStep(3, 'Generating insights', accent) +
      '</div></div></div>';
  }

  function loadingStep(n, text, accent) {
    return '<div style="display:flex;align-items:center;gap:10px;animation:__dai-fadein 0.3s ease ' + (0.3*(n-1)) + 's both"><div style="width:22px;height:22px;border-radius:50%;background:' + accent + '20;border:1px solid ' + accent + '44;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:10px;font-weight:700;color:' + accent + '">' + n + '</div><span style="font-size:12px;color:rgba(26,8,16,0.6)">' + text + '</span></div>';
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
    content.innerHTML = '<div style="padding:32px 20px;display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center;animation:__dai-fadein 0.25s ease both"><div style="width:52px;height:52px;border-radius:50%;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);display:flex;align-items:center;justify-content:center"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 8v4M12 16h.01" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="10" stroke="#ef4444" stroke-width="1.5"/></svg></div><div><div style="font-size:15px;font-weight:700;color:#1a0810;margin-bottom:6px">' + esc(title) + '</div><div style="font-size:12px;color:rgba(26,8,16,0.5);line-height:1.6;max-width:340px">' + esc(desc) + '</div></div></div>';
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
    const hiddenHTML = (r.hiddenComplaints||[]).map(x => '<div style="font-size:11.5px;color:rgba(26,8,16,0.6);padding:4px 0;border-bottom:1px solid rgba(236,72,153,0.07)">' + esc(x) + '</div>').join('');
    const altsHTML   = (pi.alternatives||[]).map(a => '<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid rgba(236,72,153,0.07)"><span style="font-size:12px;color:rgba(26,8,16,0.7)">' + esc(a.store) + '</span><div style="display:flex;align-items:center;gap:8px">' + (a.note ? '<span style="font-size:11px;color:rgba(26,8,16,0.4)">' + esc(a.note) + '</span>' : '') + '<span style="font-size:13px;font-weight:700;color:#1a0810">' + esc(a.estimatedPrice) + '</span></div></div>').join('');
    const compsHTML  = comps.map(c => '<div style="padding:10px 12px;background:rgba(236,72,153,0.04);border-radius:10px;border:1px solid rgba(236,72,153,0.08)"><div style="font-size:12.5px;font-weight:600;color:#1a0810;margin-bottom:3px">' + esc(c.name) + '</div><div style="font-size:11.5px;color:rgba(26,8,16,0.5)">' + esc(c.why) + (c.betterFor ? ' · Better for: ' + esc(c.betterFor) : '') + '</div></div>').join('');

    return '<div style="padding:16px 16px 20px;display:flex;flex-direction:column;gap:14px">' +

      // Score + verdict
      '<div style="display:flex;gap:12px;align-items:flex-start">' +
        '<div style="display:flex;flex-direction:column;align-items:center;padding:12px 16px;background:rgba(236,72,153,0.06);border:1px solid rgba(236,72,153,0.14);border-radius:14px;flex-shrink:0;min-width:80px">' +
          '<div style="font-size:36px;font-weight:800;color:' + scColor + ';line-height:1">' + sc + '</div>' +
          '<div style="font-size:10px;font-weight:600;color:' + scColor + ';letter-spacing:0.5px;margin-top:3px;text-transform:uppercase">' + esc(d.scoreLabel||'') + '</div>' +
          '<div style="font-size:9.5px;color:rgba(26,8,16,0.35);margin-top:2px">Truth Score</div>' +
        '</div>' +
        '<div style="flex:1;background:' + vc.bg + ';border:1px solid ' + vc.border + ';border-radius:14px;padding:12px 14px">' +
          '<div style="font-size:18px;margin-bottom:4px">' + esc(v.emoji||'') + '</div>' +
          '<div style="font-size:13px;font-weight:700;color:' + vc.text + ';margin-bottom:5px">' + esc(v.label||'See below') + '</div>' +
          '<div style="font-size:11.5px;color:rgba(26,8,16,0.55);line-height:1.55">' + esc(v.reasoning||'') + '</div>' +
        '</div>' +
      '</div>' +

      // Product info
      (p.name ? sec('Product', accent, '<div style="font-size:14px;font-weight:700;color:#1a0810;margin-bottom:6px">' + esc(p.name) + '</div><div style="display:flex;flex-wrap:wrap;gap:6px">' + (p.price ? badge(p.price, accent) : '') + (p.brand ? badge(p.brand, 'rgba(236,72,153,0.12)') : '') + (p.store ? badge(p.store, 'rgba(236,72,153,0.22)') : '') + (p.rating ? badge('★ '+p.rating+(p.reviewCount?' · '+p.reviewCount+' reviews':''), '#f59e0b') : '') + '</div>') : '') +

      // Pros & Cons
      ((r.pros&&r.pros.length)||(r.cons&&r.cons.length) ? sec('Pros & Cons', accent,
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
          '<div><div style="font-size:10px;font-weight:700;color:#10b981;letter-spacing:0.6px;text-transform:uppercase;margin-bottom:6px">Pros</div><ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px">' + (prosHTML||'<li style="font-size:11.5px;color:rgba(26,8,16,0.35)">—</li>') + '</ul></div>' +
          '<div><div style="font-size:10px;font-weight:700;color:#ef4444;letter-spacing:0.6px;text-transform:uppercase;margin-bottom:6px">Cons</div><ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px">' + (consHTML||'<li style="font-size:11.5px;color:rgba(26,8,16,0.35)">—</li>') + '</ul></div>' +
        '</div>' +
        (r.summary ? '<p style="font-size:11.5px;color:rgba(26,8,16,0.5);line-height:1.55;margin-top:10px;padding-top:10px;border-top:1px solid rgba(236,72,153,0.12)">' + esc(r.summary) + '</p>' : '') +
        (hiddenHTML ? '<div style="margin-top:10px;padding:10px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:10px"><div style="font-size:10px;font-weight:700;color:#f59e0b;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:6px">⚠ Hidden Complaints</div>' + hiddenHTML + '</div>' : '')
      ) : '') +

      // Price intel
      ((pi.currentPrice||altsHTML) ? sec('Price Intelligence', accent,
        '<div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:10px;border-bottom:1px solid rgba(236,72,153,0.12)">' +
          '<div><div style="font-size:10.5px;color:rgba(26,8,16,0.4);text-transform:uppercase;letter-spacing:0.5px">Current Price</div><div style="font-size:20px;font-weight:800;color:#1a0810">' + esc(pi.currentPrice||'—') + '</div>' + (pi.fairPrice ? '<div style="font-size:11px;color:rgba(26,8,16,0.4)">Fair value: ' + esc(pi.fairPrice) + '</div>' : '') + '</div>' +
          (pi.dealRating ? '<div style="padding:5px 12px;background:' + (pi.dealRating==='Great Deal'?'rgba(16,185,129,0.15)':pi.dealRating==='Overpriced'?'rgba(239,68,68,0.15)':'rgba(245,158,11,0.15)') + ';border:1px solid ' + (pi.dealRating==='Great Deal'?'rgba(16,185,129,0.3)':pi.dealRating==='Overpriced'?'rgba(239,68,68,0.3)':'rgba(245,158,11,0.3)') + ';border-radius:100px;font-size:11.5px;font-weight:700;color:' + (pi.dealRating==='Great Deal'?'#10b981':pi.dealRating==='Overpriced'?'#ef4444':'#f59e0b') + '">' + esc(pi.dealRating) + '</div>' : '') +
        '</div>' + altsHTML +
        (d.buyTiming ? '<div style="margin-top:8px;font-size:11.5px;color:rgba(26,8,16,0.5)"><span style="color:rgba(26,8,16,0.7);font-weight:600">Buy timing:</span> ' + esc(d.buyTiming.reason) + '</div>' : '')
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
      ? '<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:12px">' +
          d.topics.map(t => '<span style="font-size:11px;font-weight:600;color:rgba(26,8,16,0.6);background:rgba(236,72,153,0.12);border:1px solid rgba(236,72,153,0.18);border-radius:100px;padding:4px 11px">' + esc(t) + '</span>').join('') +
        '</div>'
      : '';

    const overviewHTML = d.quickOverview
      ? '<div style="margin:14px 0 0;padding:15px 18px;background:linear-gradient(135deg,' + accent + '1a,' + accent + '08,rgba(236,72,153,0.03));border:1px solid ' + accent + '40;border-radius:14px;position:relative;overflow:hidden">' +
          '<div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,' + accent + ',' + accent + '44,transparent)"></div>' +
          '<div style="font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:' + accent + ';margin-bottom:8px">⚡ Quick Overview</div>' +
          '<p style="font-size:14px;color:rgba(26,8,16,0.92);line-height:1.7;margin:0;font-weight:400">' + esc(d.quickOverview) + '</p>' +
        '</div>'
      : '';

    const header =
      '<div style="padding:18px 18px 0">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:11px">' +
          '<span style="font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:' + accent + ';background:linear-gradient(135deg,' + accent + '22,' + accent + '0f);border:1px solid ' + accent + '45;border-radius:100px;padding:4px 13px">' + esc(d.contentLabel || 'Analysis') + '</span>' +
          (d.confidence ? '<span style="font-size:10.5px;color:rgba(26,8,16,0.35);font-weight:500">' + d.confidence + '% confidence</span>' : '') +
        '</div>' +
        (d.title ? '<div style="font-size:18px;font-weight:900;color:#1a0810;line-height:1.3;letter-spacing:-0.5px">' + esc(d.title) + '</div>' : '') +
        topicsHTML +
        overviewHTML +
      '</div>';

    // ── Per-content-type body ─────────────────────────────────────────────
    let bodyHTML = '';

    // ── MODE 2: Article / URL Analyzer ───────────────────────────────────
    if (ct === 'article_url' && d.articleData) {
      const a = d.articleData;

      bodyHTML =
        (a.mainIdea ? sec('💡 Main Idea', accent,
          '<p style="font-size:12.5px;color:rgba(26,8,16,0.82);line-height:1.72">' + esc(a.mainIdea) + '</p>'
        ) : '') +

        ((a.importantHighlights && a.importantHighlights.length) ? sec('⭐ Important Highlights', accent,
          '<ol style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:7px">' +
          a.importantHighlights.map((x, i) =>
            '<li style="display:flex;align-items:flex-start;gap:9px">' +
              '<span style="flex-shrink:0;width:20px;height:20px;border-radius:50%;background:' + accent + '20;border:1px solid ' + accent + '40;display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:800;color:' + accent + '">' + (i+1) + '</span>' +
              '<span style="font-size:12.5px;color:rgba(26,8,16,0.78);line-height:1.5;padding-top:2px">' + esc(x) + '</span>' +
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
              '<span style="font-size:12px;color:rgba(26,8,16,0.75);line-height:1.5">' + esc(x) + '</span>' +
            '</div>'
          ).join('') + '</div>'
        ) : '') +

        ((a.pros && a.pros.length && a.pros[0]) || (a.cons && a.cons.length && a.cons[0])
          ? '<div style="padding:12px 16px 0"><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
              ((a.pros && a.pros.length && a.pros[0]) ?
                '<div style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.2);border-radius:10px;padding:10px 12px"><div style="font-size:9.5px;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:7px">✓ Pros</div>' +
                '<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px">' + a.pros.map(x => '<li style="display:flex;gap:6px"><span style="color:#10b981;flex-shrink:0">+</span><span style="font-size:11.5px;color:rgba(26,8,16,0.72);line-height:1.4">' + esc(x) + '</span></li>').join('') + '</ul></div>'
              : '<div></div>') +
              ((a.cons && a.cons.length && a.cons[0]) ?
                '<div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:10px;padding:10px 12px"><div style="font-size:9.5px;font-weight:700;color:#ef4444;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:7px">✗ Cons</div>' +
                '<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px">' + a.cons.map(x => '<li style="display:flex;gap:6px"><span style="color:#ef4444;flex-shrink:0">–</span><span style="font-size:11.5px;color:rgba(26,8,16,0.72);line-height:1.4">' + esc(x) + '</span></li>').join('') + '</ul></div>'
              : '<div></div>') +
            '</div></div>'
          : '') +

        (a.finalSummary ? sec('📝 Final Summary', '#f59e0b',
          '<p style="font-size:12.5px;color:rgba(26,8,16,0.82);line-height:1.72">' + esc(a.finalSummary) + '</p>'
        ) : '');

    // ── MODE 3: Problem Solver ────────────────────────────────────────────
    } else if (ct === 'problem' && d.problem) {
      const p = d.problem;

      bodyHTML =
        (p.understanding ? sec('🔍 Understanding the Problem', accent,
          '<p style="font-size:12.5px;color:rgba(26,8,16,0.82);line-height:1.72">' + esc(p.understanding) + '</p>'
        ) : '') +

        ((p.solution && p.solution.length) ? sec('⚙️ Step-by-Step Solution', accent,
          '<div style="display:flex;flex-direction:column;gap:8px">' +
          p.solution.map((s, i) =>
            '<div style="background:rgba(236,72,153,0.04);border:1px solid ' + accent + '22;border-radius:11px;overflow:hidden">' +
              '<div style="display:flex;align-items:center;gap:9px;padding:8px 13px;background:linear-gradient(90deg,' + accent + '15,transparent)">' +
                '<span style="flex-shrink:0;width:22px;height:22px;border-radius:50%;background:' + accent + '25;border:1px solid ' + accent + '45;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:' + accent + '">' + (i+1) + '</span>' +
                '<span style="font-size:12px;font-weight:700;color:#1a0810">' + esc(s.title || ('Step ' + (i+1))) + '</span>' +
              '</div>' +
              '<div style="padding:9px 13px">' +
                '<p style="font-size:12.5px;color:rgba(26,8,16,0.76);line-height:1.68;margin:0">' + esc(s.explanation) + '</p>' +
              '</div>' +
            '</div>'
          ).join('') + '</div>'
        ) : '') +

        (p.reasoning ? sec('🧠 Why This Works', '#10b981',
          '<p style="font-size:12.5px;color:rgba(26,8,16,0.78);line-height:1.7">' + esc(p.reasoning) + '</p>'
        ) : '') +

        (p.example ? sec('📌 Example', '#f59e0b',
          '<div style="padding:11px 14px;border-left:3px solid #f59e0b50;background:rgba(245,158,11,0.06);border-radius:0 10px 10px 0">' +
            '<p style="font-size:12.5px;color:rgba(26,8,16,0.76);line-height:1.65;margin:0">' + esc(p.example) + '</p>' +
          '</div>'
        ) : '') +

        (p.finalAnswer ? '<div style="padding:12px 16px 0">' +
          '<div style="padding:13px 16px;background:linear-gradient(135deg,' + accent + '18,' + accent + '08);border:1.5px solid ' + accent + '40;border-radius:13px">' +
            '<div style="font-size:9.5px;font-weight:800;color:' + accent + ';text-transform:uppercase;letter-spacing:0.7px;margin-bottom:6px">✅ Final Answer</div>' +
            '<p style="font-size:13px;font-weight:500;color:#1a0810;line-height:1.65;margin:0">' + esc(p.finalAnswer) + '</p>' +
          '</div>' +
        '</div>' : '') +

        ((p.relatedConcepts && p.relatedConcepts.length) ? sec('🔗 Related Concepts', 'rgba(236,72,153,0.5)',
          '<div style="display:flex;flex-wrap:wrap;gap:5px">' +
          p.relatedConcepts.map(c => '<span style="font-size:11px;color:rgba(26,8,16,0.6);background:rgba(236,72,153,0.08);border:1px solid rgba(236,72,153,0.18);border-radius:100px;padding:3px 10px">' + esc(c) + '</span>').join('') +
          '</div>'
        ) : '');

    // ── MODE 4: Startup Roadmap ───────────────────────────────────────────
    } else if (ct === 'startup_roadmap' && d.roadmap) {
      const r = d.roadmap;

      const phaseColors = ['#7c3aed', '#2563eb', '#0891b2', '#059669'];

      bodyHTML =
        (r.startupGoal ? sec('🚀 Startup Goal', accent,
          '<p style="font-size:12.5px;color:rgba(26,8,16,0.82);line-height:1.72">' + esc(r.startupGoal) + '</p>'
        ) : '') +

        ((r.phases && r.phases.length) ? sec('🗺️ Roadmap Phases', accent,
          '<div style="display:flex;flex-direction:column;gap:9px">' +
          r.phases.map((ph, idx) => {
            const pc = phaseColors[idx] || accent;
            return '<div style="border:1px solid ' + pc + '30;border-radius:12px;overflow:hidden">' +
              '<div style="padding:9px 14px;background:linear-gradient(90deg,' + pc + '20,transparent);display:flex;align-items:center;justify-content:space-between">' +
                '<div style="font-size:12px;font-weight:700;color:#1a0810">' + esc(ph.name) + '</div>' +
                (ph.duration ? '<div style="font-size:10px;color:rgba(26,8,16,0.4);background:rgba(236,72,153,0.08);border-radius:100px;padding:2px 9px">' + esc(ph.duration) + '</div>' : '') +
              '</div>' +
              '<div style="padding:10px 14px;display:flex;flex-direction:column;gap:6px">' +
                '<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px">' +
                  ph.tasks.map(t => '<li style="display:flex;gap:7px;font-size:12px;color:rgba(26,8,16,0.72)"><span style="color:' + pc + ';flex-shrink:0;font-weight:700">›</span>' + esc(t) + '</li>').join('') +
                '</ul>' +
                (ph.milestone ? '<div style="margin-top:4px;font-size:11px;color:' + pc + ';background:' + pc + '12;border:1px solid ' + pc + '25;border-radius:7px;padding:5px 9px">🎯 ' + esc(ph.milestone) + '</div>' : '') +
              '</div>' +
            '</div>';
          }).join('') + '</div>'
        ) : '') +

        ((r.skillsNeeded && r.skillsNeeded.length) ? sec('🧩 Skills Needed', '#f59e0b',
          '<div style="display:flex;flex-wrap:wrap;gap:5px">' +
          r.skillsNeeded.map(s => '<span style="font-size:11.5px;color:rgba(26,8,16,0.7);background:rgba(245,158,11,0.09);border:1px solid rgba(245,158,11,0.25);border-radius:100px;padding:3px 10px">' + esc(s) + '</span>').join('') +
          '</div>'
        ) : '') +

        ((r.toolsNeeded && r.toolsNeeded.length) ? sec('🛠️ Tools Needed', '#06b6d4',
          '<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px">' +
          r.toolsNeeded.map(t => li(t, '#06b6d4')).join('') + '</ul>'
        ) : '') +

        ((r.weeklySchedule && r.weeklySchedule.length) ? sec('📅 Weekly Schedule', '#10b981',
          '<div style="display:flex;flex-direction:column;gap:4px">' +
          r.weeklySchedule.map(s =>
            '<div style="font-size:12px;color:rgba(26,8,16,0.72);padding:5px 9px;background:rgba(16,185,129,0.06);border-radius:7px">' + esc(s) + '</div>'
          ).join('') + '</div>'
        ) : '') +

        ((r.watchOutFor && r.watchOutFor.length) ? sec('⚠️ Watch Out For', '#ef4444',
          '<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px">' +
          r.watchOutFor.map(x => li(x, '#ef4444')).join('') + '</ul>'
        ) : '') +

        (r.nextAction ? '<div style="padding:12px 16px 0">' +
          '<div style="padding:13px 16px;background:linear-gradient(135deg,rgba(124,58,237,0.18),rgba(124,58,237,0.06));border:1.5px solid rgba(124,58,237,0.4);border-radius:13px">' +
            '<div style="font-size:9.5px;font-weight:800;color:#7c3aed;text-transform:uppercase;letter-spacing:0.7px;margin-bottom:6px">⚡ Next Immediate Action</div>' +
            '<p style="font-size:13px;font-weight:500;color:#1a0810;line-height:1.6;margin:0">' + esc(r.nextAction) + '</p>' +
          '</div>' +
        '</div>' : '');

    // ── MODE 5: Study Roadmap ─────────────────────────────────────────────
    } else if (ct === 'study_roadmap' && d.studyPlan) {
      const sp = d.studyPlan;

      const levelBadge = (label, val, color) => val
        ? '<div style="flex:1;padding:9px 11px;background:' + color + '0a;border:1px solid ' + color + '30;border-radius:10px;text-align:center">' +
            '<div style="font-size:9px;font-weight:700;color:' + color + ';text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px">' + label + '</div>' +
            '<div style="font-size:12px;font-weight:600;color:rgba(26,8,16,0.8)">' + esc(val) + '</div>' +
          '</div>'
        : '';

      bodyHTML =
        (sp.goal ? sec('🎯 Learning Goal', accent,
          '<p style="font-size:12.5px;color:rgba(26,8,16,0.82);line-height:1.72">' + esc(sp.goal) + '</p>'
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
                '<div style="font-size:12px;font-weight:700;color:#1a0810">' + esc(phase.phase) + (phase.title ? ' — ' + esc(phase.title) : '') + '</div>' +
                (phase.dailyHours ? '<div style="font-size:10px;color:rgba(26,8,16,0.4);background:rgba(236,72,153,0.08);border-radius:100px;padding:2px 9px">⏱ ' + esc(phase.dailyHours) + '</div>' : '') +
              '</div>' +
              '<div style="padding:10px 14px;display:flex;flex-direction:column;gap:7px">' +
                (phase.focus ? '<p style="font-size:12px;color:rgba(26,8,16,0.72);margin:0;line-height:1.5">' + esc(phase.focus) + '</p>' : '') +
                ((phase.topics && phase.topics.length) ?
                  '<div style="display:flex;flex-wrap:wrap;gap:5px">' + phase.topics.map(t => '<span style="font-size:11px;color:rgba(26,8,16,0.65);background:' + pc + '0f;border:1px solid ' + pc + '28;border-radius:6px;padding:2px 8px">' + esc(t) + '</span>').join('') + '</div>'
                : '') +
                ((phase.resources && phase.resources.length) ?
                  '<div style="display:flex;flex-direction:column;gap:3px">' + phase.resources.map(res =>
                    '<div style="display:flex;align-items:flex-start;gap:7px;font-size:11.5px;color:rgba(26,8,16,0.65)">' +
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
            '<div style="font-size:12px;color:rgba(26,8,16,0.72);padding:5px 9px;background:rgba(6,182,212,0.07);border-radius:7px">' + esc(s) + '</div>'
          ).join('') + '</div>'
        ) : '') +

        (sp.practicePlan ? sec('💪 Practice Plan', '#10b981',
          '<p style="font-size:12.5px;color:rgba(26,8,16,0.78);line-height:1.7">' + esc(sp.practicePlan) + '</p>'
        ) : '') +

        ((sp.tips && sp.tips.length) ? sec('💡 Pro Tips', '#f59e0b',
          '<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px">' +
          sp.tips.map(t => liAction(t)).join('') + '</ul>'
        ) : '') +

        (sp.nextAction ? '<div style="padding:12px 16px 0">' +
          '<div style="padding:13px 16px;background:linear-gradient(135deg,' + accent + '18,' + accent + '08);border:1.5px solid ' + accent + '40;border-radius:13px">' +
            '<div style="font-size:9.5px;font-weight:800;color:' + accent + ';text-transform:uppercase;letter-spacing:0.7px;margin-bottom:6px">⚡ Start Here Today</div>' +
            '<p style="font-size:13px;font-weight:500;color:#1a0810;line-height:1.6;margin:0">' + esc(sp.nextAction) + '</p>' +
          '</div>' +
        '</div>' : '');

    } else if (ct === 'article' && d.article) {
      const a = d.article;
      bodyHTML =
        (a.executiveSummary ? sec('Executive Summary', accent,
          '<p style="font-size:12.5px;color:rgba(26,8,16,0.78);line-height:1.7">' + esc(a.executiveSummary) + '</p>'
        ) : '') +

        ((a.keyTakeaways && a.keyTakeaways.length) ? sec('Key Takeaways', accent,
          '<ol style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:7px">' +
          a.keyTakeaways.map((x, i) =>
            '<li style="display:flex;align-items:flex-start;gap:9px">' +
              '<span style="flex-shrink:0;width:20px;height:20px;border-radius:50%;background:' + accent + '20;border:1px solid ' + accent + '40;display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:800;color:' + accent + '">' + (i+1) + '</span>' +
              '<span style="font-size:12.5px;color:rgba(26,8,16,0.78);line-height:1.5;padding-top:2px">' + esc(x) + '</span>' +
            '</li>'
          ).join('') + '</ol>'
        ) : '') +

        ((a.coreConcepts && a.coreConcepts.length) ? sec('Core Concepts', accent,
          '<div style="display:flex;flex-direction:column;gap:7px">' +
          a.coreConcepts.map(c =>
            '<div style="padding:9px 12px;background:rgba(236,72,153,0.06);border-radius:10px;border:1px solid rgba(236,72,153,0.12)">' +
              '<div style="font-size:12px;font-weight:700;color:' + accent + ';margin-bottom:3px">' + esc(c.term) + '</div>' +
              '<div style="font-size:11.5px;color:rgba(26,8,16,0.6);line-height:1.5">' + esc(c.definition) + '</div>' +
            '</div>'
          ).join('') + '</div>'
        ) : '') +

        (a.expertPerspective ? sec('Expert Perspective', '#f59e0b',
          '<div style="display:flex;gap:10px;align-items:flex-start">' +
            '<div style="flex-shrink:0;font-size:20px;margin-top:-2px">🎓</div>' +
            '<p style="font-size:12.5px;color:rgba(26,8,16,0.75);line-height:1.65;font-style:italic;margin:0">' + esc(a.expertPerspective) + '</p>' +
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
          '<p style="font-size:12.5px;color:rgba(26,8,16,0.78);line-height:1.7">' + esc(r.abstract) + '</p>'
        ) : '') +

        (r.simplifiedExplanation ? sec('Plain English', '#10b981',
          '<div style="display:flex;gap:10px;align-items:flex-start">' +
            '<div style="flex-shrink:0;font-size:18px">💡</div>' +
            '<p style="font-size:12.5px;color:rgba(26,8,16,0.78);line-height:1.65;margin:0">' + esc(r.simplifiedExplanation) + '</p>' +
          '</div>'
        ) : '') +

        ((r.keyFindings && r.keyFindings.length) ? sec('Key Findings', accent,
          '<ol style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:7px">' +
          r.keyFindings.map((x, i) =>
            '<li style="display:flex;align-items:flex-start;gap:9px">' +
              '<span style="flex-shrink:0;width:20px;height:20px;border-radius:50%;background:' + accent + '20;border:1px solid ' + accent + '40;display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:800;color:' + accent + '">' + (i+1) + '</span>' +
              '<span style="font-size:12.5px;color:rgba(26,8,16,0.78);line-height:1.5;padding-top:2px">' + esc(x) + '</span>' +
            '</li>'
          ).join('') + '</ol>'
        ) : '') +

        (r.methodology ? sec('Methodology', accent,
          '<p style="font-size:12.5px;color:rgba(26,8,16,0.7);line-height:1.6">' + esc(r.methodology) + '</p>'
        ) : '') +

        (r.conclusions ? sec('Conclusions', accent,
          '<p style="font-size:12.5px;color:rgba(26,8,16,0.78);line-height:1.65">' + esc(r.conclusions) + '</p>'
        ) : '') +

        (r.limitations ? sec('Limitations', '#f59e0b',
          '<p style="font-size:12.5px;color:rgba(26,8,16,0.65);line-height:1.6">' + esc(r.limitations) + '</p>'
        ) : '') +

        ((r.flashcards && r.flashcards.length) ? sec('Study Flashcards', accent,
          flashcardsHTML(r.flashcards, accent)
        ) : '');

    } else if (ct === 'math' && d.math) {
      const m = d.math;
      const diffColor = { Easy:'#10b981', Medium:'#f59e0b', Hard:'#f97316', Expert:'#ef4444' }[m.difficulty] || accent;
      bodyHTML =
        (m.problem ? sec('Problem', accent,
          '<p style="font-size:13px;color:rgba(26,8,16,0.85);font-family:ui-monospace,monospace;line-height:1.6;background:rgba(236,72,153,0.06);padding:10px;border-radius:8px">' + esc(m.problem) + '</p>'
        ) : '') +

        (m.solution ? '<div style="margin:0 16px;padding:16px;background:linear-gradient(135deg,' + accent + '20,' + accent + '08);border:1.5px solid ' + accent + '40;border-radius:14px;text-align:center">' +
          '<div style="font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:' + accent + ';opacity:0.7;margin-bottom:6px">Final Answer</div>' +
          '<div style="font-size:26px;font-weight:900;color:#1a0810;letter-spacing:-0.5px">' + esc(m.solution) + '</div>' +
        '</div>' : '') +

        ((m.steps && m.steps.length) ? sec('Step-by-Step Solution', accent,
          '<div style="display:flex;flex-direction:column;gap:10px">' +
          m.steps.map(s =>
            '<div style="display:flex;gap:10px;align-items:flex-start">' +
              '<div style="width:24px;height:24px;border-radius:50%;background:' + accent + '20;border:1px solid ' + accent + '44;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:' + accent + ';flex-shrink:0;margin-top:1px">' + s.step + '</div>' +
              '<div style="flex:1">' +
                '<div style="font-size:12.5px;color:rgba(26,8,16,0.8);line-height:1.5">' + esc(s.description) + '</div>' +
                (s.result ? '<div style="font-size:12px;font-weight:700;color:' + accent + ';margin-top:3px;font-family:ui-monospace,monospace">= ' + esc(s.result) + '</div>' : '') +
              '</div>' +
            '</div>'
          ).join('') + '</div>'
        ) : '') +

        ((m.concepts && m.concepts.length) ? sec('Concepts Used', accent,
          '<div style="display:flex;flex-wrap:wrap;gap:6px">' +
          m.concepts.map(c => '<span style="font-size:11px;font-weight:600;color:' + accent + ';background:' + accent + '15;border:1px solid ' + accent + '30;border-radius:100px;padding:3px 10px">' + esc(c) + '</span>').join('') + '</div>'
        ) : '') +

        (m.difficulty ? '<div style="margin:0 16px 4px;display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:rgba(236,72,153,0.06);border-radius:10px">' +
          '<span style="font-size:11.5px;color:rgba(26,8,16,0.4)">Difficulty</span>' +
          '<span style="font-size:12px;font-weight:700;color:' + diffColor + '">' + esc(m.difficulty) + '</span>' +
        '</div>' : '');

    } else if (ct === 'job_posting' && d.job) {
      const j = d.job;
      const fitColor = { Strong:'#10b981', Moderate:'#f59e0b', Niche:'#f97316' }[j.fitScore] || accent;
      bodyHTML =
        '<div style="padding:14px 16px 0;display:flex;flex-wrap:wrap;gap:6px">' +
          (j.company ? badge(j.company, accent) : '') +
          (j.location ? badge('📍 ' + j.location, 'rgba(236,72,153,0.18)') : '') +
          (j.salary ? badge('💰 ' + j.salary, '#10b981') : '') +
          (j.fitScore ? badge('Fit: ' + j.fitScore, fitColor) : '') +
        '</div>' +

        (j.overview ? sec('Role Overview', accent,
          '<p style="font-size:12.5px;color:rgba(26,8,16,0.78);line-height:1.65">' + esc(j.overview) + '</p>'
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
        (d.duration ? badge('⏱ ' + d.duration, 'rgba(236,72,153,0.18)') : '') +
        (d.views ? badge('👁 ' + d.views, 'rgba(236,72,153,0.18)') : '') +
        transcriptBadge +
      '</div>';

      const chaptersHTML = (y.chapters && y.chapters.length)
        ? y.chapters.map((ch, idx) =>
            '<div style="background:rgba(236,72,153,0.04);border:1px solid ' + accent + '25;border-radius:12px;overflow:hidden">' +
              '<div style="padding:9px 14px;background:linear-gradient(90deg,' + accent + '18,transparent);border-bottom:1px solid ' + accent + '20;display:flex;align-items:center;gap:8px">' +
                '<span style="font-size:9.5px;font-weight:800;color:' + accent + ';background:' + accent + '25;border-radius:50%;width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0">' + (idx+1) + '</span>' +
                '<span style="font-size:12px;font-weight:700;color:#1a0810">' + esc(ch.title) + '</span>' +
              '</div>' +
              '<div style="padding:11px 14px;display:flex;flex-direction:column;gap:9px">' +
                (ch.explanation ? '<p style="font-size:12.5px;color:rgba(26,8,16,0.78);line-height:1.7;margin:0">' + esc(ch.explanation) + '</p>' : '') +
                ((ch.concepts && ch.concepts.length) ?
                  '<div><div style="font-size:9.5px;font-weight:700;color:' + accent + ';text-transform:uppercase;letter-spacing:0.6px;margin-bottom:5px">Key Concepts</div>' +
                  '<div style="display:flex;flex-wrap:wrap;gap:5px">' + ch.concepts.map(c => '<span style="font-size:11px;color:rgba(26,8,16,0.7);background:rgba(236,72,153,0.08);border:1px solid rgba(236,72,153,0.18);border-radius:6px;padding:3px 9px">' + esc(c) + '</span>').join('') + '</div></div>'
                : '') +
                ((ch.definitions && ch.definitions.filter(d=>d.term).length) ?
                  '<div><div style="font-size:9.5px;font-weight:700;color:#f59e0b;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:5px">Definitions</div>' +
                  '<div style="display:flex;flex-direction:column;gap:4px">' + ch.definitions.filter(d=>d.term).map(d =>
                    '<div style="display:flex;gap:6px"><span style="font-size:11.5px;font-weight:700;color:#f59e0b;white-space:nowrap">' + esc(d.term) + ':</span><span style="font-size:11.5px;color:rgba(26,8,16,0.65);line-height:1.5">' + esc(d.definition) + '</span></div>'
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
          '<p style="font-size:12.5px;color:rgba(26,8,16,0.78);line-height:1.7">' + esc(y.introduction) + '</p>'
        ) : '') +

        (chaptersHTML ? '<div style="display:flex;flex-direction:column;gap:8px">' + chaptersHTML + '</div>' : '') +

        ((y.importantPoints && y.importantPoints.length) ? sec('🎯 Important Points', '#f59e0b',
          '<ol style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:7px">' +
          y.importantPoints.map((x, i) =>
            '<li style="display:flex;align-items:flex-start;gap:9px">' +
              '<span style="flex-shrink:0;width:20px;height:20px;border-radius:50%;background:rgba(245,158,11,0.18);border:1px solid rgba(245,158,11,0.35);display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:800;color:#f59e0b">' + (i+1) + '</span>' +
              '<span style="font-size:12.5px;color:rgba(26,8,16,0.78);line-height:1.5;padding-top:2px">' + esc(x) + '</span>' +
            '</li>'
          ).join('') + '</ol>'
        ) : '') +

        ((y.quickRevision && y.quickRevision.length) ? sec('⚡ Quick Revision Notes', '#06b6d4',
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:5px">' +
          y.quickRevision.map(x =>
            '<div style="display:flex;align-items:flex-start;gap:6px;padding:6px 8px;background:rgba(6,182,212,0.06);border:1px solid rgba(6,182,212,0.15);border-radius:8px">' +
              '<span style="color:#06b6d4;font-size:10px;font-weight:800;flex-shrink:0;margin-top:2px">›</span>' +
              '<span style="font-size:11.5px;color:rgba(26,8,16,0.7);line-height:1.4">' + esc(x) + '</span>' +
            '</div>'
          ).join('') + '</div>'
        ) : '') +

        (y.conclusion ? sec('📚 Final Conclusion', '#10b981',
          '<p style="font-size:12.5px;color:rgba(26,8,16,0.78);line-height:1.7">' + esc(y.conclusion) + '</p>'
        ) : '');

    } else if (ct === 'video' && d.video) {
      const v = d.video;
      bodyHTML =
        '<div style="padding:14px 16px 0;display:flex;flex-wrap:wrap;gap:6px">' +
          (v.channel ? badge('📺 ' + v.channel, accent) : '') +
        '</div>' +

        (v.summary ? sec('Video Summary', accent,
          '<p style="font-size:12.5px;color:rgba(26,8,16,0.78);line-height:1.7">' + esc(v.summary) + '</p>'
        ) : '') +

        ((v.keyTopics && v.keyTopics.length) ? sec('Key Topics Covered', accent,
          '<ol style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:7px">' +
          v.keyTopics.map((x, i) =>
            '<li style="display:flex;align-items:flex-start;gap:9px">' +
              '<span style="flex-shrink:0;width:20px;height:20px;border-radius:50%;background:' + accent + '20;border:1px solid ' + accent + '40;display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:800;color:' + accent + '">' + (i+1) + '</span>' +
              '<span style="font-size:12.5px;color:rgba(26,8,16,0.78);line-height:1.5;padding-top:2px">' + esc(x) + '</span>' +
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
              '<p style="font-size:12px;color:rgba(26,8,16,0.7);font-style:italic;line-height:1.55;margin:0">"' + esc(q) + '"</p>' +
            '</div>'
          ).join('') + '</div>'
        ) : '');

    } else if (ct === 'code' && d.code) {
      const c = d.code;
      bodyHTML =
        '<div style="padding:14px 16px 0;display:flex;flex-wrap:wrap;gap:6px">' +
          (c.language ? badge(c.language, accent) : '') +
          (c.timeComplexity ? badge('⏱ ' + c.timeComplexity, 'rgba(236,72,153,0.18)') : '') +
        '</div>' +

        (c.explanation ? sec('What It Does', accent,
          '<p style="font-size:12.5px;color:rgba(26,8,16,0.78);line-height:1.65">' + esc(c.explanation) + '</p>'
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
          '<p style="font-size:12.5px;color:rgba(26,8,16,0.78);line-height:1.7">' + esc(g.executiveSummary || g.summary) + '</p>'
        ) : '') +

        ((g.keyInsights && g.keyInsights.length) ? sec('Key Insights', accent,
          '<ol style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:7px">' +
          g.keyInsights.map((x, i) =>
            '<li style="display:flex;align-items:flex-start;gap:9px">' +
              '<span style="flex-shrink:0;width:20px;height:20px;border-radius:50%;background:' + accent + '20;border:1px solid ' + accent + '40;display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:800;color:' + accent + '">' + (i+1) + '</span>' +
              '<span style="font-size:12.5px;color:rgba(26,8,16,0.78);line-height:1.5;padding-top:2px">' + esc(x) + '</span>' +
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
    return '<div style="background:rgba(236,72,153,0.03);border:1px solid rgba(236,72,153,0.18);border-radius:16px;overflow:hidden">' +
      '<div style="padding:11px 16px 10px;background:linear-gradient(90deg,' + accent + '18 0%,rgba(236,72,153,0.02) 70%);border-bottom:1px solid rgba(236,72,153,0.12);display:flex;align-items:center;gap:9px">' +
        '<div style="width:4px;height:18px;background:linear-gradient(180deg,' + accent + ',' + accent + '55);border-radius:4px;flex-shrink:0"></div>' +
        '<span style="font-size:11px;font-weight:800;letter-spacing:0.7px;text-transform:uppercase;color:rgba(26,8,16,0.9)">' + esc(title) + '</span>' +
      '</div>' +
      '<div style="padding:14px 16px">' + inner + '</div>' +
    '</div>';
  }

  function li(text, color) {
    return '<li style="display:flex;align-items:flex-start;gap:9px;font-size:13px;color:rgba(26,8,16,0.85);line-height:1.6;padding:3px 0">' +
      '<div style="flex-shrink:0;margin-top:5px;width:6px;height:6px;border-radius:50%;background:' + color + ';box-shadow:0 0 6px ' + color + '80"></div>' +
      '<span>' + esc(text) + '</span>' +
    '</li>';
  }

  function liAction(text) {
    return '<li style="display:flex;align-items:flex-start;gap:10px;font-size:13px;color:rgba(26,8,16,0.85);line-height:1.6;padding:4px 0">' +
      '<div style="flex-shrink:0;margin-top:4px;width:18px;height:18px;border-radius:6px;background:rgba(16,185,129,0.18);border:1px solid rgba(16,185,129,0.35);display:flex;align-items:center;justify-content:center">' +
        '<svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5 9-9" stroke="#10b981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '</div>' +
      '<span>' + esc(text) + '</span>' +
    '</li>';
  }

  function badge(text, color) {
    // rgba() colors already have full opacity spec — can't append hex alpha codes to them
    if (/^rgba?\(/.test(color)) {
      return '<span style="font-size:11.5px;font-weight:700;padding:4px 11px;border-radius:100px;background:' + color + ';border:1px solid rgba(236,72,153,0.3);color:rgba(26,8,16,0.65);letter-spacing:0.1px">' + esc(text) + '</span>';
    }
    const isWhite = color.includes('255,255,255');
    return '<span style="font-size:11.5px;font-weight:700;padding:4px 11px;border-radius:100px;background:' + color + '22;border:1px solid ' + color + '45;color:' + (isWhite ? 'rgba(26,8,16,0.75)' : color) + ';letter-spacing:0.1px">' + esc(text) + '</span>';
  }

  function infoRow(label, value) {
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-top:1px solid rgba(236,72,153,0.07)"><span style="font-size:11.5px;color:rgba(26,8,16,0.4)">' + esc(label) + '</span><span style="font-size:12px;font-weight:600;color:rgba(26,8,16,0.8)">' + esc(value) + '</span></div>';
  }

  function flashcardsHTML(cards, accent) {
    return '<div style="display:flex;flex-direction:column;gap:7px">' + (cards||[]).map(c => '<div style="border:1px solid rgba(236,72,153,0.14);border-radius:10px;overflow:hidden"><div style="padding:7px 11px;background:' + accent + '12;border-bottom:1px solid rgba(236,72,153,0.08);font-size:11.5px;font-weight:600;color:' + accent + '">' + esc(c.q) + '</div><div style="padding:7px 11px;font-size:12px;color:rgba(26,8,16,0.65);line-height:1.5">' + esc(c.a) + '</div></div>').join('') + '</div>';
  }

  // ── Bottom bar ────────────────────────────────────────────────────────────

  function buildBottomBarHTML(accent) {
    const b = 'display:inline-flex;align-items:center;gap:5px;padding:7px 13px;border-radius:9px;font-size:11.5px;font-weight:600;cursor:pointer;border:1px solid;transition:opacity 0.15s';
    return '<button id="__dai-copy" style="' + b + ';background:' + accent + '18;border-color:' + accent + '44;color:' + accent + '"><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="1.8"/></svg>Copy</button>' +
      '<button id="__dai-rescan" style="' + b + ';background:rgba(236,72,153,0.07);border-color:rgba(236,72,153,0.18);color:rgba(26,8,16,0.6)"><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>Scan again</button>' +
      '<div style="flex:1"></div>' +
      '<button id="__dai-close2" style="' + b + ';background:rgba(236,72,153,0.06);border-color:rgba(236,72,153,0.18);color:rgba(26,8,16,0.4)">Close</button>';
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
      const lines = [];
      if (result.title)        lines.push('Title: ' + result.title);
      if (result.contentLabel) lines.push('Type: ' + result.contentLabel);
      if (result.quickOverview) lines.push('\nOverview:\n' + result.quickOverview);
      // article_url
      const ad = result.articleData;
      if (ad) {
        if (ad.mainIdea)  lines.push('\nMain Idea:\n' + ad.mainIdea);
        if (ad.importantHighlights && ad.importantHighlights.length) lines.push('\nHighlights:\n' + ad.importantHighlights.map(x=>'• '+x).join('\n'));
        if (ad.finalSummary) lines.push('\nSummary:\n' + ad.finalSummary);
      }
      // problem solver
      const pr = result.problem;
      if (pr) {
        if (pr.understanding) lines.push('\nUnderstanding:\n' + pr.understanding);
        if (pr.solution && pr.solution.length) lines.push('\nSteps:\n' + pr.solution.map((s,i)=>(i+1)+'. '+s.title+': '+s.explanation).join('\n'));
        if (pr.finalAnswer) lines.push('\nAnswer: ' + pr.finalAnswer);
      }
      // youtube
      const yt = result.youtube;
      if (yt) {
        if (yt.introduction) lines.push('\nIntro:\n' + yt.introduction);
        if (yt.importantPoints && yt.importantPoints.length) lines.push('\nKey Points:\n' + yt.importantPoints.map(x=>'• '+x).join('\n'));
        if (yt.conclusion) lines.push('\nConclusion:\n' + yt.conclusion);
      }
      // startup_roadmap / study_roadmap
      const rm = result.roadmap || result.studyPlan;
      if (rm) {
        const goal = rm.startupGoal || rm.goal;
        if (goal) lines.push('\nGoal:\n' + goal);
        if (rm.nextAction) lines.push('\nNext Action: ' + rm.nextAction);
      }
      // research_paper
      const rs = result.research;
      if (rs) {
        if (rs.abstract) lines.push('\nAbstract:\n' + rs.abstract);
        if (rs.keyFindings && rs.keyFindings.length) lines.push('\nKey Findings:\n' + rs.keyFindings.map(x=>'• '+x).join('\n'));
        if (rs.conclusions) lines.push('\nConclusions:\n' + rs.conclusions);
      }
      // general fallback
      const gn = result.general;
      if (gn) {
        if (gn.executiveSummary) lines.push('\nSummary:\n' + gn.executiveSummary);
        if (gn.keyInsights && gn.keyInsights.length) lines.push('\nInsights:\n' + gn.keyInsights.map(x=>'• '+x).join('\n'));
      }
      return lines.filter(Boolean).join('\n');
    }
    const p = result.product || {}, v = result.verdict || {}, r = result.reviews || {}, pi = result.priceIntel || {};
    return ['DecisionAI Truth Layer', p.name ? 'Product: '+p.name : '', 'Truth Score: '+result.truthScore+'/100 ('+(result.scoreLabel||')'), v.label ? 'Verdict: '+v.label : '', v.reasoning ? '\n'+v.reasoning : '', (r.pros&&r.pros.length) ? '\nPros:\n'+r.pros.map(x=>'• '+x).join('\n') : '', (r.cons&&r.cons.length) ? '\nCons:\n'+r.cons.map(x=>'• '+x).join('\n') : '', pi.currentPrice ? '\nPrice: '+pi.currentPrice+' · '+(pi.dealRating||'') : ''].filter(Boolean).join('\n');
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PROFILE EXTRACTION — EXTRACT_PROFILE & PARSE_RESUME_TEXT
  // ══════════════════════════════════════════════════════════════════════════

  const PROFILE_SCHEMA =
    '{"name":"Full name","email":"email@example.com","phone":"+1 555-0100","location":"City, Country",' +
    '"linkedin":"https://linkedin.com/in/...","github":"username","website":"https://...",' +
    '"summary":"2-3 sentence professional bio",' +
    '"skills":{"tech":"JavaScript, Python, React (comma-separated)","tools":"Git, Docker, AWS","langs":"English, Spanish","soft":"Leadership, Communication"},' +
    '"education":[{"inst":"University Name","degree":"B.Sc","field":"Computer Science","years":"2018-2022","gpa":"3.8"}],' +
    '"experience":[{"company":"Company Name","role":"Job Title","period":"Jan 2021 – Jun 2023","bullets":"Achievement 1\nAchievement 2"}],' +
    '"projects":[{"name":"Project Name","desc":"What it does","tech":"React, Node.js","url":"https://..."}],' +
    '"certifications":[{"name":"AWS Solutions Architect","issuer":"Amazon","date":"Mar 2024"}],' +
    '"prefs":{"role":"Target Role","industry":"Fintech","workType":"Remote"}}';

  async function extractProfileWithGroq(text, context) {
    const data = await groqCall([
      { role: 'system', content: 'You are a professional resume parser. Extract structured profile data from the provided text. Return ONLY valid JSON — no markdown, no extra text. If a field is not found, use an empty string or empty array. Be thorough and accurate.' },
      { role: 'user', content:
        context + '\n\n---\n' + text.slice(0, 18000) + '\n---\n\n' +
        'Extract all available profile information and return exactly this JSON structure:\n' + PROFILE_SCHEMA
      }
    ], 'llama-3.3-70b-versatile');
    return data;
  }

  async function handleExtractProfile(message, sendResponse) {
    try {
      const isLinkedIn = message.isLinkedIn || window.location.href.includes('linkedin.com/in/');

      let pageText;
      if (isLinkedIn) {
        // For LinkedIn, grab structured sections directly from the DOM
        const sections = [];
        const name = document.querySelector('h1')?.innerText?.trim();
        if (name) sections.push('Name: ' + name);

        const headline = document.querySelector('.text-body-medium')?.innerText?.trim()
          || document.querySelector('[data-generated-suggestion-target]')?.innerText?.trim();
        if (headline) sections.push('Headline: ' + headline);

        const location = document.querySelector('.text-body-small.inline.t-black--light')?.innerText?.trim();
        if (location) sections.push('Location: ' + location);

        // Grab all section text
        document.querySelectorAll('section').forEach(s => {
          const heading = s.querySelector('h2,h3')?.innerText?.trim();
          const content = s.innerText?.trim();
          if (content && content.length > 20) {
            sections.push((heading ? '[' + heading + ']\n' : '') + content.slice(0, 2000));
          }
        });
        pageText = sections.join('\n\n');
      } else {
        // Generic page — get readable text
        const body = document.body.cloneNode(true);
        ['script','style','nav','header','footer','aside'].forEach(tag => {
          body.querySelectorAll(tag).forEach(el => el.remove());
        });
        pageText = body.innerText.replace(/\s+/g, ' ').trim().slice(0, 18000);
      }

      if (!pageText || pageText.length < 50) {
        sendResponse({ profile: null, error: 'Not enough content found on this page.' });
        return;
      }

      const context = isLinkedIn
        ? 'This is a LinkedIn profile page. Extract all resume/profile information.'
        : 'This page may contain resume or professional profile information. Extract what is available.';

      const extracted = await extractProfileWithGroq(pageText, context);
      sendResponse({ profile: extracted });
    } catch (err) {
      sendResponse({ profile: null, error: err.message });
    }
  }

  async function handleParseResumeText(message, sendResponse) {
    try {
      const text = message.text || '';
      if (!text || text.length < 30) {
        sendResponse({ profile: null, error: 'Resume text too short.' });
        return;
      }
      const extracted = await extractProfileWithGroq(text, 'This is resume text pasted by the user. Extract all resume fields accurately.');
      sendResponse({ profile: extracted });
    } catch (err) {
      sendResponse({ profile: null, error: err.message });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FORM AUTOFILL
  // ══════════════════════════════════════════════════════════════════════════

  async function handleAutofillForm(sendResponse) {
    const profile = await new Promise(r => chrome.storage.local.get('userProfile', d => r(d.userProfile || null)));
    if (!profile || (!profile.name && !profile.email)) {
      showAutofillToast(0, [], 'Set up your profile first in the DecisionAI extension.');
      sendResponse({ success: false, error: 'NO_PROFILE' });
      return;
    }

    // ── Field matching rules ────────────────────────────────────────────────
    const RULES = [
      { keys: ['firstname','first_name','fname','givenname','given_name'], value: p => (p.name || '').split(' ')[0] },
      { keys: ['lastname','last_name','lname','surname','familyname','family_name'], value: p => (p.name || '').split(' ').slice(1).join(' ') },
      { keys: ['fullname','full_name','name','yourname','applicantname','candidatename','contactname'], value: p => p.name },
      { keys: ['email','emailaddress','email_address','mail','emailid'], value: p => p.email },
      { keys: ['phone','telephone','tel','mobile','cell','phonenumber','phone_number','contactnumber','mobilenumber'], value: p => p.phone },
      { keys: ['location','city','address','region','country','hometown','currentlocation','currentcity'], value: p => p.location },
      { keys: ['linkedin','linkedinurl','linkedinprofile','linkedinlink'], value: p => p.linkedin },
      { keys: ['github','githuburl','githubprofile','githubusername','githublink'], value: p => {
        if (!p.github) return '';
        const uname = p.github.replace(/^@/, '').replace(/.*github\.com\//, '').replace(/\/$/, '');
        return uname.startsWith('http') ? p.github : 'https://github.com/' + uname;
      }},
      { keys: ['website','portfolio','portfoliourl','personalsite','personalwebsite','portfoliolink','personalurl'], value: p => p.website },
      { keys: ['summary','bio','about','objective','coverletter','motivation','aboutyourself','professionalsummary','personalstatement','aboutme'], value: p => p.summary },
      { keys: ['skills','technicalskills','techskills','technologies','competencies','expertise','techstack'], value: p => [p.skills?.tech, p.skills?.tools, p.skills?.langs].filter(Boolean).join(', ') },
      { keys: ['role','position','jobtitle','desiredrole','targetrole','applyingfor','preferredrole','desiredposition'], value: p => p.prefs?.role },
      { keys: ['salary','expectedsalary','desiredsalary','compensation','ctc','expectedctc','salaryexpectation'], value: p => p.prefs?.salary },
      { keys: ['availability','startdate','available','noticeperiod','joining','availablefrom'], value: p => p.prefs?.availability },
      { keys: ['industry','sector','domain','targetindustry'], value: p => p.prefs?.industry },
      { keys: ['worktype','workmode','remote','workstyle','joiningtype','employment'], value: p => p.prefs?.workType },
    ];

    function normalize(s) {
      return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    function getMatchedValue(el) {
      const identifiers = [
        el.name, el.id, el.placeholder,
        el.getAttribute('aria-label'),
        el.getAttribute('data-name'),
        el.getAttribute('data-field'),
        el.getAttribute('autocomplete'),
        el.title,
      ];
      // Associated <label> text
      if (el.id) {
        const lbl = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
        if (lbl) identifiers.push(lbl.textContent);
      }
      const closestLbl = el.closest('label');
      if (closestLbl) identifiers.push(closestLbl.textContent);
      const parentLbl = el.parentElement?.querySelector('label');
      if (parentLbl) identifiers.push(parentLbl.textContent);

      const normed = identifiers.map(normalize).filter(Boolean);

      for (const rule of RULES) {
        for (const key of rule.keys) {
          if (normed.some(n => n.includes(key) || key.includes(n.slice(0, 6)))) {
            const val = rule.value(profile);
            if (val && String(val).trim()) return String(val).trim();
          }
        }
      }
      return null;
    }

    function fillField(el, value) {
      try {
        if (el.tagName === 'SELECT') {
          const norm = normalize(value);
          for (const opt of el.options) {
            if (normalize(opt.value) === norm || normalize(opt.text) === norm ||
                normalize(opt.text).includes(norm) || norm.includes(normalize(opt.text))) {
              el.value = opt.value;
              el.dispatchEvent(new Event('change', { bubbles: true }));
              return true;
            }
          }
          return false;
        }

        // Use native setter to bypass React/Vue/Angular controlled-input guard
        const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (nativeSetter) {
          nativeSetter.call(el, value);
        } else {
          el.value = value;
        }
        ['input', 'change', 'keyup'].forEach(evt =>
          el.dispatchEvent(new Event(evt, { bubbles: true }))
        );
        el.dispatchEvent(new InputEvent('input', { bubbles: true, data: value }));
        return true;
      } catch (_) { return false; }
    }

    const SKIP_TYPES = new Set(['hidden','submit','button','reset','file','checkbox','radio','image']);
    const fields = Array.from(document.querySelectorAll('input, textarea, select'));
    let filled = 0, skipped = 0;
    const filledLabels = [];

    for (const el of fields) {
      if (el.disabled || el.readOnly) { skipped++; continue; }
      if (el.type && SKIP_TYPES.has(el.type.toLowerCase())) continue;
      if (!el.offsetParent && el.style.display === 'none') { skipped++; continue; }
      if (el.value && el.value.trim().length > 0) { skipped++; continue; }

      const value = getMatchedValue(el);
      if (value && fillField(el, value)) {
        filled++;
        const lbl = el.placeholder || el.name || el.id || 'field';
        filledLabels.push(lbl.replace(/_/g, ' '));
      }
    }

    showAutofillToast(filled, filledLabels, null);
    sendResponse({ success: true, filled, skipped });
  }

  function showAutofillToast(filled, labels, customMsg) {
    const existing = document.getElementById('__dai-autofill-toast');
    if (existing) existing.remove();

    const ok = filled > 0;
    const toast = document.createElement('div');
    toast.id = '__dai-autofill-toast';
    sp(toast, {
      position: 'fixed', bottom: '24px', right: '24px',
      'z-index': '2147483647',
      background: '#ffffff',
      border: '1px solid ' + (ok ? 'rgba(16,185,129,0.35)' : 'rgba(245,158,11,0.35)'),
      'border-radius': '16px',
      padding: '16px 18px',
      'min-width': '280px', 'max-width': '380px',
      'box-shadow': '0 8px 32px rgba(236,72,153,0.1),0 2px 8px rgba(0,0,0,0.05),0 0 0 1px ' + (ok ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.06)'),
      animation: '__dai-slidein 0.35s cubic-bezier(0.16,1,0.3,1) both',
      'font-family': '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    });

    const iconColor = ok ? '#10b981' : '#f59e0b';
    const iconBg    = ok ? 'rgba(16,185,129,0.18)' : 'rgba(245,158,11,0.15)';
    const iconSvg   = ok
      ? '<svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#10b981" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      : '<svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M12 8v4M12 16h.01" stroke="#f59e0b" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="12" r="10" stroke="#f59e0b" stroke-width="1.6"/></svg>';
    const title = ok ? 'Auto-filled ' + filled + ' field' + (filled > 1 ? 's' : '') : 'No fields filled';
    const desc  = customMsg || (ok
      ? labels.slice(0, 4).join(', ') + (labels.length > 4 ? ' +' + (labels.length - 4) + ' more' : '')
      : 'No empty matching fields found on this page.');

    toast.innerHTML =
      '<div style="display:flex;align-items:flex-start;gap:12px">' +
        '<div style="width:34px;height:34px;border-radius:50%;background:' + iconBg + ';border:1px solid ' + iconColor + '44;display:flex;align-items:center;justify-content:center;flex-shrink:0">' + iconSvg + '</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:13.5px;font-weight:700;color:#1a0810;margin-bottom:4px">' + title + '</div>' +
          '<div style="font-size:12px;color:rgba(26,8,16,0.55);line-height:1.5;word-break:break-word">' + esc(desc) + '</div>' +
        '</div>' +
        '<button onclick="this.parentElement.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:rgba(26,8,16,0.35);flex-shrink:0;padding:2px;line-height:1">✕</button>' +
      '</div>';

    document.documentElement.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        toast.style.opacity = '0'; toast.style.transform = 'translateX(20px)';
        setTimeout(() => toast.remove(), 500);
      }
    }, 6000);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TEXT SELECTION TOOLBAR — Translate & Explain
  // ══════════════════════════════════════════════════════════════════════════

  const TRANSLATE_LANGS = [
    { code:'es', label:'Spanish',    native:'Español',    flag:'🇪🇸' },
    { code:'hi', label:'Hindi',      native:'हिंदी',      flag:'🇮🇳' },
    { code:'pt', label:'Portuguese', native:'Português',  flag:'🇧🇷' },
    { code:'ur', label:'Urdu',       native:'اردو',       flag:'🇵🇰' },
    { code:'fr', label:'French',     native:'Français',   flag:'🇫🇷' },
    { code:'de', label:'German',     native:'Deutsch',    flag:'🇩🇪' },
    { code:'ar', label:'Arabic',     native:'العربية',    flag:'🇸🇦' },
    { code:'zh', label:'Chinese',    native:'中文',        flag:'🇨🇳' },
    { code:'ja', label:'Japanese',   native:'日本語',      flag:'🇯🇵' },
    { code:'ko', label:'Korean',     native:'한국어',      flag:'🇰🇷' },
    { code:'ru', label:'Russian',    native:'Русский',    flag:'🇷🇺' },
    { code:'tr', label:'Turkish',    native:'Türkçe',     flag:'🇹🇷' },
    { code:'it', label:'Italian',    native:'Italiano',   flag:'🇮🇹' },
    { code:'id', label:'Indonesian', native:'Bahasa',     flag:'🇮🇩' },
  ];

  let __selToolbar = null, __selPicker = null;

  function removeSelectionUI() {
    if (__selToolbar) { __selToolbar.remove(); __selToolbar = null; }
    if (__selPicker)  { __selPicker.remove();  __selPicker  = null; }
  }

  document.addEventListener('mouseup', (e) => {
    setTimeout(() => {
      if (e.target.closest('#__dai-sel-toolbar') || e.target.closest('#__dai-sel-picker')) return;
      const sel  = window.getSelection();
      const text = sel?.toString().trim();
      if (!text || text.length < 5 || text.length > 8000) { removeSelectionUI(); return; }
      if (e.target.closest('#__dai-overlay-root') || e.target.closest('#__dai-autofill-toast')) return;

      removeSelectionUI();
      const range = sel.getRangeAt(0);
      const rect  = range.getBoundingClientRect();
      const midX  = rect.left + rect.width / 2;
      const aboveY = rect.top - 46;
      const useBelow = aboveY < 8;
      const posX = Math.max(8, Math.min(window.innerWidth - 230, midX - 90));
      const posY = useBelow ? rect.bottom + 8 : aboveY;

      __selToolbar = document.createElement('div');
      __selToolbar.id = '__dai-sel-toolbar';
      sp(__selToolbar, {
        position:'fixed', left:posX+'px', top:posY+'px',
        'z-index':'2147483646',
        background:'#ffffff',
        border:'1px solid rgba(236,72,153,0.25)',
        'border-radius':'12px',
        'box-shadow':'0 4px 20px rgba(236,72,153,0.12),0 1px 4px rgba(0,0,0,0.05)',
        display:'flex', 'align-items':'center', gap:'3px', padding:'5px',
        animation:'__dai-fadein 0.15s ease both',
        'font-family':'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
        'user-select':'none', '-webkit-user-select':'none',
      });

      const mkBtn = (svgColor, icon, label, bg, onClick) => {
        const b = document.createElement('button');
        b.style.cssText = 'display:flex;align-items:center;gap:6px;padding:6px 11px;border-radius:8px;border:none;cursor:pointer;font-size:12px;font-weight:700;background:' + bg + ';transition:filter 0.12s;outline:none';
        b.innerHTML = icon + '<span style="color:' + svgColor + '">' + label + '</span>';
        b.addEventListener('mouseenter', () => b.style.filter = 'brightness(1.3)');
        b.addEventListener('mouseleave', () => b.style.filter = 'brightness(1)');
        b.addEventListener('click', (ev) => { ev.stopPropagation(); onClick(); });
        return b;
      };

      const transIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 5h8M7 3v2M10 5a11 11 0 01-2.5 6.5M6 11a8.5 8.5 0 005 2" stroke="#06b6d4" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><rect x="12" y="10" width="11" height="11" rx="2" stroke="#06b6d4" stroke-width="1.5"/><path d="M15 18l2-4 2 4M15.8 17h2.4" stroke="#06b6d4" stroke-width="1.5" stroke-linecap="round"/></svg>';
      const explainIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#a855f7" stroke-width="1.5"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" stroke="#a855f7" stroke-width="1.7" stroke-linecap="round"/></svg>';

      const transBtn = mkBtn('#06b6d4', transIcon, 'Translate', 'rgba(6,182,212,0.13)', () => showLangPicker(text));
      const explBtn  = mkBtn('#a855f7', explainIcon, 'Explain', 'rgba(168,85,247,0.11)', () => {
        removeSelectionUI();
        handleExplainText(text);
      });

      const divider = document.createElement('div');
      divider.style.cssText = 'width:1px;height:20px;background:rgba(236,72,153,0.2);margin:0 1px';

      __selToolbar.append(transBtn, divider, explBtn);
      document.documentElement.appendChild(__selToolbar);
    }, 10);
  }, true);

  document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('#__dai-sel-toolbar') && !e.target.closest('#__dai-sel-picker')) {
      removeSelectionUI();
    }
    if (!e.target.closest('#__dai-inline-trans')) {
      removeInlineTrans();
    }
  }, true);

  function showLangPicker(text) {
    if (__selPicker) { __selPicker.remove(); __selPicker = null; }
    if (!__selToolbar) return;
    const ar = __selToolbar.getBoundingClientRect();

    __selPicker = document.createElement('div');
    __selPicker.id = '__dai-sel-picker';
    sp(__selPicker, {
      position:'fixed',
      left: Math.max(8, Math.min(window.innerWidth - 298, ar.left)) + 'px',
      top: (ar.bottom + 6) + 'px',
      'z-index':'2147483647',
      background:'#ffffff',
      border:'1px solid rgba(236,72,153,0.2)',
      'border-radius':'16px',
      'box-shadow':'0 8px 32px rgba(236,72,153,0.12),0 2px 8px rgba(0,0,0,0.05)',
      width:'290px',
      padding:'10px',
      animation:'__dai-fadein 0.15s ease both',
      'font-family':'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    });

    const hdr = document.createElement('div');
    hdr.style.cssText = 'font-size:10px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;color:rgba(26,8,16,0.45);padding:2px 6px 9px;border-bottom:1px solid rgba(236,72,153,0.15);margin-bottom:8px';
    hdr.textContent = 'Select target language';

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:5px';

    TRANSLATE_LANGS.forEach(lang => {
      const btn = document.createElement('button');
      btn.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:9px;border:1px solid rgba(236,72,153,0.15);background:rgba(236,72,153,0.04);cursor:pointer;text-align:left;transition:all 0.12s;outline:none';
      btn.innerHTML =
        '<span style="font-size:18px;line-height:1">' + lang.flag + '</span>' +
        '<div><div style="font-size:12px;font-weight:700;color:rgba(26,8,16,0.88)">' + lang.label + '</div>' +
        '<div style="font-size:10px;color:rgba(26,8,16,0.38)">' + lang.native + '</div></div>';
      btn.addEventListener('mouseenter', () => { btn.style.background = 'rgba(6,182,212,0.12)'; btn.style.borderColor = 'rgba(6,182,212,0.35)'; });
      btn.addEventListener('mouseleave', () => { btn.style.background = 'rgba(236,72,153,0.04)'; btn.style.borderColor = 'rgba(236,72,153,0.15)'; });
      btn.addEventListener('click', () => { removeSelectionUI(); handleTranslateText(text, lang); });
      grid.appendChild(btn);
    });

    __selPicker.append(hdr, grid);
    document.documentElement.appendChild(__selPicker);
  }

  // ── Inline Translation Popup ─────────────────────────────────────────────

  let __inlineTransEl    = null;   // the floating popup element
  let __inlineReplacedSpan = null; // <span> we inserted into the page (if any)

  function removeInlineTrans() {
    if (__inlineTransEl) { __inlineTransEl.remove(); __inlineTransEl = null; }
  }

  function positionInlineTrans(popup, rect) {
    const W = 400, MARGIN = 12;
    let left = rect.left + rect.width / 2 - W / 2;
    left = Math.max(MARGIN, Math.min(window.innerWidth - W - MARGIN, left));
    const spaceBelow = window.innerHeight - rect.bottom;
    const useBelow   = spaceBelow >= 200 || rect.top < 200;
    sp(popup, {
      position:'fixed', left:left+'px', width:W+'px',
      top:    useBelow ? (rect.bottom + 10)+'px' : 'auto',
      bottom: useBelow ? 'auto' : (window.innerHeight - rect.top + 10)+'px',
      'z-index':'2147483647',
      background:'#ffffff',
      border:'1px solid rgba(6,182,212,0.18)',
      'border-radius':'18px',
      'box-shadow':'0 24px 64px rgba(0,0,0,0.14),0 4px 16px rgba(6,182,212,0.12),0 0 0 1px rgba(6,182,212,0.08)',
      'font-family':'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      overflow:'hidden',
      'max-height':'80vh',
      'overflow-y':'auto',
      animation:'__dai-popin 0.22s cubic-bezier(0.16,1,0.3,1) both',
    });
  }

  function inlineTransAccentBar() {
    return '<div style="height:3px;background:linear-gradient(90deg,#06b6d4,#a855f7,#ec4899,#06b6d4);background-size:200% 100%;animation:__dai-shimmer 3s linear infinite"></div>';
  }

  function inlineTransHeader(flag, label, detectedLang) {
    return '<div style="padding:14px 16px 12px;background:linear-gradient(160deg,#ffffff 60%,#fff5fb 100%);border-bottom:1px solid rgba(236,72,153,0.15);display:flex;align-items:center;justify-content:space-between">' +
      '<div style="display:flex;align-items:center;gap:11px">' +
        '<div style="position:relative;width:40px;height:40px;flex-shrink:0">' +
          '<div style="position:absolute;inset:0;border-radius:12px;background:linear-gradient(135deg,rgba(6,182,212,0.3),rgba(168,85,247,0.2));border:1px solid rgba(6,182,212,0.4)"></div>' +
          '<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:20px">' + flag + '</span>' +
        '</div>' +
        '<div>' +
          '<div style="font-size:14px;font-weight:800;color:#1a0810;letter-spacing:-0.3px">' + esc(label) + ' Translation</div>' +
          (detectedLang ? '<div style="font-size:10.5px;color:rgba(6,182,212,0.7);margin-top:2px;display:flex;align-items:center;gap:4px"><span style="width:4px;height:4px;border-radius:50%;background:#06b6d4;flex-shrink:0"></span>from ' + esc(detectedLang) + '</div>' : '') +
        '</div>' +
      '</div>' +
      '<button id="__dai-trans-close" style="width:28px;height:28px;border-radius:9px;border:1px solid rgba(236,72,153,0.2);background:rgba(236,72,153,0.06);cursor:pointer;display:flex;align-items:center;justify-content:center;color:rgba(26,8,16,0.45);flex-shrink:0;transition:all 0.15s">' +
        '<svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/></svg>' +
      '</button>' +
    '</div>';
  }

  function buildTransLoadingHTML(lang) {
    return inlineTransAccentBar() +
    '<div style="padding:20px 18px;display:flex;align-items:center;gap:15px">' +
      '<div style="position:relative;width:48px;height:48px;flex-shrink:0">' +
        '<div style="position:absolute;inset:0;border-radius:50%;background:linear-gradient(135deg,rgba(6,182,212,0.12),rgba(168,85,247,0.06));border:1.5px solid rgba(6,182,212,0.2)"></div>' +
        '<svg style="animation:__dai-spin 1.1s linear infinite;position:absolute;inset:0" width="48" height="48" viewBox="0 0 48 48" fill="none">' +
          '<circle cx="24" cy="24" r="20" stroke="rgba(6,182,212,0.12)" stroke-width="2.5"/>' +
          '<circle cx="24" cy="24" r="20" stroke="url(#tg)" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="32 94"/>' +
          '<defs><linearGradient id="tg" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#06b6d4"/><stop offset="100%" stop-color="#a855f7"/></linearGradient></defs>' +
        '</svg>' +
        '<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:18px">' + lang.flag + '</span>' +
      '</div>' +
      '<div style="flex:1">' +
        '<div style="font-size:14px;font-weight:700;color:#1a0810;letter-spacing:-0.2px">Translating to ' + esc(lang.label) + '…</div>' +
        '<div style="font-size:11.5px;color:#94a3b8;margin-top:5px;display:flex;align-items:center;gap:6px">' +
          '<span style="width:5px;height:5px;border-radius:50%;background:#06b6d4;display:inline-block;animation:__dai-pulse-dot 1.4s ease-in-out infinite"></span>' +
          'Powered by Groq AI · llama-3.3-70b' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function buildTransResultHTML(lang, originalText, translation, detectedLang, notes) {
    const orig = esc(originalText.slice(0, 240) + (originalText.length > 240 ? '…' : ''));
    const copyIcon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="1.8"/></svg>';
    const swapIcon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    return inlineTransAccentBar() +
      inlineTransHeader(lang.flag, lang.label, detectedLang) +
      // Original text card
      '<div style="margin:12px 14px 0;padding:11px 13px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:11px">' +
        '<div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;margin-bottom:6px">Original</div>' +
        '<div style="font-size:12.5px;color:#64748b;line-height:1.65;font-style:italic">' + orig + '</div>' +
      '</div>' +
      // Translation card — featured
      '<div style="margin:10px 14px;padding:14px 15px;background:linear-gradient(135deg,rgba(6,182,212,0.05) 0%,rgba(168,85,247,0.03) 100%);border:1.5px solid rgba(6,182,212,0.18);border-radius:13px;position:relative;overflow:hidden">' +
        '<div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,#06b6d4,#a855f7,transparent)"></div>' +
        '<div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#06b6d4;margin-bottom:9px">Translation</div>' +
        '<div style="font-size:15px;color:#1a0810;line-height:1.8;font-weight:400;user-select:text;-webkit-user-select:text">' + esc(translation) + '</div>' +
      '</div>' +
      // Translator note
      (notes ?
        '<div style="margin:0 14px 10px;padding:9px 12px;background:linear-gradient(135deg,rgba(245,158,11,0.06),rgba(251,191,36,0.04));border:1px solid rgba(245,158,11,0.2);border-radius:10px;display:flex;gap:8px;align-items:flex-start">' +
          '<span style="font-size:15px;line-height:1;flex-shrink:0;margin-top:1px">💡</span>' +
          '<div style="font-size:11.5px;color:#92400e;line-height:1.55">' + esc(notes) + '</div>' +
        '</div>'
      : '') +
      // Footer buttons
      '<div style="margin:0 14px 13px;display:flex;gap:8px">' +
        '<button id="__dai-trans-copy" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:9px 12px;background:linear-gradient(135deg,rgba(6,182,212,0.1),rgba(6,182,212,0.06));border:1px solid rgba(6,182,212,0.28);border-radius:10px;font-size:12px;font-weight:700;color:#0891b2;cursor:pointer;letter-spacing:0.1px">' +
          copyIcon + 'Copy' +
        '</button>' +
        '<button id="__dai-trans-replace" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:9px 12px;background:linear-gradient(135deg,rgba(168,85,247,0.1),rgba(236,72,153,0.06));border:1px solid rgba(168,85,247,0.28);border-radius:10px;font-size:12px;font-weight:700;color:#7c3aed;cursor:pointer;letter-spacing:0.1px">' +
          swapIcon + 'Replace on page' +
        '</button>' +
      '</div>';
  }

  function buildTransErrorHTML(msg) {
    const isNoKey = msg === 'NO_API_KEY';
    return inlineTransAccentBar() +
    '<div style="padding:22px 18px;display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center">' +
      '<div style="width:46px;height:46px;border-radius:50%;background:radial-gradient(circle,rgba(239,68,68,0.15),rgba(239,68,68,0.05));border:1.5px solid rgba(239,68,68,0.3);display:flex;align-items:center;justify-content:center">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 8v4M12 16h.01" stroke="#ef4444" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="12" r="10" stroke="#ef4444" stroke-width="1.5"/></svg>' +
      '</div>' +
      '<div>' +
        '<div style="font-size:14px;font-weight:800;color:#1a0810;margin-bottom:5px">Translation failed</div>' +
        '<div style="font-size:12px;color:#64748b;line-height:1.55;max-width:280px">' + (isNoKey ? 'Add a Groq API key in extension Settings (⚙) to start translating.' : esc(msg || 'Something went wrong. Please try again.')) + '</div>' +
      '</div>' +
      '<button id="__dai-trans-close-err" style="padding:8px 20px;background:rgba(239,68,68,0.08);border:1.5px solid rgba(239,68,68,0.22);border-radius:10px;font-size:12.5px;font-weight:700;color:#dc2626;cursor:pointer;letter-spacing:0.1px">Dismiss</button>' +
    '</div>';
  }

  function wireInlineTransButtons(savedRange, originalText, translation) {
    const popup = __inlineTransEl;
    if (!popup) return;

    const copyBtn    = popup.querySelector('#__dai-trans-copy');
    const replaceBtn = popup.querySelector('#__dai-trans-replace');
    const closeBtn   = popup.querySelector('#__dai-trans-close');

    if (closeBtn) closeBtn.addEventListener('click', removeInlineTrans);

    if (copyBtn) copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(translation).catch(() => {});
      copyBtn.textContent = '✓ Copied!';
      setTimeout(() => { if (copyBtn.isConnected) copyBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="1.8"/></svg>Copy'; }, 1800);
    });

    if (replaceBtn) replaceBtn.addEventListener('click', () => {
      if (__inlineReplacedSpan) {
        // Undo: restore original text
        if (__inlineReplacedSpan.parentNode) {
          const orig = __inlineReplacedSpan.getAttribute('data-dai-original') || '';
          __inlineReplacedSpan.parentNode.replaceChild(document.createTextNode(orig), __inlineReplacedSpan);
        }
        __inlineReplacedSpan = null;
        replaceBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>Replace on page';
        replaceBtn.style.cssText = 'flex:1;display:flex;align-items:center;justify-content:center;gap:5px;padding:7px 10px;background:rgba(236,72,153,0.07);border:1px solid rgba(236,72,153,0.22);border-radius:8px;font-size:11.5px;font-weight:600;color:#be185d;cursor:pointer;transition:all 0.12s';
      } else if (savedRange) {
        // Replace selected text with translation
        try {
          __inlineReplacedSpan = document.createElement('span');
          __inlineReplacedSpan.setAttribute('data-dai-original', originalText);
          __inlineReplacedSpan.setAttribute('data-dai-trans', 'true');
          __inlineReplacedSpan.style.cssText = 'border-bottom:2px solid rgba(6,182,212,0.5);background:rgba(6,182,212,0.07);border-radius:2px;padding:0 1px';
          __inlineReplacedSpan.textContent = translation;
          savedRange.deleteContents();
          savedRange.insertNode(__inlineReplacedSpan);
          window.getSelection()?.removeAllRanges();
          replaceBtn.innerHTML = '↩ Restore original';
          replaceBtn.style.cssText = 'flex:1;display:flex;align-items:center;justify-content:center;gap:5px;padding:7px 10px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.3);border-radius:8px;font-size:11.5px;font-weight:600;color:#b45309;cursor:pointer;transition:all 0.12s';
        } catch (e) { /* read-only page node */ }
      }
    });
  }

  async function handleTranslateText(text, lang) {
    // Capture selection position BEFORE async (user may scroll / deselect)
    const sel = window.getSelection();
    let savedRange  = null;
    let anchorRect  = { top:100, bottom:140, left:window.innerWidth/2-195, width:390 };
    if (sel && sel.rangeCount > 0) {
      savedRange = sel.getRangeAt(0).cloneRange();
      const r = savedRange.getBoundingClientRect();
      if (r.width > 0 || r.height > 0) anchorRect = r;
    }

    // Build loading popup
    removeInlineTrans();
    __inlineReplacedSpan = null;
    const popup = document.createElement('div');
    popup.id = '__dai-inline-trans';
    popup.innerHTML = buildTransLoadingHTML(lang);
    positionInlineTrans(popup, anchorRect);
    document.documentElement.appendChild(popup);
    __inlineTransEl = popup;

    try {
      const result = await groqCall([
        { role:'system', content:'You are an expert professional translator. Translate the given text to ' + lang.label + ' (' + lang.native + '). Return ONLY valid JSON (no markdown, no explanation): {"translation":"the full translated text","detectedLanguage":"name of the source language","notes":"one brief cultural or linguistic note if interesting, else empty string"}' },
        { role:'user',   content:'Translate this to ' + lang.label + ':\n\n' + text }
      ], 'llama-3.3-70b-versatile');

      if (!__inlineTransEl) return; // popup closed while waiting

      const translation  = (typeof result === 'object' ? result.translation : String(result)) || '';
      const detectedLang = result.detectedLanguage || '';
      const notes        = result.notes || '';

      __inlineTransEl.innerHTML = buildTransResultHTML(lang, text, translation, detectedLang, notes);
      positionInlineTrans(__inlineTransEl, anchorRect);
      wireInlineTransButtons(savedRange, text, translation);

    } catch (err) {
      if (!__inlineTransEl) return;
      __inlineTransEl.innerHTML = buildTransErrorHTML(err.message);
      const errClose = __inlineTransEl.querySelector('#__dai-trans-close-err');
      if (errClose) errClose.addEventListener('click', removeInlineTrans);
    }
  }

  async function handleExplainText(text) {
    showOverlay('masterscan', null);
    updateOverlayLoadingText('Analyzing selected text…');
    try {
      const result = await groqCall([
        { role:'system', content:'You are an expert explainer. Explain the given text clearly and concisely. Return ONLY valid JSON (no markdown): {"summary":"1-2 sentence plain language summary","keyPoints":["point 1","point 2","point 3"],"difficulty":"Beginner or Intermediate or Advanced","relatedTerms":["term1","term2","term3"]}' },
        { role:'user',   content:'Explain this clearly:\n\n' + text }
      ], 'llama-3.3-70b-versatile');

      const a = '#a855f7';
      const html =
        '<div style="padding:18px;display:flex;flex-direction:column;gap:14px">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:2px">' +
          '<span style="font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:' + a + ';background:' + a + '18;border:1px solid ' + a + '35;border-radius:100px;padding:4px 13px">✦ Explanation</span>' +
        '</div>' +
        '<div style="padding:16px 18px;background:linear-gradient(135deg,' + a + '18,' + a + '06);border:1.5px solid ' + a + '40;border-radius:14px;position:relative;overflow:hidden">' +
          '<div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,' + a + ',' + a + '44,transparent)"></div>' +
          '<p style="font-size:14px;color:rgba(26,8,16,0.92);line-height:1.75;margin:0">' + esc(result.summary || '') + '</p>' +
        '</div>' +
        ((result.keyPoints && result.keyPoints.length) ? sec('Key Points', a,
          '<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px">' +
          result.keyPoints.map(p => li(p, a)).join('') + '</ul>'
        ) : '') +
        '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
          '<span style="font-size:10.5px;font-weight:700;color:rgba(26,8,16,0.4);text-transform:uppercase;letter-spacing:0.6px">Level:</span>' +
          '<span style="font-size:12px;font-weight:700;padding:3px 11px;border-radius:100px;background:' + a + '18;border:1px solid ' + a + '35;color:' + a + '">' + esc(result.difficulty || 'General') + '</span>' +
          ((result.relatedTerms && result.relatedTerms.length)
            ? result.relatedTerms.map(t => badge(t, 'rgba(236,72,153,0.12)')).join(' ')
            : '') +
        '</div>' +
        '</div>';

      const content = document.getElementById('__dai-content');
      if (content) {
        const div = document.createElement('div');
        sp(div, { animation:'__dai-fadein 0.3s ease both' });
        div.innerHTML = html;
        content.innerHTML = '';
        content.appendChild(div);
        const bar = document.getElementById('__dai-bottom');
        if (bar) { sp(bar, { display:'flex' }); bar.innerHTML = buildBottomBarHTML(a); wireBottomBar(bar, result, 'masterscan'); }
      }
    } catch (err) {
      overlayShowError(err.message === 'NO_API_KEY' ? 'NO_API_KEY' : err.message);
    }
  }

  function overlayShowTranslation(d, accent) {
    const content = document.getElementById('__dai-content');
    if (!content) return;

    const html =
      '<div style="padding:18px;display:flex;flex-direction:column;gap:16px">' +

      '<div style="display:flex;align-items:center;gap:8px">' +
        '<span style="font-size:22px">' + d.lang.flag + '</span>' +
        '<div>' +
          '<div style="font-size:17px;font-weight:900;color:#fff;letter-spacing:-0.4px">' + d.lang.label + ' Translation</div>' +
          (d.detectedLanguage ? '<div style="font-size:11px;color:rgba(26,8,16,0.4);margin-top:2px">Detected: ' + esc(d.detectedLanguage) + '</div>' : '') +
        '</div>' +
      '</div>' +

      '<div>' +
        '<div style="font-size:10px;font-weight:800;color:rgba(26,8,16,0.4);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px">Original</div>' +
        '<div style="padding:12px 15px;background:rgba(236,72,153,0.04);border:1px solid rgba(236,72,153,0.14);border-radius:12px;font-size:13px;color:rgba(26,8,16,0.6);line-height:1.65;font-style:italic">' + esc(d.originalText) + '</div>' +
      '</div>' +

      '<div>' +
        '<div style="font-size:10px;font-weight:800;color:' + accent + ';text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px">Translation</div>' +
        '<div style="padding:16px 18px;background:linear-gradient(135deg,' + accent + '1c,' + accent + '08);border:1.5px solid ' + accent + '45;border-radius:14px;position:relative;overflow:hidden">' +
          '<div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,' + accent + ',' + accent + '55,transparent)"></div>' +
          '<p style="font-size:15px;color:rgba(26,8,16,0.95);line-height:1.8;margin:0;font-weight:400">' + esc(String(d.translation)) + '</p>' +
        '</div>' +
      '</div>' +

      (d.notes ? sec('Translator Note', '#f59e0b',
        '<p style="font-size:13px;color:rgba(26,8,16,0.78);line-height:1.65;margin:0">' + esc(d.notes) + '</p>'
      ) : '') +

      '</div>';

    const div = document.createElement('div');
    sp(div, { animation:'__dai-fadein 0.3s ease both' });
    div.innerHTML = html;
    content.innerHTML = '';
    content.appendChild(div);
    const bar = document.getElementById('__dai-bottom');
    if (bar) {
      sp(bar, { display:'flex' });
      bar.innerHTML = buildBottomBarHTML(accent);
      wireBottomBar(bar, { text: d.translation }, 'masterscan');
    }
  }

})();
