/**
 * DecisionAI — Groq Vision API Layer
 * Calls Groq directly using the stored API key.
 * Used by both background.js (service worker) and views (ES module pages).
 */

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const VISION_MODEL  = 'meta-llama/llama-4-scout-17b-16e-instruct';
const TEXT_MODEL    = 'llama-3.3-70b-versatile';

export async function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get('groqApiKey', (d) => resolve(d.groqApiKey || null));
  });
}

export async function groqCall(messages, model, json = true, maxTokens = 4096) {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error('NO_API_KEY');

  const isVision = model === VISION_MODEL;

  const body = {
    model,
    messages,
    temperature: 0.3,
    max_tokens: maxTokens
  };
  // Vision models do not support response_format — text models only
  if (json && !isVision) body.response_format = { type: 'json_object' };

  const resp = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const err = await resp.text().catch(() => resp.statusText);
    if (resp.status === 401) throw new Error('INVALID_API_KEY');
    throw new Error(`Groq API error ${resp.status}: ${err}`);
  }

  const data = await resp.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from AI');

  if (json) {
    // 1) Try clean parse
    try { return JSON.parse(text); } catch (_) { /* fall through to repair */ }

    // 2) Strip any markdown fences
    const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    try { return JSON.parse(stripped); } catch (_) { /* fall through to repair */ }

    // 3) Attempt truncation repair — close any open arrays/objects
    try {
      let s = stripped;
      // Count unmatched open brackets/braces
      const stack = [];
      let inString = false, escape = false;
      for (const ch of s) {
        if (escape) { escape = false; continue; }
        if (ch === '\\' && inString) { escape = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (ch === '{' || ch === '[') stack.push(ch);
        else if (ch === '}' || ch === ']') stack.pop();
      }
      // Remove trailing incomplete key-value (e.g. ,"key": or ,"key":"inc)
      s = s.replace(/,\s*"[^"]*"\s*:\s*"[^"]*$/, '')   // truncated string value
           .replace(/,\s*"[^"]*"\s*:\s*\[?[^,}\]]*$/, '') // truncated array/number
           .replace(/,\s*"[^"]*"\s*$/, '');                // truncated key only
      // Close open structures
      for (let i = stack.length - 1; i >= 0; i--) {
        s += stack[i] === '{' ? '}' : ']';
      }
      return JSON.parse(s);
    } catch (_) { /* fall through */ }

    throw new Error('AI returned invalid JSON. Please try again.');
  }
  return text;
}

// ── Truth Layer ───────────────────────────────────────────────────────────────

export async function analyzeTruthLayer(imageDataUrl, pageUrl, pageTitle) {
  const messages = [
    {
      role: 'system',
      content: `You are DecisionAI Truth Layer — an expert product analyst AI. Analyze product screenshots and return comprehensive, honest assessments. Always return valid JSON only, no markdown.`
    },
    {
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: { url: imageDataUrl }
        },
        {
          type: 'text',
          text: `Analyze this screenshot from: ${pageUrl || 'unknown page'}
Title: ${pageTitle || 'unknown'}

Extract product information and provide a complete analysis. Return ONLY this JSON structure:
{
  "product": {
    "name": "full product name",
    "brand": "brand name",
    "model": "model/version if visible",
    "price": "price as shown",
    "currency": "currency symbol or code",
    "rating": "rating as shown (e.g. 4.2/5)",
    "reviewCount": "number of reviews",
    "store": "website/store name",
    "inStock": true
  },
  "truthScore": 75,
  "scoreLabel": "Good",
  "verdict": {
    "type": "buy",
    "label": "Recommended Buy",
    "reasoning": "3-4 sentence explanation based on visible info and general knowledge about this product/brand",
    "emoji": "✅"
  },
  "reviews": {
    "summary": "What customers typically say about this product (2-3 sentences)",
    "pros": ["Pro 1", "Pro 2", "Pro 3", "Pro 4"],
    "cons": ["Con 1", "Con 2", "Con 3"],
    "hiddenComplaints": ["Any common issue not shown in ratings"]
  },
  "priceIntel": {
    "currentPrice": "visible price",
    "fairPrice": "estimated fair market value",
    "dealRating": "Great Deal|Fair|Overpriced",
    "alternatives": [
      { "store": "Amazon", "estimatedPrice": "$XX", "note": "typically cheaper" },
      { "store": "Walmart", "estimatedPrice": "$XX", "note": "" }
    ]
  },
  "buyTiming": {
    "recommendation": "buy-now",
    "reason": "Short reason for timing recommendation"
  },
  "competitors": [
    { "name": "Competitor Name", "why": "How it compares", "betterFor": "use case" }
  ]
}`
        }
      ]
    }
  ];

  return groqCall(messages, VISION_MODEL, true, 6000);
}

