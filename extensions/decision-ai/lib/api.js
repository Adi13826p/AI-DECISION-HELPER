/**
 * DecisionAI — API Layer
 *
 * This module is the single integration point for AI backends.
 * All analysis flows route through DecisionAIApi.
 *
 * To integrate a real AI provider (OpenAI, Anthropic, Gemini, etc.):
 *   1. Set your API key in the background script via chrome.storage
 *   2. Replace the MOCK_* methods below with real fetch() calls
 *   3. Update the prompts in buildPrompt() for your use case
 *
 * Architecture:
 *   truth-layer.js → DecisionAIApi.analyzePage(pageData, url)
 *                        → _extractProduct()
 *                        → _analyzeReviews()
 *                        → _detectFakeReviews()
 *                        → _fetchWebSentiment()
 *                        → _comparePrices()
 *                        → _findSimilar()
 *                        → _generateVerdict()
 */

export class DecisionAIApi {
  constructor() {
    this.baseUrl = null; // Set to your AI API endpoint when ready
    this.apiKey = null;  // Loaded from chrome.storage in _loadConfig()
  }

  async _loadConfig() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['aiApiKey', 'aiBaseUrl'], (data) => {
        this.apiKey  = data.aiApiKey  || null;
        this.baseUrl = data.aiBaseUrl || null;
        resolve();
      });
    });
  }

  /**
   * Main entry point — analyzes a product page end-to-end.
   * Returns a structured result object consumed by truth-layer.js.
   *
   * @param {object} pageData  — extracted DOM data from content script
   * @param {string} url       — current tab URL
   * @returns {Promise<AnalysisResult>}
   */
  async analyzePage(pageData, url) {
    await this._loadConfig();

    // When a real AI key is configured, delegate to _realAnalysis().
    // Until then, use mock data for UI development.
    if (this.apiKey && this.baseUrl) {
      return this._realAnalysis(pageData, url);
    }

    return this._mockAnalysis(pageData, url);
  }

  // ── Real AI integration (implement when ready) ───────────────────────────

  async _realAnalysis(pageData, url) {
    const prompt = this._buildPrompt(pageData, url);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',   // swap for your preferred model
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;

    try {
      return JSON.parse(text);
    } catch {
      throw new Error('Failed to parse AI response. Please try again.');
    }
  }

  _buildPrompt(pageData, url) {
    return `
Analyze the following product page and return a JSON object matching the AnalysisResult schema.

URL: ${url}
Title: ${pageData.title}
Price: ${pageData.price || 'unknown'}
Rating: ${pageData.rating || 'unknown'}
Review count: ${pageData.reviewCount || 'unknown'}
Description: ${pageData.description || 'N/A'}
Page text snippet: ${(pageData.bodyText || '').substring(0, 1000)}

Return ONLY valid JSON. No markdown, no explanation.
    `.trim();
  }

  // ── Mock data (development / demo mode) ─────────────────────────────────

  async _mockAnalysis(pageData, url) {
    await _delay(1200); // Simulate network latency

    const domain = _getDomain(url);
    const title  = pageData.title || 'Unknown Product';
    const price  = pageData.price  || '$49.99';
    const rating = parseFloat(pageData.rating) || 4.2;

    return {
      verdict: {
        type:    'buy',
        label:   '✅ Recommended Buy',
        summary: 'Strong reviews, fair price, and minimal fake activity detected.',
        score:   8,
        emoji:   '✅'
      },
      product: {
        name:        title,
        price:       price,
        store:       domain,
        rating:      rating.toFixed(1),
        reviewCount: pageData.reviewCount || '1,247'
      },
      reviews: {
        rating:       rating,
        totalReviews: pageData.reviewCount || '1,247',
        summary: 'Customers consistently praise the build quality and value for money. A minority of buyers report minor shipping delays, but overall satisfaction is high.',
        pros: ['Great build quality', 'Good value for money', 'Fast shipping'],
        cons: ['Some reports of packaging issues', 'Instructions could be clearer']
      },
      fakeDetection: {
        riskLevel:   'Low',
        riskPercent: 18,
        signals: [
          { type: 'ok',      text: 'Review dates are spread naturally over time' },
          { type: 'ok',      text: 'Reviewer profiles appear genuine with purchase history' },
          { type: 'warning', text: '12% of reviews use very similar phrasing patterns' },
          { type: 'ok',      text: 'Verified purchase ratio is 94%' }
        ]
      },
      sentiment: [
        {
          source: 'Reddit',
          mood:   '😊 Positive',
          text:   'r/BuyItForLife and r/Frugal both mention this product favorably. Users cite long-term durability and good customer support as standout qualities.'
        },
        {
          source: 'Quora',
          mood:   '😐 Mixed',
          text:   'Quora discussions are mostly positive but a few users note there are cheaper alternatives with comparable quality. Recommended by 2 of 3 verified experts.'
        },
        {
          source: 'Web',
          mood:   '😊 Positive',
          text:   'Multiple review sites give it 4+ stars. Ranked #3 in its category on two major comparison sites. Featured in a "Best of 2024" roundup.'
        }
      ],
      prices: [
        { store: 'BestPrice.com',  price: '$41.99', numericPrice: 41.99, isCurrent: false },
        { store: 'Amazon',         price: '$44.99', numericPrice: 44.99, isCurrent: false },
        { store: domain,           price: price,    numericPrice: parseFloat(price.replace(/[^0-9.]/g, '')) || 49.99, isCurrent: true  },
        { store: 'Walmart',        price: '$52.00', numericPrice: 52.00, isCurrent: false }
      ],
      similar: [
        { name: 'ProModel X3 (Top Alternative)',      price: '$39.99', note: '⭐ 4.5 · Better value' },
        { name: 'CompactPro Lite',                    price: '$34.99', note: '⭐ 4.3 · Budget pick'  },
        { name: 'EliteChoice Premium Edition',        price: '$58.00', note: '⭐ 4.7 · Premium tier' }
      ]
    };
  }
}

// ── System prompt (customize for your AI model) ──────────────────────────────

const SYSTEM_PROMPT = `
You are DecisionAI, a smart shopping assistant. When given a product page, you analyze it and return a structured JSON object with the following fields:
- verdict: { type: "buy"|"caution"|"skip", label, summary, score (1-10), emoji }
- product: { name, price, store, rating, reviewCount }
- reviews: { rating, totalReviews, summary, pros[], cons[] }
- fakeDetection: { riskLevel: "Low"|"Medium"|"High", riskPercent, signals[{ type: "ok"|"warning"|"bad", text }] }
- sentiment: [{ source: "Reddit"|"Quora"|"Web", mood, text }]
- prices: [{ store, price, numericPrice, isCurrent }]
- similar: [{ name, price, note }]

Be concise, accurate, and helpful. Always return valid JSON.
`.trim();

// ── Helpers ───────────────────────────────────────────────────────────────────

function _delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function _getDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return 'this store';
  }
}
