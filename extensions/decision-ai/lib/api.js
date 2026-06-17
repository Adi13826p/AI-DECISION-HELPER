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

export async function groqCall(messages, model, json = true) {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error('NO_API_KEY');

  const body = {
    model,
    messages,
    temperature: 0.3,
    max_tokens: 2048
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
      content: `You are MasterScan — a universal AI content analyzer. You can analyze any type of web content from screenshots: articles, research papers, math problems, job postings, YouTube videos, social posts, code, recipes, and more. Always return valid JSON only, no markdown.`
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

First detect the content type, then provide the most useful analysis for that content type.
Return ONLY this JSON structure:

{
  "contentType": "article|research_paper|math|job_posting|video|product|code|social_post|recipe|study_material|other",
  "contentLabel": "Human-readable label like 'News Article' or 'Research Paper'",
  "title": "Detected title or topic",
  "language": "en",
  "extractedText": "All visible text extracted from the screenshot, max 800 chars",
  "confidence": 90,

  "article": {
    "summary": "3-4 sentence summary of the article",
    "keyPoints": ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5"],
    "sentiment": "Positive|Neutral|Negative|Mixed",
    "readingTime": "3 min",
    "topics": ["topic1", "topic2"],
    "flashcards": [
      { "q": "Question 1?", "a": "Answer 1" },
      { "q": "Question 2?", "a": "Answer 2" }
    ]
  },

  "research": {
    "abstract": "Brief abstract summary",
    "methodology": "Research method used",
    "findings": ["Finding 1", "Finding 2", "Finding 3"],
    "conclusions": "Main conclusion",
    "simplifiedExplanation": "Explain this to a non-expert in 2-3 sentences",
    "flashcards": [
      { "q": "Key concept?", "a": "Definition" }
    ]
  },

  "math": {
    "problem": "The math problem as text",
    "solution": "Final answer",
    "steps": [
      { "step": 1, "description": "Step description", "result": "intermediate result" }
    ],
    "concepts": ["concept1", "concept2"],
    "difficulty": "Easy|Medium|Hard"
  },

  "job": {
    "company": "Company name",
    "role": "Job title",
    "location": "Location or Remote",
    "salary": "Salary if visible",
    "requirements": ["Requirement 1", "Requirement 2"],
    "niceToHave": ["Nice to have 1"],
    "skills": ["skill1", "skill2", "skill3"],
    "applicationTips": ["Tip 1", "Tip 2"],
    "redFlags": ["Any red flag if visible"]
  },

  "video": {
    "title": "Video title",
    "channel": "Channel name if visible",
    "summary": "What this video appears to be about",
    "keyTopics": ["Topic 1", "Topic 2", "Topic 3"],
    "studyNotes": ["Note 1", "Note 2", "Note 3"],
    "estimatedDuration": "X min"
  },

  "code": {
    "language": "Programming language",
    "explanation": "What this code does",
    "codeSnippet": "The code if readable",
    "improvements": ["Improvement 1", "Improvement 2"],
    "bugs": ["Bug if any"]
  },

  "social_post": {
    "platform": "Twitter/Reddit/LinkedIn/etc",
    "author": "Author if visible",
    "content": "Post content",
    "sentiment": "Positive|Negative|Neutral",
    "context": "What this is about",
    "keyTakeaway": "Main point in one sentence"
  },

  "recipe": {
    "name": "Recipe name",
    "ingredients": ["ingredient 1", "ingredient 2"],
    "steps": ["Step 1", "Step 2"],
    "prepTime": "X min",
    "servings": "X",
    "tips": ["Tip 1"]
  },

  "study_material": {
    "subject": "Subject/topic",
    "summary": "What this covers",
    "keyTerms": [{ "term": "term", "definition": "definition" }],
    "flashcards": [{ "q": "Question?", "a": "Answer" }],
    "practiceQuestions": ["Q1?", "Q2?", "Q3?"],
    "studyPlan": "Suggested study approach"
  },

  "general": {
    "summary": "What this content is about",
    "keyInsights": ["Insight 1", "Insight 2", "Insight 3"],
    "actionItems": ["Action 1", "Action 2"],
    "categories": ["tag1", "tag2"]
  }
}`
        }
      ]
    }
  ];

  return groqCall(messages, VISION_MODEL, true);
}