// ── Master Scan ───────────────────────────────────────────────────────────────

export async function analyzeMasterScan(imageDataUrl, pageUrl, pageTitle) {
  const messages = [
    {
      role: 'system',
      content: `You are MasterScan — a world-class AI content analyzer. Detect the content type from the screenshot, then deliver a sharp, insightful breakdown.

WRITING RULES (follow strictly for every text field):
- Write like a brilliant, knowledgeable friend — clear, direct, conversational yet polished.
- Every sentence must be immediately understandable. No jargon without explanation.
- Be specific: use real details, names, numbers from the content — never vague generalities.
- Sound confident. Think: premium analyst report meets WhatsApp from a smart friend.
- Never pad. No filler. Cut every unnecessary word.
- Each point = one sharp idea. Max 12 words per sentence. Think bullet, not paragraph.

Always return valid JSON only, no markdown, no explanation.`
    },
    {
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: { url: imageDataUrl }
        },
        {
          type: 'text',
          text: `Analyze this screenshot from: ${pageUrl || 'unknown'}
Title: ${pageTitle || 'unknown'}

Detect the content type and return ONLY the following compact JSON. Be concise — max 2-3 items per array, max 60 words per text field.

Return ONLY this JSON (no extra text, no markdown):
{
  "contentType": "article|research_paper|math|job_posting|video|product|code|social_post|recipe|study_material|other",
  "contentLabel": "human readable label",
  "title": "detected title or topic (max 12 words)",
  "language": "en",
  "extractedText": "key visible text, max 300 chars",
  "confidence": 90,
  "article":        {},
  "research":       {},
  "math":           {},
  "job":            {},
  "video":          {},
  "code":           {},
  "social_post":    {},
  "recipe":         {},
  "study_material": {},
  "general":        {}
}

After the base JSON, fill ONLY the single section that matches contentType:
- article → "article": {"summary":"2-3 sentences max","keyPoints":["pt1","pt2","pt3"],"sentiment":"Positive|Neutral|Negative|Mixed","readingTime":"X min","topics":["t1","t2"]}
- research_paper → "research": {"abstract":"2 sentences","findings":["f1","f2","f3"],"conclusions":"1 sentence","simplifiedExplanation":"1 sentence"}
- math → "math": {"problem":"brief","solution":"answer","steps":[{"step":1,"description":"desc","result":"res"}],"difficulty":"Easy|Medium|Hard"}
- job_posting → "job": {"company":"name","role":"title","location":"loc","salary":"range","requirements":["r1","r2","r3"],"skills":["s1","s2","s3"],"redFlags":["flag1"]}
- video → "video": {"title":"title","channel":"ch","summary":"2 sentences","keyTopics":["t1","t2","t3"]}
- code → "code": {"language":"lang","explanation":"2 sentences","improvements":["i1","i2"],"bugs":["b1"]}
- social_post → "social_post": {"platform":"name","author":"handle","content":"text","sentiment":"pos/neg/neutral","keyTakeaway":"1 sentence"}
- recipe → "recipe": {"name":"dish","ingredients":["i1","i2","i3"],"steps":["s1","s2","s3"],"prepTime":"Xmin"}
- study_material → "study_material": {"subject":"name","summary":"2 sentences","keyTerms":[{"term":"t","definition":"d"}],"practiceQuestions":["q1","q2"]}
- other → "general": {"summary":"2-3 sentences","keyInsights":["i1","i2","i3"],"actionItems":["a1","a2"]}`
        }
      ]
    }
  ];

  return groqCall(messages, VISION_MODEL, true, 8000);
}
