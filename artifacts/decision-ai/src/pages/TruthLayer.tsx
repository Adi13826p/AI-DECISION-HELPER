import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { type TruthLayerResult } from "@/lib/mockData";

type ViewState = "input" | "analyzing" | "results";

const ANALYSIS_STEPS = [
  { icon: "🔎", text: "Identifying product…" },
  { icon: "💬", text: "Scanning Reddit discussions…" },
  { icon: "❓", text: "Analyzing Quora threads…" },
  { icon: "🔍", text: "Processing Google expert reviews…" },
  { icon: "▶",  text: "Summarizing YouTube reviews…" },
  { icon: "🧠", text: "Synthesizing cross-platform report…" },
];

export default function TruthLayer() {
  const [, navigate] = useLocation();
  const [state, setState] = useState<ViewState>("input");
  const [stepIdx, setStepIdx] = useState(0);
  const [result, setResult] = useState<TruthLayerResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAnalysis(productName: string) {
    setError(null);
    setStepIdx(0);
    setState("analyzing");

    let p = 0;
    const iv = setInterval(() => {
      p = Math.min(p + 1, ANALYSIS_STEPS.length - 1);
      setStepIdx(p);
    }, 700);

    try {
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName }),
      });

      clearInterval(iv);

      if (!response.ok) {
        const err = await response.json() as { error?: string };
        throw new Error(err.error ?? "Analysis failed");
      }

      const data = await response.json() as TruthLayerResult;
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
    <div style={s.root}>
      <div style={s.blob1} /><div style={s.blob2} /><div style={s.blob3} />
      <div style={s.dotGrid} />
      <div style={s.page}>
        <Header onBack={() => {
          if (state === "results") setState("input");
          else navigate("/");
        }} />
        {state === "input"     && <InputView onAnalyze={runAnalysis} error={error} />}
        {state === "analyzing" && <AnalyzingView stepIdx={stepIdx} />}
        {state === "results"   && result && (
          <ResultsDashboard result={result} onReanalyze={() => setState("input")} />
        )}
      </div>
    </div>
  );
}

/* ─── Header ─────────────────────────────────────── */
function Header({ onBack }: { onBack: () => void }) {
  return (
    <header style={s.header}>
      <button style={s.backBtn} onClick={onBack}>
        <svg style={{ width: 15, height: 15 }} viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <div style={s.headerCenter}>
        <div style={s.headerIconWrap}>
          <svg style={{ width: 12, height: 12 }} viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M8 11h6M11 8v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.2px" }}>Truth Layer</span>
        <div style={s.livePill}><span style={s.liveDot} />LIVE</div>
      </div>
      <div style={{ width: 32 }} />
    </header>
  );
}

