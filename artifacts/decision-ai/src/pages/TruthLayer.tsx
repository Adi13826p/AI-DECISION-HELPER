import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { type TruthLayerResult } from "@/lib/mockData";

/* ── Normalise raw API response ─────────────────────── */
function normalizeVerdictType(t: unknown): 'recommended' | 'consider' | 'avoid' {
  const s = String(t ?? '').toLowerCase();
  if (s.includes('avoid') || s.includes('skip')) return 'avoid';
  if (s.includes('consider') || s.includes('maybe') || s.includes('neutral')) return 'consider';
  return 'recommended';
}

function normalizeResult(raw: unknown): TruthLayerResult {
  const d = raw as Record<string, unknown>;
  const toNum = (v: unknown): number => {
    if (typeof v === "number" && !isNaN(v)) return v;
    const n = parseInt(String(v ?? "0").replace(/[^0-9]/g, ""), 10);
    return isNaN(n) ? 0 : n;
  };
  const rawStats = (d.analysisStats ?? {}) as Record<string, unknown>;
  const sources: string[] = (d.sourcePlatforms as string[] | undefined) ?? ["Reddit", "Amazon", "YouTube", "TechRadar", "Google"];
  const loves = ((d.loves as unknown[]) ?? []).map((l, i) =>
    typeof l === "string" ? { text: l as string, source: sources[i % sources.length] } : l as TruthLayerResult["loves"][0]);
  const hates = ((d.hates as unknown[]) ?? []).map((h, i) =>
    typeof h === "string" ? { text: h as string, source: sources[i % sources.length] } : h as TruthLayerResult["hates"][0]);
  const hiddenInsights = ((d.hiddenInsights as unknown[]) ?? []).map((ins, i) => {
    const obj = ins as Record<string, unknown>;
    return {
      type: (obj.type ?? "neutral") as TruthLayerResult["hiddenInsights"][0]["type"],
      text: String(obj.text ?? ""),
      source: String(obj.source ?? sources[i % sources.length]),
    };
  });
  return {
    ...(d as unknown as TruthLayerResult),
    analysisStats: {
      reviewsAnalyzed: toNum(rawStats.reviewsAnalyzed),
      sourcesScanned:  toNum(rawStats.sourcesScanned),
      dataPoints:      toNum(rawStats.dataPoints),
      timeTaken:       String(rawStats.timeTaken ?? "2s"),
    },
    sourcePlatforms: sources,
    loves,
    hates,
    hiddenInsights,
    summary:         String(d.summary ?? d.truthSummary ?? ""),
    keyFacts:        (d.keyFacts as TruthLayerResult["keyFacts"] | undefined) ?? [],
    ratingBreakdown: (d.ratingBreakdown as TruthLayerResult["ratingBreakdown"] | undefined),
    sourceInsights:  (d.sourceInsights as TruthLayerResult["sourceInsights"] | undefined) ?? [],
    alternatives:    (d.alternatives as TruthLayerResult["alternatives"] | undefined) ?? [],
    competitors:     (d.competitors as TruthLayerResult["competitors"] | undefined) ?? [],
    customerReviews: (d.customerReviews as TruthLayerResult["customerReviews"] | undefined) ?? [],
    whoShouldBuy:    (d.whoShouldBuy as string[] | undefined) ?? [],
    whoShouldSkip:   (d.whoShouldSkip as string[] | undefined) ?? [],
    verdict: {
      ...((d.verdict ?? {}) as TruthLayerResult["verdict"]),
      type: normalizeVerdictType((d.verdict as Record<string, unknown> | undefined)?.type),
    },
  };
}

/* ── Analysis steps ─────────────────────────────────── */
type ViewState = "input" | "analyzing" | "results";
const ANALYSIS_STEPS = [
  { icon: "🔎", text: "Identifying product…" },
  { icon: "📡", text: "Scanning Reddit & Amazon…" },
  { icon: "▶",  text: "Processing YouTube reviews…" },
  { icon: "🧠", text: "Synthesizing report…" },
];

