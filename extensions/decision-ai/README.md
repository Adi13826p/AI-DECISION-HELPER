# DecisionAI Chrome Extension

Shop smarter. Analyze any product page instantly — reviews, fake detection, price comparison, and an AI-powered buy recommendation.

## Install in Chrome (Developer Mode)

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `extensions/decision-ai/` folder
5. The DecisionAI icon will appear in your Chrome toolbar

## Features

### Truth Layer
Click the **Truth Layer** card in the popup, then navigate to any product page and hit **Analyze**. You'll get:
- Review summary with pros & cons
- Fake review risk score with detected signals
- Reddit, Quora & web sentiment
- Price comparison across stores
- Similar product suggestions
- Final buy/caution/skip recommendation

### MasterScan *(Coming Soon)*
Advanced market scanning with trend analysis, deal scoring, and competitive alternatives.

## Project Structure

```
decision-ai/
├── manifest.json               # Extension manifest (v3)
├── popup/
│   ├── popup.html              # Main popup UI
│   ├── popup.css               # Popup styles
│   └── popup.js                # Popup logic
├── views/
│   ├── truth-layer/
│   │   ├── truth-layer.html    # Truth Layer full page
│   │   ├── truth-layer.css     # Styles
│   │   └── truth-layer.js      # Analysis logic + state machine
│   └── masterscan/
│       ├── masterscan.html     # Coming Soon page
│       ├── masterscan.css      # Styles
│       └── masterscan.js       # Email capture
├── background/
│   └── background.js           # Service worker (message routing, storage)
├── content/
│   └── content.js              # DOM data extractor (runs on every page)
├── lib/
│   └── api.js                  # AI API integration layer
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

## Connecting a Real AI Provider

The extension is architected for easy AI integration. `lib/api.js` is the single integration point.

**To connect OpenAI (or any OpenAI-compatible API):**

1. Open the extension's background page: `chrome://extensions/` → DecisionAI → "Service Worker" → Console
2. Run:
   ```js
   chrome.storage.local.set({ aiApiKey: 'sk-...', aiBaseUrl: 'https://api.openai.com/v1' });
   ```
3. The extension will automatically use real AI on the next analysis.

**To switch models or providers**, edit `lib/api.js` → `_realAnalysis()`:
- Change the `model` field to your preferred model
- Update `this.baseUrl` for Anthropic, Gemini, or your own backend
- The `SYSTEM_PROMPT` constant controls the AI's behavior

## Development Notes

- **Mock mode**: When no API key is set, the extension uses realistic mock data so you can develop/test the UI without API costs.
- **Content script** (`content/content.js`): Extracts product data from the page DOM. Supports Schema.org microdata, Open Graph, Amazon selectors, and generic e-commerce patterns.
- **Background script** (`background/background.js`): Handles message routing, stores analysis history (last 50 analyses), and manages settings.
- **State machine**: `truth-layer.js` has 4 UI states: `idle → loading → results → error`. Each state is a separate DOM section toggled with `.hidden`.

## Tech Stack

- Plain HTML, CSS, JavaScript (no build step required)
- Chrome Extension Manifest V3
- `chrome.scripting` for DOM extraction
- `chrome.storage.local` for persistence
- ES modules in views/lib (loaded as scripts with `type="module"`)
