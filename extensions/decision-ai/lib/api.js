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

  const body = {
    model,
    messages,
    temperature: 0.3,
    max_tokens: maxTokens
  };
  if (json) body.response_format = { type: 'json_object' };

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
    try { return JSON.parse(text); }
    catch { throw new Error('AI returned invalid JSON. Please try again.'); }
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

  return groqCall(messages, VISION_MODEL, true);
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
- Never pad. No filler phrases like "It is worth noting..." or "This highlights that..."
- Each point must feel genuinely insightful — something the user gains from, not just a restatement.
- Sentence length: not too short (no 4-word stubs), not too long (max ~25 words). Hit the sweet spot.

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

Step 1 — detect contentType: "article" | "research_paper" | "math" | "job_posting" | "video" | "product" | "code" | "social_post" | "recipe" | "study_material" | "other"

Step 2 — fill ONLY the section matching that contentType. Leave all other sections as empty objects {}.

Return ONLY this JSON (no extra text):
{
  "contentType": "<detected type>",
  "contentLabel": "<human label e.g. 'News Article'>",
  "title": "<detected title or topic>",
  "language": "en",
  "extractedText": "<visible text, max 500 chars>",
  "confidence": 90,

  "article":        <if contentType=article: {"summary":"...","keyPoints":["..."],"sentiment":"Positive|Neutral|Negative|Mixed","readingTime":"X min","topics":["..."],"flashcards":[{"q":"...","a":"..."}]} else {}>,
  "research":       <if contentType=research_paper: {"abstract":"...","methodology":"...","findings":["..."],"conclusions":"...","simplifiedExplanation":"...","flashcards":[{"q":"...","a":"..."}]} else {}>,
  "math":           <if contentType=math: {"problem":"...","solution":"...","steps":[{"step":1,"description":"...","result":"..."}],"concepts":["..."],"difficulty":"Easy|Medium|Hard"} else {}>,
  "job":            <if contentType=job_posting: {"company":"...","role":"...","location":"...","salary":"...","requirements":["..."],"skills":["..."],"applicationTips":["..."],"redFlags":["..."]} else {}>,
  "video":          <if contentType=video: {"title":"...","channel":"...","summary":"...","keyTopics":["..."],"studyNotes":["..."]} else {}>,
  "code":           <if contentType=code: {"language":"...","explanation":"...","codeSnippet":"...","improvements":["..."],"bugs":["..."]} else {}>,
  "social_post":    <if contentType=social_post: {"platform":"...","author":"...","content":"...","sentiment":"...","context":"...","keyTakeaway":"..."} else {}>,
  "recipe":         <if contentType=recipe: {"name":"...","ingredients":["..."],"steps":["..."],"prepTime":"...","servings":"..."} else {}>,
  "study_material": <if contentType=study_material: {"subject":"...","summary":"...","keyTerms":[{"term":"...","definition":"..."}],"flashcards":[{"q":"...","a":"..."}],"practiceQuestions":["..."]} else {}>,
  "general":        <if contentType=other: {"summary":"...","keyInsights":["..."],"actionItems":["..."],"categories":["..."]} else {}>
}`
        }
      ]
    }
  ];

  return groqCall(messages, VISION_MODEL, true, 3000);
}
