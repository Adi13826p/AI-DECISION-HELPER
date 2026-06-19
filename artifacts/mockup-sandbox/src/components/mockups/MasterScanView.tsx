const MASTERSCAN_CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { color-scheme: light !important; }
html, body { background-color: #fff0f7 !important; color: #1a0810 !important; }
:root {
  --bg-base: #fff0f7; --bg-surface: #ffffff; --bg-elevated: #fce7f3; --bg-hover: #fbd5ea;
  --border: rgba(236,72,153,0.14); --border-light: rgba(236,72,153,0.08);
  --text-primary: #1a0810; --text-secondary: #7a3358; --text-muted: #c28aab;
  --accent: #f43f5e; --accent-bg: rgba(244,63,94,0.10);
  --green: #10b981; --green-bg: rgba(16,185,129,0.12);
  --yellow: #f59e0b; --yellow-bg: rgba(245,158,11,0.10);
  --red: #ef4444; --red-bg: rgba(239,68,68,0.12);
  --purple: #ec4899; --purple-bg: rgba(236,72,153,0.12);
  --tts: #a374ff;
  --radius-sm: 6px; --radius-md: 10px; --radius-lg: 14px;
}
html { background: var(--bg-base); color: var(--text-primary); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; font-size: 13px; line-height: 1.5; -webkit-font-smoothing: antialiased; }
body { min-height: 100vh; display: flex; justify-content: center; }
body::before { content: ''; position: fixed; inset: 0; border: 1.5px solid rgba(219,39,119,0.55); pointer-events: none; z-index: 99999; }
.app { width: 100%; max-width: 720px; min-height: 100vh; display: flex; flex-direction: column; position: relative; }
.hidden { display: none !important; }
.header { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid var(--border); position: sticky; top: 0; background: rgba(255,240,247,0.95); backdrop-filter: blur(12px); z-index: 10; }
.back-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text-secondary); cursor: pointer; transition: all 0.15s; }
.back-btn:hover { background: var(--bg-hover); color: var(--accent); }
.back-btn svg { width: 16px; height: 16px; }
.header-center { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: var(--text-primary); }
.header-icon { width: 22px; height: 22px; background: var(--accent-bg); color: var(--accent); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; }
.header-icon svg { width: 13px; height: 13px; }
.header-spacer { width: 32px; }
.header-type-badge { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 100px; }
.no-capture { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 36px 24px 120px; text-align: center; gap: 14px; }
.nc-icon { color: var(--accent); opacity: 0.7; }
.no-capture h2 { font-size: 18px; font-weight: 700; color: var(--text-primary); }
.no-capture p { font-size: 13px; color: var(--text-secondary); max-width: 360px; line-height: 1.7; }
.no-capture strong { color: var(--accent); }
.tts-speak-panel { width: 100%; max-width: 440px; background: linear-gradient(135deg, rgba(163,116,255,0.06), rgba(255,255,255,0.9)); border: 1.5px solid rgba(163,116,255,0.25); border-radius: 16px; padding: 16px; display: flex; flex-direction: column; gap: 12px; text-align: left; margin-top: 8px; }
.tsp-header { display: flex; align-items: center; gap: 10px; }
.tsp-icon { width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; background: linear-gradient(135deg, rgba(163,116,255,0.2), rgba(163,116,255,0.08)); border: 1px solid rgba(163,116,255,0.28); display: flex; align-items: center; justify-content: center; font-size: 16px; }
.tsp-info { flex: 1; }
.tsp-title { font-size: 13px; font-weight: 800; color: var(--text-primary); letter-spacing: -0.2px; }
.tsp-sub { font-size: 11px; color: var(--text-muted); margin-top: 2px; line-height: 1.4; }
.tsp-badge { font-size: 9px; font-weight: 700; padding: 2px 8px; border-radius: 20px; background: rgba(163,116,255,0.12); color: var(--tts); border: 1px solid rgba(163,116,255,0.25); letter-spacing: 0.5px; text-transform: uppercase; flex-shrink: 0; }
.tts-textarea { width: 100%; padding: 11px 13px; background: #fff; border: 1.5px solid rgba(163,116,255,0.22); border-radius: 11px; color: var(--text-primary); font-size: 12.5px; font-family: inherit; resize: none; outline: none; line-height: 1.65; transition: border-color 0.15s, box-shadow 0.15s; }
.tts-textarea:focus { border-color: var(--tts); box-shadow: 0 0 0 3px rgba(163,116,255,0.14); }
.tts-controls { display: flex; gap: 8px; }
.tts-listen-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 7px; padding: 10px 14px; border-radius: 10px; border: none; font-size: 12.5px; font-weight: 700; cursor: pointer; background: linear-gradient(135deg, var(--tts), #ec4899); color: #fff; box-shadow: 0 4px 16px rgba(163,116,255,0.4); transition: opacity 0.15s, transform 0.15s; }
.tts-listen-btn:disabled { background: var(--bg-elevated); color: var(--text-muted); box-shadow: none; cursor: not-allowed; }
.tts-listen-btn:not(:disabled):hover { opacity: 0.9; transform: translateY(-1px); }
.tts-clear-btn { padding: 10px 13px; border-radius: 10px; background: var(--bg-elevated); border: 1px solid var(--border); color: var(--text-muted); font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
.tts-clear-btn:hover { color: var(--accent); border-color: rgba(244,63,94,0.3); }
.tts-char-count { font-size: 10px; color: var(--text-muted); text-align: right; margin-top: -4px; }
.loading-state { flex: 1; display: flex; flex-direction: column; }
.loading-preview { width: 100%; height: 160px; background-size: cover; background-position: center top; border-bottom: 1px solid var(--border); opacity: 0.6; filter: blur(2px); }
.loading-body { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px; text-align: center; }
.scan-spinner { position: relative; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; }
.scan-ring { position: absolute; border-radius: 50%; border: 2px solid transparent; }
@keyframes spin { to { transform: rotate(360deg); } }
.r1 { width: 60px; height: 60px; border-top-color: var(--accent); animation: spin 1.2s linear infinite; }
.r2 { width: 44px; height: 44px; border-top-color: rgba(236,72,153,0.4); animation: spin 0.8s linear infinite reverse; }
.scan-icon { color: var(--accent); }
.loading-title { font-size: 18px; font-weight: 700; margin-bottom: 6px; color: var(--text-primary); }
.loading-sub { font-size: 12px; color: var(--text-secondary); margin-bottom: 28px; }
.loading-steps { display: flex; flex-direction: column; gap: 10px; text-align: left; width: 100%; max-width: 280px; }
.load-step { display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--text-muted); transition: color 0.3s; }
.load-step.active { color: var(--text-primary); }
.load-step.done { color: var(--green); }
.load-step-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--bg-elevated); border: 1px solid var(--border); flex-shrink: 0; transition: all 0.3s; }
.results-state { flex: 1; display: flex; flex-direction: column; background: var(--bg-base); padding-bottom: 64px; }
.results-scroll { flex: 1; overflow-y: auto; padding: 0 16px 16px; display: flex; flex-direction: column; gap: 10px; }
.results-footer { padding: 10px 16px; border-top: 1px solid var(--border); display: flex; gap: 7px; background: var(--bg-surface); position: sticky; bottom: 0; }
.copy-text-btn, .scan-again-btn, .download-pdf-btn, .listen-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px; background: var(--bg-elevated); color: var(--text-secondary); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 9px 6px; font-size: 11.5px; font-weight: 500; cursor: pointer; transition: all 0.15s; }
.error-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 32px; text-align: center; gap: 14px; }
.error-icon { color: var(--red); }
.error-title { font-size: 18px; font-weight: 700; color: var(--text-primary); }
.error-desc { font-size: 12.5px; color: var(--text-secondary); max-width: 340px; line-height: 1.7; }
.retry-btn { background: var(--accent); color: white; border: none; padding: 10px 22px; border-radius: var(--radius-md); font-size: 13px; font-weight: 600; cursor: pointer; }
`;

function buildMasterScanDoc() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>${MASTERSCAN_CSS}</style>
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
            <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/>
            <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/>
            <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/>
            <path d="M14 14h2v2h-2zM18 14h3M14 18h2M18 18h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
        <span>MasterScan</span>
      </div>
      <div class="header-spacer"></div>
    </header>

    <section class="no-capture" id="noCaptureState">
      <div class="nc-icon">
        <svg viewBox="0 0 24 24" fill="none" width="48" height="48">
          <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </div>
      <h2>Start with a Screen Selection</h2>
      <p>Click the DecisionAI extension icon, choose <strong>MasterScan</strong>, then drag to select any content — articles, math, job posts, research papers, and more.</p>

      <div class="tts-speak-panel">
        <div class="tsp-header">
          <div class="tsp-icon">🔊</div>
          <div class="tsp-info">
            <div class="tsp-title">Speak Selected Text</div>
            <div class="tsp-sub">Paste any text — YouTube summary, article, notes — to hear it read aloud</div>
          </div>
          <span class="tsp-badge">TTS</span>
        </div>
        <textarea class="tts-textarea" placeholder="Paste text here to hear it read aloud in a natural voice…" rows="4"></textarea>
        <div class="tts-controls">
          <button class="tts-listen-btn" disabled>
            <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            Listen Now
          </button>
        </div>
      </div>
    </section>
  </div>
</body></html>`;
}

export default function MasterScanView() {
  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "#e8e0f0" }}>
      <iframe
        srcDoc={buildMasterScanDoc()}
        style={{ width: "100%", height: "100vh", border: "none", display: "block" }}
        title="MasterScan View"
        sandbox="allow-scripts"
      />
    </div>
  );
}
