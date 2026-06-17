import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { type TruthLayerResult } from "@/lib/mockData";

type ViewState = "input" | "analyzing" | "results";

const ANALYSIS_STEPS = [
  { icon: "🔎", text: "Identifying product from input…" },
  { icon: "🛒", text: "Scanning Amazon & Flipkart reviews…" },
  { icon: "🤖", text: "Running fake review detection…" },
  { icon: "💬", text: "Searching Reddit discussions…" },
  { icon: "❓", text: "Analyzing Quora threads…" },
  { icon: "🔍", text: "Processing Google expert reviews…" },
  { icon: "▶",  text: "Summarizing YouTube reviews…" },
  { icon: "📈", text: "Analyzing price history & timing…" },
  { icon: "💰", text: "Running Price Intelligence scan…" },
  { icon: "🧠", text: "Synthesizing AI cross-platform report…" },
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
    }, 600);

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
      await new Promise(r => setTimeout(r, 500));
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
        <div style={{ fontSize:46, marginBottom:14 }}>🔍</div>
        <h2 style={{ fontSize:20, fontWeight:800, color:"var(--text-primary)", marginBottom:7, letterSpacing:"-0.5px" }}>Product Truth Analysis</h2>
        <p style={{ fontSize:12.5, color:"var(--text-muted)", lineHeight:1.65, maxWidth:300 }}>
          Enter a product name. Our AI cross-checks 5+ sources for fake reviews, price trends, and real opinions.
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
          🔍 Analyze Product
        </button>

        {error && (
          <div style={{
            padding:"10px 14px",
            background:"rgba(239,68,68,0.08)",
            border:"1px solid rgba(239,68,68,0.2)",
            borderRadius:10, fontSize:12, color:"#f87171", lineHeight:1.5,
          }}>
            ⚠️ {error}. Please try again.
          </div>
        )}

        <div style={{ marginTop:4 }}>
          <div style={{ fontSize:10.5, color:"var(--text-muted)", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.5px", fontWeight:600 }}>Try these examples</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {examples.map(ex => (
              <button
                key={ex}
                type="button"
                onClick={() => setValue(ex)}
                style={{
                  padding:"5px 12px",
                  background:"rgba(255,255,255,0.04)",
                  border:"1px solid rgba(255,255,255,0.08)",
                  borderRadius:20, color:"var(--text-secondary)",
                  fontSize:11, cursor:"pointer", transition:"all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(108,141,250,0.4)"; e.currentTarget.style.color="#a374ff"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(255,255,255,0.08)"; e.currentTarget.style.color="var(--text-secondary)"; }}
              >{ex}</button>
            ))}
          </div>
        </div>
      </form>
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

/* ─── Idle ────────────────────────────────────────── */
function IdleView({ onDemo }: { onDemo: () => void }) {
  return (
    <div style={s.idle}>
      <div style={s.capturePreview}>
        <div style={s.captureGrid}>
          {[0,1,2,3].map(i => (
            <div key={i} style={s.captureCard}>
              <div style={{ ...s.captureCardImg, animationDelay: `${i*0.3}s` }} />
              <div style={{ display:"flex", flexDirection:"column", gap:5, flex:1 }}>
                <div style={{ ...s.bone, width:"80%", height:7 }} />
                <div style={{ ...s.bone, width:"55%", height:7 }} />
                <div style={{ ...s.bone, width:"38%", height:9, background:"rgba(108,141,250,0.18)", marginTop:2 }} />
              </div>
            </div>
          ))}
        </div>
        <div style={s.overlay}>
          <div style={s.selBox}>
            <Corner pos={{ top:-4, left:-4 }} /><Corner pos={{ top:-4, right:-4 }} />
            <Corner pos={{ bottom:-4, left:-4 }} /><Corner pos={{ bottom:-4, right:-4 }} />
            <div style={s.selLabel}><span style={s.selLabelDot} />Product captured</div>
          </div>
        </div>
        <div style={s.scanLine} />
      </div>

      <h1 style={s.idleTitle}>
        Capture Any Product.{" "}
        <span style={s.gradientText}>Reveal the Truth.</span>
      </h1>
      <p style={s.idleDesc}>
        Select a product on any e-commerce page. DecisionAI scans Amazon, Flipkart,
        Reddit, Quora, Google, and YouTube — and detects fake reviews.
      </p>

      <div style={s.platformRow}>
        {[{e:"🛒",l:"Amazon"},{e:"💬",l:"Reddit"},{e:"❓",l:"Quora"},{e:"🔍",l:"Google"},{e:"▶",l:"YouTube"}].map(p => (
          <div key={p.l} style={s.platformPill}><span style={{fontSize:12}}>{p.e}</span>{p.l}</div>
        ))}
      </div>

      <button style={s.demoBtn} onClick={onDemo}>
        <svg style={{width:15,height:15}} viewBox="0 0 24 24" fill="none">
          <path d="M5 3l14 9-14 9V3z" fill="currentColor"/>
        </svg>
        Run Demo Analysis
      </button>
      <p style={s.idleNote}>Uses Sony WH-1000XM5 as the demo product</p>
    </div>
  );
}

function Corner({ pos }: { pos: React.CSSProperties }) {
  return <div style={{ ...s.corner, ...pos }} />;
}

/* ─── Capturing ──────────────────────────────────── */
function CapturingView({ product, onAnalyze }: { product: TruthLayerResult["product"]; onAnalyze: () => void }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { setTimeout(() => setReady(true), 900); }, []);
  return (
    <div style={s.capturing}>
      {!ready ? (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:16, animation:"fade-in 0.3s ease" }}>
          <div style={s.extractSpinner}><div style={s.extractSpinnerInner} /></div>
          <p style={{ color:"var(--text-secondary)", fontSize:13 }}>Extracting product details…</p>
        </div>
      ) : (
        <div style={{ ...s.captureConfirm, animation:"card-reveal 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
          <div style={s.captureTagRow}>
            <div style={s.captureTag}><span style={{ ...s.liveDot, background:"var(--green)", boxShadow:"0 0 6px var(--green)" }} />Product identified</div>
          </div>
          <div style={s.captureProductCard}>
            <div style={s.captureImgWrap}>
              <img src={product.image} alt="" style={s.captureProductImg} onError={e=>{(e.target as HTMLImageElement).style.display="none";}} />
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={s.captureProductBrand}>{product.brand}</div>
              <div style={s.captureProductName}>{product.name}</div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginTop:9,flexWrap:"wrap"}}>
                <span style={s.capturePrice}>{product.price}</span>
                <span style={s.captureRating}>★ {product.rating}</span>
                <span style={s.captureModel}>{product.model}</span>
              </div>
            </div>
          </div>
          <div style={s.scanWillCheck}>
            <p style={s.scanWillLabel}>Will scan across</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {["🛒 Amazon","🛍 Flipkart","💬 Reddit","❓ Quora","🔍 Google","▶ YouTube"].map(p=>(
                <div key={p} style={s.scanPill}>{p}</div>
              ))}
            </div>
          </div>
          <button style={s.analyzeBtn} onClick={onAnalyze}>
            <svg style={{width:15,height:15}} viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
              <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Start Full Analysis
          </button>
        </div>
      )}
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
          <span style={{fontSize:26,position:"relative",zIndex:1}}>🧠</span>
        </div>
      </div>
      <h2 style={s.analyzingTitle}>Analyzing across the web…</h2>
      <p style={s.analyzingSub}>Scanning {stepIdx+1} of {ANALYSIS_STEPS.length} sources</p>
      <div style={s.stepsCard}>
        {ANALYSIS_STEPS.map((step, i) => {
          const done = i < stepIdx, active = i === stepIdx;
          return (
            <div key={i} style={{ ...s.stepRow, opacity: i > stepIdx+1 ? 0.3 : 1, borderBottom: i < ANALYSIS_STEPS.length-1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
              <div style={{ ...s.stepDot, background: done?"var(--green)":active?"var(--accent)":"var(--bg-elevated)", borderColor: done?"var(--green)":active?"var(--accent)":"var(--border)", boxShadow: active?"0 0 0 3px rgba(108,141,250,0.2)":done?"0 0 6px rgba(52,211,153,0.3)":"none" }} />
              <span style={{fontSize:14}}>{step.icon}</span>
              <span style={{fontSize:12.5,flex:1,color:done?"var(--green)":active?"var(--text-primary)":"var(--text-muted)",fontWeight:active?600:400}}>{step.text}</span>
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
        <TruthScoreCard score={result.truthScore} label={result.scoreLabel} />
        <PriceIntelligence priceIntel={result.priceIntel} />
        <GlassCard accent="rgba(108,141,250,0.08)">
          <SectionHead icon="🎯" title="Truth Summary" />
          <p style={s.summaryText}>{result.truthSummary}</p>
        </GlassCard>
        <div style={s.loveHateGrid}>
          <GlassCard accent="rgba(52,211,153,0.06)" style={{flex:1,minWidth:220}}>
            <SectionHead icon="✅" title="What People Love" titleColor="var(--green)" />
            <ul style={s.listPoints}>
              {result.loves.map((l,i)=>(
                <li key={i} style={s.loveItem}><span style={s.loveCheck}>✓</span><span>{l}</span></li>
              ))}
            </ul>
          </GlassCard>
          <GlassCard accent="rgba(248,113,113,0.06)" style={{flex:1,minWidth:220}}>
            <SectionHead icon="❌" title="What People Hate" titleColor="var(--red)" />
            <ul style={s.listPoints}>
              {result.hates.map((h,i)=>(
                <li key={i} style={s.hateItem}><span style={s.hateX}>✗</span><span>{h}</span></li>
              ))}
            </ul>
          </GlassCard>
        </div>
        <GlassCard accent="rgba(108,141,250,0.05)">
          <SectionHead icon="📊" title="Platform Breakdown" />
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {result.platforms.map((p,i)=><PlatformRow key={i} platform={p} delay={i*90} />)}
          </div>
        </GlassCard>
        <CompetitorComparison competitors={result.competitors} />
        <GlassCard accent="rgba(251,191,36,0.05)">
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
            <span style={{fontSize:15}}>🔦</span>
            <span style={{fontSize:13,fontWeight:600,flex:1}}>Hidden Insights</span>
            <span style={s.insightsBadge}>Not obvious from ratings</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {result.hiddenInsights.slice(0, 3).map((ins,i)=><InsightRow key={i} insight={ins} />)}
          </div>
        </GlassCard>
        <FinalVerdictCard verdict={result.verdict} />
        <button style={s.reanalyzeBtn} onClick={onReanalyze}>
          <svg style={{width:13,height:13}} viewBox="0 0 24 24" fill="none">
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
        <img src={product.image} alt="" style={s.productImg} onError={e=>{(e.target as HTMLImageElement).style.display="none";}} />
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={s.productBrand}>{product.brand}</div>
        <div style={s.productName}>{product.name}</div>
        <div style={{display:"flex",alignItems:"center",gap:8,marginTop:9,flexWrap:"wrap"}}>
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
    { value: stats.reviewsAnalyzed, label: "Reviews Analyzed", suffix: "", color: "var(--accent)" },
    { value: stats.sourcesScanned,  label: "Platforms Scanned", suffix: "",  color: "var(--accent-scan)" },
    { value: stats.dataPoints,      label: "Data Points",        suffix: "",  color: "var(--green)" },
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
        <span style={{ ...s.statValue, color: "var(--yellow)" }}>{stats.timeTaken}</span>
        <span style={s.statLabel}>Analysis Time</span>
      </div>
    </div>
  );
}

function CountUp({ to, color }: { to: number; color: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const duration = 1600;
    const start = performance.now();
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
function TruthScoreCard({ score, label }: { score: number; label: string }) {
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    const dur = 1400, start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / dur, 1);
      setAnimated(Math.round((1 - Math.pow(1 - t, 4)) * score));
      if (t < 1) requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [score]);

  const size=148, r=56, cx=74, cy=74;
  const circ = 2*Math.PI*r, arc = (250/360)*circ, filled = (animated/100)*arc;
  const col = score>=80?"#34d399":score>=60?"#fbbf24":"#f87171";
  const glow = score>=80?"rgba(52,211,153,0.5)":score>=60?"rgba(251,191,36,0.5)":"rgba(248,113,113,0.5)";

  return (
    <div style={s.scoreCard}>
      <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
        <svg width={size} height={size}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={9}
            strokeDasharray={`${arc} ${circ-arc}`} strokeLinecap="round" transform={`rotate(-215 ${cx} ${cy})`} />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={col} strokeWidth={9}
            strokeDasharray={`${filled} ${circ-filled}`} strokeLinecap="round" transform={`rotate(-215 ${cx} ${cy})`}
            style={{filter:`drop-shadow(0 0 8px ${glow})`}} />
        </svg>
        <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <span style={{fontSize:36,fontWeight:900,letterSpacing:"-3px",color:col,lineHeight:1}}>{animated}</span>
          <span style={{fontSize:10,color:"var(--text-muted)",letterSpacing:"0.3px",marginTop:2,fontWeight:500}}>/100</span>
        </div>
      </div>
      <div style={s.scoreLegend}>
        <div style={{fontSize:10,color:"var(--text-muted)",letterSpacing:"0.8px",textTransform:"uppercase",marginBottom:5}}>Truth Score</div>
        <div style={{fontSize:24,fontWeight:800,color:col,letterSpacing:"-0.5px",marginBottom:12}}>{label}</div>
        {[{r:"90–100",l:"Excellent",a:score>=90},{r:"80–89",l:"Recommended",a:score>=80&&score<90},{r:"70–79",l:"Good",a:score>=70&&score<80},{r:"60–69",l:"Average",a:score>=60&&score<70},{r:"<60",l:"Avoid",a:score<60}].map(t=>(
          <div key={t.r} style={{display:"flex",alignItems:"center",gap:8,opacity:t.a?1:0.28,marginBottom:4}}>
            <span style={{width:5,height:5,borderRadius:"50%",background:t.a?col:"var(--text-muted)",flexShrink:0}} />
            <span style={{fontSize:11,color:t.a?"var(--text-primary)":"var(--text-muted)",fontWeight:t.a?600:400}}>{t.r} — {t.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Price Intelligence ──────────────────────────── */
function PriceIntelligence({ priceIntel }: { priceIntel: TruthLayerResult["priceIntel"] }) {
  if (priceIntel.hasBetterDeal && priceIntel.betterDeal) {
    const d = priceIntel.betterDeal;
    return (
      <div style={s.priceCard}>
        <div style={s.priceCardGlow} />
        <div style={s.priceCardInner}>
          <div style={s.priceLeft}>
            <span style={{fontSize:16,flexShrink:0}}>💰</span>
            <div style={s.priceTitleRow}>
              <div style={s.priceDealTitle}>Better Deal on {d.platform}</div>
            </div>
            <div style={s.priceNumbers}>
              <div style={s.priceBig}>{d.price}</div>
              <div style={s.priceCompare}>
                <span style={s.priceCurrentVal}>{priceIntel.currentPrice}</span>
              </div>
            </div>
            <div style={s.priceSavings}><span style={s.priceSavingsIcon}>↓</span>Save {d.savings}</div>
          </div>
          <a href={d.link} style={s.viewDealBtn}>
            <svg style={{width:12,height:12}} viewBox="0 0 24 24" fill="none">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            View Deal
          </a>
        </div>
      </div>
    );
  }
  return (
    <div style={s.priceBestCard}>
      <span style={{fontSize:16}}>✅</span>
      <div>
        <div style={{fontSize:13,fontWeight:600,color:"var(--green)",marginBottom:2}}>Best Price Available</div>
        <div style={{fontSize:12,color:"var(--text-muted)"}}>{priceIntel.currentPlatform} currently has the best price across platforms.</div>
      </div>
    </div>
  );
}

/* ─── Fake Review Detector ────────────────────────── */
function FakeReviewDetector({ data }: { data: TruthLayerResult["fakeReviewAnalysis"] }) {
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    const dur = 1200, start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now-start)/dur, 1);
      setAnimated(Math.round((1-Math.pow(1-t,3))*data.fakePercentage));
      if (t < 1) requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [data.fakePercentage]);

  const maxSpike = Math.max(...data.monthlySpike.map(m => m.fake));
  const fakeColor = data.fakePercentage >= 30 ? "var(--red)" : data.fakePercentage >= 15 ? "var(--yellow)" : "var(--green)";

  return (
    <div style={{ ...s.glassCard, background:"linear-gradient(135deg, rgba(248,113,113,0.07) 0%, rgba(15,17,26,0.9) 100%)", border:"1px solid rgba(248,113,113,0.15)" }}>
      <SectionHead icon="🤖" title="Fake Review Detector" />

      <div style={s.fakeLayout}>
        {/* Ring */}
        <div style={s.fakeRingWrap}>
          <svg width={110} height={110}>
            <circle cx={55} cy={55} r={44} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={8} />
            <circle cx={55} cy={55} r={44} fill="none" stroke={fakeColor} strokeWidth={8}
              strokeDasharray={`${(animated/100)*276.5} 276.5`}
              strokeLinecap="round" transform="rotate(-90 55 55)"
              style={{filter:`drop-shadow(0 0 6px ${fakeColor})`, transition:"none"}} />
          </svg>
          <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
            <span style={{fontSize:24,fontWeight:900,color:fakeColor,letterSpacing:"-1px",lineHeight:1}}>{animated}%</span>
            <span style={{fontSize:9,color:"var(--text-muted)",marginTop:1}}>fake</span>
          </div>

          <div style={s.fakeConfidence}>
            <span style={{fontSize:10,color:"var(--text-muted)"}}>AI Confidence</span>
            <span style={{fontSize:13,fontWeight:700,color:"var(--accent)"}}>{data.confidence}%</span>
          </div>
        </div>

        {/* Patterns */}
        <div style={{flex:1,minWidth:0}}>
          <p style={{fontSize:11,color:"var(--text-muted)",marginBottom:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px"}}>
            Suspicious patterns detected
          </p>
          {data.patterns.map((p,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:7 }}>
              <div style={{
                width:8, height:8, borderRadius:2, flexShrink:0,
                background: p.severity==="high"?"var(--red)":p.severity==="medium"?"var(--yellow)":"var(--text-muted)",
              }} />
              <span style={{fontSize:12,color:"var(--text-secondary)",flex:1,lineHeight:1.4}}>{p.label}</span>
              <span style={{
                fontSize:10, fontWeight:700, padding:"1px 7px", borderRadius:5,
                background: p.severity==="high"?"rgba(248,113,113,0.12)":p.severity==="medium"?"rgba(251,191,36,0.1)":"rgba(255,255,255,0.05)",
                color: p.severity==="high"?"var(--red)":p.severity==="medium"?"var(--yellow)":"var(--text-muted)",
              }}>{p.count.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly spike bars */}
      <div style={{marginTop:16}}>
        <p style={{fontSize:10,color:"var(--text-muted)",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>
          Fake review activity by month
        </p>
        <div style={{display:"flex",alignItems:"flex-end",gap:5,height:40}}>
          {data.monthlySpike.map((m,i)=>(
            <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
              <div style={{
                width:"100%", borderRadius:3,
                height: `${Math.round((m.fake/maxSpike)*36)+4}px`,
                background: m.fake===maxSpike
                  ? "linear-gradient(180deg, var(--red), rgba(248,113,113,0.4))"
                  : "rgba(255,255,255,0.08)",
                boxShadow: m.fake===maxSpike ? "0 0 8px rgba(248,113,113,0.3)" : "none",
                transition:"height 0.6s ease", animationDelay:`${i*0.1}s`,
              }} />
              <span style={{fontSize:9,color:"var(--text-muted)"}}>{m.month}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Buy Timing ──────────────────────────────────── */
function BuyTimingCard({ timing }: { timing: TruthLayerResult["buyTiming"] }) {
  const isBuyNow = timing.recommendation === "buy-now";
  const minPrice = Math.min(...timing.priceHistory.map(p => p.price));
  const maxPrice = Math.max(...timing.priceHistory.map(p => p.price));
  const range = maxPrice - minPrice || 1;

  return (
    <div style={{
      ...s.glassCard,
      background: isBuyNow
        ? "linear-gradient(135deg, rgba(52,211,153,0.07) 0%, rgba(15,17,26,0.9) 100%)"
        : "linear-gradient(135deg, rgba(251,191,36,0.07) 0%, rgba(15,17,26,0.9) 100%)",
      border: `1px solid ${isBuyNow ? "rgba(52,211,153,0.2)" : "rgba(251,191,36,0.2)"}`,
    }}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{
            width:44, height:44, borderRadius:12, flexShrink:0,
            background: isBuyNow ? "rgba(52,211,153,0.12)" : "rgba(251,191,36,0.12)",
            border: `1px solid ${isBuyNow ? "rgba(52,211,153,0.2)" : "rgba(251,191,36,0.2)"}`,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:22,
          }}>{isBuyNow?"🛒":"⏳"}</div>
          <div>
            <div style={{fontSize:10,color:"var(--text-muted)",fontWeight:600,letterSpacing:"0.5px",textTransform:"uppercase",marginBottom:3}}>Buy Timing</div>
            <div style={{fontSize:18,fontWeight:800,color:isBuyNow?"var(--green)":"var(--yellow)",letterSpacing:"-0.3px"}}>
              {isBuyNow ? "Buy Now" : "Wait for Better Price"}
            </div>
          </div>
        </div>
        <div style={{
          fontSize:10, fontWeight:700, padding:"4px 10px", borderRadius:8,
          background: isBuyNow ? "rgba(52,211,153,0.12)" : "rgba(251,191,36,0.1)",
          color: isBuyNow ? "var(--green)" : "var(--yellow)",
          border: `1px solid ${isBuyNow?"rgba(52,211,153,0.2)":"rgba(251,191,36,0.2)"}`,
          flexShrink:0,
        }}>{timing.confidence}% confident</div>
      </div>

      <p style={{fontSize:12.5,color:"var(--text-secondary)",lineHeight:1.7,marginBottom:16}}>{timing.reason}</p>

      {/* Price history mini chart */}
      <div style={{marginBottom:10}}>
        <p style={{fontSize:10,color:"var(--text-muted)",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:10}}>
          6-Month Price History
        </p>
        <div style={{display:"flex",alignItems:"flex-end",gap:4,height:52,position:"relative"}}>
          {/* Grid line */}
          <div style={{position:"absolute",left:0,right:0,bottom:"50%",borderTop:"1px dashed rgba(255,255,255,0.05)"}} />
          {timing.priceHistory.map((p,i)=>{
            const h = Math.round(((p.price-minPrice)/range)*44)+8;
            const isNow = p.month === "Now";
            const isLow = p.price === minPrice;
            return (
              <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                {isLow && <div style={{fontSize:8,color:"var(--green)",fontWeight:700,lineHeight:1}}>LOW</div>}
                {!isLow && <div style={{height:12}} />}
                <div style={{
                  width:"100%", borderRadius:4,
                  height:`${h}px`,
                  background: isNow
                    ? `linear-gradient(180deg, ${isBuyNow?"var(--green)":"var(--yellow)"}, ${isBuyNow?"rgba(52,211,153,0.3)":"rgba(251,191,36,0.3)"})`
                    : isLow
                    ? "linear-gradient(180deg, rgba(52,211,153,0.6), rgba(52,211,153,0.2))"
                    : "rgba(255,255,255,0.1)",
                  boxShadow: isNow ? `0 0 8px ${isBuyNow?"rgba(52,211,153,0.4)":"rgba(251,191,36,0.4)"}` : "none",
                  position:"relative",
                }}>
                  {isNow && (
                    <div style={{position:"absolute",top:-18,left:"50%",transform:"translateX(-50%)",fontSize:8,color:isBuyNow?"var(--green)":"var(--yellow)",fontWeight:700,whiteSpace:"nowrap"}}>${p.price}</div>
                  )}
                </div>
                <span style={{fontSize:9,color:isNow?"var(--text-primary)":"var(--text-muted)",fontWeight:isNow?600:400}}>{p.month}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{
        display:"flex",alignItems:"center",gap:8,padding:"10px 12px",
        background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",
        borderRadius:10,
      }}>
        <span style={{fontSize:14}}>🔮</span>
        <p style={{fontSize:12,color:"var(--text-secondary)",lineHeight:1.5}}>{timing.prediction}</p>
      </div>
    </div>
  );
}

/* ─── Competitor Comparison ───────────────────────── */
function CompetitorComparison({ competitors }: { competitors: TruthLayerResult["competitors"] }) {
  return (
    <div style={{ ...s.glassCard, background:"linear-gradient(135deg, rgba(163,116,255,0.06) 0%, rgba(15,17,26,0.9) 100%)", border:"1px solid rgba(163,116,255,0.15)" }}>
      <SectionHead icon="⚡" title="Top Alternatives" />
      <p style={{fontSize:11.5,color:"var(--text-muted)",marginBottom:14,marginTop:-6}}>
        Ranked by value for money. Scroll before you spend.
      </p>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {competitors.map((c,i)=><CompetitorCard key={i} comp={c} rank={i+1} />)}
      </div>
    </div>
  );
}

function CompetitorCard({ comp, rank }: { comp: TruthLayerResult["competitors"][0]; rank: number }) {
  const scoreCol = comp.score>=80?"var(--green)":comp.score>=65?"var(--yellow)":"var(--red)";
  return (
    <div style={s.compCard}>
      <div style={s.compRank}>{rank}</div>
      <div style={s.compImgWrap}>
        <img src={comp.image} alt="" style={s.compImg} onError={e=>{(e.target as HTMLImageElement).style.display="none";}} />
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8,marginBottom:4}}>
          <div>
            <div style={{fontSize:10,color:"var(--text-muted)",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.4px",marginBottom:2}}>{comp.brand}</div>
            <div style={{fontSize:13,fontWeight:600,color:"var(--text-primary)",lineHeight:1.3}}>{comp.name}</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,flexShrink:0}}>
            <div style={{fontSize:15,fontWeight:800,color:"var(--text-primary)",letterSpacing:"-0.3px"}}>{comp.price}</div>
            <div style={{fontSize:11,fontWeight:700,color:scoreCol}}>{comp.score}/100</div>
          </div>
        </div>
        <div style={{display:"inline-flex",alignItems:"center",gap:5,marginBottom:7,
          background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",
          borderRadius:6,padding:"2px 8px",
        }}>
          <span style={{fontSize:10}}>{comp.badge}</span>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:6,fontSize:11.5,color:"var(--text-secondary)"}}>
            <span style={{color:"var(--green)",fontWeight:700,flexShrink:0,marginTop:0.5}}>✓</span>{comp.pros}
          </div>
          <div style={{display:"flex",alignItems:"flex-start",gap:6,fontSize:11.5,color:"var(--text-secondary)"}}>
            <span style={{color:"var(--red)",fontWeight:700,flexShrink:0,marginTop:0.5}}>✗</span>{comp.cons}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Platform Row ────────────────────────────────── */
function PlatformRow({ platform, delay }: { platform: TruthLayerResult["platforms"][0]; delay: number }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(()=>setW(platform.sentiment), 350+delay); return ()=>clearTimeout(t); }, [platform.sentiment,delay]);
  const col = platform.sentiment>=80?"var(--green)":platform.sentiment>=60?"var(--yellow)":"var(--red)";
  return (
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <span style={{fontSize:13,minWidth:18,textAlign:"center"}}>{platform.icon}</span>
      <span style={{fontSize:12,fontWeight:600,minWidth:90,color:"var(--text-secondary)"}}>{platform.name}</span>
      <div style={{flex:1}}>
        <div style={{...s.barTrack,height:5}}>
          <div style={{...s.barFill,width:`${w}%`,background:`linear-gradient(90deg,${platform.color}70,${platform.color})`,boxShadow:`0 0 8px ${platform.color}40`,transition:"width 0.9s cubic-bezier(0.16,1,0.3,1)"}} />
        </div>
      </div>
      <span style={{fontSize:12,fontWeight:700,color:col,minWidth:32,textAlign:"right"}}>{platform.sentiment}%</span>
      <span style={{fontSize:9,fontWeight:600,padding:"2px 6px",borderRadius:20,background:col==="var(--green)"?"var(--green-bg)":col==="var(--yellow)"?"var(--yellow-bg)":"var(--red-bg)",color:col,minWidth:60,textAlign:"center"}}>{platform.label}</span>
    </div>
  );
}

/* ─── Insight / Verdict / Glass ───────────────────── */
function InsightRow({ insight }: { insight: TruthLayerResult["hiddenInsights"][0] }) {
  const cfg={warning:{bg:"rgba(251,191,36,0.06)",border:"#fbbf24",icon:"⚠️"},positive:{bg:"rgba(52,211,153,0.06)",border:"#34d399",icon:"💡"},neutral:{bg:"rgba(108,141,250,0.06)",border:"#6c8dfa",icon:"ℹ️"}}[insight.type];
  return (
    <div style={{...s.insightRow,background:cfg.bg,borderLeft:`2px solid ${cfg.border}`}}>
      <span style={{fontSize:14,flexShrink:0}}>{cfg.icon}</span>
      <p style={{fontSize:12.5,color:"var(--text-secondary)",lineHeight:1.65}}>{insight.text}</p>
    </div>
  );
}

function FinalVerdictCard({ verdict }: { verdict: TruthLayerResult["verdict"] }) {
  const cfg={recommended:{bg:"rgba(52,211,153,0.07)",border:"rgba(52,211,153,0.2)",col:"var(--green)",glow:"0 0 60px rgba(52,211,153,0.12)"},consider:{bg:"rgba(251,191,36,0.07)",border:"rgba(251,191,36,0.2)",col:"var(--yellow)",glow:"0 0 60px rgba(251,191,36,0.12)"},avoid:{bg:"rgba(248,113,113,0.07)",border:"rgba(248,113,113,0.2)",col:"var(--red)",glow:"0 0 60px rgba(248,113,113,0.12)"}}[verdict.type];
  return (
    <div style={{...s.verdictCard,background:cfg.bg,border:`1px solid ${cfg.border}`,boxShadow:cfg.glow}}>
      <div style={s.verdictTop}>
        <div style={{...s.verdictEmoji,boxShadow:`0 0 24px ${cfg.col}50`}}><span style={{fontSize:28}}>{verdict.emoji}</span></div>
        <div>
          <div style={{fontSize:10,color:"var(--text-muted)",letterSpacing:"0.8px",textTransform:"uppercase",marginBottom:3}}>Final Verdict</div>
          <div style={{fontSize:22,fontWeight:800,color:cfg.col,letterSpacing:"-0.4px"}}>{verdict.label}</div>
        </div>
      </div>
      <p style={{fontSize:13,color:"var(--text-secondary)",lineHeight:1.75}}>{verdict.reasoning}</p>
    </div>
  );
}

function GlassCard({ children, accent, style }: { children: React.ReactNode; accent?: string; style?: React.CSSProperties }) {
  return <div style={{...s.glassCard,background:accent?`linear-gradient(135deg,${accent} 0%,rgba(15,17,26,0.9) 100%)`:"rgba(15,17,26,0.9)",...style}}>{children}</div>;
}

function SectionHead({ icon, title, titleColor }: { icon: string; title: string; titleColor?: string }) {
  return <div style={s.sectionHead}><span style={{fontSize:15}}>{icon}</span><span style={{fontSize:13,fontWeight:600,color:titleColor??"var(--text-primary)"}}>{title}</span></div>;
}

/* ══ Styles ══════════════════════════════════════════ */
const s: Record<string, React.CSSProperties> = {
  root:{minHeight:"100vh",background:"var(--bg-base)",display:"flex",justifyContent:"center",position:"relative",overflow:"hidden"},
  blob1:{position:"fixed",top:"-5%",left:"-10%",width:600,height:600,borderRadius:"50%",pointerEvents:"none",background:"radial-gradient(circle,rgba(108,141,250,0.14) 0%,transparent 65%)",animation:"orb-drift 20s ease-in-out infinite",zIndex:0},
  blob2:{position:"fixed",bottom:"5%",right:"-10%",width:560,height:560,borderRadius:"50%",pointerEvents:"none",background:"radial-gradient(circle,rgba(163,116,255,0.12) 0%,transparent 65%)",animation:"orb-drift-2 25s ease-in-out infinite",zIndex:0},
  blob3:{position:"fixed",top:"45%",left:"50%",transform:"translate(-50%,-50%)",width:400,height:400,borderRadius:"50%",pointerEvents:"none",background:"radial-gradient(circle,rgba(52,211,153,0.04) 0%,transparent 70%)",animation:"orb-drift 30s ease-in-out infinite reverse",zIndex:0},
  dotGrid:{position:"fixed",inset:0,backgroundImage:"radial-gradient(circle,rgba(255,255,255,0.045) 1px,transparent 1px)",backgroundSize:"28px 28px",WebkitMaskImage:"radial-gradient(ellipse 80% 80% at 50% 50%,black 40%,transparent 100%)",maskImage:"radial-gradient(ellipse 80% 80% at 50% 50%,black 40%,transparent 100%)",pointerEvents:"none",zIndex:0} as React.CSSProperties,
  page:{width:"100%",maxWidth:720,minHeight:"100vh",display:"flex",flexDirection:"column",position:"relative",zIndex:1},

  header:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 20px",borderBottom:"1px solid rgba(255,255,255,0.06)",position:"sticky",top:0,background:"rgba(8,10,16,0.88)",backdropFilter:"blur(28px)",zIndex:10,boxShadow:"0 1px 0 rgba(108,141,250,0.08),0 4px 24px rgba(0,0,0,0.4)"},
  backBtn:{width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:8,color:"var(--text-secondary)",boxShadow:"inset 0 1px 0 rgba(255,255,255,0.05)"},
  headerCenter:{display:"flex",alignItems:"center",gap:9},
  headerIconWrap:{width:26,height:26,background:"linear-gradient(135deg,rgba(108,141,250,0.25),rgba(108,141,250,0.1))",border:"1px solid rgba(108,141,250,0.3)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",color:"var(--accent)",boxShadow:"0 0 12px rgba(108,141,250,0.2)"},
  livePill:{display:"flex",alignItems:"center",gap:5,fontSize:9,fontWeight:700,letterSpacing:"0.8px",background:"rgba(52,211,153,0.12)",color:"var(--green)",border:"1px solid rgba(52,211,153,0.22)",borderRadius:20,padding:"3px 9px",boxShadow:"0 0 8px rgba(52,211,153,0.1)"},
  liveDot:{width:5,height:5,borderRadius:"50%",flexShrink:0,background:"var(--green)",boxShadow:"0 0 6px var(--green-glow)",animation:"pulse-glow 2s ease-in-out infinite"},

  idle:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 28px 40px",textAlign:"center"},
  capturePreview:{position:"relative",width:"100%",maxWidth:500,height:170,marginBottom:36,borderRadius:16,background:"var(--bg-surface)",border:"1px solid rgba(108,141,250,0.12)",overflow:"hidden",boxShadow:"0 0 40px rgba(108,141,250,0.06)"},
  captureGrid:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,padding:14,height:"100%"},
  captureCard:{background:"var(--bg-elevated)",borderRadius:10,padding:"10px 12px",display:"flex",gap:10,alignItems:"center",border:"1px solid rgba(255,255,255,0.05)"},
  captureCardImg:{width:34,height:34,borderRadius:7,flexShrink:0,background:"linear-gradient(135deg,rgba(108,141,250,0.25),rgba(163,116,255,0.2))",animation:"float 4s ease-in-out infinite"},
  bone:{borderRadius:4,background:"rgba(255,255,255,0.055)"},
  overlay:{position:"absolute",inset:0,background:"rgba(8,10,16,0.58)",backdropFilter:"blur(1.5px)",display:"flex",alignItems:"center",justifyContent:"flex-end",padding:"14px 18px"},
  selBox:{position:"relative",width:200,height:108,border:"1.5px solid var(--accent)",borderRadius:8,animation:"capture-pulse 2.5s ease-in-out infinite",display:"flex",alignItems:"flex-end",justifyContent:"center",paddingBottom:10},
  corner:{position:"absolute",width:8,height:8,background:"var(--accent)",borderRadius:2},
  selLabel:{display:"flex",alignItems:"center",gap:5,fontSize:9,fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",color:"var(--accent)",background:"rgba(8,10,16,0.92)",padding:"3px 9px",borderRadius:5,border:"1px solid rgba(108,141,250,0.25)"},
  selLabelDot:{width:5,height:5,borderRadius:"50%",background:"var(--accent)",flexShrink:0,animation:"pulse-glow 1.5s ease-in-out infinite"},
  scanLine:{position:"absolute",left:0,right:0,height:1.5,background:"linear-gradient(90deg,transparent,rgba(108,141,250,0.6) 30%,rgba(163,116,255,0.6) 70%,transparent)",animation:"scan-sweep 3s ease-in-out infinite",boxShadow:"0 0 8px rgba(108,141,250,0.4)"},
  idleTitle:{fontSize:28,fontWeight:900,letterSpacing:"-0.8px",lineHeight:1.2,marginBottom:12},
  gradientText:{background:"linear-gradient(135deg,var(--accent) 0%,var(--accent-scan) 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"},
  idleDesc:{fontSize:13,color:"var(--text-secondary)",maxWidth:440,lineHeight:1.75,margin:"0 auto 24px"},
  platformRow:{display:"flex",flexWrap:"wrap",gap:7,justifyContent:"center",marginBottom:30},
  platformPill:{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"var(--text-secondary)",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:20,padding:"5px 11px"},
  demoBtn:{display:"flex",alignItems:"center",gap:8,background:"linear-gradient(135deg,#6c8dfa 0%,#a374ff 100%)",color:"#fff",fontSize:13.5,fontWeight:700,border:"none",borderRadius:12,padding:"13px 28px",cursor:"pointer",marginBottom:10,boxShadow:"0 4px 24px rgba(108,141,250,0.4),0 0 0 1px rgba(108,141,250,0.2),inset 0 1px 0 rgba(255,255,255,0.15)",letterSpacing:"-0.2px"},
  idleNote:{fontSize:11,color:"var(--text-muted)"},

  capturing:{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:28},
  extractSpinner:{width:44,height:44,position:"relative",display:"flex",alignItems:"center",justifyContent:"center"},
  extractSpinnerInner:{width:40,height:40,borderRadius:"50%",border:"2px solid rgba(255,255,255,0.06)",borderTopColor:"var(--accent)",borderRightColor:"rgba(163,116,255,0.5)",animation:"spin 0.7s linear infinite"},
  captureConfirm:{width:"100%",maxWidth:500,display:"flex",flexDirection:"column",gap:14},
  captureTagRow:{display:"flex"},
  captureTag:{display:"flex",alignItems:"center",gap:6,fontSize:10,fontWeight:700,letterSpacing:"0.6px",textTransform:"uppercase",color:"var(--green)",background:"rgba(52,211,153,0.1)",border:"1px solid rgba(52,211,153,0.18)",borderRadius:20,padding:"3px 10px"},
  captureProductCard:{display:"flex",gap:16,padding:18,background:"rgba(15,17,26,0.9)",backdropFilter:"blur(12px)",border:"1px solid rgba(108,141,250,0.15)",borderRadius:16,boxShadow:"0 0 30px rgba(108,141,250,0.06)"},
  captureImgWrap:{width:80,height:80,borderRadius:12,flexShrink:0,border:"1px solid var(--border)",overflow:"hidden",background:"var(--bg-elevated)"},
  captureProductImg:{width:"100%",height:"100%",objectFit:"cover"},
  captureProductBrand:{fontSize:10,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:4},
  captureProductName:{fontSize:13.5,fontWeight:600,lineHeight:1.45,color:"var(--text-primary)"},
  capturePrice:{fontSize:16,fontWeight:800,color:"var(--accent)",letterSpacing:"-0.3px"},
  captureRating:{fontSize:11.5,color:"var(--yellow)"},
  captureModel:{fontSize:10,color:"var(--text-muted)",background:"var(--bg-elevated)",padding:"2px 8px",borderRadius:5,border:"1px solid var(--border)"},
  scanWillCheck:{padding:"13px 16px",background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12},
  scanWillLabel:{fontSize:10,color:"var(--text-muted)",marginBottom:9,fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase"},
  scanPill:{fontSize:10.5,fontWeight:600,padding:"4px 10px",borderRadius:7,background:"rgba(108,141,250,0.1)",color:"var(--accent)",border:"1px solid rgba(108,141,250,0.15)"},
  analyzeBtn:{display:"flex",alignItems:"center",justifyContent:"center",gap:8,background:"linear-gradient(135deg,#6c8dfa,#a374ff)",color:"#fff",fontSize:14,fontWeight:700,border:"none",borderRadius:12,padding:"13px",cursor:"pointer",boxShadow:"0 4px 24px rgba(108,141,250,0.35),inset 0 1px 0 rgba(255,255,255,0.15)",letterSpacing:"-0.2px"},

  analyzing:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 32px",textAlign:"center"},
  orbWrap:{position:"relative",width:90,height:90,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:28},
  orbRing1:{position:"absolute",inset:0,borderRadius:"50%",border:"1px solid rgba(108,141,250,0.5)",animation:"pulse-ring 2s ease-out infinite"},
  orbRing2:{position:"absolute",inset:-14,borderRadius:"50%",border:"1px solid rgba(108,141,250,0.25)",animation:"pulse-ring 2s ease-out infinite 0.45s"},
  orbRing3:{position:"absolute",inset:-28,borderRadius:"50%",border:"1px solid rgba(108,141,250,0.1)",animation:"pulse-ring 2s ease-out infinite 0.9s"},
  orbCore:{width:60,height:60,borderRadius:"50%",background:"linear-gradient(135deg,rgba(108,141,250,0.15),rgba(163,116,255,0.15))",border:"1px solid rgba(108,141,250,0.2)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1,position:"relative",boxShadow:"0 0 30px rgba(108,141,250,0.15),inset 0 1px 0 rgba(255,255,255,0.08)"},
  orbGlow:{position:"absolute",inset:0,borderRadius:"50%",background:"radial-gradient(circle,rgba(108,141,250,0.2) 0%,transparent 70%)",animation:"pulse-glow 2s ease-in-out infinite"},
  analyzingTitle:{fontSize:19,fontWeight:800,letterSpacing:"-0.4px",marginBottom:6},
  analyzingSub:{fontSize:12.5,color:"var(--text-secondary)",marginBottom:28},
  stepsCard:{width:"100%",maxWidth:400,background:"rgba(15,17,26,0.9)",backdropFilter:"blur(12px)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:16,overflow:"hidden"},
  stepRow:{display:"flex",alignItems:"center",gap:10,padding:"9px 16px",transition:"opacity 0.3s"},
  stepDot:{width:8,height:8,borderRadius:"50%",border:"1px solid",flexShrink:0,transition:"all 0.3s"},
  stepCheck:{fontSize:11,color:"var(--green)",fontWeight:700,marginLeft:"auto"},
  stepSpinner:{width:12,height:12,borderRadius:"50%",border:"1.5px solid var(--border)",borderTopColor:"var(--accent)",animation:"spin 0.7s linear infinite",marginLeft:"auto",flexShrink:0},

  dashboard:{flex:1,display:"flex",flexDirection:"column"},
  dashScroll:{flex:1,overflowY:"auto",padding:"20px 22px 32px",display:"flex",flexDirection:"column",gap:14},

  productHero:{display:"flex",alignItems:"flex-start",gap:16,padding:"18px 20px",background:"linear-gradient(135deg,rgba(108,141,250,0.08) 0%,rgba(163,116,255,0.04) 100%)",border:"1px solid rgba(108,141,250,0.15)",borderRadius:18,boxShadow:"0 0 40px rgba(108,141,250,0.05)"},
  productImgWrap:{width:80,height:80,borderRadius:14,flexShrink:0,border:"1px solid rgba(255,255,255,0.08)",overflow:"hidden",background:"var(--bg-elevated)",boxShadow:"0 4px 16px rgba(0,0,0,0.3)"},
  productImg:{width:"100%",height:"100%",objectFit:"cover"},
  productBrand:{fontSize:10,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.7px",marginBottom:4},
  productName:{fontSize:14.5,fontWeight:700,color:"var(--text-primary)",lineHeight:1.4,letterSpacing:"-0.2px"},
  productPrice:{fontSize:16,fontWeight:800,letterSpacing:"-0.3px",background:"linear-gradient(135deg,var(--accent),var(--accent-scan))",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"},
  productRating:{fontSize:11,color:"var(--yellow)"},
  productStore:{fontSize:10,color:"var(--text-muted)",background:"rgba(255,255,255,0.04)",padding:"2px 8px",borderRadius:5,border:"1px solid var(--border)"},

  /* Stats ticker */
  statsRow:{display:"flex",alignItems:"stretch",gap:0,background:"rgba(15,17,26,0.9)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,overflow:"hidden"},
  statItem:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"14px 8px",borderRight:"1px solid rgba(255,255,255,0.05)"},
  statValue:{fontSize:20,fontWeight:900,letterSpacing:"-0.8px",lineHeight:1},
  statLabel:{fontSize:9.5,color:"var(--text-muted)",marginTop:4,textAlign:"center",lineHeight:1.3},

  scoreCard:{display:"flex",alignItems:"center",gap:28,padding:"22px 24px",background:"rgba(15,17,26,0.9)",backdropFilter:"blur(16px)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:18,boxShadow:"0 4px 32px rgba(0,0,0,0.3),inset 0 1px 0 rgba(255,255,255,0.04)"},
  scoreLegend:{flex:1},

  glassCard:{padding:"18px 20px",backdropFilter:"blur(16px)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:18,boxShadow:"0 4px 24px rgba(0,0,0,0.2)"},
  sectionHead:{display:"flex",alignItems:"center",gap:8,marginBottom:13},

  summaryText:{fontSize:13,color:"var(--text-secondary)",lineHeight:1.85},
  loveHateGrid:{display:"flex",gap:12,flexWrap:"wrap"},
  listPoints:{display:"flex",flexDirection:"column",gap:8},
  loveItem:{display:"flex",alignItems:"flex-start",gap:8,fontSize:12,color:"var(--text-secondary)",lineHeight:1.55},
  hateItem:{display:"flex",alignItems:"flex-start",gap:8,fontSize:12,color:"var(--text-secondary)",lineHeight:1.55},
  loveCheck:{color:"var(--green)",fontWeight:800,flexShrink:0,marginTop:1,fontSize:12},
  hateX:{color:"var(--red)",fontWeight:800,flexShrink:0,marginTop:1,fontSize:12},

  platformIconWrap:{width:30,height:30,borderRadius:8,flexShrink:0,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",display:"flex",alignItems:"center",justifyContent:"center"},
  barTrack:{height:7,background:"rgba(255,255,255,0.05)",borderRadius:99,overflow:"hidden"},
  barFill:{height:"100%",borderRadius:99},
  insightsBadge:{fontSize:9,fontWeight:600,padding:"2px 8px",borderRadius:20,background:"rgba(251,191,36,0.1)",color:"var(--yellow)",border:"1px solid rgba(251,191,36,0.18)"},
  insightRow:{display:"flex",alignItems:"flex-start",gap:10,padding:"11px 13px",borderRadius:10},

  /* Fake review */
  fakeLayout:{display:"flex",gap:18,alignItems:"flex-start",flexWrap:"wrap"},
  fakeRingWrap:{position:"relative",width:110,height:110,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"},
  fakeConfidence:{position:"absolute",bottom:-24,left:"50%",transform:"translateX(-50%)",display:"flex",flexDirection:"column",alignItems:"center",gap:1,whiteSpace:"nowrap"},

  /* Competitor */
  compCard:{display:"flex",alignItems:"flex-start",gap:12,padding:"14px 16px",background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14},
  compRank:{width:22,height:22,borderRadius:6,background:"rgba(163,116,255,0.12)",border:"1px solid rgba(163,116,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"var(--accent-scan)",flexShrink:0,marginTop:2},
  compImgWrap:{width:52,height:52,borderRadius:10,flexShrink:0,border:"1px solid var(--border)",overflow:"hidden",background:"var(--bg-elevated)"},
  compImg:{width:"100%",height:"100%",objectFit:"cover"},

  /* Price */
  priceCard:{position:"relative",overflow:"hidden",background:"linear-gradient(135deg,rgba(251,191,36,0.07) 0%,rgba(15,17,26,0.9) 100%)",border:"1px solid rgba(251,191,36,0.18)",borderRadius:14,boxShadow:"0 0 20px rgba(251,191,36,0.04)"},
  priceCardGlow:{position:"absolute",top:-20,right:-20,width:80,height:80,borderRadius:"50%",background:"radial-gradient(circle,rgba(251,191,36,0.1) 0%,transparent 70%)",pointerEvents:"none"},
  priceCardInner:{padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,position:"relative"},
  priceLeft:{display:"flex",alignItems:"center",gap:12,flex:1,minWidth:0},
  priceTitleRow:{display:"flex",alignItems:"center",gap:7},
  priceDealTitle:{fontSize:13,fontWeight:700,color:"var(--yellow)",letterSpacing:"-0.1px"},
  priceDealSub:{fontSize:10,color:"var(--text-muted)"},
  priceNumbers:{display:"flex",alignItems:"center",gap:8},
  priceBig:{fontSize:20,fontWeight:900,color:"var(--text-primary)",letterSpacing:"-0.5px"},
  priceSavings:{display:"flex",alignItems:"center",gap:3,fontSize:11,fontWeight:700,color:"var(--green)",background:"rgba(52,211,153,0.1)",border:"1px solid rgba(52,211,153,0.15)",borderRadius:6,padding:"2px 7px"},
  priceSavingsIcon:{fontSize:11,fontWeight:900},
  priceCompare:{display:"flex",alignItems:"center",gap:5},
  priceCurrentLabel:{fontSize:10,color:"var(--text-muted)"},
  priceCurrentVal:{fontSize:10,fontWeight:600,color:"var(--text-secondary)",textDecoration:"line-through",textDecorationColor:"rgba(255,255,255,0.2)"},
  viewDealBtn:{display:"flex",alignItems:"center",gap:6,background:"linear-gradient(135deg,#fbbf24,#f97316)",color:"#000",fontSize:11.5,fontWeight:700,border:"none",borderRadius:9,padding:"8px 14px",boxShadow:"0 2px 10px rgba(251,191,36,0.25)",cursor:"pointer",whiteSpace:"nowrap",textDecoration:"none",flexShrink:0},
  priceBestCard:{display:"flex",alignItems:"center",gap:14,padding:"16px 20px",background:"rgba(52,211,153,0.05)",border:"1px solid rgba(52,211,153,0.15)",borderRadius:18,boxShadow:"0 0 30px rgba(52,211,153,0.04)"},

  verdictCard:{padding:"22px 24px",borderRadius:18,display:"flex",flexDirection:"column",gap:14},
  verdictTop:{display:"flex",alignItems:"center",gap:14},
  verdictEmoji:{width:56,height:56,borderRadius:16,flexShrink:0,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center"},
  reanalyzeBtn:{display:"flex",alignItems:"center",justifyContent:"center",gap:7,background:"rgba(255,255,255,0.04)",color:"var(--text-muted)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"11px",fontSize:12.5,fontWeight:500},
};
