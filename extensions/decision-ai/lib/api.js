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
// Two-call pipeline:
//   1. Vision model  → extract raw product data from screenshot (no JSON mode needed)
//   2. Text model    → generate full source-attributed analysis (JSON mode enforced)

export async function analyzeTruthLayer(imageDataUrl, pageUrl, pageTitle) {

  // ── Step 1: Vision extraction ──────────────────────────────────────────────
  const visionMessages = [
    {
      role: 'system',
      content: 'You are a product data extractor. Extract all visible product information from the screenshot and return it as plain text. Be concise and factual.'
    },
    {
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: imageDataUrl } },
        {
          type: 'text',
          text: `Page URL: ${pageUrl || 'unknown'}
Page title: ${pageTitle || 'unknown'}

Extract all visible product information from this screenshot:
- Product name and brand
- Model / variant
- Price (with currency)
- Rating and review count
- Store / website
- Any visible specs or features
- Any visible reviews or customer quotes
- Stock status

Reply in plain text only. Be factual and complete.`
        }
      ]
    }
  ];

  const rawExtraction = await groqCall(visionMessages, VISION_MODEL, false, 1500);

  // ── Step 2: Text model full analysis ──────────────────────────────────────
  const analysisMessages = [
    {
      role: 'system',
      content: `You are DecisionAI Truth Layer — an expert product analyst. You receive raw product data extracted from a screenshot and return a comprehensive JSON analysis.

SOURCE RULES (critical — follow exactly):
- Valid source names: Reddit, Amazon, YouTube, Google, Quora, Flipkart, TechRadar, RTINGS
- Every pro and con MUST have a "source" field set to one of these exact names
- Choose the source that would most realistically surface that specific insight
- The "sources" array must list 5-6 platforms with short insights about what each platform says about this product type
- Assign sources based on product type: electronics → TechRadar/RTINGS; consumer goods → Reddit/Amazon; budget products → Flipkart; all → Google/YouTube

Always return valid JSON only, no markdown.`
    },
    {
      role: 'user',
      content: `Product data extracted from screenshot:
---
${rawExtraction}
---
Page URL: ${pageUrl || 'unknown'}

Return ONLY this JSON (no extra text):
{
  "product": {
    "name": "full product name",
    "brand": "brand name",
    "model": "model/version",
    "price": "price as shown",
    "rating": "rating as shown",
    "reviewCount": "number of reviews",
    "store": "website/store name"
  },
  "truthScore": 75,
  "scoreLabel": "Good",
  "verdict": {
    "type": "buy",
    "label": "Recommended Buy",
    "reasoning": "3-4 sentences using your knowledge of this product/brand",
    "emoji": "✅"
  },
  "sources": [
    { "name": "Reddit", "insight": "What Reddit users typically say about this product" },
    { "name": "Amazon", "insight": "What Amazon verified buyers highlight" },
    { "name": "YouTube", "insight": "What tech reviewers say on YouTube" },
    { "name": "Google", "insight": "Top search result consensus" },
    { "name": "Quora", "insight": "Common questions and answers on Quora" },
    { "name": "TechRadar", "insight": "Expert review verdict" }
  ],
  "reviews": {
    "summary": "2-3 sentence overview of what customers say",
    "pros": [
      { "text": "specific pro point", "source": "Reddit" },
      { "text": "specific pro point", "source": "Amazon" },
      { "text": "specific pro point", "source": "YouTube" },
      { "text": "specific pro point", "source": "Google" }
    ],
    "cons": [
      { "text": "specific con point", "source": "Reddit" },
      { "text": "specific con point", "source": "Quora" },
      { "text": "specific con point", "source": "Amazon" }
    ],
    "hiddenComplaints": ["issue not obvious from star ratings"]
  },
  "priceIntel": {
    "currentPrice": "price from screenshot",
    "fairPrice": "estimated fair market value",
    "dealRating": "Great Deal",
    "alternatives": [
      { "store": "Amazon", "estimatedPrice": "$XX", "note": "check for deals" },
      { "store": "Flipkart", "estimatedPrice": "$XX", "note": "compare prices" }
    ]
  },
  "buyTiming": {
    "recommendation": "buy-now",
    "reason": "Short reason"
  },
  "competitors": [
    { "name": "Competitor Name", "why": "How it compares", "betterFor": "use case" }
  ]
}

CRITICAL: Every single pro and con object MUST have a "source" field. Use ONLY these names: Reddit, Amazon, YouTube, Google, Quora, Flipkart, TechRadar, RTINGS.`
    }
  ];

  return groqCall(analysisMessages, TEXT_MODEL, true, 4096);
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