/* ─── Input ───────────────────────────────────────── */
function InputView({ onAnalyze, error }: { onAnalyze: (name: string) => void; error: string | null }) {
  const [value, setValue] = useState("");
  const examples = ["AirPods Pro 2", "Samsung 65\" OLED TV", "Dyson V15 Vacuum", "iPhone 16 Pro"];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = value.trim();
    if (t) onAnalyze(t);
  }

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"32px 20px", gap:24 }}>
      <div style={{ textAlign:"center", marginBottom:4 }}>
        <div style={{ fontSize:44, marginBottom:14 }}>🔍</div>
        <h2 style={{ fontSize:20, fontWeight:800, color:"var(--text-primary)", marginBottom:7, letterSpacing:"-0.5px" }}>Product Intelligence</h2>
        <p style={{ fontSize:12.5, color:"var(--text-muted)", lineHeight:1.65, maxWidth:300 }}>
          Enter any product. AI cross-checks Reddit, Quora, Google, and YouTube — delivers a professional verdict in seconds.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ width:"100%", maxWidth:380, display:"flex", flexDirection:"column", gap:12 }}>
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="e.g. Sony WH-1000XM5 headphones"
          autoFocus
          style={{
            width:"100%", padding:"14px 18px",
            background:"rgba(255,255,255,0.04)",
            border:"1px solid rgba(255,255,255,0.1)",
            borderRadius:14, color:"var(--text-primary)",
            fontSize:13.5, outline:"none", boxSizing:"border-box",
            transition:"border-color 0.2s, box-shadow 0.2s",
          }}
          onFocus={e => { e.currentTarget.style.borderColor="rgba(108,141,250,0.5)"; e.currentTarget.style.boxShadow="0 0 0 3px rgba(108,141,250,0.1)"; }}
          onBlur={e => { e.currentTarget.style.borderColor="rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow="none"; }}
        />
        <button
          type="submit"
          disabled={!value.trim()}
          style={{
            padding:"14px",
            background: value.trim() ? "linear-gradient(135deg, #6c8dfa, #a374ff)" : "rgba(255,255,255,0.06)",
            border:"none", borderRadius:14,
            color: value.trim() ? "#fff" : "var(--text-muted)",
            fontSize:14, fontWeight:700,
            cursor: value.trim() ? "pointer" : "not-allowed",
            transition:"all 0.2s", letterSpacing:"-0.2px",
          }}
        >
          Run Analysis
        </button>

        {error && (
          <div style={{ padding:"10px 14px", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:10, fontSize:12, color:"#f87171", lineHeight:1.5 }}>
            ⚠️ {error}. Please try again.
          </div>
        )}

        <div style={{ marginTop:4 }}>
          <div style={{ fontSize:10.5, color:"var(--text-muted)", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.5px", fontWeight:600 }}>Quick examples</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {examples.map(ex => (
              <button key={ex} type="button" onClick={() => setValue(ex)}
                style={{ padding:"5px 12px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:20, color:"var(--text-secondary)", fontSize:11, cursor:"pointer", transition:"all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(108,141,250,0.4)"; e.currentTarget.style.color="#a374ff"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(255,255,255,0.08)"; e.currentTarget.style.color="var(--text-secondary)"; }}
              >{ex}</button>
            ))}
          </div>
        </div>
      </form>

      {/* Source badges */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center", opacity:0.5, marginTop:4 }}>
        {[{ icon:"💬", label:"Reddit" },{ icon:"❓", label:"Quora" },{ icon:"🔍", label:"Google" },{ icon:"▶", label:"YouTube" }].map(p => (
          <div key={p.label} style={{ display:"flex", alignItems:"center", gap:5, fontSize:10.5, color:"var(--text-muted)", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:20, padding:"4px 10px" }}>
            <span style={{ fontSize:11 }}>{p.icon}</span>{p.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Analyzing ──────────────────────────────────── */
function AnalyzingView({ stepIdx }: { stepIdx: number }) {
  return (
    <div style={s.analyzing}>
      <div style={s.orbWrap}>
        <div style={s.orbRing1} /><div style={s.orbRing2} /><div style={s.orbRing3} />
        <div style={s.orbCore}>
          <div style={s.orbGlow} />
          <span style={{ fontSize:26, position:"relative", zIndex:1 }}>🧠</span>
        </div>
      </div>
      <h2 style={s.analyzingTitle}>Analyzing across the web…</h2>
      <p style={s.analyzingSub}>Step {stepIdx+1} of {ANALYSIS_STEPS.length}</p>
      <div style={s.stepsCard}>
        {ANALYSIS_STEPS.map((step, i) => {
          const done = i < stepIdx, active = i === stepIdx;
          return (
            <div key={i} style={{ ...s.stepRow, opacity: i > stepIdx+1 ? 0.3 : 1, borderBottom: i < ANALYSIS_STEPS.length-1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
              <div style={{ ...s.stepDot, background: done?"var(--green)":active?"var(--accent)":"var(--bg-elevated)", borderColor: done?"var(--green)":active?"var(--accent)":"var(--border)", boxShadow: active?"0 0 0 3px rgba(108,141,250,0.2)":done?"0 0 6px rgba(52,211,153,0.3)":"none" }} />
              <span style={{ fontSize:14 }}>{step.icon}</span>
              <span style={{ fontSize:12.5, flex:1, color:done?"var(--green)":active?"var(--text-primary)":"var(--text-muted)", fontWeight:active?600:400 }}>{step.text}</span>
              {done && <div style={s.stepCheck}>✓</div>}
              {active && <div style={s.stepSpinner} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Results Dashboard ──────────────────────────── */
function ResultsDashboard({ result, onReanalyze }: { result: TruthLayerResult; onReanalyze: () => void }) {
  return (
    <div style={s.dashboard}>
      <div style={s.dashScroll}>
        <ProductHero product={result.product} />
        <StatsTicker stats={result.analysisStats} />
        <TruthScoreCard score={result.truthScore} label={result.scoreLabel} summary={result.truthSummary} />
        <LovesHates loves={result.loves} hates={result.hates} />
        <CommunitySentiment platforms={result.platforms} />
        <KeyInsights insights={result.hiddenInsights} />
        <CompetitorComparison competitors={result.competitors} />
        <FinalVerdictCard verdict={result.verdict} />
        <button style={s.reanalyzeBtn} onClick={onReanalyze}>
          <svg style={{ width:13, height:13 }} viewBox="0 0 24 24" fill="none">
            <path d="M3 12a9 9 0 0112-8.46M21 12a9 9 0 01-12 8.46" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M21 3v5h-5M3 21v-5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Analyze Another Product
        </button>
      </div>
    </div>
  );
}

/* ─── Product Hero ────────────────────────────────── */
function ProductHero({ product }: { product: TruthLayerResult["product"] }) {
  return (
    <div style={s.productHero}>
      <div style={s.productImgWrap}>
        <img src={product.image} alt="" style={s.productImg} onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={s.productBrand}>{product.brand}</div>
        <div style={s.productName}>{product.name}</div>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:9, flexWrap:"wrap" }}>
          <span style={s.productPrice}>{product.price}</span>
          <span style={s.productRating}>★ {product.rating} · {product.reviewCount} reviews</span>
          <span style={s.productStore}>{product.store}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Stats Ticker ────────────────────────────────── */
function StatsTicker({ stats }: { stats: TruthLayerResult["analysisStats"] }) {
  const items = [
    { value: stats.reviewsAnalyzed, label: "Reviews", color: "var(--accent)" },
    { value: stats.sourcesScanned,  label: "Platforms", color: "var(--accent-scan)" },
    { value: stats.dataPoints,      label: "Data Points", color: "var(--green)" },
  ];
  return (
    <div style={s.statsRow}>
      {items.map((item, i) => (
        <div key={i} style={s.statItem}>
          <CountUp to={item.value} color={item.color} />
          <span style={s.statLabel}>{item.label}</span>
        </div>
      ))}
      <div style={s.statItem}>
        <span style={{ ...s.statValue, color:"var(--yellow)" }}>{stats.timeTaken}</span>
        <span style={s.statLabel}>Scan Time</span>
      </div>
    </div>
  );
}

function CountUp({ to, color }: { to: number; color: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const duration = 1600, start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(ease * to));
      if (t < 1) requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [to]);
  return (
    <span style={{ ...s.statValue, color }}>
      {val >= 1000 ? `${(val / 1000).toFixed(val >= 10000 ? 0 : 1)}K` : val}
    </span>
  );
}

/* ─── Truth Score ─────────────────────────────────── */
function TruthScoreCard({ score, label, summary }: { score: number; label: string; summary: string }) {
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    const dur = 1400, start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / dur, 1);
      setAnimated(+(( 1 - Math.pow(1 - t, 4)) * score).toFixed(1));
      if (t < 1) requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [score]);

  const size=140, r=52, cx=70, cy=70;
  const circ = 2*Math.PI*r, arc = (250/360)*circ, filled = (score/100)*arc;
  const col = score>=80?"#34d399":score>=65?"#fbbf24":"#f87171";

  const tiers = [
    { min:90, label:"Highly Recommended" },
    { min:80, label:"Recommended" },
    { min:65, label:"Average" },
    { min:50, label:"Below Average" },
    { min:0,  label:"Avoid" },
  ];
  const tier = tiers.find(t => score >= t.min)!;

  return (
    <div style={{ ...s.glassCard, padding:"20px 18px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:18 }}>
        {/* Score ring */}
        <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
          <svg width={size} height={size}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={8}
              strokeDasharray={`${arc} ${circ-arc}`} strokeLinecap="round" transform={`rotate(-215 ${cx} ${cy})`} />
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={col} strokeWidth={8}
              strokeDasharray={`${filled} ${circ-filled}`} strokeLinecap="round" transform={`rotate(-215 ${cx} ${cy})`}
              style={{ filter:`drop-shadow(0 0 8px ${col}80)` }} />
          </svg>
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:11, color:"var(--text-muted)", fontWeight:600, letterSpacing:"0.3px" }}>SCORE</span>
            <span style={{ fontSize:28, fontWeight:900, letterSpacing:"-2px", color:col, lineHeight:1 }}>
              {(animated / 10).toFixed(1)}
            </span>
            <span style={{ fontSize:10, color:"var(--text-muted)", marginTop:1 }}>/10</span>
          </div>
        </div>

        {/* Label + tier list */}
        <div style={{ flex:1 }}>
          <div style={{ fontSize:10, color:"var(--text-muted)", letterSpacing:"0.8px", textTransform:"uppercase", marginBottom:4 }}>AI Verdict</div>
          <div style={{ fontSize:20, fontWeight:800, color:col, letterSpacing:"-0.4px", marginBottom:12 }}>{tier.label}</div>
          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
            {tiers.map(t => {
              const active = t.label === tier.label;
              return (
                <div key={t.label} style={{ display:"flex", alignItems:"center", gap:7, opacity:active?1:0.25 }}>
                  <span style={{ width:5, height:5, borderRadius:"50%", background:active?col:"var(--text-muted)", flexShrink:0, display:"inline-block" }} />
                  <span style={{ fontSize:11, color:active?"var(--text-primary)":"var(--text-muted)", fontWeight:active?600:400 }}>{t.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Summary below */}
      <div style={{ marginTop:16, paddingTop:14, borderTop:"1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize:10, color:"var(--text-muted)", fontWeight:600, letterSpacing:"0.5px", textTransform:"uppercase", marginBottom:6 }}>AI Summary</div>
        <p style={{ fontSize:12.5, color:"var(--text-secondary)", lineHeight:1.7, margin:0 }}>{summary}</p>
      </div>
    </div>
  );
}

/* ─── Loves & Hates ───────────────────────────────── */
function LovesHates({ loves, hates }: { loves: string[]; hates: string[] }) {
  return (
    <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
      <GlassCard accent="rgba(52,211,153,0.06)" style={{ flex:1, minWidth:200 }}>
        <SectionHead icon="✅" title="Loved For" titleColor="var(--green)" />
        <ul style={s.listPoints}>
          {loves.map((l, i) => (
            <li key={i} style={{ display:"flex", alignItems:"flex-start", gap:7, marginBottom:7 }}>
              <span style={{ color:"var(--green)", fontWeight:700, flexShrink:0, fontSize:11, marginTop:1 }}>✓</span>
              <span style={{ fontSize:12, color:"var(--text-secondary)", lineHeight:1.5 }}>{l}</span>
            </li>
          ))}
        </ul>
      </GlassCard>
      <GlassCard accent="rgba(248,113,113,0.06)" style={{ flex:1, minWidth:200 }}>
        <SectionHead icon="⚠️" title="Watch Out For" titleColor="var(--red)" />
        <ul style={s.listPoints}>
          {hates.map((h, i) => (
            <li key={i} style={{ display:"flex", alignItems:"flex-start", gap:7, marginBottom:7 }}>
              <span style={{ color:"var(--red)", fontWeight:700, flexShrink:0, fontSize:11, marginTop:1 }}>✗</span>
              <span style={{ fontSize:12, color:"var(--text-secondary)", lineHeight:1.5 }}>{h}</span>
            </li>
          ))}
        </ul>
      </GlassCard>
    </div>
  );
}

/* ─── Community Sentiment ─────────────────────────── */
function CommunitySentiment({ platforms }: { platforms: TruthLayerResult["platforms"] }) {
  return (
    <GlassCard accent="rgba(108,141,250,0.05)">
      <SectionHead icon="📡" title="Community Sentiment" />
      <p style={{ fontSize:11.5, color:"var(--text-muted)", marginBottom:14, marginTop:-4 }}>
        Aggregated from real community discussions and expert reviews.
      </p>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {platforms.map((p, i) => <PlatformCard key={i} platform={p} delay={i * 100} />)}
      </div>
    </GlassCard>
  );
}

function PlatformCard({ platform, delay }: { platform: TruthLayerResult["platforms"][0]; delay: number }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(platform.score * 10), 300 + delay);
    return () => clearTimeout(t);
  }, [platform.score, delay]);

  const col = platform.score >= 8 ? "var(--green)" : platform.score >= 6.5 ? "var(--yellow)" : "var(--red)";

  return (
    <div style={{
      padding:"12px 14px",
      background:"rgba(255,255,255,0.02)",
      border:"1px solid rgba(255,255,255,0.06)",
      borderRadius:12,
    }}>
      {/* Header row */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
        <span style={{ fontSize:15, flexShrink:0 }}>{platform.icon}</span>
        <span style={{ fontSize:13, fontWeight:700, color:"var(--text-primary)", flex:1 }}>{platform.name}</span>

        {/* Score pill */}
        <div style={{
          display:"flex", alignItems:"center", gap:4,
          background: platform.score >= 8 ? "rgba(52,211,153,0.1)" : platform.score >= 6.5 ? "rgba(251,191,36,0.1)" : "rgba(248,113,113,0.1)",
          border: `1px solid ${col}30`,
          borderRadius:8, padding:"3px 10px",
        }}>
          <span style={{ fontSize:14, fontWeight:800, color:col, letterSpacing:"-0.5px" }}>{platform.score.toFixed(1)}</span>
          <span style={{ fontSize:10, color:"var(--text-muted)", fontWeight:500 }}>/10</span>
          <span style={{ fontSize:9, color:col, fontWeight:700, marginLeft:2 }}>— {platform.label}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height:3, background:"rgba(255,255,255,0.06)", borderRadius:2, marginBottom:10, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${w}%`, background:`linear-gradient(90deg, ${platform.color}80, ${platform.color})`, borderRadius:2, transition:"width 0.9s cubic-bezier(0.16,1,0.3,1)", boxShadow:`0 0 6px ${platform.color}40` }} />
      </div>

      {/* Source tag */}
      <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:8 }}>
        <span style={{ fontSize:9, fontWeight:700, letterSpacing:"0.4px", textTransform:"uppercase", color:"var(--text-muted)" }}>Source:</span>
        <span style={{ fontSize:10.5, color:"var(--accent)", fontWeight:500 }}>{platform.source}</span>
      </div>

      {/* Bullet points */}
      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
        {platform.points.map((pt, i) => (
          <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:7 }}>
            <span style={{ width:4, height:4, borderRadius:"50%", background:platform.color, flexShrink:0, marginTop:5 }} />
            <span style={{ fontSize:11.5, color:"var(--text-secondary)", lineHeight:1.5 }}>{pt}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Key Insights ────────────────────────────────── */
function KeyInsights({ insights }: { insights: TruthLayerResult["hiddenInsights"] }) {
  return (
    <GlassCard accent="rgba(251,191,36,0.05)">
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
        <span style={{ fontSize:15 }}>🔦</span>
        <span style={{ fontSize:13, fontWeight:600, flex:1 }}>Key Insights</span>
        <span style={s.insightsBadge}>Not obvious from ratings</span>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {insights.map((ins, i) => <InsightRow key={i} insight={ins} />)}
      </div>
    </GlassCard>
  );
}

/* ─── Competitor Comparison ───────────────────────── */
function CompetitorComparison({ competitors }: { competitors: TruthLayerResult["competitors"] }) {
  return (
    <div style={{ ...s.glassCard, background:"linear-gradient(135deg, rgba(163,116,255,0.06) 0%, rgba(15,17,26,0.9) 100%)", border:"1px solid rgba(163,116,255,0.15)" }}>
      <SectionHead icon="⚡" title="Top Alternatives" />
      <p style={{ fontSize:11.5, color:"var(--text-muted)", marginBottom:14, marginTop:-6 }}>
        Ranked by value. Compare before you buy.
      </p>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {competitors.map((c, i) => <CompetitorCard key={i} comp={c} rank={i+1} />)}
      </div>
    </div>
  );
}

function CompetitorCard({ comp, rank }: { comp: TruthLayerResult["competitors"][0]; rank: number }) {
  const scoreCol = comp.score >= 80 ? "var(--green)" : comp.score >= 65 ? "var(--yellow)" : "var(--red)";
  return (
    <div style={s.compCard}>
      <div style={s.compRank}>{rank}</div>
      <div style={s.compImgWrap}>
        <img src={comp.image} alt="" style={s.compImg} onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8, marginBottom:4 }}>
          <div>
            <div style={{ fontSize:10, color:"var(--text-muted)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.4px", marginBottom:2 }}>{comp.brand}</div>
            <div style={{ fontSize:13, fontWeight:600, color:"var(--text-primary)", lineHeight:1.3 }}>{comp.name}</div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4, flexShrink:0 }}>
            <div style={{ fontSize:15, fontWeight:800, color:"var(--text-primary)", letterSpacing:"-0.3px" }}>{comp.price}</div>
            <div style={{ fontSize:11, fontWeight:700, color:scoreCol }}>{(comp.score / 10).toFixed(1)}/10</div>
          </div>
        </div>
        <div style={{ display:"inline-flex", alignItems:"center", gap:5, marginBottom:7, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:6, padding:"2px 8px" }}>
          <span style={{ fontSize:10 }}>{comp.badge}</span>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:6, fontSize:11.5, color:"var(--text-secondary)" }}>
            <span style={{ color:"var(--green)", fontWeight:700, flexShrink:0 }}>✓</span>{comp.pros}
          </div>
          <div style={{ display:"flex", alignItems:"flex-start", gap:6, fontSize:11.5, color:"var(--text-secondary)" }}>
            <span style={{ color:"var(--red)", fontWeight:700, flexShrink:0 }}>✗</span>{comp.cons}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Shared Components ───────────────────────────── */
function InsightRow({ insight }: { insight: TruthLayerResult["hiddenInsights"][0] }) {
  const cfg = {
    warning:  { bg:"rgba(251,191,36,0.06)",  border:"#fbbf24", icon:"⚠️" },
    positive: { bg:"rgba(52,211,153,0.06)",  border:"#34d399", icon:"💡" },
    neutral:  { bg:"rgba(108,141,250,0.06)", border:"#6c8dfa", icon:"ℹ️" },
  }[insight.type];
  return (
    <div style={{ ...s.insightRow, background:cfg.bg, borderLeft:`2px solid ${cfg.border}` }}>
      <span style={{ fontSize:14, flexShrink:0 }}>{cfg.icon}</span>
      <p style={{ fontSize:12.5, color:"var(--text-secondary)", lineHeight:1.65, margin:0 }}>{insight.text}</p>
    </div>
  );
}

function FinalVerdictCard({ verdict }: { verdict: TruthLayerResult["verdict"] }) {
  const cfg = {
    recommended: { bg:"rgba(52,211,153,0.07)",  border:"rgba(52,211,153,0.2)",  col:"var(--green)",  glow:"0 0 60px rgba(52,211,153,0.12)" },
    consider:    { bg:"rgba(251,191,36,0.07)",   border:"rgba(251,191,36,0.2)",  col:"var(--yellow)", glow:"0 0 60px rgba(251,191,36,0.12)" },
    avoid:       { bg:"rgba(248,113,113,0.07)",  border:"rgba(248,113,113,0.2)", col:"var(--red)",    glow:"0 0 60px rgba(248,113,113,0.12)" },
  }[verdict.type];
  return (
    <div style={{ ...s.verdictCard, background:cfg.bg, border:`1px solid ${cfg.border}`, boxShadow:cfg.glow }}>
      <div style={s.verdictTop}>
        <div style={{ ...s.verdictEmoji, boxShadow:`0 0 24px ${cfg.col}50` }}><span style={{ fontSize:28 }}>{verdict.emoji}</span></div>
        <div>
          <div style={{ fontSize:10, color:"var(--text-muted)", letterSpacing:"0.8px", textTransform:"uppercase", marginBottom:3 }}>Final Verdict</div>
          <div style={{ fontSize:22, fontWeight:800, color:cfg.col, letterSpacing:"-0.4px" }}>{verdict.label}</div>
        </div>
      </div>
      <p style={{ fontSize:13, color:"var(--text-secondary)", lineHeight:1.75, margin:0 }}>{verdict.reasoning}</p>
    </div>
  );
}

function GlassCard({ children, accent, style }: { children: React.ReactNode; accent?: string; style?: React.CSSProperties }) {
  return <div style={{ ...s.glassCard, background:accent?`linear-gradient(135deg,${accent} 0%,rgba(15,17,26,0.9) 100%)`:"rgba(15,17,26,0.9)", ...style }}>{children}</div>;
}

function SectionHead({ icon, title, titleColor }: { icon: string; title: string; titleColor?: string }) {
  return <div style={s.sectionHead}><span style={{ fontSize:15 }}>{icon}</span><span style={{ fontSize:13, fontWeight:600, color:titleColor??"var(--text-primary)" }}>{title}</span></div>;
}

/* ══ Styles ══════════════════════════════════════════ */
const s: Record<string, React.CSSProperties> = {
  root: { minHeight:"100vh", background:"var(--bg-base)", display:"flex", justifyContent:"center", position:"relative", overflow:"hidden" },
  blob1: { position:"fixed", top:"-5%", left:"-10%", width:600, height:600, borderRadius:"50%", pointerEvents:"none", background:"radial-gradient(circle,rgba(108,141,250,0.14) 0%,transparent 65%)", animation:"orb-drift 20s ease-in-out infinite", zIndex:0 },
  blob2: { position:"fixed", bottom:"5%", right:"-10%", width:560, height:560, borderRadius:"50%", pointerEvents:"none", background:"radial-gradient(circle,rgba(163,116,255,0.12) 0%,transparent 65%)", animation:"orb-drift-2 25s ease-in-out infinite", zIndex:0 },
  blob3: { position:"fixed", top:"45%", left:"50%", transform:"translate(-50%,-50%)", width:400, height:400, borderRadius:"50%", pointerEvents:"none", background:"radial-gradient(circle,rgba(52,211,153,0.04) 0%,transparent 70%)", zIndex:0 },
  dotGrid: { position:"fixed", inset:0, backgroundImage:"radial-gradient(circle,rgba(255,255,255,0.045) 1px,transparent 1px)", backgroundSize:"28px 28px", WebkitMaskImage:"radial-gradient(ellipse 80% 80% at 50% 50%,black 40%,transparent 100%)", maskImage:"radial-gradient(ellipse 80% 80% at 50% 50%,black 40%,transparent 100%)", pointerEvents:"none", zIndex:0 } as React.CSSProperties,
  page: { width:"100%", maxWidth:720, minHeight:"100vh", display:"flex", flexDirection:"column", position:"relative", zIndex:1 },

  header: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 20px", borderBottom:"1px solid rgba(255,255,255,0.06)", position:"sticky", top:0, background:"rgba(8,10,16,0.88)", backdropFilter:"blur(28px)", zIndex:10, boxShadow:"0 1px 0 rgba(108,141,250,0.08),0 4px 24px rgba(0,0,0,0.4)" },
  backBtn: { width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:8, color:"var(--text-secondary)", cursor:"pointer" },
  headerCenter: { display:"flex", alignItems:"center", gap:9 },
  headerIconWrap: { width:26, height:26, background:"linear-gradient(135deg,rgba(108,141,250,0.25),rgba(108,141,250,0.1))", border:"1px solid rgba(108,141,250,0.3)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", color:"var(--accent)" },
  livePill: { display:"flex", alignItems:"center", gap:5, fontSize:9, fontWeight:700, letterSpacing:"0.8px", background:"rgba(52,211,153,0.12)", color:"var(--green)", border:"1px solid rgba(52,211,153,0.22)", borderRadius:20, padding:"3px 9px" },
  liveDot: { width:5, height:5, borderRadius:"50%", flexShrink:0, background:"var(--green)", animation:"pulse-glow 2s ease-in-out infinite" },

  analyzing: { flex:1, display:"flex", flexDirection:"column", alignItems:"center", padding:"40px 24px", gap:20 },
  orbWrap: { position:"relative", width:120, height:120, display:"flex", alignItems:"center", justifyContent:"center" },
  orbRing1: { position:"absolute", inset:0, borderRadius:"50%", border:"1px solid rgba(108,141,250,0.2)", animation:"spin 8s linear infinite" },
  orbRing2: { position:"absolute", inset:10, borderRadius:"50%", border:"1px solid rgba(163,116,255,0.15)", animation:"spin 12s linear infinite reverse" },
  orbRing3: { position:"absolute", inset:20, borderRadius:"50%", border:"1px solid rgba(108,141,250,0.1)", animation:"spin 6s linear infinite" },
  orbCore: { width:64, height:64, borderRadius:"50%", background:"linear-gradient(135deg,rgba(108,141,250,0.2),rgba(163,116,255,0.15))", border:"1px solid rgba(108,141,250,0.3)", display:"flex", alignItems:"center", justifyContent:"center", position:"relative" },
  orbGlow: { position:"absolute", inset:0, borderRadius:"50%", background:"radial-gradient(circle,rgba(108,141,250,0.3) 0%,transparent 70%)", animation:"pulse-glow 2s ease-in-out infinite" },
  analyzingTitle: { fontSize:18, fontWeight:800, letterSpacing:"-0.4px", color:"var(--text-primary)", textAlign:"center" },
  analyzingSub: { fontSize:12.5, color:"var(--text-muted)", textAlign:"center", marginTop:-12 },
  stepsCard: { width:"100%", maxWidth:420, background:"var(--bg-surface)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:14, overflow:"hidden" },
  stepRow: { display:"flex", alignItems:"center", gap:10, padding:"10px 14px" },
  stepDot: { width:8, height:8, borderRadius:"50%", flexShrink:0, border:"1.5px solid" },
  stepCheck: { fontSize:10, color:"var(--green)", fontWeight:700 },
  stepSpinner: { width:12, height:12, borderRadius:"50%", border:"1.5px solid rgba(108,141,250,0.2)", borderTopColor:"var(--accent)", animation:"spin 0.7s linear infinite", flexShrink:0 },

  dashboard: { flex:1, display:"flex", flexDirection:"column", overflow:"hidden" },
  dashScroll: { flex:1, overflowY:"auto", padding:"16px 16px 40px", display:"flex", flexDirection:"column", gap:12 },

  productHero: { display:"flex", gap:14, padding:"16px", background:"var(--bg-surface)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:16 },
  productImgWrap: { width:72, height:72, borderRadius:12, overflow:"hidden", flexShrink:0, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" },
  productImg: { width:"100%", height:"100%", objectFit:"cover" },
  productBrand: { fontSize:10, color:"var(--text-muted)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:3 },
  productName: { fontSize:14, fontWeight:700, color:"var(--text-primary)", lineHeight:1.35 },
  productPrice: { fontSize:16, fontWeight:800, color:"var(--text-primary)", letterSpacing:"-0.3px" },
  productRating: { fontSize:11, color:"var(--yellow)", fontWeight:500 },
  productStore: { fontSize:10, color:"var(--text-muted)", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:5, padding:"2px 7px" },

  statsRow: { display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:8 },
  statItem: { display:"flex", flexDirection:"column", alignItems:"center", gap:4, padding:"12px 8px", background:"var(--bg-surface)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:12 },
  statValue: { fontSize:20, fontWeight:900, letterSpacing:"-1px", lineHeight:1 },
  statLabel: { fontSize:10, color:"var(--text-muted)", textAlign:"center", fontWeight:500 },

  glassCard: { padding:"16px 16px 14px", border:"1px solid rgba(255,255,255,0.07)", borderRadius:16, overflow:"hidden" },
  sectionHead: { display:"flex", alignItems:"center", gap:8, marginBottom:14 },
  listPoints: { listStyle:"none", padding:0, margin:0 },

  insightRow: { display:"flex", alignItems:"flex-start", gap:10, padding:"10px 12px", borderRadius:10 },
  insightsBadge: { fontSize:9.5, fontWeight:600, color:"var(--yellow)", background:"rgba(251,191,36,0.1)", border:"1px solid rgba(251,191,36,0.2)", borderRadius:5, padding:"2px 8px" },

  compCard: { display:"flex", alignItems:"flex-start", gap:10, padding:"12px 14px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:12 },
  compRank: { width:22, height:22, borderRadius:"50%", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", fontSize:11, fontWeight:700, color:"var(--text-muted)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 },
  compImgWrap: { width:46, height:46, borderRadius:10, overflow:"hidden", flexShrink:0, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)" },
  compImg: { width:"100%", height:"100%", objectFit:"cover" },

  verdictCard: { padding:"18px 18px 16px", borderRadius:16 },
  verdictTop: { display:"flex", alignItems:"center", gap:14, marginBottom:12 },
  verdictEmoji: { width:56, height:56, borderRadius:16, background:"rgba(255,255,255,0.05)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },

  reanalyzeBtn: { display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"12px", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:12, color:"var(--text-secondary)", fontSize:13, fontWeight:600, cursor:"pointer", marginTop:4 },

  barTrack: { width:"100%", background:"rgba(255,255,255,0.06)", borderRadius:3, overflow:"hidden" },
  barFill: { height:"100%", borderRadius:3, transition:"width 0.9s cubic-bezier(0.16,1,0.3,1)" },
};
