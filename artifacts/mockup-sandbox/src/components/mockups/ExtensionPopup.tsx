const POPUP_CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg-base: #fff0f7; --bg-surface: #ffffff; --bg-elevated: #fce7f3; --bg-hover: #fbd5ea;
  --border: rgba(236,72,153,0.15); --border-hover: rgba(236,72,153,0.3);
  --text-primary: #1a0810; --text-secondary: #7a3358; --text-muted: #c28aab;
  --accent: #ec4899; --accent-bg: rgba(236,72,153,0.10); --accent-glow: rgba(236,72,153,0.2);
  --accent-scan: #f43f5e; --accent-scan-bg: rgba(244,63,94,0.10);
  --accent-profile: #7c3aed; --accent-profile-bg: rgba(124,58,237,0.1);
  --green: #10b981; --green-bg: rgba(16,185,129,0.12);
  --yellow: #f59e0b; --yellow-bg: rgba(245,158,11,0.1);
  --radius-sm: 8px; --radius-md: 12px; --radius-lg: 16px;
  --scan-accent: #f43f5e; --scan-mid: #f97316;
}
html { color-scheme: light; width: 412px; background: #fff0f7; }
body { width: 412px; padding: 0; margin: 0; background: #fff0f7; color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  font-size: 13px; line-height: 1.5; -webkit-font-smoothing: antialiased; }
.app { display: flex; flex-direction: column; width: 412px; background: var(--bg-base); overflow: hidden; position: relative; }
.hidden { display: none !important; }
@keyframes slideDown { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideUp   { from { opacity: 0; transform: translateY(8px);  } to { opacity: 1; transform: translateY(0); } }
@keyframes spin      { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes fadeIn    { from { opacity: 0; } to { opacity: 1; } }
@keyframes gradient-flow { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
@keyframes shimmer-sweep { 0% { transform: translateX(-160%) skewX(-12deg); } 100% { transform: translateX(260%) skewX(-12deg); } }
@keyframes sparkle-twinkle { 0%, 100% { opacity: 0; transform: scale(0.4) rotate(0deg); } 25% { opacity: 1; transform: scale(1.4) rotate(60deg); } 55% { opacity: 0.6; transform: scale(0.95) rotate(130deg); } 80% { opacity: 0.9; transform: scale(1.2) rotate(195deg); } }
@keyframes card-enter { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
@keyframes orb-float { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(12px, -16px) scale(1.09); } 66% { transform: translate(-9px, 7px) scale(0.94); } }
@keyframes top-bar-flow { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
@keyframes float-ping { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(2.4); opacity: 0; } }
.app-top-bar { height: 2.5px; flex-shrink: 0; background: linear-gradient(90deg, #ec4899 0%, #f472b6 20%, #a855f7 40%, #f43f5e 60%, #f472b6 80%, #ec4899 100%); background-size: 300% 100%; animation: top-bar-flow 3.5s ease-in-out infinite; border-radius: 20px 20px 0 0; }
.app-orb { position: absolute; border-radius: 50%; pointer-events: none; z-index: 0; }
.app-orb-1 { width: 220px; height: 220px; top: -70px; right: -55px; background: radial-gradient(circle, rgba(236,72,153,0.11) 0%, transparent 68%); animation: orb-float 15s ease-in-out infinite; }
.app-orb-2 { width: 160px; height: 160px; bottom: -45px; left: -45px; background: radial-gradient(circle, rgba(168,85,247,0.10) 0%, transparent 68%); animation: orb-float 20s ease-in-out infinite reverse; }
.app-orb-3 { width: 120px; height: 120px; top: 42%; right: -25px; background: radial-gradient(circle, rgba(244,63,94,0.08) 0%, transparent 68%); animation: orb-float 13s ease-in-out infinite 2s; }
.sparkle { position: absolute; pointer-events: none; z-index: 5; color: #ec4899; line-height: 1; user-select: none; animation: sparkle-twinkle 3.8s ease-in-out infinite; }
.sp-1 { top: 15px; right: 20px; font-size: 9px; color: #ec4899; animation-delay: 0s; }
.sp-2 { top: 47px; right: 14px; font-size: 5.5px; color: #f472b6; animation-delay: 1.1s; }
.sp-3 { top: 30px; left: 20px; font-size: 6px; color: #f43f5e; animation-delay: 0.55s; }
.sp-4 { bottom: 100px; right: 24px; font-size: 7.5px; color: #a855f7; animation-delay: 2.2s; }
.sp-5 { bottom: 148px; left: 26px; font-size: 5px; color: #ec4899; animation-delay: 1.65s; }
.sp-1::after { content: ''; position: absolute; inset: -5px; border-radius: 50%; border: 1px solid rgba(236,72,153,0.4); animation: float-ping 2.4s ease-out infinite; pointer-events: none; }
.header { display: flex; align-items: center; justify-content: space-between; padding: 15px 16px 13px; border-bottom: 1px solid var(--border); background: linear-gradient(160deg, #ffffff 60%, #fff5fb 100%); box-shadow: 0 1px 0 var(--border), 0 2px 8px rgba(236,72,153,0.04); }
.logo { display: flex; align-items: center; gap: 9px; }
@keyframes logoBounce { 0%, 100% { transform: translateY(0); } 40% { transform: translateY(-3px); } 60% { transform: translateY(-1px); } }
.logo-icon-wrap { width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; background: linear-gradient(145deg, #f472b6 0%, #ec4899 45%, #f43f5e 100%); box-shadow: 0 3px 12px rgba(236,72,153,0.5), inset 0 1px 0 rgba(255,255,255,0.3); display: flex; align-items: center; justify-content: center; transition: transform 0.2s, box-shadow 0.2s; }
.logo:hover .logo-icon-wrap { animation: logoBounce 0.55s ease; box-shadow: 0 5px 18px rgba(236,72,153,0.6), inset 0 1px 0 rgba(255,255,255,0.3); }
.logo-icon { width: 19px; height: 19px; }
.logo-text { font-size: 15px; font-weight: 800; letter-spacing: -0.4px; color: var(--text-primary); }
.logo-accent { background: linear-gradient(90deg, #ec4899, #f43f5e, #a855f7, #f472b6, #ec4899); background-size: 300% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; animation: gradient-flow 4s ease-in-out infinite; }
.header-right { display: flex; align-items: center; gap: 8px; }
.header-badge { font-size: 10px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; color: var(--text-muted); background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 20px; padding: 2px 8px; }
.settings-btn { background: transparent; border: 1px solid var(--border); color: var(--text-muted); width: 28px; height: 28px; border-radius: 7px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; padding: 0; }
.settings-btn svg { width: 13px; height: 13px; }
.settings-btn:hover { border-color: rgba(236,72,153,0.4); color: var(--accent); background: var(--accent-bg); }
.features { display: flex; flex-direction: column; gap: 10px; padding: 14px 16px 18px; background: var(--bg-base); }
.feature-card { display: flex; align-items: flex-start; gap: 13px; background: var(--bg-surface); border: 1px solid rgba(236,72,153,0.14); border-radius: 16px; padding: 16px 15px; cursor: pointer; text-align: left; text-decoration: none; color: inherit; transition: all 0.18s; width: 100%; position: relative; overflow: hidden; box-shadow: 0 2px 10px rgba(236,72,153,0.07), 0 1px 3px rgba(0,0,0,0.04); }
.feature-card::before { content: ''; position: absolute; inset: 0; opacity: 0; transition: opacity 0.2s; pointer-events: none; }
.feature-card::after { content: ''; position: absolute; inset: 0; background: linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.70) 50%, transparent 80%); transform: translateX(-160%) skewX(-12deg); pointer-events: none; z-index: 2; border-radius: 16px; }
#truthLayerBtn::before { background: radial-gradient(ellipse at 0% 0%, rgba(236,72,153,0.12) 0%, transparent 60%); }
#masterScanBtn::before { background: radial-gradient(ellipse at 0% 0%, rgba(244,63,94,0.10) 0%, transparent 60%); }
.feature-card:hover { border-color: var(--border-hover); transform: translateY(-2px); box-shadow: 0 8px 32px rgba(236,72,153,0.13), 0 2px 8px rgba(0,0,0,0.06); }
.feature-card:hover::before { opacity: 1; }
.feature-card:hover::after { animation: shimmer-sweep 0.55s ease-out forwards; }
#truthLayerBtn:hover { border-color: rgba(236,72,153,0.38); box-shadow: 0 8px 36px rgba(236,72,153,0.18), 0 2px 8px rgba(236,72,153,0.08); }
#masterScanBtn:hover { border-color: rgba(244,63,94,0.33); box-shadow: 0 8px 36px rgba(244,63,94,0.15), 0 2px 8px rgba(244,63,94,0.07); }
.feature-card:active { transform: translateY(0); }
.feature-icon-wrap { flex-shrink: 0; width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.feature-icon-wrap svg { width: 18px; height: 18px; }
.feature-icon-truth { background: var(--accent-bg); color: var(--accent); }
.feature-icon-scan { background: var(--accent-scan-bg); color: var(--accent-scan); }
.feature-content { flex: 1; min-width: 0; }
.feature-header { display: flex; align-items: center; gap: 6px; margin-bottom: 3px; }
.feature-title { font-size: 14px; font-weight: 700; color: var(--text-primary); }
.feature-tag { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; padding: 2px 6px; border-radius: 100px; }
.feature-tag-live { background: rgba(16,185,129,0.12); color: #059669; border: 1px solid rgba(16,185,129,0.2); }
.feature-tag-new { background: var(--accent-scan-bg); color: var(--accent-scan); border: 1px solid rgba(244,63,94,0.2); }
.feature-desc { font-size: 11.5px; color: var(--text-secondary); margin-bottom: 8px; line-height: 1.55; }
.feature-bullets { list-style: none; display: flex; flex-direction: column; gap: 3px; }
.feature-bullets li { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--text-muted); }
.feature-bullets li svg { width: 12px; height: 12px; color: var(--accent); flex-shrink: 0; }
.feature-arrow { color: var(--text-muted); flex-shrink: 0; align-self: center; transition: all 0.15s; }
.feature-arrow svg { width: 16px; height: 16px; }
.feature-card:hover .feature-arrow { transform: translateX(2px); color: var(--accent); }
#truthLayerBtn { animation: card-enter 0.45s cubic-bezier(0.16,1,0.3,1) 0.10s both; }
#masterScanBtn { animation: card-enter 0.45s cubic-bezier(0.16,1,0.3,1) 0.22s both; }
.footer { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px 13px; border-top: 1px solid rgba(236,72,153,0.1); font-size: 11px; color: var(--text-muted); background: linear-gradient(180deg, var(--bg-surface) 0%, #fff8fc 100%); }
.api-key-indicator { display: flex; align-items: center; gap: 5px; }
.indicator-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.dot-ok { background: var(--green); box-shadow: 0 0 5px rgba(16,185,129,0.5); }
.dot-warn { background: var(--yellow); box-shadow: 0 0 5px rgba(245,158,11,0.5); }
`;

function buildPopupDoc() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>${POPUP_CSS}</style>
</head>
<body>
<div class="app">
  <div class="app-top-bar"></div>
  <div class="app-orb app-orb-1"></div>
  <div class="app-orb app-orb-2"></div>
  <div class="app-orb app-orb-3"></div>
  <span class="sparkle sp-1">✦</span>
  <span class="sparkle sp-2">✦</span>
  <span class="sparkle sp-3">✶</span>
  <span class="sparkle sp-4">✦</span>
  <span class="sparkle sp-5">✦</span>

  <div id="homeView">
    <header class="header">
      <div class="logo">
        <div class="logo-icon-wrap">
          <svg class="logo-icon" viewBox="0 0 24 24" fill="none">
            <path d="M2 12C5 6 8.5 3.5 12 3.5C15.5 3.5 19 6 22 12C19 18 15.5 20.5 12 20.5C8.5 20.5 5 18 2 12Z" fill="white" fill-opacity="0.25" stroke="white" stroke-width="1.8" stroke-linejoin="round"/>
            <circle cx="12" cy="12" r="4.5" fill="white" fill-opacity="0.35" stroke="white" stroke-width="1.6"/>
            <path d="M13 8L10 12.5H12.2L11 16L14 11.5H11.8L13 8Z" fill="white"/>
          </svg>
        </div>
        <span class="logo-text">Decision<span class="logo-accent">AI</span></span>
      </div>
      <div class="header-right">
        <div class="header-badge">Beta</div>
        <button class="settings-btn" title="API Key Settings">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5"/>
            <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </header>

    <main class="features">
      <button class="feature-card" id="truthLayerBtn">
        <div class="feature-icon-wrap feature-icon-truth">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="1.5"/>
            <path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M8 11h6M11 8v6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="feature-content">
          <div class="feature-header">
            <h2 class="feature-title">Truth Layer</h2>
            <span class="feature-tag feature-tag-live">Live</span>
          </div>
          <p class="feature-desc">Select any product on screen for a full analysis — reviews, price comparison, and buy recommendation.</p>
          <ul class="feature-bullets">
            <li><svg viewBox="0 0 16 16" fill="none"><path d="M3 8l3 3 7-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>Price comparison across stores</li>
            <li><svg viewBox="0 0 16 16" fill="none"><path d="M3 8l3 3 7-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>Red flag detection</li>
            <li><svg viewBox="0 0 16 16" fill="none"><path d="M3 8l3 3 7-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>Buy recommendation</li>
          </ul>
        </div>
        <div class="feature-arrow">
          <svg viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
      </button>

      <button class="feature-card" id="masterScanBtn">
        <div class="feature-icon-wrap feature-icon-scan">
          <svg viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/>
            <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/>
            <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/>
            <path d="M14 14h2v2h-2zM18 14h3M14 18h2M18 18h3M14 21h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="feature-content">
          <div class="feature-header">
            <h2 class="feature-title">MasterScan</h2>
            <span class="feature-tag feature-tag-new">New</span>
          </div>
          <p class="feature-desc">Universal AI copilot. Paste any URL, ask a question, scan your screen — and manage your profile for instant form autofill.</p>
          <ul class="feature-bullets">
            <li><svg viewBox="0 0 16 16" fill="none"><path d="M3 8l3 3 7-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>YouTube, articles, research papers</li>
            <li><svg viewBox="0 0 16 16" fill="none"><path d="M3 8l3 3 7-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>5 AI modes: Problems, Roadmaps &amp; more</li>
            <li><svg viewBox="0 0 16 16" fill="none"><path d="M3 8l3 3 7-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>My Profile tab — auto-fill any job form</li>
          </ul>
        </div>
        <div class="feature-arrow">
          <svg viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
      </button>
    </main>

    <footer class="footer">
      <div class="api-key-indicator">
        <span class="indicator-dot dot-ok"></span>
        <span>API Key Active</span>
      </div>
      <span>v1.3.0</span>
    </footer>
  </div>
</div>
</body></html>`;
}

export default function ExtensionPopup() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f0f0f5", padding: "20px" }}>
      <div style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.1)", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(0,0,0,0.08)" }}>
        <iframe
          srcDoc={buildPopupDoc()}
          style={{ width: 412, height: 520, border: "none", display: "block" }}
          title="DecisionAI Popup"
          sandbox="allow-scripts"
        />
      </div>
    </div>
  );
}