/* ── Panel ──────────────────────────────────────────── */
export function TruthLayerPanel({ onClose }: { onClose: () => void }) {
  const [state,   setState]   = useState<ViewState>("input");
  const [stepIdx, setStepIdx] = useState(0);
  const [result,  setResult]  = useState<TruthLayerResult | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  async function runAnalysis(productName: string) {
    setError(null); setStepIdx(0); setState("analyzing");
    let p = 0;
    const iv = setInterval(() => { p = Math.min(p + 1, ANALYSIS_STEPS.length - 1); setStepIdx(p); }, 800);
    try {
      const res = await fetch("/api/ai/analyze", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ productName }) });
      clearInterval(iv);
      if (!res.ok) { const err = await res.json() as { error?: string }; throw new Error(err.error ?? "Analysis failed"); }
      const data = normalizeResult(await res.json());
      setStepIdx(ANALYSIS_STEPS.length - 1);
      await new Promise(r => setTimeout(r, 400));
      setResult(data);
      setState("results");
    } catch (err) {
      clearInterval(iv);
      setError(String(err).replace("Error: ", ""));
      setState("input");
    }
  }

  return (
    <div style={{ position:"absolute", inset:0, background:"var(--bg-base)", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={s.dotGrid} />
      <div style={{ width:"100%", flex:1, display:"flex", flexDirection:"column", position:"relative", zIndex:1, overflow:"hidden" }}>
        <TLHeader onBack={() => { if (state==="results") setState("input"); else onClose(); }} />
        {state === "input"     && <InputView onAnalyze={runAnalysis} error={error} />}
        {state === "analyzing" && <AnalyzingView stepIdx={stepIdx} />}
        {state === "results"   && result && <ResultsDashboard result={result} onReanalyze={() => { setState("input"); setResult(null); }} />}
      </div>
    </div>
  );
}

export default function TruthLayer() {
  const [, navigate] = useLocation();
  return <TruthLayerPanel onClose={() => navigate("/")} />;
}

/* ── Header ─────────────────────────────────────────── */
function TLHeader({ onBack }: { onBack: () => void }) {
  return (
    <header style={s.header}>
      <button style={s.backBtn} onClick={onBack}>
        <svg style={{ width:15, height:15 }} viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <div style={s.headerCenter}>
        <div style={s.headerIconWrap}>
          <svg style={{ width:12, height:12 }} viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M8 11h6M11 8v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <span style={{ fontSize:14, fontWeight:700, letterSpacing:"-0.2px" }}>Truth Layer</span>
        <div style={s.livePill}><span style={s.liveDot}/>LIVE</div>
      </div>
      <div style={{ width:32 }}/>
    </header>
  );
}

/* ── Input ──────────────────────────────────────────── */
function InputView({ onAnalyze, error }: { onAnalyze: (name: string) => void; error: string | null }) {
  const [value, setValue] = useState("");
  const examples = ["AirPods Pro 2", "Samsung 65\" QLED TV", "Dyson V15 Vacuum", "iPhone 16 Pro"];

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"32px 20px", gap:22 }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:44, marginBottom:12 }}>🔍</div>
        <h2 style={{ fontSize:20, fontWeight:800, color:"var(--text-primary)", marginBottom:7, letterSpacing:"-0.5px" }}>Product Intelligence</h2>
        <p style={{ fontSize:12.5, color:"var(--text-muted)", lineHeight:1.65, maxWidth:300 }}>
          AI cross-checks Reddit, Amazon, YouTube & expert reviews — delivers a professional verdict in seconds.
        </p>
      </div>

      <form onSubmit={e => { e.preventDefault(); const t=value.trim(); if(t) onAnalyze(t); }} style={{ width:"100%", maxWidth:380, display:"flex", flexDirection:"column", gap:12 }}>
        <input value={value} onChange={e => setValue(e.target.value)} placeholder="e.g. Sony WH-1000XM5 headphones" autoFocus
          style={{ width:"100%", padding:"14px 18px", background:"#fff", border:"1px solid rgba(236,72,153,0.2)", borderRadius:14, color:"var(--text-primary)", fontSize:13.5, outline:"none", boxSizing:"border-box", transition:"border-color 0.2s,box-shadow 0.2s" } as React.CSSProperties}
          onFocus={e => { e.currentTarget.style.borderColor="rgba(236,72,153,0.5)"; e.currentTarget.style.boxShadow="0 0 0 3px rgba(236,72,153,0.1)"; }}
          onBlur={e => { e.currentTarget.style.borderColor="rgba(236,72,153,0.2)"; e.currentTarget.style.boxShadow="none"; }}
        />
        <button type="submit" disabled={!value.trim()}
          style={{ padding:"14px", background: value.trim() ? "linear-gradient(135deg,#ec4899,#f43f5e)" : "var(--bg-elevated)", border:"none", borderRadius:14, color: value.trim() ? "#fff" : "var(--text-muted)", fontSize:14, fontWeight:700, cursor: value.trim() ? "pointer" : "not-allowed", transition:"all 0.2s" }}>
          Run Analysis
        </button>
        {error && <div style={{ padding:"10px 14px", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:10, fontSize:12, color:"#f87171", lineHeight:1.5 }}>⚠️ {error}. Please try again.</div>}
        <div>
          <div style={{ fontSize:10.5, color:"var(--text-muted)", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.5px", fontWeight:600 }}>Quick examples</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {examples.map(ex => (
              <button key={ex} type="button" onClick={() => setValue(ex)}
                style={{ padding:"5px 12px", background:"var(--bg-elevated)", border:"1px solid rgba(236,72,153,0.14)", borderRadius:20, color:"var(--text-secondary)", fontSize:11, cursor:"pointer" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(236,72,153,0.4)"; e.currentTarget.style.color="var(--accent)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(236,72,153,0.14)"; e.currentTarget.style.color="var(--text-secondary)"; }}>
                {ex}
              </button>
            ))}
          </div>
        </div>
      </form>

      <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center", opacity:0.5 }}>
        {[{icon:"🔴",label:"Reddit"},{icon:"🛒",label:"Amazon"},{icon:"▶",label:"YouTube"},{icon:"📰",label:"TechRadar"}].map(p => (
          <div key={p.label} style={{ display:"flex", alignItems:"center", gap:5, fontSize:10.5, color:"var(--text-muted)", background:"var(--bg-elevated)", border:"1px solid var(--border)", borderRadius:20, padding:"4px 10px" }}>
            <span style={{ fontSize:11 }}>{p.icon}</span>{p.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Analyzing ──────────────────────────────────────── */
function AnalyzingView({ stepIdx }: { stepIdx: number }) {
  return (
    <div style={s.analyzing}>
      <div style={s.orbWrap}>
        <div style={s.orbRing1}/><div style={s.orbRing2}/><div style={s.orbRing3}/>
        <div style={s.orbCore}><div style={s.orbGlow}/><span style={{ fontSize:26, position:"relative", zIndex:1 }}>🧠</span></div>
      </div>
      <h2 style={s.analyzingTitle}>Analyzing across the web…</h2>
      <p style={s.analyzingSub}>Step {stepIdx+1} of {ANALYSIS_STEPS.length}</p>
      <div style={s.stepsCard}>
        {ANALYSIS_STEPS.map((step, i) => {
          const done=i<stepIdx, active=i===stepIdx;
          return (
            <div key={i} style={{ ...s.stepRow, opacity: i>stepIdx+1?0.3:1, borderBottom: i<ANALYSIS_STEPS.length-1?"1px solid var(--border)":"none" }}>
              <div style={{ ...s.stepDot, background: done?"var(--green)":active?"var(--accent)":"var(--bg-elevated)", borderColor: done?"var(--green)":active?"var(--accent)":"var(--border)", boxShadow: active?"0 0 0 3px rgba(236,72,153,0.15)":done?"0 0 6px rgba(16,185,129,0.3)":"none" }}/>
              <span style={{ fontSize:14 }}>{step.icon}</span>
              <span style={{ fontSize:12.5, flex:1, color: done?"var(--green)":active?"var(--text-primary)":"var(--text-muted)", fontWeight: active?600:400 }}>{step.text}</span>
              {done && <span style={{ fontSize:10, color:"var(--green)", fontWeight:700 }}>✓</span>}
              {active && <div style={s.stepSpinner}/>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Section header helper ───────────────────────────── */
function SectionHead2({ icon, title, badge, badgeFg = "var(--accent)", badgeBg = "rgba(236,72,153,0.1)" }: { icon: string; title: string; badge?: string; badgeFg?: string; badgeBg?: string }) {
  return (
    <div style={{ padding:"11px 14px 10px", background:"linear-gradient(135deg,rgba(236,72,153,0.04),rgba(244,63,94,0.01))", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:7 }}>
      <span style={{ fontSize:14 }}>{icon}</span>
      <span style={{ fontSize:11.5, fontWeight:700, color:"var(--text-primary)", letterSpacing:"-0.1px" }}>{title}</span>
      {badge && (
        <span style={{ marginLeft:"auto", fontSize:9.5, fontWeight:700, color:badgeFg, background:badgeBg, border:`1px solid ${badgeFg}33`, borderRadius:6, padding:"2px 7px", flexShrink:0 }}>
          {badge}
        </span>
      )}
    </div>
  );
}

/* ── DownloadCard2 ───────────────────────────────────── */
function DownloadCard({ onDownload, downloaded, product, score }: { onDownload: () => void; downloaded: boolean; product: TruthLayerResult["product"]; score: number }) {
  return (
    <div style={{ background:"linear-gradient(135deg,rgba(236,72,153,0.06),rgba(244,63,94,0.03))", border:"1px solid rgba(236,72,153,0.22)", borderRadius:14, padding:"14px 16px", display:"flex", alignItems:"center", gap:14 }}>
      <div style={{ width:44, height:44, borderRadius:12, background:"linear-gradient(135deg,rgba(236,72,153,0.15),rgba(244,63,94,0.08))", border:"1px solid rgba(236,72,153,0.25)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>📄</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:12.5, fontWeight:700, color:"var(--text-primary)", marginBottom:2 }}>Download Full Report</div>
        <div style={{ fontSize:10.5, color:"var(--text-muted)", lineHeight:1.5 }}>{product.name} · Score {(score/10).toFixed(1)}/10 · All sections as .txt</div>
      </div>
      <button onClick={onDownload} style={{ display:"flex", alignItems:"center", gap:5, padding:"9px 15px", background: downloaded ? "rgba(52,211,153,0.12)" : "var(--accent)", border: downloaded ? "1px solid rgba(52,211,153,0.3)" : "1px solid transparent", borderRadius:9, color: downloaded ? "#34d399" : "#fff", fontSize:11.5, fontWeight:700, cursor:"pointer", flexShrink:0, whiteSpace:"nowrap", transition:"all 0.25s" }}>
        {downloaded ? "✓ Saved!" : "⬇ Download"}
      </button>
    </div>
  );
}

/* ── Rating Breakdown2 ───────────────────────────────── */
function RatingBreakdown({ breakdown }: { breakdown: NonNullable<TruthLayerResult["ratingBreakdown"]> }) {
  const [anim, setAnim] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnim(true), 120); return () => clearTimeout(t); }, []);
  const rows: { label: string; key: keyof typeof breakdown; color: string }[] = [
    { label:"5 ★", key:"5star", color:"#34d399" },
    { label:"4 ★", key:"4star", color:"#86efac" },
    { label:"3 ★", key:"3star", color:"#fbbf24" },
    { label:"2 ★", key:"2star", color:"#fb923c" },
    { label:"1 ★", key:"1star", color:"#f87171" },
  ];
  return (
    <div style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", borderRadius:13, overflow:"hidden" }}>
      <SectionHead2 icon="⭐" title="Rating Breakdown" badge="Auto-detected" />
      <div style={{ padding:"11px 14px 13px", display:"flex", flexDirection:"column", gap:7 }}>
        {rows.map(({ label, key, color }) => {
          const pct = breakdown[key] ?? 0;
          return (
            <div key={key} style={{ display:"flex", alignItems:"center", gap:9 }}>
              <span style={{ fontSize:10, fontWeight:700, color:"var(--text-secondary)", width:28, flexShrink:0, textAlign:"right" }}>{label}</span>
              <div style={{ flex:1, height:7, background:"var(--bg-elevated)", borderRadius:5, overflow:"hidden" }}>
                <div style={{ width: anim ? `${pct}%` : "0%", height:"100%", background:color, borderRadius:5, transition:"width 0.85s cubic-bezier(0.16,1,0.3,1)" }} />
              </div>
              <span style={{ fontSize:10, fontWeight:700, color, width:28, flexShrink:0 }}>{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Customer Reviews2 ───────────────────────────────── */
function CustomerReviewsCard({ reviews }: { reviews: NonNullable<TruthLayerResult["customerReviews"]> }) {
  return (
    <div style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", borderRadius:13, overflow:"hidden" }}>
      <SectionHead2 icon="💬" title="Customer Reviews" badge="AI-curated from real buyers" />
      <div style={{ display:"flex", flexDirection:"column" }}>
        {reviews.map((rev, i) => (
          <div key={i} style={{ padding:"12px 14px", borderBottom: i < reviews.length-1 ? "1px solid var(--border)" : "none" }}>
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10, marginBottom:5 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:5, flexWrap:"wrap", marginBottom:3 }}>
                  <span style={{ fontSize:11.5, fontWeight:700, color:"var(--text-primary)" }}>{rev.reviewer}</span>
                  {rev.verified && <span style={{ fontSize:8.5, fontWeight:700, color:"#34d399", background:"rgba(52,211,153,0.1)", border:"1px solid rgba(52,211,153,0.25)", borderRadius:4, padding:"1px 5px" }}>✓ Verified</span>}
                  <SourceBadge source={rev.source} size="xs" />
                </div>
                <div style={{ fontSize:12.5, fontWeight:700, color:"var(--text-primary)", lineHeight:1.35 }}>{rev.title}</div>
              </div>
              <div style={{ flexShrink:0, display:"flex", flexDirection:"column", alignItems:"flex-end", gap:2 }}>
                <div style={{ display:"flex", gap:1 }}>{[1,2,3,4,5].map(s => <span key={s} style={{ fontSize:12, color: s<=rev.rating ? "#fbbf24" : "rgba(0,0,0,0.1)" }}>★</span>)}</div>
                <span style={{ fontSize:9, color:"var(--text-muted)" }}>{rev.date}</span>
              </div>
            </div>
            <p style={{ fontSize:12, color:"var(--text-secondary)", lineHeight:1.7, margin:"0 0 6px" }}>{rev.text}</p>
            <span style={{ fontSize:9.5, color:"var(--text-muted)" }}>👍 {rev.helpful} found this helpful</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Who Should Buy / Skip2 ──────────────────────────── */
function WhoCard({ shouldBuy, shouldSkip }: { shouldBuy: string[]; shouldSkip: string[] }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      {shouldBuy.length > 0 && (
        <div style={{ background:"var(--bg-surface)", border:"1px solid rgba(52,211,153,0.2)", borderRadius:13, overflow:"hidden" }}>
          <SectionHead2 icon="✅" title="Who Should Buy This" badge={`${shouldBuy.length} profiles`} badgeFg="#34d399" badgeBg="rgba(52,211,153,0.1)" />
          <div style={{ display:"flex", flexDirection:"column" }}>
            {shouldBuy.map((item, i) => (
              <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"9px 14px", borderBottom: i<shouldBuy.length-1 ? "1px solid rgba(52,211,153,0.07)" : "none", borderLeft:"3px solid #34d399" }}>
                <span style={{ fontSize:12, color:"#34d399", fontWeight:800, flexShrink:0, marginTop:1 }}>✓</span>
                <span style={{ fontSize:12, color:"var(--text-primary)", lineHeight:1.6 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {shouldSkip.length > 0 && (
        <div style={{ background:"var(--bg-surface)", border:"1px solid rgba(248,113,113,0.2)", borderRadius:13, overflow:"hidden" }}>
          <SectionHead2 icon="🚫" title="Who Should Skip This" badge={`${shouldSkip.length} profiles`} badgeFg="#f87171" badgeBg="rgba(248,113,113,0.1)" />
          <div style={{ display:"flex", flexDirection:"column" }}>
            {shouldSkip.map((item, i) => (
              <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"9px 14px", borderBottom: i<shouldSkip.length-1 ? "1px solid rgba(248,113,113,0.07)" : "none", borderLeft:"3px solid #f87171" }}>
                <span style={{ fontSize:12, color:"#f87171", fontWeight:800, flexShrink:0, marginTop:1 }}>✗</span>
                <span style={{ fontSize:12, color:"var(--text-primary)", lineHeight:1.6 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Download Report ────────────────────────────────── */
function downloadReport(result: TruthLayerResult) {
  const hr = "─".repeat(60);
  const lines: string[] = [
    "╔══════════════════════════════════════════════════════════╗",
    "║         DecisionAI — Product Intelligence Report         ║",
    "╚══════════════════════════════════════════════════════════╝",
    `Generated: ${new Date().toLocaleString()}`,
    "",
    hr,
    `PRODUCT: ${result.product.name}`,
    `Brand   : ${result.product.brand}`,
    `Category: ${result.product.category ?? "—"}`,
    `Price   : ${result.product.price}${result.product.priceRange ? ` (${result.product.priceRange})` : ""}`,
    `Rating  : ★ ${result.product.rating} (${result.product.reviewCount} reviews)`,
    `Score   : ${(result.truthScore / 10).toFixed(1)} / 10 — ${result.scoreLabel}`,
    "",
    hr,
    "AI VERDICT SUMMARY",
    hr,
    result.summary || result.truthSummary,
    "",
  ];

  if (result.keyFacts?.length) {
    lines.push(hr, "KEY SPECS", hr);
    result.keyFacts.forEach(f => lines.push(`  ${f.label.padEnd(16)}: ${f.value}`));
    lines.push("");
  }

  if (result.sourceInsights?.length) {
    lines.push(hr, "WHAT THE WEB SAYS", hr);
    result.sourceInsights.forEach(si => {
      lines.push(`[${si.source}]`);
      lines.push(`  ${si.insight}`);
      lines.push(`  → ${si.searchUrl}`);
      lines.push("");
    });
  }

  lines.push(hr, "WHAT USERS LOVE", hr);
  result.loves.forEach(l => {
    const item = typeof l === "string" ? { text: l, source: "—" } : l;
    lines.push(`  ✓ ${item.text}  [${item.source}]`);
  });
  lines.push("", hr, "COMMON COMPLAINTS", hr);
  result.hates.forEach(h => {
    const item = typeof h === "string" ? { text: h, source: "—" } : h;
    lines.push(`  ✗ ${item.text}  [${item.source}]`);
  });
  lines.push("");

  if (result.hiddenInsights?.length) {
    lines.push(hr, "THINGS MOST BUYERS MISS", hr);
    result.hiddenInsights.forEach(ins =>
      lines.push(`  [${ins.type.toUpperCase()}] ${ins.text}  (${ins.source})`));
    lines.push("");
  }

  if (result.alternatives?.length) {
    lines.push(hr, "BETTER ALTERNATIVES", hr);
    result.alternatives.forEach(alt => {
      lines.push(`  ${alt.badge}  ${alt.name} — ${alt.price}`);
      lines.push(`     ${alt.why}`);
      lines.push(`     🛒 ${alt.amazonUrl}`);
      lines.push(`     🔍 ${alt.googleUrl}`);
      lines.push("");
    });
  }

  lines.push(
    hr, "FINAL VERDICT", hr,
    `${result.verdict.emoji}  ${result.verdict.label}`,
    result.verdict.reasoning,
    "",
    hr,
    "Report by DecisionAI · AI-powered product intelligence",
    hr,
  );

  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${result.product.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-truth-report.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ── Results Dashboard ──────────────────────────────── */
function ResultsDashboard({ result, onReanalyze }: { result: TruthLayerResult; onReanalyze: () => void }) {
  const [downloaded, setDownloaded] = useState(false);

  function handleDownload() {
    downloadReport(result);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  }

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ flex:1, overflowY:"auto", padding:"14px 14px 40px", display:"flex", flexDirection:"column", gap:11 }}>

        {/* 1. Product header + score */}
        <ProductHeader product={result.product} score={result.truthScore} verdict={result.verdict} stats={result.analysisStats} />

        {/* 2. AI Summary — first thing user reads */}
        <SummaryCard summary={result.summary || result.truthSummary} />

        {/* 3. Rating breakdown — auto-detected from review distribution */}
        {result.ratingBreakdown && <RatingBreakdown breakdown={result.ratingBreakdown} />}

        {/* 4. Key specs grid */}
        {(result.keyFacts ?? []).length > 0 && <KeyFactsGrid facts={result.keyFacts!} />}

        {/* 5. Source intelligence — what each platform says with links */}
        <SourceIntelligence insights={result.sourceInsights ?? []} platforms={result.sourcePlatforms ?? []} />

        {/* 6. Pros & Cons */}
        <ProsConsCard loves={result.loves} hates={result.hates} />

        {/* 7. Customer reviews */}
        {(result.customerReviews ?? []).length > 0 && <CustomerReviewsCard reviews={result.customerReviews!} />}

        {/* 8. Who should buy / who should skip */}
        {((result.whoShouldBuy ?? []).length > 0 || (result.whoShouldSkip ?? []).length > 0) && (
          <WhoCard shouldBuy={result.whoShouldBuy ?? []} shouldSkip={result.whoShouldSkip ?? []} />
        )}

        {/* 9. Hidden insights */}
        {(result.hiddenInsights ?? []).length > 0 && <WatchOutCard insights={result.hiddenInsights} />}

        {/* 10. Better alternatives with buy links */}
        {(result.alternatives ?? []).length > 0 && <AlternativesCard alternatives={result.alternatives!} />}

        {/* 11. Final verdict */}
        <VerdictCard verdict={result.verdict} />

        {/* 12. Download report */}
        <DownloadCard onDownload={handleDownload} downloaded={downloaded} product={result.product} score={result.truthScore} />

        <button onClick={onReanalyze} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"11px", background:"var(--bg-surface)", border:"1px solid var(--border)", borderRadius:11, color:"var(--text-secondary)", fontSize:12.5, fontWeight:600, cursor:"pointer" }}>
          ← Analyze Another Product
        </button>
      </div>
    </div>
  );
}

/* ── 1. Product Header ──────────────────────────────── */
function ProductHeader({ product, score, verdict, stats }: { product: TruthLayerResult["product"]; score: number; verdict: TruthLayerResult["verdict"]; stats: TruthLayerResult["analysisStats"] }) {
  const col = score>=80 ? "#34d399" : score>=65 ? "#fbbf24" : "#f87171";
  const verdictCfgMap = {
    recommended: { bg:"rgba(52,211,153,0.12)", color:"#34d399", border:"rgba(52,211,153,0.3)" },
    consider:    { bg:"rgba(251,191,36,0.12)",  color:"#fbbf24", border:"rgba(251,191,36,0.3)" },
    avoid:       { bg:"rgba(248,113,113,0.12)", color:"#f87171", border:"rgba(248,113,113,0.3)" },
  };
  const verdictCfg = verdictCfgMap[verdict.type as keyof typeof verdictCfgMap] ?? verdictCfgMap.recommended;

  return (
    <div style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", borderRadius:16, overflow:"hidden" }}>
      {/* Top row */}
      <div style={{ padding:"14px 16px 12px", display:"flex", alignItems:"flex-start", gap:14 }}>
        {/* Score circle */}
        <div style={{ flexShrink:0, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
          <ScoreRing score={score} color={col} size={68} />
        </div>
        {/* Product info */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:9.5, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.7px", marginBottom:3 }}>{product.brand} · {product.category || product.store}</div>
          <div style={{ fontSize:14, fontWeight:800, color:"var(--text-primary)", lineHeight:1.3, marginBottom:8 }}>{product.name}</div>
          <div style={{ display:"flex", flexWrap:"wrap", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:16, fontWeight:900, color:"var(--accent)", letterSpacing:"-0.5px" }}>{product.price}</span>
            {product.priceRange && <span style={{ fontSize:10, color:"var(--text-muted)" }}>({product.priceRange})</span>}
            <span style={{ fontSize:11, color:"#fbbf24", fontWeight:600 }}>★ {product.rating}</span>
            <span style={{ fontSize:10, color:"var(--text-muted)" }}>{product.reviewCount} reviews</span>
          </div>
        </div>
      </div>
      {/* Bottom bar */}
      <div style={{ padding:"9px 16px 10px", borderTop:"1px solid var(--border)", background:"rgba(236,72,153,0.02)", display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
        <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:11.5, fontWeight:700, color:verdictCfg.color, background:verdictCfg.bg, border:`1px solid ${verdictCfg.border}`, borderRadius:20, padding:"4px 10px" }}>
          {verdict.emoji} {verdict.label}
        </span>
        <span style={{ fontSize:10, color:"var(--text-muted)" }}>
          <b style={{ color:"var(--accent)" }}>{stats.reviewsAnalyzed.toLocaleString()}</b> reviews · <b style={{ color:"var(--green)" }}>{stats.sourcesScanned}</b> sources
        </span>
      </div>
    </div>
  );
}

function ScoreRing({ score, color, size }: { score: number; color: string; size: number }) {
  const [anim, setAnim] = useState(0);
  useEffect(() => {
    const dur=1200, start=performance.now();
    const tick=(now:number)=>{ const t=Math.min((now-start)/dur,1); setAnim(+(( 1-Math.pow(1-t,4))*score).toFixed(1)); if(t<1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }, [score]);
  const r=28, cx=size/2, cy=size/2, circ=2*Math.PI*r, arc=(250/360)*circ, filled=(score/100)*arc;
  return (
    <div style={{ position:"relative", width:size, height:size }}>
      <svg width={size} height={size}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(236,72,153,0.1)" strokeWidth={5} strokeDasharray={`${arc} ${circ-arc}`} strokeLinecap="round" transform={`rotate(-215 ${cx} ${cy})`}/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={5} strokeDasharray={`${filled} ${circ-filled}`} strokeLinecap="round" transform={`rotate(-215 ${cx} ${cy})`} style={{ filter:`drop-shadow(0 0 5px ${color}80)` }}/>
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
        <span style={{ fontSize:16, fontWeight:900, color, lineHeight:1, letterSpacing:"-1px" }}>{(anim/10).toFixed(1)}</span>
        <span style={{ fontSize:8, color:"var(--text-muted)", fontWeight:600 }}>/10</span>
      </div>
    </div>
  );
}

/* ── 2. AI Summary ──────────────────────────────────── */
function SummaryCard({ summary }: { summary: string }) {
  return (
    <div style={{ padding:"13px 15px", background:"linear-gradient(135deg,rgba(236,72,153,0.06),rgba(244,63,94,0.03))", border:"1px solid rgba(236,72,153,0.18)", borderRadius:13, borderLeft:"3px solid var(--accent)" }}>
      <div style={{ fontSize:9.5, fontWeight:700, color:"var(--accent)", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6 }}>🧠 AI Verdict Summary</div>
      <p style={{ fontSize:13, color:"var(--text-primary)", lineHeight:1.72, margin:0, fontWeight:500 }}>{summary}</p>
    </div>
  );
}

/* ── 3. Key Facts Grid ──────────────────────────────── */
function KeyFactsGrid({ facts }: { facts: NonNullable<TruthLayerResult["keyFacts"]> }) {
  return (
    <div style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", borderRadius:13, overflow:"hidden" }}>
      <div style={{ padding:"10px 14px 8px", borderBottom:"1px solid var(--border)" }}>
        <span style={{ fontSize:11, fontWeight:700, color:"var(--text-primary)" }}>📋 Key Specs</span>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:0 }}>
        {facts.slice(0,6).map((f, i) => (
          <div key={i} style={{ padding:"10px 13px", borderRight: i%3!==2?"1px solid var(--border)":"none", borderBottom: i<3?"1px solid var(--border)":"none" }}>
            <div style={{ fontSize:9.5, fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:3 }}>{f.label}</div>
            <div style={{ fontSize:12.5, fontWeight:700, color:"var(--text-primary)", lineHeight:1.3 }}>{f.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 4. Source Intelligence ─────────────────────────── */
const SOURCE_CFG: Record<string, { icon: string; color: string; bg: string; border: string; label: string }> = {
  Reddit:    { icon:"🔴", color:"#FF4500", bg:"rgba(255,69,0,0.07)",    border:"rgba(255,69,0,0.2)",    label:"Reddit" },
  Amazon:    { icon:"🛒", color:"#FF9900", bg:"rgba(255,153,0,0.07)",   border:"rgba(255,153,0,0.2)",   label:"Amazon" },
  YouTube:   { icon:"▶",  color:"#FF0000", bg:"rgba(255,0,0,0.06)",     border:"rgba(255,0,0,0.18)",    label:"YouTube" },
  TechRadar: { icon:"📰", color:"#7C3AED", bg:"rgba(124,58,237,0.07)",  border:"rgba(124,58,237,0.2)", label:"TechRadar" },
  Google:    { icon:"🔍", color:"#4285F4", bg:"rgba(66,133,244,0.07)",  border:"rgba(66,133,244,0.2)", label:"Google" },
  Quora:     { icon:"Q",  color:"#B92B27", bg:"rgba(185,43,39,0.07)",   border:"rgba(185,43,39,0.2)",  label:"Quora" },
  RTINGS:    { icon:"R",  color:"#10B981", bg:"rgba(16,185,129,0.07)",  border:"rgba(16,185,129,0.2)", label:"RTINGS" },
};

function SourceBadge({ source, size="sm" }: { source: string; size?: "sm"|"xs" }) {
  const m = SOURCE_CFG[source] ?? { icon:"◆", color:"#7a3358", bg:"rgba(122,51,88,0.07)", border:"rgba(122,51,88,0.2)", label:source };
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4, background:m.bg, border:`1px solid ${m.border}`, borderRadius:20, padding: size==="xs"?"1px 6px":"2px 8px", fontSize: size==="xs"?9:10, fontWeight:700, color:m.color, flexShrink:0 }}>
      <span style={{ fontSize: size==="xs"?8:9 }}>{m.icon}</span>{m.label}
    </span>
  );
}

function SourceIntelligence({ insights, platforms }: { insights: NonNullable<TruthLayerResult["sourceInsights"]>; platforms: string[] }) {
  const displayInsights = insights.length > 0 ? insights : platforms.map(p => ({
    source: p,
    insight: "Scanned for reviews, sentiment, and key discussion points.",
    searchUrl: SOURCE_CFG[p] ? `https://www.google.com/search?q=${encodeURIComponent(p + " reviews")}` : "#",
  }));

  return (
    <div style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", borderRadius:13, overflow:"hidden" }}>
      <div style={{ padding:"10px 14px 9px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:11, fontWeight:700, color:"var(--text-primary)" }}>🌐 What the Web Says</span>
        <span style={{ fontSize:9.5, color:"var(--text-muted)", background:"var(--bg-elevated)", border:"1px solid var(--border)", borderRadius:6, padding:"1px 6px" }}>Sourced</span>
      </div>
      <div style={{ display:"flex", flexDirection:"column" }}>
        {displayInsights.map((ins, i) => {
          const cfg = SOURCE_CFG[ins.source] ?? { icon:"◆", color:"#7a3358", bg:"rgba(122,51,88,0.06)", border:"rgba(122,51,88,0.15)", label:ins.source };
          return (
            <div key={i} style={{ display:"flex", gap:11, padding:"11px 14px", borderBottom: i<displayInsights.length-1?"1px solid rgba(236,72,153,0.06)":"none", borderLeft:`3px solid ${cfg.color}` }}>
              <div style={{ flexShrink:0, marginTop:1 }}>
                <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:26, height:26, background:cfg.bg, border:`1px solid ${cfg.border}`, borderRadius:8, fontSize:13 }}>{cfg.icon}</span>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:6, marginBottom:4 }}>
                  <span style={{ fontSize:11, fontWeight:700, color:cfg.color }}>{cfg.label}</span>
                  <a href={ins.searchUrl} target="_blank" rel="noreferrer" style={{ display:"inline-flex", alignItems:"center", gap:3, fontSize:9.5, color:"var(--text-muted)", background:"var(--bg-elevated)", border:"1px solid var(--border)", borderRadius:5, padding:"2px 7px", textDecoration:"none", fontWeight:600, flexShrink:0 }}>
                    View ↗
                  </a>
                </div>
                <p style={{ fontSize:12, color:"var(--text-secondary)", lineHeight:1.6, margin:0 }}>{ins.insight}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── 5. Pros & Cons ─────────────────────────────────── */
function ProsConsCard({ loves, hates }: { loves: TruthLayerResult["loves"]; hates: TruthLayerResult["hates"] }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      {/* Pros */}
      <div style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", borderRadius:13, overflow:"hidden" }}>
        <div style={{ padding:"10px 14px 9px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:7 }}>
          <span style={{ fontSize:13 }}>✅</span>
          <span style={{ fontSize:11, fontWeight:700, color:"#34d399" }}>What Users Love</span>
          <span style={{ marginLeft:"auto", fontSize:9.5, color:"var(--text-muted)" }}>{loves.length} points</span>
        </div>
        {loves.map((l, i) => {
          const item = typeof l === "string" ? { text:l, source:"Reddit" } : l;
          return (
            <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:9, padding:"9px 14px", borderBottom: i<loves.length-1?"1px solid rgba(52,211,153,0.07)":"none", borderLeft:"3px solid #34d399" }}>
              <span style={{ color:"#34d399", fontWeight:800, flexShrink:0, fontSize:12, marginTop:1 }}>✓</span>
              <span style={{ fontSize:12, color:"var(--text-primary)", lineHeight:1.55, flex:1 }}>{item.text}</span>
              <SourceBadge source={item.source} size="xs" />
            </div>
          );
        })}
      </div>
      {/* Cons */}
      <div style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", borderRadius:13, overflow:"hidden" }}>
        <div style={{ padding:"10px 14px 9px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:7 }}>
          <span style={{ fontSize:13 }}>⚠️</span>
          <span style={{ fontSize:11, fontWeight:700, color:"#f87171" }}>Common Complaints</span>
          <span style={{ marginLeft:"auto", fontSize:9.5, color:"var(--text-muted)" }}>{hates.length} points</span>
        </div>
        {hates.map((h, i) => {
          const item = typeof h === "string" ? { text:h, source:"Reddit" } : h;
          return (
            <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:9, padding:"9px 14px", borderBottom: i<hates.length-1?"1px solid rgba(248,113,113,0.07)":"none", borderLeft:"3px solid #f87171" }}>
              <span style={{ color:"#f87171", fontWeight:800, flexShrink:0, fontSize:12, marginTop:1 }}>✗</span>
              <span style={{ fontSize:12, color:"var(--text-primary)", lineHeight:1.55, flex:1 }}>{item.text}</span>
              <SourceBadge source={item.source} size="xs" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── 6. Watch Out ───────────────────────────────────── */
function WatchOutCard({ insights }: { insights: TruthLayerResult["hiddenInsights"] }) {
  const cfg = {
    warning:  { bg:"rgba(251,191,36,0.07)",  border:"#fbbf24", icon:"⚠️", label:"Warning",    color:"#fbbf24" },
    positive: { bg:"rgba(52,211,153,0.06)",  border:"#34d399", icon:"💡", label:"Hidden Gem", color:"#34d399" },
    neutral:  { bg:"rgba(108,141,250,0.06)", border:"#6c8dfa", icon:"ℹ️", label:"Note",       color:"#6c8dfa" },
  };
  return (
    <div style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", borderRadius:13, overflow:"hidden" }}>
      <div style={{ padding:"10px 14px 9px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:7 }}>
        <span style={{ fontSize:13 }}>🔦</span>
        <span style={{ fontSize:11, fontWeight:700, color:"var(--text-primary)" }}>Things Most Buyers Miss</span>
        <span style={{ marginLeft:"auto", fontSize:9, fontWeight:600, color:"#fbbf24", background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.2)", borderRadius:5, padding:"2px 7px" }}>Not in ratings</span>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8, padding:"10px 12px" }}>
        {insights.map((ins, i) => {
          const c = cfg[ins.type];
          return (
            <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:9, padding:"10px 12px", background:c.bg, borderLeft:`3px solid ${c.border}`, borderRadius:9 }}>
              <span style={{ fontSize:15, flexShrink:0 }}>{c.icon}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:9.5, fontWeight:700, color:c.color, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:3 }}>{c.label}</div>
                <p style={{ fontSize:12, color:"var(--text-primary)", lineHeight:1.6, margin:0, fontWeight:500 }}>{ins.text}</p>
                {ins.source && <div style={{ marginTop:6 }}><SourceBadge source={ins.source} size="xs" /></div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── 7. Alternatives ────────────────────────────────── */
function AlternativesCard({ alternatives }: { alternatives: NonNullable<TruthLayerResult["alternatives"]> }) {
  return (
    <div style={{ background:"var(--bg-surface)", border:"1px solid rgba(236,72,153,0.15)", borderRadius:13, overflow:"hidden" }}>
      <div style={{ padding:"10px 14px 9px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:7 }}>
        <span style={{ fontSize:13 }}>⚡</span>
        <span style={{ fontSize:11, fontWeight:700, color:"var(--text-primary)" }}>Consider These Instead</span>
        <span style={{ marginLeft:"auto", fontSize:9.5, color:"var(--text-muted)" }}>Better alternatives</span>
      </div>
      <div style={{ display:"flex", flexDirection:"column" }}>
        {alternatives.map((alt, i) => (
          <div key={i} style={{ padding:"11px 14px", borderBottom: i<alternatives.length-1?"1px solid rgba(236,72,153,0.06)":"none" }}>
            {/* Alt header row */}
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10, marginBottom:5 }}>
              <div>
                <div style={{ fontSize:9.5, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:2 }}>{alt.brand}</div>
                <div style={{ fontSize:13, fontWeight:700, color:"var(--text-primary)", lineHeight:1.3 }}>{alt.name}</div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4, flexShrink:0 }}>
                <span style={{ fontSize:15, fontWeight:900, color:"var(--accent)", letterSpacing:"-0.5px" }}>{alt.price}</span>
                <span style={{ fontSize:9.5, fontWeight:700, color:"var(--text-muted)", background:"var(--bg-elevated)", border:"1px solid var(--border)", borderRadius:5, padding:"1px 6px" }}>{alt.badge}</span>
              </div>
            </div>
            {/* Why */}
            <p style={{ fontSize:11.5, color:"var(--text-secondary)", lineHeight:1.55, margin:"0 0 9px" }}>{alt.why}</p>
            {/* Buy links */}
            <div style={{ display:"flex", gap:6 }}>
              <a href={alt.amazonUrl} target="_blank" rel="noreferrer"
                style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:10.5, fontWeight:700, color:"#FF9900", background:"rgba(255,153,0,0.08)", border:"1px solid rgba(255,153,0,0.2)", borderRadius:7, padding:"5px 10px", textDecoration:"none" }}>
                🛒 Amazon ↗
              </a>
              <a href={alt.googleUrl} target="_blank" rel="noreferrer"
                style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:10.5, fontWeight:700, color:"#4285F4", background:"rgba(66,133,244,0.08)", border:"1px solid rgba(66,133,244,0.2)", borderRadius:7, padding:"5px 10px", textDecoration:"none" }}>
                🔍 Google ↗
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 8. Final Verdict ───────────────────────────────── */
function VerdictCard({ verdict }: { verdict: TruthLayerResult["verdict"] }) {
  const cfg = {
    recommended: { bg:"rgba(52,211,153,0.07)",  border:"rgba(52,211,153,0.25)",  col:"#34d399", glow:"0 4px 24px rgba(52,211,153,0.12)" },
    consider:    { bg:"rgba(251,191,36,0.07)",   border:"rgba(251,191,36,0.25)",  col:"#fbbf24", glow:"0 4px 24px rgba(251,191,36,0.12)" },
    avoid:       { bg:"rgba(248,113,113,0.07)",  border:"rgba(248,113,113,0.25)", col:"#f87171", glow:"0 4px 24px rgba(248,113,113,0.12)" },
  }[verdict.type];
  return (
    <div style={{ padding:"16px", background:cfg.bg, border:`1px solid ${cfg.border}`, borderRadius:14, boxShadow:cfg.glow }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
        <div style={{ width:48, height:48, borderRadius:14, background:"rgba(255,255,255,0.6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, flexShrink:0 }}>{verdict.emoji}</div>
        <div>
          <div style={{ fontSize:9.5, color:"var(--text-muted)", letterSpacing:"0.8px", textTransform:"uppercase", marginBottom:2 }}>Final Verdict</div>
          <div style={{ fontSize:20, fontWeight:800, color:cfg.col, letterSpacing:"-0.4px" }}>{verdict.label}</div>
        </div>
      </div>
      <p style={{ fontSize:13, color:"var(--text-secondary)", lineHeight:1.72, margin:0 }}>{verdict.reasoning}</p>
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  dotGrid: { position:"fixed", inset:0, backgroundImage:"radial-gradient(circle,rgba(236,72,153,0.07) 1px,transparent 1px)", backgroundSize:"28px 28px", WebkitMaskImage:"radial-gradient(ellipse 80% 80% at 50% 50%,black 40%,transparent 100%)", maskImage:"radial-gradient(ellipse 80% 80% at 50% 50%,black 40%,transparent 100%)", pointerEvents:"none", zIndex:0 } as React.CSSProperties,
  header: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 20px", borderBottom:"1px solid rgba(236,72,153,0.12)", background:"rgba(255,240,247,0.94)", backdropFilter:"blur(28px)", zIndex:10, boxShadow:"0 1px 0 rgba(236,72,153,0.08)" },
  backBtn: { width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", background:"var(--bg-elevated)", border:"1px solid var(--border)", borderRadius:8, color:"var(--text-secondary)", cursor:"pointer" },
  headerCenter: { display:"flex", alignItems:"center", gap:9 },
  headerIconWrap: { width:26, height:26, background:"linear-gradient(135deg,rgba(236,72,153,0.2),rgba(236,72,153,0.08))", border:"1px solid rgba(236,72,153,0.25)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", color:"var(--accent)" },
  livePill: { display:"flex", alignItems:"center", gap:5, fontSize:9, fontWeight:700, letterSpacing:"0.8px", background:"rgba(16,185,129,0.12)", color:"var(--green)", border:"1px solid rgba(16,185,129,0.22)", borderRadius:20, padding:"3px 9px" },
  liveDot: { width:5, height:5, borderRadius:"50%", flexShrink:0, background:"var(--green)", animation:"pulse-glow 2s ease-in-out infinite" },
  analyzing: { flex:1, display:"flex", flexDirection:"column", alignItems:"center", padding:"40px 24px", gap:20 },
  orbWrap: { position:"relative", width:120, height:120, display:"flex", alignItems:"center", justifyContent:"center" },
  orbRing1: { position:"absolute", inset:0, borderRadius:"50%", border:"1px solid rgba(236,72,153,0.25)", animation:"spin 8s linear infinite" },
  orbRing2: { position:"absolute", inset:10, borderRadius:"50%", border:"1px solid rgba(244,63,94,0.18)", animation:"spin 12s linear infinite reverse" },
  orbRing3: { position:"absolute", inset:20, borderRadius:"50%", border:"1px solid rgba(236,72,153,0.12)", animation:"spin 6s linear infinite" },
  orbCore: { width:64, height:64, borderRadius:"50%", background:"linear-gradient(135deg,rgba(236,72,153,0.18),rgba(244,63,94,0.12))", border:"1px solid rgba(236,72,153,0.3)", display:"flex", alignItems:"center", justifyContent:"center", position:"relative" },
  orbGlow: { position:"absolute", inset:0, borderRadius:"50%", background:"radial-gradient(circle,rgba(236,72,153,0.25) 0%,transparent 70%)", animation:"pulse-glow 2s ease-in-out infinite" },
  analyzingTitle: { fontSize:18, fontWeight:800, letterSpacing:"-0.4px", color:"var(--text-primary)", textAlign:"center" },
  analyzingSub: { fontSize:12.5, color:"var(--text-muted)", textAlign:"center", marginTop:-12 },
  stepsCard: { width:"100%", maxWidth:420, background:"var(--bg-surface)", border:"1px solid var(--border)", borderRadius:14, overflow:"hidden" },
  stepRow: { display:"flex", alignItems:"center", gap:10, padding:"10px 14px" },
  stepDot: { width:8, height:8, borderRadius:"50%", flexShrink:0, border:"1.5px solid" },
  stepSpinner: { width:12, height:12, borderRadius:"50%", border:"1.5px solid rgba(236,72,153,0.2)", borderTopColor:"var(--accent)", animation:"spin 0.7s linear infinite", flexShrink:0 },
};
