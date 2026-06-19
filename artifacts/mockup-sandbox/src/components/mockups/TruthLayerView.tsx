const TRUTH_CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { color-scheme: light !important; }
html, body { background-color: #fff0f7 !important; color: #1a0810 !important; }
:root {
  --bg-base: #fff0f7; --bg-surface: #ffffff; --bg-elevated: #fce7f3; --bg-hover: #fbd5ea;
  --border: rgba(236,72,153,0.14); --border-light: rgba(236,72,153,0.08);
  --text-primary: #0f0608; --text-secondary: #1e0d16; --text-muted: #4a2040;
  --accent: #ec4899; --accent-bg: rgba(236,72,153,0.10);
  --green: #10b981; --green-bg: rgba(16,185,129,0.12);
  --yellow: #f59e0b; --yellow-bg: rgba(245,158,11,0.10);
  --red: #ef4444; --red-bg: rgba(239,68,68,0.12);
  --purple: #db2777; --purple-bg: rgba(219,39,119,0.12);
  --radius-sm: 6px; --radius-md: 10px; --radius-lg: 14px;
}
html { background: var(--bg-base); color: var(--text-primary); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; font-size: 13px; line-height: 1.5; -webkit-font-smoothing: antialiased; }
body { min-height: 100vh; display: flex; justify-content: center; }
.app { width: 100%; max-width: 680px; min-height: 100vh; display: flex; flex-direction: column; }
.hidden { display: none !important; }
.header { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid var(--border); position: sticky; top: 0; background: rgba(255,240,247,0.95); backdrop-filter: blur(12px); z-index: 10; }
.back-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text-secondary); cursor: pointer; transition: all 0.15s; }
.back-btn:hover { background: var(--bg-hover); color: var(--accent); }
.back-btn svg { width: 16px; height: 16px; }
.header-center { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: var(--text-primary); }
.header-icon { width: 22px; height: 22px; background: var(--accent-bg); color: var(--accent); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; }
.header-icon svg { width: 13px; height: 13px; }
.header-spacer { width: 32px; }
.no-capture { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 32px; text-align: center; gap: 16px; }
.nc-icon { color: var(--accent); opacity: 0.7; }
.no-capture h2 { font-size: 18px; font-weight: 700; color: var(--text-primary); }
.no-capture p { font-size: 13px; color: var(--text-secondary); max-width: 340px; line-height: 1.7; }
.no-capture strong { color: var(--accent); }
.truth-banner { display: flex; align-items: center; gap: 16px; margin: 16px; padding: 16px; border-radius: var(--radius-lg); border: 1px solid var(--border); background: var(--bg-surface); }
.truth-banner.verdict-buy { background: rgba(16,185,129,0.07); border-color: rgba(16,185,129,0.25); }
.truth-score-wrap { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; min-width: 64px; }
.truth-score-num { font-size: 36px; font-weight: 900; letter-spacing: -2px; line-height: 1; }
.score-green { color: var(--green); }
.truth-score-label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px; }
.truth-verdict { flex: 1; display: flex; align-items: flex-start; gap: 10px; }
.truth-verdict-emoji { font-size: 24px; flex-shrink: 0; }
.truth-verdict-label { font-size: 15px; font-weight: 700; margin-bottom: 3px; }
.verdict-buy .truth-verdict-label { color: var(--green); }
.truth-verdict-sub { font-size: 11.5px; color: var(--text-secondary); line-height: 1.5; }
.results-state { flex: 1; display: flex; flex-direction: column; background: var(--bg-base); }
.results-scroll { flex: 1; overflow-y: auto; padding: 0 16px 16px; display: flex; flex-direction: column; gap: 10px; }
.result-section { background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 14px; }
.section-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.section-icon { width: 26px; height: 26px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.section-icon svg { width: 13px; height: 13px; }
.section-icon-blue { background: var(--accent-bg); color: var(--accent); }
.section-icon-green { background: var(--green-bg); color: var(--green); }
.section-icon-yellow { background: var(--yellow-bg); color: var(--yellow); }
.section-title { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.product-card-inner { display: flex; flex-direction: column; gap: 6px; }
.product-name { font-size: 13px; font-weight: 600; color: var(--text-primary); line-height: 1.4; }
.product-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.product-price { font-size: 16px; font-weight: 700; color: var(--accent); }
.product-store { font-size: 11px; color: var(--text-muted); background: var(--bg-elevated); padding: 2px 7px; border-radius: 20px; }
.product-rating { font-size: 11px; color: var(--yellow); }
.review-summary-inner { display: flex; flex-direction: column; gap: 10px; }
.pros-cons { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.pros-box, .cons-box { border-radius: var(--radius-sm); padding: 8px 10px; }
.pros-box { background: rgba(16,185,129,0.06); border: 1px solid rgba(16,185,129,0.15); }
.cons-box { background: rgba(239,68,68,0.06); border: 1px solid rgba(239,68,68,0.15); }
.pros-label, .cons-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
.pros-label { color: var(--green); }
.cons-label { color: var(--red, #ef4444); }
.pros-box ul, .cons-box ul { list-style: none; display: flex; flex-direction: column; gap: 4px; }
.pros-box li, .cons-box li { font-size: 11px; color: var(--text-secondary); padding-left: 10px; position: relative; }
.pros-box li::before { content: '+'; position: absolute; left: 0; color: var(--green); font-weight: 700; }
.cons-box li::before { content: '\u2212'; position: absolute; left: 0; color: var(--red, #ef4444); font-weight: 700; }
.source-chip { display: inline-flex; align-items: center; gap: 4px; border-radius: 20px; font-weight: 700; white-space: nowrap; padding: 2px 7px 2px 5px; font-size: 10px; }
.sources-section { padding: 11px 14px; }
.sources-chips-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.results-footer { padding: 12px 16px; border-top: 1px solid var(--border); background: var(--bg-surface); }
.scan-again-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 7px; background: var(--accent); color: #fff; border: none; border-radius: var(--radius-md); padding: 9px; font-size: 12.5px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
.scan-again-btn svg { width: 14px; height: 14px; }
.scan-again-btn:hover { background: #db2777; }
.price-intel-inner { display: flex; flex-direction: column; gap: 10px; }
.price-deal-row { display: flex; align-items: center; justify-content: space-between; }
.price-current-val { font-size: 20px; font-weight: 700; color: var(--accent); letter-spacing: -0.5px; }
.price-current-label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.price-deal-badge { font-size: 12px; font-weight: 600; padding: 5px 12px; border-radius: 20px; background: var(--green-bg); color: var(--green); }
.price-alts { display: flex; flex-direction: column; border: 1px solid var(--border); border-radius: var(--radius-md); overflow: hidden; }
.price-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid var(--border); background: var(--bg-elevated); }
.price-item:last-child { border-bottom: none; }
.price-store { font-size: 12px; color: var(--text-secondary); }
.price-amount { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.competitors-list { display: flex; flex-direction: column; gap: 8px; }
.competitor-item { padding: 10px 12px; background: var(--bg-elevated); border-radius: var(--radius-md); border: 1px solid var(--border); }
.comp-name { font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px; }
.comp-why { font-size: 11.5px; color: var(--text-secondary); }
.comp-for { font-size: 11px; color: var(--text-muted); }
.error-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 32px; text-align: center; gap: 14px; }
.error-icon { color: var(--red, #ef4444); }
.error-title { font-size: 18px; font-weight: 700; color: var(--text-primary); }
.error-desc { font-size: 12.5px; color: var(--text-secondary); max-width: 340px; line-height: 1.7; }
`;

const SAMPLE_RESULT = `
  <div class="truth-banner verdict-buy">
    <div class="truth-score-wrap">
      <div class="truth-score-num score-green">82</div>
      <div class="truth-score-label">Truth Score</div>
    </div>
    <div class="truth-verdict">
      <div class="truth-verdict-emoji">✅</div>
      <div class="truth-verdict-text">
        <div class="truth-verdict-label verdict-buy" style="color:#10b981">Strong Buy</div>
        <div class="truth-verdict-sub">Highly rated across Reddit &amp; Amazon. Fair price, no major red flags found.</div>
      </div>
    </div>
  </div>
  <div class="results-scroll">
    <div class="result-section">
      <div class="section-header">
        <div class="section-icon section-icon-blue"><svg viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.2"/><path d="M5 8h6M5 5.5h6M5 10.5h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg></div>
        <h3 class="section-title">Product Detected</h3>
      </div>
      <div class="product-card-inner">
        <div class="product-name">Sony WH-1000XM5 Wireless Headphones</div>
        <div class="product-meta">
          <span class="product-price">$279.99</span>
          <span class="product-store">Amazon</span>
          <span class="product-rating">★ 4.6 · 12,400 reviews</span>
        </div>
      </div>
    </div>
    <div class="result-section">
      <div class="section-header">
        <div class="section-icon section-icon-green"><svg viewBox="0 0 16 16" fill="none"><path d="M8 2l1.5 3 3.5.5-2.5 2.5.5 3.5L8 10l-3 1.5.5-3.5L3 5.5l3.5-.5L8 2z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg></div>
        <h3 class="section-title">Review Analysis</h3>
      </div>
      <div class="review-summary-inner">
        <div class="pros-cons">
          <div class="pros-box"><div class="pros-label">Pros</div><ul><li>Best-in-class ANC</li><li>30hr battery life</li><li>Multipoint connection</li></ul></div>
          <div class="cons-box"><div class="cons-label">Cons</div><ul><li>Plastic build quality</li><li>Touch controls slippery</li><li>Price premium</li></ul></div>
        </div>
      </div>
    </div>
    <div class="result-section">
      <div class="section-header">
        <div class="section-icon section-icon-yellow"><svg viewBox="0 0 16 16" fill="none"><path d="M8 2l1.2 3.5H13l-3 2.2 1.2 3.5L8 9l-3.2 2.2L6 7.7 3 5.5h3.8L8 2z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg></div>
        <h3 class="section-title">Price Intelligence</h3>
      </div>
      <div class="price-intel-inner">
        <div class="price-deal-row">
          <div><div class="price-current-label">Current Price</div><div class="price-current-val">$279.99</div></div>
          <div class="price-deal-badge">Great Deal</div>
        </div>
        <div class="price-alts">
          <div class="price-item"><span class="price-store">Best Buy</span><span class="price-amount">$299.99</span></div>
          <div class="price-item"><span class="price-store">B&amp;H Photo</span><span class="price-amount">$289.00</span></div>
          <div class="price-item"><span class="price-store">Walmart</span><span class="price-amount">$274.00</span></div>
        </div>
      </div>
    </div>
    <div class="result-section">
      <div class="section-header">
        <div class="section-icon section-icon-blue"><svg viewBox="0 0 16 16" fill="none"><path d="M2 8h12M8 2v12" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg></div>
        <h3 class="section-title">Competitors &amp; Alternatives</h3>
      </div>
      <div class="competitors-list">
        <div class="competitor-item"><div class="comp-name">Bose QuietComfort 45</div><div class="comp-why">Better comfort, slightly worse ANC. ~$279.</div></div>
        <div class="competitor-item"><div class="comp-name">Apple AirPods Max</div><div class="comp-why">Premium build, great for Apple ecosystem. ~$449.</div></div>
      </div>
    </div>
  </div>
  <div class="results-footer">
    <button class="scan-again-btn">
      <svg viewBox="0 0 24 24" fill="none"><path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      Scan a new area
    </button>
  </div>
`;

function buildTruthLayerDoc(showResult = false) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>${TRUTH_CSS}</style>
</head>
<body>
  <div class="app">
    <header class="header">
      <button class="back-btn">
        <svg viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <div class="header-center">
        <div class="header-icon">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="1.5"/>
            <path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
        <span>Truth Layer</span>
      </div>
      <div class="header-spacer"></div>
    </header>

    ${showResult
      ? `<section class="results-state" id="resultsState">${SAMPLE_RESULT}</section>`
      : `<section class="no-capture" id="noCaptureState">
      <div class="nc-icon">
        <svg viewBox="0 0 24 24" fill="none" width="48" height="48">
          <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </div>
      <h2>Start with a Screen Selection</h2>
      <p>Click the DecisionAI extension icon on any product page, choose <strong>Truth Layer</strong>, then drag to select the product area.</p>
    </section>`}
  </div>
</body></html>`;
}

export default function TruthLayerView() {
  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "#e8e0f0" }}>
      <iframe
        srcDoc={buildTruthLayerDoc(true)}
        style={{ width: "100%", height: "100vh", border: "none", display: "block" }}
        title="Truth Layer View"
        sandbox="allow-scripts"
      />
    </div>
  );
}
