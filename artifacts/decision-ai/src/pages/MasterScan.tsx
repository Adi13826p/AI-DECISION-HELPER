import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";

/* ── Types ─────────────────────────────────────────── */
type Mode  = "product" | "article" | "youtube" | "planner" | "resume" | "translate";
type Stage = "home" | "profile" | "analyzing" | "result";

interface UserProfile {
  name: string; email: string; phone: string; address: string;
  linkedin: string; github: string; portfolio: string;
  skills: string; qualifications: string; experience: string; summary: string;
}

interface SmartySection { id: string; icon: string; label: string; content: string[]; }
interface SmartyResult  { title: string; sections: SmartySection[]; sourceLabel: string; sourceColor: string; }
interface ProductResult { product: { name: string; brand: string; price: string; rating: string; store: string }; truthScore: number; loves: ({ text: string; source: string } | string)[]; hates: ({ text: string; source: string } | string)[]; verdict: { label: string; emoji: string; reasoning: string }; }
interface ResumeResult  { fields: { label: string; value: string; status: string }[]; aiAnswers: { q: string; a: string }[]; coverLetter: string; }
interface TranslateResult { translated: string; language: string; detectedLanguage: string; notes: string[]; keyPhrases: { original: string; translated: string }[]; }
type AnyResult = { type: "product"; data: ProductResult } | { type: "smarty"; data: SmartyResult } | { type: "resume"; data: ResumeResult } | { type: "translate"; data: TranslateResult };

/* ── Profile Storage ───────────────────────────────── */
const PROFILE_KEY = "masterscan_profile";
const EMPTY: UserProfile = { name:"", email:"", phone:"", address:"", linkedin:"", github:"", portfolio:"", skills:"", qualifications:"", experience:"", summary:"" };

function loadProfile(): UserProfile {
  try { return { ...EMPTY, ...JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "{}") }; }
  catch { return { ...EMPTY }; }
}
function saveProfile(p: UserProfile) { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); }

/* ── Mode Config ───────────────────────────────────── */
const MODES: { id: Mode; icon: string; label: string; placeholder: string; hint: string; color: string; bg: string; border: string }[] = [
  { id:"product",   icon:"📦", label:"Product",   placeholder:"Enter product name (e.g., iPhone 16 Pro)",          hint:"AI product intelligence — score, pros & cons",       color:"#ec4899", bg:"rgba(236,72,153,0.09)",  border:"rgba(236,72,153,0.25)" },
  { id:"article",   icon:"📰", label:"Article",   placeholder:"Paste a URL (https://...) or paste article text",    hint:"URL fetched & analyzed — key points & insights",     color:"#6c8dfa", bg:"rgba(108,141,250,0.09)", border:"rgba(108,141,250,0.25)" },
  { id:"youtube",   icon:"▶",  label:"YouTube",   placeholder:"Paste YouTube URL (e.g., https://youtube.com/...)", hint:"Structured video notes, key moments & takeaways",    color:"#f87171", bg:"rgba(248,113,113,0.09)", border:"rgba(248,113,113,0.25)" },
  { id:"planner",   icon:"🧭", label:"Planner",   placeholder:"Describe your goal (e.g., Learn Python in 30 days)", hint:"Roadmaps, schedules & step-by-step action plans",  color:"#10b981", bg:"rgba(16,185,129,0.09)",  border:"rgba(16,185,129,0.25)"  },
  { id:"resume",    icon:"📄", label:"Resume",    placeholder:"Paste job URL or description (optional)",            hint:"Auto-fill forms from your saved profile",            color:"#a374ff", bg:"rgba(163,116,255,0.09)", border:"rgba(163,116,255,0.25)" },
  { id:"translate", icon:"🌐", label:"Translate", placeholder:"Paste text to translate into any language",          hint:"Instantly translate text or selected content",       color:"#fb923c", bg:"rgba(251,146,60,0.09)",  border:"rgba(251,146,60,0.25)"  },
];

const STEPS: Record<Mode, string[]> = {
  product:   ["Identifying product…", "Fetching price data…",  "Analyzing reviews…",    "Building verdict…"],
  article:   ["Reading content…",     "Extracting key points…","Generating insights…",  "Finalizing notes…"],
  youtube:   ["Analyzing video…",     "Extracting transcript…","Summarizing content…",  "Formatting notes…"],
  planner:   ["Understanding goal…",  "Building timeline…",    "Generating steps…",     "Structuring plan…"],
  resume:    ["Reading profile…",     "Matching to job…",      "Generating answers…",   "Formatting output…"],
  translate: ["Detecting language…",  "Translating content…",  "Extracting key phrases…","Finalizing output…"],
};

const EXAMPLES: Record<Mode, string[]> = {
  product:   ["iPhone 16 Pro", "Samsung 65\" OLED TV", "Dyson V15 Vacuum"],
  article:   ["https://techcrunch.com/", "Paste any article text here"],
  youtube:   ["https://youtube.com/watch?v=dQw4w9WgXcQ", "https://youtu.be/..."],
  planner:   ["Learn Python in 30 days", "Prepare for interviews in 2 weeks", "Plan a Europe trip in 7 days"],
  resume:    ["Software Engineer at Google", "Marketing Manager at startup"],
  translate: ["Hello, how are you today?", "The meeting is scheduled for Friday at 3pm.", "Please review the attached document carefully."],
};

const PLANNER_TEMPLATES = [
  { icon:"🚀", label:"Startup Roadmap",      color:"#ec4899", query:"Create a detailed 6-12 month roadmap for launching a tech startup from scratch — include idea validation, MVP development, fundraising milestones, team building, product-market fit, and go-to-market strategy with monthly checkpoints." },
  { icon:"🎓", label:"College Interview Prep",color:"#a374ff", query:"Create a comprehensive 4-week college/university interview preparation plan — include daily practice questions, common interview topics, confidence-building exercises, mock interview schedule, body language tips, and research tasks for each week." },
  { icon:"📅", label:"Weekly Study Schedule", color:"#6c8dfa", query:"Create a balanced and realistic weekly student timetable/schedule — include study blocks, subject rotation, break times, exercise, meals, revision sessions, and free time. Make it sustainable and effective for academic success." },
  { icon:"💼", label:"Job Interview Roadmap", color:"#34d399", query:"Create a 3-week intensive job interview preparation roadmap for a software engineering position — include daily DSA practice, system design study, behavioral question prep (STAR format), company research tasks, mock interview sessions, and final week polishing strategy." },
];

const LANGUAGES = ["Spanish","French","German","Italian","Portuguese","Chinese (Simplified)","Chinese (Traditional)","Japanese","Korean","Arabic","Hindi","Russian","Dutch","Swedish","Polish","Turkish","Vietnamese","Thai","Indonesian","Malay","Greek","Hebrew","Bengali","Urdu"];

/* ── Panel ─────────────────────────────────────────── */
export function MasterScanPanel({ onClose }: { onClose: () => void }) {
  const [mode,    setMode]    = useState<Mode>("article");
  const [stage,   setStage]   = useState<Stage>("home");
  const [query,   setQuery]   = useState("");
  const [stepIdx, setStep]    = useState(0);
  const [result,  setResult]  = useState<AnyResult | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile>(loadProfile);
  const [lang,    setLang]    = useState("Spanish");

  async function analyze() {
    if (!query.trim() && mode !== "resume") return;
    setError(null); setStep(0); setStage("analyzing");

    const steps = STEPS[mode];
    let p = 0;
    const iv = setInterval(() => { p = Math.min(p + 1, steps.length - 1); setStep(p); }, 700);

    try {
      let data: AnyResult;

      if (mode === "product") {
        const res = await fetch("/api/ai/analyze", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ productName: query }) });
        if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Analysis failed");
        data = { type:"product", data: await res.json() as ProductResult };

      } else if (mode === "resume") {
        const profileStr = Object.entries(profile).filter(([,v]) => v?.trim()).map(([k,v]) => `${k}: ${v}`).join("\n");
        const res = await fetch("/api/ai/resume", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ profile: profileStr, jobContext: query || "General job application" }) });
        if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Resume failed");
        data = { type:"resume", data: await res.json() as ResumeResult };

      } else if (mode === "translate") {
        const res = await fetch("/api/ai/translate", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ text: query, targetLanguage: lang }) });
        if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Translation failed");
        data = { type:"translate", data: await res.json() as TranslateResult };

      } else {
        let smartyQuery = query;
        if (mode === "planner") smartyQuery = `Create a detailed step-by-step action plan with clear timeline and milestones for this goal: ${query}`;
        const res = await fetch("/api/ai/smarty", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ query: smartyQuery }) });
        if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Analysis failed");
        data = { type:"smarty", data: await res.json() as SmartyResult };
      }

      clearInterval(iv);
      setStep(steps.length - 1);
      await new Promise(r => setTimeout(r, 400));
      setResult(data);
      setStage("result");
    } catch (err) {
      clearInterval(iv);
      setError(String(err).replace("Error: ", ""));
      setStage("home");
    }
  }

  function handleTranslateText(text: string) {
    setMode("translate");
    setQuery(text);
    setResult(null);
    setStage("home");
  }

  return (
    <div style={{ position:"absolute", inset:0, background:"var(--bg-base)", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={ms.dotGrid} />
      <div style={{ width:"100%", flex:1, display:"flex", flexDirection:"column", position:"relative", zIndex:1, overflow:"hidden" }}>
        <MSHeader
          onBack={() => { if (stage==="result") { setStage("home"); setResult(null); } else if (stage==="profile") setStage("home"); else onClose(); }}
          stage={stage}
          onProfile={() => setStage("profile")}
          profileFilled={!!profile.name}
        />
        {stage === "home"      && <HomeView mode={mode} setMode={m => { setMode(m); setQuery(""); }} query={query} setQuery={setQuery} onAnalyze={analyze} error={error} profile={profile} lang={lang} setLang={setLang} />}
        {stage === "analyzing" && <AnalyzingView mode={mode} stepIdx={stepIdx} />}
        {stage === "result"    && result && <ResultView result={result} mode={mode} onReset={() => { setStage("home"); setResult(null); }} onTranslateText={handleTranslateText} />}
        {stage === "profile"   && <ProfileView profile={profile} onSave={p => { saveProfile(p); setProfile(p); setStage("home"); }} onCancel={() => setStage("home")} />}
      </div>
    </div>
  );
}

export default function MasterScan() {
  const [, navigate] = useLocation();
  return <MasterScanPanel onClose={() => navigate("/")} />;
}

/* ── Header ─────────────────────────────────────────── */
function MSHeader({ onBack, stage, onProfile, profileFilled }: { onBack: () => void; stage: Stage; onProfile: () => void; profileFilled: boolean }) {
  return (
    <header style={ms.header}>
      <button style={ms.iconBtn} onClick={onBack}>
        <svg style={{width:14,height:14}} viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
      <div style={ms.headerCenter}>
        <div style={ms.headerIcon}>
          <svg style={{width:12,height:12}} viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M14 14h2v2h-2zM18 14h3M14 18h2M18 18h3M14 21h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <span style={{fontSize:14,fontWeight:700,letterSpacing:"-0.2px"}}>MasterScan</span>
        {stage === "result" && <div style={ms.livePill}><span style={ms.liveDot}/>LIVE</div>}
      </div>
      <button style={{...ms.iconBtn, position:"relative"}} onClick={onProfile} title="My Profile">
        <svg style={{width:14,height:14}} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6"/>
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
        {profileFilled && <span style={{position:"absolute",top:3,right:3,width:6,height:6,borderRadius:"50%",background:"var(--green)",border:"1.5px solid var(--bg-base)"}} />}
      </button>
    </header>
  );
}

/* ── Home View ──────────────────────────────────────── */
function HomeView({ mode, setMode, query, setQuery, onAnalyze, error, profile, lang, setLang }: {
  mode: Mode; setMode: (m: Mode) => void;
  query: string; setQuery: (q: string) => void;
  onAnalyze: () => void; error: string | null; profile: UserProfile;
  lang: string; setLang: (l: string) => void;
}) {
  const info = MODES.find(m => m.id === mode)!;
  const canSubmit = query.trim() || mode === "resume";
  const btnLabel = mode==="resume" ? "🪄 Auto-Fill Resume" : mode==="planner" ? "🧭 Generate Plan" : mode==="translate" ? "🌐 Translate Now" : mode==="youtube" ? "▶ Extract Notes" : "⚡ Analyze Now";

  return (
    <div style={{flex:1, overflowY:"auto", padding:"16px 14px 36px", display:"flex", flexDirection:"column", gap:14}}>

      {/* Mode tabs */}
      <div style={{display:"flex", gap:6, overflowX:"auto", paddingBottom:2}}>
        {MODES.map(m => {
          const active = mode === m.id;
          return (
            <button key={m.id} onClick={() => setMode(m.id)}
              style={{flexShrink:0, display:"flex", alignItems:"center", gap:5, padding:"7px 13px", borderRadius:22, border:"1px solid", fontSize:11.5, fontWeight:700, cursor:"pointer", transition:"all 0.18s",
                background: active ? m.color : "var(--bg-surface)",
                color:       active ? "#fff" : "var(--text-secondary)",
                borderColor: active ? m.color : "var(--border)",
                boxShadow:   active ? `0 4px 14px ${m.color}45` : "none",
                transform:   active ? "translateY(-1px)" : "none",
              }}>
              <span style={{fontSize:13}}>{m.icon}</span>
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Mode hint card — colour-coded per mode */}
      <div style={{
        padding:"14px 16px",
        background: `linear-gradient(135deg, ${info.bg} 0%, rgba(255,255,255,0.6) 100%)`,
        border:`1.5px solid ${info.border}`,
        borderRadius:16,
        display:"flex", alignItems:"center", gap:13,
        position:"relative", overflow:"hidden",
      }}>
        {/* Decorative blob */}
        <div style={{position:"absolute",top:-20,right:-20,width:80,height:80,borderRadius:"50%",background:`radial-gradient(circle,${info.color}22 0%,transparent 70%)`,pointerEvents:"none"}} />
        {/* Icon bubble */}
        <div style={{
          flexShrink:0, width:44, height:44, borderRadius:14,
          background:`linear-gradient(135deg,${info.color}25,${info.color}0e)`,
          border:`1px solid ${info.color}35`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:22, boxShadow:`0 4px 16px ${info.color}20`,
        }}>{info.icon}</div>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontSize:13,fontWeight:800,color:"var(--text-primary)",letterSpacing:"-0.3px"}}>{info.label} Mode</div>
          <div style={{fontSize:11.5,color:"var(--text-secondary)",marginTop:2,lineHeight:1.4}}>{info.hint}</div>
        </div>
        {/* Active dot */}
        <div style={{width:8,height:8,borderRadius:"50%",background:info.color,boxShadow:`0 0 10px ${info.color}`,flexShrink:0}} />
      </div>

      {/* Planner templates (only in planner mode) */}
      {mode === "planner" && <PlannerTemplates onSelect={setQuery} />}

      {/* Input area */}
      {mode === "resume" ? (
        <ResumeInput profile={profile} query={query} setQuery={setQuery} />
      ) : mode === "translate" ? (
        <TranslateInput query={query} setQuery={setQuery} lang={lang} setLang={setLang} placeholder={info.placeholder} />
      ) : (
        <>
          <div style={{position:"relative"}}>
            <textarea value={query} onChange={e => setQuery(e.target.value)} placeholder={info.placeholder} rows={5}
              style={{width:"100%", padding:"14px 15px", background:"#fff",
                border:`1.5px solid ${info.border}`,
                borderRadius:14, color:"var(--text-primary)", fontSize:13, fontFamily:"inherit", resize:"none", outline:"none", boxSizing:"border-box", lineHeight:1.65,
                boxShadow:`0 2px 12px ${info.color}10`} as React.CSSProperties}
              onFocus={e => { e.currentTarget.style.borderColor=info.color; e.currentTarget.style.boxShadow=`0 0 0 3px ${info.color}20, 0 2px 12px ${info.color}15`; }}
              onBlur={e => { e.currentTarget.style.borderColor=info.border; e.currentTarget.style.boxShadow=`0 2px 12px ${info.color}10`; }}
            />
            {query.length > 0 && (
              <div style={{position:"absolute",bottom:10,right:12,fontSize:10,color:"var(--text-muted)",fontWeight:500,background:"rgba(255,255,255,0.9)",padding:"2px 6px",borderRadius:6}}>
                {query.length} chars
              </div>
            )}
          </div>
          {/* URL detection badge for article/youtube modes */}
          {(mode === "article" || mode === "youtube") && /^https?:\/\//i.test(query.trim()) && (
            <div style={{display:"flex", alignItems:"center", gap:8, padding:"9px 13px",
              background: mode==="youtube" ? "rgba(248,113,113,0.08)" : "rgba(108,141,250,0.08)",
              border:`1.5px solid ${mode==="youtube" ? "rgba(248,113,113,0.25)" : "rgba(108,141,250,0.25)"}`,
              borderRadius:10, marginTop:-6}}>
              <span style={{fontSize:14}}>{mode==="youtube" ? "▶" : "🔗"}</span>
              <span style={{fontSize:11.5, fontWeight:600, color: mode==="youtube" ? "#f87171" : "#6c8dfa"}}>
                {mode==="youtube" ? "YouTube URL detected — generating structured video notes" : "URL detected — fetching & analyzing article content"}
              </span>
            </div>
          )}
        </>
      )}

      {error && (
        <div style={{padding:"10px 14px", background:"rgba(248,113,113,0.08)", border:"1.5px solid rgba(248,113,113,0.25)", borderRadius:10, fontSize:12, color:"var(--red)", display:"flex", gap:7, alignItems:"center"}}>
          <span>⚠️</span>{error}
        </div>
      )}

      {/* Analyze button — always visible, dims when empty */}
      <button onClick={onAnalyze} disabled={!canSubmit}
        style={{
          padding:"15px", borderRadius:14, border:"none", fontSize:15, fontWeight:800, cursor: canSubmit ? "pointer" : "not-allowed",
          transition:"all 0.2s", letterSpacing:"-0.3px",
          background: canSubmit
            ? `linear-gradient(135deg, ${info.color}, ${info.color}cc)`
            : "linear-gradient(135deg, rgba(236,72,153,0.12), rgba(244,63,94,0.08))",
          color: canSubmit ? "#fff" : "var(--text-muted)",
          boxShadow: canSubmit ? `0 6px 20px ${info.color}45, 0 2px 8px ${info.color}25` : "none",
          transform: canSubmit ? "none" : "none",
        }}
        onMouseEnter={e => { if (canSubmit) { e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.boxShadow=`0 10px 28px ${info.color}50, 0 4px 12px ${info.color}30`; }}}
        onMouseLeave={e => { e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow=canSubmit ? `0 6px 20px ${info.color}45, 0 2px 8px ${info.color}25` : "none"; }}
      >
        {btnLabel}
      </button>

      {/* Quick examples */}
      {mode !== "planner" && EXAMPLES[mode].length > 0 && (
        <div>
          <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:10}}>
            <div style={{fontSize:10.5, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.7px"}}>Try an example</div>
            <div style={{flex:1, height:1, background:`linear-gradient(90deg, ${info.border}, transparent)`}} />
          </div>
          <div style={{display:"flex", flexWrap:"wrap", gap:7}}>
            {EXAMPLES[mode].map(ex => (
              <button key={ex} onClick={() => setQuery(ex)}
                style={{fontSize:11.5, padding:"6px 12px",
                  background: `linear-gradient(135deg, ${info.bg}, rgba(255,255,255,0.8))`,
                  border:`1px solid ${info.border}`,
                  borderRadius:22, color: info.color, cursor:"pointer", fontWeight:600,
                  transition:"all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background=info.color; e.currentTarget.style.color="#fff"; e.currentTarget.style.boxShadow=`0 3px 12px ${info.color}35`; }}
                onMouseLeave={e => { e.currentTarget.style.background=`linear-gradient(135deg, ${info.bg}, rgba(255,255,255,0.8))`; e.currentTarget.style.color=info.color; e.currentTarget.style.boxShadow="none"; }}
              >
                {ex.length > 36 ? ex.slice(0,36)+"…" : ex}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Planner Templates ──────────────────────────────── */
function PlannerTemplates({ onSelect }: { onSelect: (q: string) => void }) {
  return (
    <div>
      <div style={{fontSize:10,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.7px",marginBottom:8}}>⚡ Quick Templates</div>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:7}}>
        {PLANNER_TEMPLATES.map(t => (
          <button key={t.label} onClick={() => onSelect(t.query)}
            style={{display:"flex", alignItems:"center", gap:7, padding:"10px 11px", background:"var(--bg-surface)", border:`1px solid ${t.color}25`, borderRadius:10, cursor:"pointer", textAlign:"left", transition:"all 0.15s"}}
            onMouseEnter={e => { e.currentTarget.style.background=`${t.color}0e`; e.currentTarget.style.borderColor=`${t.color}50`; }}
            onMouseLeave={e => { e.currentTarget.style.background="var(--bg-surface)"; e.currentTarget.style.borderColor=`${t.color}25`; }}>
            <span style={{fontSize:20,flexShrink:0}}>{t.icon}</span>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontSize:11.5,fontWeight:700,color:"var(--text-primary)",lineHeight:1.3,marginBottom:1}}>{t.label}</div>
              <div style={{fontSize:10,color:t.color,fontWeight:600}}>Tap to load →</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Translate Input ────────────────────────────────── */
function TranslateInput({ query, setQuery, lang, setLang, placeholder }: { query: string; setQuery: (q: string) => void; lang: string; setLang: (l: string) => void; placeholder: string }) {
  return (
    <div style={{display:"flex", flexDirection:"column", gap:8}}>
      {/* Language selector */}
      <div style={{display:"flex", alignItems:"center", gap:8}}>
        <div style={{fontSize:11,fontWeight:600,color:"var(--text-secondary)",flexShrink:0}}>Translate to:</div>
        <select value={lang} onChange={e => setLang(e.target.value)}
          style={{flex:1, padding:"8px 10px", background:"#fff", border:"1px solid rgba(236,72,153,0.22)", borderRadius:9, fontSize:12.5, color:"var(--text-primary)", fontFamily:"inherit", outline:"none", cursor:"pointer"} as React.CSSProperties}>
          {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>
      {/* Text input */}
      <textarea value={query} onChange={e => setQuery(e.target.value)} placeholder={placeholder} rows={5}
        style={{width:"100%", padding:"12px 14px", background:"#fff", border:"1px solid rgba(236,72,153,0.2)", borderRadius:12, color:"var(--text-primary)", fontSize:13, fontFamily:"inherit", resize:"none", outline:"none", boxSizing:"border-box", lineHeight:1.65} as React.CSSProperties}
        onFocus={e => { e.currentTarget.style.borderColor="rgba(236,72,153,0.5)"; e.currentTarget.style.boxShadow="0 0 0 3px rgba(236,72,153,0.1)"; }}
        onBlur={e => { e.currentTarget.style.borderColor="rgba(236,72,153,0.2)"; e.currentTarget.style.boxShadow="none"; }}
      />
      <div style={{fontSize:10.5,color:"var(--text-muted)",textAlign:"right"}}>{query.length} chars · supports any language</div>
    </div>
  );
}

function ResumeInput({ profile, query, setQuery }: { profile: UserProfile; query: string; setQuery: (q: string) => void }) {
  const filled = Object.values(profile).filter(Boolean).length;
  return (
    <div style={{display:"flex", flexDirection:"column", gap:8}}>
      <div style={{padding:"10px 14px", background: filled > 3 ? "rgba(16,185,129,0.06)" : "rgba(236,72,153,0.04)", border:`1px solid ${filled > 3 ? "rgba(16,185,129,0.2)" : "rgba(236,72,153,0.15)"}`, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"space-between"}}>
        <div>
          <div style={{fontSize:12,fontWeight:700,color: filled > 3 ? "var(--green)" : "var(--text-primary)"}}>{filled > 3 ? `✓ Profile ready (${filled}/11 fields)` : `⚠ Profile incomplete (${filled}/11)`}</div>
          <div style={{fontSize:11,color:"var(--text-muted)"}}>Tap the profile icon (top right) to fill in your info</div>
        </div>
      </div>
      <textarea value={query} onChange={e => setQuery(e.target.value)} placeholder="Paste job URL or job description (leave blank for a general resume)" rows={3}
        style={{width:"100%", padding:"12px 14px", background:"#fff", border:"1px solid rgba(236,72,153,0.2)", borderRadius:12, color:"var(--text-primary)", fontSize:13, fontFamily:"inherit", resize:"none", outline:"none", boxSizing:"border-box", lineHeight:1.6} as React.CSSProperties}
        onFocus={e => { e.currentTarget.style.borderColor="rgba(236,72,153,0.5)"; e.currentTarget.style.boxShadow="0 0 0 3px rgba(236,72,153,0.1)"; }}
        onBlur={e => { e.currentTarget.style.borderColor="rgba(236,72,153,0.2)"; e.currentTarget.style.boxShadow="none"; }}
      />
    </div>
  );
}

/* ── Analyzing View ─────────────────────────────────── */
function AnalyzingView({ mode, stepIdx }: { mode: Mode; stepIdx: number }) {
  const steps = STEPS[mode];
  const info  = MODES.find(m => m.id === mode)!;
  return (
    <div style={{flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"28px 20px", gap:20}}>
      <div style={{position:"relative", width:86, height:86, display:"flex", alignItems:"center", justifyContent:"center"}}>
        <div style={{position:"absolute", inset:0, borderRadius:"50%", border:"1px solid rgba(236,72,153,0.22)", animation:"spin 7s linear infinite"}} />
        <div style={{position:"absolute", inset:10, borderRadius:"50%", border:"1px solid rgba(244,63,94,0.15)", animation:"spin 11s linear infinite reverse"}} />
        <div style={{width:52, height:52, borderRadius:"50%", background:"linear-gradient(135deg,rgba(236,72,153,0.15),rgba(244,63,94,0.1))", border:"1px solid rgba(236,72,153,0.28)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22}}>{info.icon}</div>
      </div>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:16,fontWeight:800,color:"var(--text-primary)",marginBottom:4,letterSpacing:"-0.3px"}}>Analyzing…</div>
        <div style={{fontSize:12,color:"var(--text-muted)"}}>{steps[stepIdx]}</div>
      </div>
      <div style={{width:"100%", maxWidth:340, background:"var(--bg-surface)", border:"1px solid var(--border)", borderRadius:12, overflow:"hidden"}}>
        {steps.map((step, i) => {
          const done = i < stepIdx, active = i === stepIdx;
          return (
            <div key={i} style={{display:"flex", alignItems:"center", gap:10, padding:"9px 14px", borderBottom: i < steps.length-1 ? "1px solid var(--border)" : "none", opacity: i > stepIdx+1 ? 0.3 : 1}}>
              <div style={{width:7, height:7, borderRadius:"50%", flexShrink:0, background: done ? "var(--green)" : active ? "var(--accent)" : "var(--bg-elevated)", border:`1.5px solid ${done ? "var(--green)" : active ? "var(--accent)" : "var(--border)"}`}} />
              <span style={{fontSize:12, color: done ? "var(--green)" : active ? "var(--text-primary)" : "var(--text-muted)", fontWeight: active ? 600 : 400, flex:1}}>{step}</span>
              {done   && <span style={{fontSize:10,color:"var(--green)",fontWeight:700}}>✓</span>}
              {active && <div style={{width:10,height:10,borderRadius:"50%",border:"1.5px solid rgba(236,72,153,0.2)",borderTopColor:"var(--accent)",animation:"spin 0.7s linear infinite",flexShrink:0}} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Extension Download Card ────────────────────────── */
function ExtensionDownloadCard() {
  const [state, setState] = useState<"idle"|"loading"|"done">("idle");

  async function handleDownload() {
    if (state === "loading") return;
    setState("loading");
    try {
      const res = await fetch("/api/extension/download");
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = "decision-ai-extension.zip"; a.click();
      URL.revokeObjectURL(url);
      setState("done");
      setTimeout(() => setState("idle"), 3500);
    } catch { setState("idle"); }
  }

  return (
    <div style={{
      position:"relative", overflow:"hidden", borderRadius:16,
      background:"linear-gradient(135deg,rgba(139,92,246,0.08) 0%,rgba(236,72,153,0.07) 50%,rgba(108,141,250,0.06) 100%)",
      border:"1px solid rgba(139,92,246,0.22)",
      padding:"16px 16px 14px",
    }}>
      {/* Decorative blobs */}
      <div style={{position:"absolute",top:-24,right:-24,width:80,height:80,borderRadius:"50%",background:"radial-gradient(circle,rgba(139,92,246,0.15),transparent 70%)",pointerEvents:"none"}} />
      <div style={{position:"absolute",bottom:-20,left:-20,width:70,height:70,borderRadius:"50%",background:"radial-gradient(circle,rgba(236,72,153,0.1),transparent 70%)",pointerEvents:"none"}} />

      <div style={{position:"relative",zIndex:1}}>
        {/* Header row */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
          <div style={{
            width:36,height:36,borderRadius:10,flexShrink:0,
            background:"linear-gradient(135deg,rgba(139,92,246,0.22),rgba(236,72,153,0.14))",
            border:"1px solid rgba(139,92,246,0.28)",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,
          }}>🧩</div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:800,color:"var(--text-primary)",letterSpacing:"-0.2px"}}>Get the Chrome Extension</div>
            <div style={{fontSize:10.5,color:"var(--text-muted)",marginTop:1}}>Use DecisionAI on any website, instantly</div>
          </div>
        </div>

        {/* Feature pills */}
        <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>
          {["🛍️ Truth Layer","📺 YouTube Notes","📄 MasterScan","🤖 Auto Job Apply"].map(f => (
            <span key={f} style={{
              fontSize:10,fontWeight:600,padding:"3px 8px",borderRadius:20,
              background:"rgba(139,92,246,0.08)",
              border:"1px solid rgba(139,92,246,0.16)",
              color:"var(--text-secondary)",
            }}>{f}</span>
          ))}
        </div>

        {/* Download button */}
        <button
          onClick={handleDownload}
          style={{
            width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            padding:"11px 16px", borderRadius:11, border:"none", cursor: state==="loading" ? "wait" : "pointer",
            fontSize:12.5, fontWeight:700, color:"#fff", letterSpacing:"0.1px",
            background: state==="done"
              ? "linear-gradient(135deg,#10b981,#059669)"
              : "linear-gradient(135deg,#8b5cf6,#ec4899,#6c8dfa)",
            backgroundSize:"200%",
            opacity: state==="loading" ? 0.8 : 1,
            transition:"opacity 0.2s",
            boxShadow: state==="done" ? "0 4px 18px rgba(16,185,129,0.3)" : "0 4px 18px rgba(139,92,246,0.35)",
          }}
        >
          {state==="loading" ? (
            <svg style={{width:14,height:14,animation:"spin 1s linear infinite"}} viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="32" strokeDashoffset="10"/>
            </svg>
          ) : state==="done" ? (
            <svg style={{width:14,height:14}} viewBox="0 0 24 24" fill="none">
              <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg style={{width:14,height:14}} viewBox="0 0 24 24" fill="none">
              <path d="M12 3v13M7 11l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          )}
          <span>{state==="loading" ? "Packaging extension…" : state==="done" ? "Downloaded! Install from chrome://extensions" : "⬇ Download Extension (.zip)"}</span>
        </button>

        {state==="done" && (
          <div style={{marginTop:8,fontSize:10.5,color:"var(--text-muted)",textAlign:"center",lineHeight:1.5}}>
            Unzip → open <strong>chrome://extensions</strong> → enable Developer mode → Load unpacked
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Result View ────────────────────────────────────── */
function ResultView({ result, mode, onReset, onTranslateText }: { result: AnyResult; mode: Mode; onReset: () => void; onTranslateText: (text: string) => void }) {
  const [selTip, setSelTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  function handleMouseUp(e: React.MouseEvent) {
    setTimeout(() => {
      const sel = window.getSelection();
      const text = sel?.toString().trim() ?? "";
      if (text.length >= 8) {
        const rect = (e.target as HTMLElement).closest("[data-result-scroll]")?.getBoundingClientRect();
        const baseLeft = rect ? rect.left : 0;
        setSelTip({
          x: Math.max(baseLeft + 4, Math.min(e.clientX, (rect ? rect.right : window.innerWidth) - 180)),
          y: e.clientY,
          text,
        });
      } else {
        setSelTip(null);
      }
    }, 20);
  }

  return (
    <div style={{flex:1, display:"flex", flexDirection:"column", overflow:"hidden", position:"relative"}}>
      <div ref={scrollRef} data-result-scroll="1"
        style={{flex:1, overflowY:"auto", padding:"14px 14px 32px", display:"flex", flexDirection:"column", gap:10}}
        onMouseUp={handleMouseUp}
        onTouchEnd={() => setTimeout(() => {
          const sel = window.getSelection();
          const text = sel?.toString().trim() ?? "";
          if (text.length >= 8) {
            const r = sel!.getRangeAt(0).getBoundingClientRect();
            setSelTip({ x: r.left + r.width / 2, y: r.top - 2, text });
          }
        }, 50)}
      >
        {result.type === "product"   && <ProductResultView data={result.data} />}
        {result.type === "smarty"    && <SmartyResultView data={result.data} mode={mode} />}
        {result.type === "resume"    && <ResumeResultView data={result.data} />}
        {result.type === "translate" && <TranslateResultView data={result.data} />}

        {/* ── Download Extension CTA ── */}
        <ExtensionDownloadCard />

        <button onClick={onReset} style={{display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"11px", background:"var(--bg-elevated)", border:"1px solid var(--border)", borderRadius:11, color:"var(--text-secondary)", fontSize:12.5, fontWeight:600, cursor:"pointer", marginTop:4}}>
          ↩ Analyze Another
        </button>
      </div>

      {/* Floating translate tooltip — appears on text selection */}
      {selTip && (
        <div style={{
          position:"fixed", left: selTip.x - 80, top: selTip.y - 52,
          zIndex:9999, display:"flex", borderRadius:9, overflow:"hidden",
          background:"var(--bg-surface)", border:"1px solid rgba(236,72,153,0.35)",
          boxShadow:"0 4px 24px rgba(0,0,0,0.18)", userSelect:"none",
        }}>
          <button
            onClick={() => { onTranslateText(selTip.text); setSelTip(null); window.getSelection()?.removeAllRanges(); }}
            style={{padding:"8px 14px", background:"var(--accent)", color:"#fff", border:"none", fontSize:11.5, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:5}}>
            🌐 Translate
          </button>
          <button onClick={() => { navigator.clipboard.writeText(selTip.text); setSelTip(null); }}
            style={{padding:"8px 10px", background:"transparent", border:"none", borderLeft:"1px solid rgba(236,72,153,0.2)", fontSize:11, color:"var(--text-secondary)", cursor:"pointer", fontWeight:600}}>
            📋
          </button>
          <button onClick={() => setSelTip(null)}
            style={{padding:"8px 9px", background:"transparent", border:"none", borderLeft:"1px solid rgba(236,72,153,0.15)", fontSize:11, color:"var(--text-muted)", cursor:"pointer"}}>
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Product Result ─────────────────────────────────── */
function ProductResultView({ data }: { data: ProductResult }) {
  const score = typeof data.truthScore === "number" && !isNaN(data.truthScore) ? data.truthScore : 0;
  const col   = score >= 80 ? "var(--green)" : score >= 65 ? "var(--yellow)" : "var(--red)";
  return (
    <>
      <div style={{padding:"14px 16px", background:"var(--bg-surface)", border:"1px solid var(--border)", borderRadius:14}}>
        <div style={{fontSize:10,color:"var(--text-muted)",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:3}}>{data.product?.brand}</div>
        <div style={{fontSize:15,fontWeight:700,color:"var(--text-primary)",marginBottom:8,lineHeight:1.3}}>{data.product?.name}</div>
        <div style={{display:"flex", alignItems:"center", gap:10, flexWrap:"wrap"}}>
          <span style={{fontSize:18,fontWeight:800,color:"var(--accent)"}}>{data.product?.price}</span>
          <span style={{fontSize:11,color:"var(--yellow)"}}>★ {data.product?.rating}</span>
          <span style={{fontSize:10,background:"var(--bg-elevated)",border:"1px solid var(--border)",borderRadius:5,padding:"2px 7px",color:"var(--text-muted)"}}>{data.product?.store}</span>
        </div>
      </div>

      <div style={{padding:"14px 16px", background:"var(--bg-surface)", border:"1px solid var(--border)", borderRadius:14, display:"flex", alignItems:"center", gap:16}}>
        <div style={{textAlign:"center", flexShrink:0}}>
          <div style={{fontSize:30,fontWeight:900,color:col,letterSpacing:"-1.5px"}}>{(score/10).toFixed(1)}</div>
          <div style={{fontSize:9,color:"var(--text-muted)",fontWeight:600}}>/ 10</div>
        </div>
        <div>
          <div style={{fontSize:10,color:"var(--text-muted)",marginBottom:3}}>AI Verdict</div>
          <div style={{fontSize:16,fontWeight:800,color:col}}>{data.verdict?.label}</div>
          <div style={{fontSize:11.5,color:"var(--text-secondary)",marginTop:4,lineHeight:1.55}}>{data.verdict?.reasoning}</div>
        </div>
      </div>

      {[{ items: data.loves ?? [], label:"✅ Loved For", col:"var(--green)" }, { items: data.hates ?? [], label:"⚠️ Watch Out", col:"var(--red)" }].map(({ items, label, col: c }) => (
        <div key={label} style={{background:"var(--bg-surface)", border:"1px solid var(--border)", borderRadius:14, overflow:"hidden"}}>
          <div style={{padding:"9px 14px", borderBottom:"1px solid var(--border)", fontSize:12, fontWeight:700, color:c}}>{label}</div>
          {items.map((item, i) => {
            const text = typeof item === "string" ? item : item.text;
            return (
              <div key={i} style={{display:"flex", alignItems:"flex-start", gap:8, padding:"9px 14px", borderBottom: i < items.length-1 ? "1px solid rgba(236,72,153,0.07)" : "none", borderLeft:`3px solid ${c}`}}>
                <span style={{color:c,fontWeight:800,fontSize:11,flexShrink:0,marginTop:1}}>{c==="var(--green)" ? "✓" : "✗"}</span>
                <span style={{fontSize:12,color:"var(--text-primary)",flex:1,lineHeight:1.5}}>{text}</span>
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}

/* ── Smarty Result (Article / YouTube / Planner) ─────── */
const SECTION_STYLES: Record<string, { accent: string; bg: string; border: string; numBg: string }> = {
  summary:    { accent:"#ec4899", bg:"rgba(236,72,153,0.04)",  border:"rgba(236,72,153,0.18)", numBg:"rgba(236,72,153,0.12)" },
  takeaways:  { accent:"#6c8dfa", bg:"rgba(108,141,250,0.04)", border:"rgba(108,141,250,0.18)", numBg:"rgba(108,141,250,0.12)" },
  insights:   { accent:"#a374ff", bg:"rgba(163,116,255,0.04)", border:"rgba(163,116,255,0.18)", numBg:"rgba(163,116,255,0.12)" },
  facts:      { accent:"#10b981", bg:"rgba(16,185,129,0.04)",  border:"rgba(16,185,129,0.18)",  numBg:"rgba(16,185,129,0.12)" },
  conclusion: { accent:"#f43f5e", bg:"rgba(244,63,94,0.04)",   border:"rgba(244,63,94,0.18)",   numBg:"rgba(244,63,94,0.12)" },
  /* YouTube-specific */
  overview:   { accent:"#f87171", bg:"rgba(248,113,113,0.04)", border:"rgba(248,113,113,0.18)", numBg:"rgba(248,113,113,0.12)" },
  segments:   { accent:"#fb923c", bg:"rgba(251,146,60,0.04)",  border:"rgba(251,146,60,0.18)",  numBg:"rgba(251,146,60,0.12)" },
  highlights: { accent:"#facc15", bg:"rgba(250,204,21,0.04)",  border:"rgba(250,204,21,0.18)",  numBg:"rgba(250,204,21,0.12)" },
  notes:      { accent:"#38bdf8", bg:"rgba(56,189,248,0.04)",  border:"rgba(56,189,248,0.18)",  numBg:"rgba(56,189,248,0.12)" },
  timestamps: { accent:"#fb923c", bg:"rgba(251,146,60,0.04)",  border:"rgba(251,146,60,0.18)",  numBg:"rgba(251,146,60,0.12)" },
  verdict:    { accent:"#f43f5e", bg:"rgba(244,63,94,0.04)",   border:"rgba(244,63,94,0.18)",   numBg:"rgba(244,63,94,0.12)" },
  /* Plan-specific */
  goals:      { accent:"#6c8dfa", bg:"rgba(108,141,250,0.04)", border:"rgba(108,141,250,0.18)", numBg:"rgba(108,141,250,0.12)" },
  timeline:   { accent:"#10b981", bg:"rgba(16,185,129,0.04)",  border:"rgba(16,185,129,0.18)",  numBg:"rgba(16,185,129,0.12)" },
  steps:      { accent:"#a374ff", bg:"rgba(163,116,255,0.04)", border:"rgba(163,116,255,0.18)", numBg:"rgba(163,116,255,0.12)" },
  risks:      { accent:"#f43f5e", bg:"rgba(244,63,94,0.04)",   border:"rgba(244,63,94,0.18)",   numBg:"rgba(244,63,94,0.12)" },
};
const DEFAULT_SECTION_STYLE = { accent:"#ec4899", bg:"rgba(236,72,153,0.04)", border:"rgba(236,72,153,0.18)", numBg:"rgba(236,72,153,0.12)" };

function SmartyResultView({ data, mode }: { data: SmartyResult; mode: Mode }) {
  const info = MODES.find(m => m.id === mode)!;
  const sections = data.sections ?? [];

  return (
    <>
      {/* ── Header card ── */}
      <div style={{
        background:"linear-gradient(135deg,rgba(236,72,153,0.07) 0%,rgba(108,141,250,0.05) 60%,rgba(163,116,255,0.04) 100%)",
        border:"1px solid rgba(236,72,153,0.16)",
        borderRadius:16,
        padding:"16px 16px 14px",
        position:"relative",
        overflow:"hidden",
      }}>
        {/* decorative orb */}
        <div style={{position:"absolute",top:-20,right:-20,width:90,height:90,borderRadius:"50%",background:"radial-gradient(circle,rgba(236,72,153,0.12),transparent 70%)",pointerEvents:"none"}} />
        <div style={{display:"flex",alignItems:"flex-start",gap:12,position:"relative",zIndex:1}}>
          <div style={{
            width:40,height:40,borderRadius:12,flexShrink:0,
            background:"linear-gradient(135deg,rgba(236,72,153,0.18),rgba(108,141,250,0.12))",
            border:"1px solid rgba(236,72,153,0.22)",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,
          }}>{info.icon}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{
              fontSize:14.5,fontWeight:800,color:"var(--text-primary)",
              lineHeight:1.3,wordBreak:"break-word",letterSpacing:"-0.2px",marginBottom:5,
            }}>{data.title || `${info.label} Analysis`}</div>
            <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
              <span style={{
                fontSize:9.5,fontWeight:700,letterSpacing:"0.6px",textTransform:"uppercase",
                background:"rgba(236,72,153,0.1)",color:"var(--accent)",
                border:"1px solid rgba(236,72,153,0.2)",borderRadius:20,padding:"2px 8px",
              }}>AI Intelligence</span>
              <span style={{fontSize:10,color:"var(--text-muted)"}}>·</span>
              <span style={{fontSize:10,color:"var(--text-muted)",fontWeight:500}}>{sections.length} sections · {sections.reduce((a,s)=>a+(s.content?.length??0),0)} insights</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sections ── */}
      {sections.map((sec, sIdx) => {
        const st = SECTION_STYLES[sec.id] ?? DEFAULT_SECTION_STYLE;
        const isLast = sIdx === sections.length - 1;
        return (
          <div key={sec.id} style={{
            background:"var(--bg-surface)",
            border:`1px solid ${st.border}`,
            borderRadius:14,
            overflow:"hidden",
          }}>
            {/* Section header */}
            <div style={{
              padding:"11px 14px 10px",
              background:st.bg,
              borderBottom:`1px solid ${st.border}`,
              display:"flex",alignItems:"center",gap:9,
            }}>
              <div style={{
                width:28,height:28,borderRadius:8,flexShrink:0,
                background:st.numBg,border:`1px solid ${st.border}`,
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,
              }}>{sec.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:11.5,fontWeight:800,color:st.accent,letterSpacing:"0.2px"}}>{sec.label}</div>
              </div>
              <div style={{
                fontSize:9,fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",
                color:st.accent,opacity:0.7,
              }}>{sec.content?.length ?? 0} points</div>
            </div>

            {/* Points */}
            <div style={{display:"flex",flexDirection:"column",gap:0}}>
              {(sec.content ?? []).map((point, i) => (
                <div key={i} style={{
                  display:"flex",alignItems:"flex-start",gap:11,
                  padding:"11px 14px",
                  borderBottom: i < (sec.content?.length ?? 0) - 1 ? `1px solid rgba(0,0,0,0.04)` : "none",
                  background: i % 2 === 1 ? "rgba(0,0,0,0.012)" : "transparent",
                }}>
                  {/* Number badge */}
                  <div style={{
                    width:20,height:20,borderRadius:6,flexShrink:0,marginTop:1,
                    background:st.numBg,border:`1px solid ${st.border}`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:9.5,fontWeight:800,color:st.accent,
                  }}>{i + 1}</div>
                  {/* Text */}
                  <span style={{
                    fontSize:12.5,color:"var(--text-primary)",lineHeight:1.65,
                    flex:1,letterSpacing:"0.01px",
                  }}>{point}</span>
                </div>
              ))}
            </div>

            {/* Bottom accent line */}
            <div style={{height:2,background:`linear-gradient(90deg,${st.accent}30,transparent)`}} />
          </div>
        );
      })}
    </>
  );
}

/* ── Resume Result ──────────────────────────────────── */
function ResumeResultView({ data }: { data: ResumeResult }) {
  const [tab, setTab]     = useState<"fields" | "answers" | "cover">("fields");
  const [copied, setCopied] = useState<string | null>(null);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(null), 2000); });
  }

  return (
    <>
      <div style={{display:"flex", gap:5}}>
        {(["fields","answers","cover"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{flex:1, padding:"7px 4px", borderRadius:8, border:"1px solid", fontSize:10.5, fontWeight:600, cursor:"pointer", background: tab===t ? "var(--accent)" : "var(--bg-surface)", color: tab===t ? "#fff" : "var(--text-secondary)", borderColor: tab===t ? "var(--accent)" : "var(--border)"}}>
            {t === "fields" ? "📋 Fields" : t === "answers" ? "💬 Q&A" : "✉️ Cover Letter"}
          </button>
        ))}
      </div>

      {tab === "fields" && (
        <div style={{display:"flex", flexDirection:"column", gap:6}}>
          {(data.fields ?? []).map((f, i) => (
            <div key={i} style={{display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 12px", background:"var(--bg-surface)", border:"1px solid var(--border)", borderRadius:9, gap:8}}>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontSize:10,color:"var(--text-muted)",fontWeight:600,marginBottom:2}}>{f.label}</div>
                <div style={{fontSize:12.5,color: f.status==="filled" ? "var(--text-primary)" : "var(--text-muted)",fontStyle: f.status==="missing" ? "italic" : "normal",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.value || "—"}</div>
              </div>
              <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:10,flexShrink:0,background: f.status==="filled" ? "rgba(16,185,129,0.1)" : "rgba(236,72,153,0.08)",color: f.status==="filled" ? "var(--green)" : "var(--accent)"}}>{f.status==="filled" ? "✓" : "!"}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "answers" && (
        <div style={{display:"flex", flexDirection:"column", gap:8}}>
          {(data.aiAnswers ?? []).map((qa, i) => (
            <div key={i} style={{padding:"12px 14px", background:"var(--bg-surface)", border:"1px solid var(--border)", borderRadius:10}}>
              <div style={{fontSize:12,fontWeight:700,color:"var(--accent)",marginBottom:6}}>{qa.q}</div>
              <div style={{fontSize:12,color:"var(--text-secondary)",lineHeight:1.65,marginBottom:8}}>{qa.a}</div>
              <button onClick={() => copy(qa.a, String(i))} style={{fontSize:10,padding:"3px 9px",background: copied===String(i) ? "rgba(16,185,129,0.1)" : "var(--bg-elevated)",border:"1px solid var(--border)",borderRadius:6,cursor:"pointer",color: copied===String(i) ? "var(--green)" : "var(--text-muted)"}}>
                {copied===String(i) ? "✓ Copied" : "📋 Copy"}
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === "cover" && (
        <div style={{padding:"14px", background:"var(--bg-surface)", border:"1px solid var(--border)", borderRadius:10}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10}}>
            <span style={{fontSize:12,fontWeight:700,color:"var(--text-primary)"}}>✉️ Cover Letter</span>
            <button onClick={() => copy(data.coverLetter ?? "", "cover")} style={{fontSize:10,padding:"3px 10px",background: copied==="cover" ? "rgba(16,185,129,0.1)" : "var(--bg-elevated)",border:"1px solid var(--border)",borderRadius:6,cursor:"pointer",color: copied==="cover" ? "var(--green)" : "var(--text-muted)"}}>
              {copied==="cover" ? "✓ Copied!" : "📋 Copy All"}
            </button>
          </div>
          <div style={{fontSize:12,color:"var(--text-secondary)",lineHeight:1.75,whiteSpace:"pre-wrap"}}>{data.coverLetter || "No cover letter generated."}</div>
        </div>
      )}
    </>
  );
}

/* ── Profile View ───────────────────────────────────── */
function ProfileView({ profile, onSave, onCancel }: { profile: UserProfile; onSave: (p: UserProfile) => void; onCancel: () => void }) {
  const [form, setForm] = useState<UserProfile>({ ...profile });
  const set = (k: keyof UserProfile) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const fields: { key: keyof UserProfile; label: string; placeholder: string; multi?: boolean }[] = [
    { key:"name",          label:"Full Name",            placeholder:"John Doe" },
    { key:"email",         label:"Email Address",        placeholder:"john@example.com" },
    { key:"phone",         label:"Phone Number",         placeholder:"+1 (555) 000-0000" },
    { key:"address",       label:"Address / City",       placeholder:"San Francisco, CA" },
    { key:"linkedin",      label:"LinkedIn URL",         placeholder:"linkedin.com/in/johndoe" },
    { key:"github",        label:"GitHub / Portfolio",   placeholder:"github.com/johndoe" },
    { key:"skills",        label:"Skills",               placeholder:"React, TypeScript, Python, SQL…", multi:true },
    { key:"qualifications",label:"Qualifications",       placeholder:"B.Sc. Computer Science, MBA…", multi:true },
    { key:"experience",    label:"Work Experience",      placeholder:"5 yrs frontend at Acme Corp…", multi:true },
    { key:"summary",       label:"Professional Summary", placeholder:"Experienced engineer specializing in…", multi:true },
  ];

  const inputBase: React.CSSProperties = { padding:"9px 12px", background:"#fff", border:"1px solid rgba(236,72,153,0.18)", borderRadius:9, fontSize:12.5, color:"var(--text-primary)", fontFamily:"inherit", outline:"none", boxSizing:"border-box", width:"100%" };

  return (
    <div style={{flex:1, display:"flex", flexDirection:"column", overflow:"hidden"}}>
      <div style={{flex:1, overflowY:"auto", padding:"14px 14px 32px", display:"flex", flexDirection:"column", gap:10}}>
        <div style={{padding:"12px 14px", background:"linear-gradient(135deg,rgba(236,72,153,0.06),rgba(244,63,94,0.04))", border:"1px solid rgba(236,72,153,0.18)", borderRadius:12}}>
          <div style={{fontSize:13,fontWeight:700,color:"var(--text-primary)",marginBottom:3}}>👤 My Profile</div>
          <div style={{fontSize:11,color:"var(--text-muted)"}}>Saved locally on your device. Used for resume auto-fill and job applications.</div>
        </div>

        {fields.map(f => (
          <div key={f.key} style={{display:"flex", flexDirection:"column", gap:5}}>
            <label style={{fontSize:11,fontWeight:600,color:"var(--text-secondary)"}}>{f.label}</label>
            {f.multi ? (
              <textarea value={form[f.key]} onChange={set(f.key)} placeholder={f.placeholder} rows={3}
                style={{...inputBase, resize:"none", lineHeight:1.6} as React.CSSProperties}
                onFocus={e => { e.currentTarget.style.borderColor="rgba(236,72,153,0.45)"; e.currentTarget.style.boxShadow="0 0 0 3px rgba(236,72,153,0.08)"; }}
                onBlur={e => { e.currentTarget.style.borderColor="rgba(236,72,153,0.18)"; e.currentTarget.style.boxShadow="none"; }}
              />
            ) : (
              <input type="text" value={form[f.key]} onChange={set(f.key)} placeholder={f.placeholder}
                style={inputBase}
                onFocus={e => { e.currentTarget.style.borderColor="rgba(236,72,153,0.45)"; e.currentTarget.style.boxShadow="0 0 0 3px rgba(236,72,153,0.08)"; }}
                onBlur={e => { e.currentTarget.style.borderColor="rgba(236,72,153,0.18)"; e.currentTarget.style.boxShadow="none"; }}
              />
            )}
          </div>
        ))}

        <div style={{display:"flex", gap:8, marginTop:4}}>
          <button onClick={onCancel} style={{flex:1, padding:"11px", background:"var(--bg-elevated)", border:"1px solid var(--border)", borderRadius:11, fontSize:13, fontWeight:600, color:"var(--text-secondary)", cursor:"pointer"}}>Cancel</button>
          <button onClick={() => onSave(form)} style={{flex:2, padding:"11px", background:"linear-gradient(135deg,#ec4899,#f43f5e)", border:"none", borderRadius:11, fontSize:13, fontWeight:700, color:"#fff", cursor:"pointer", boxShadow:"0 4px 14px rgba(236,72,153,0.3)"}}>💾 Save Profile</button>
        </div>
      </div>
    </div>
  );
}

/* ── Translate Result ───────────────────────────────── */
function TranslateResultView({ data }: { data: TranslateResult }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(data.translated ?? "").then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  return (
    <>
      {/* Header badge */}
      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", background:"linear-gradient(135deg,rgba(108,141,250,0.07),rgba(108,141,250,0.03))", border:"1px solid rgba(108,141,250,0.2)", borderRadius:12}}>
        <div style={{display:"flex", alignItems:"center", gap:8}}>
          <span style={{fontSize:20}}>🌐</span>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:"var(--text-primary)"}}>Translated to {data.language}</div>
            {data.detectedLanguage && <div style={{fontSize:10,color:"var(--text-muted)"}}>Detected: {data.detectedLanguage}</div>}
          </div>
        </div>
        <button onClick={copy} style={{fontSize:10,padding:"4px 10px",background: copied ? "rgba(16,185,129,0.12)" : "var(--bg-surface)",border:"1px solid var(--border)",borderRadius:6,cursor:"pointer",color: copied ? "var(--green)" : "var(--text-muted)",fontWeight:600}}>
          {copied ? "✓ Copied" : "📋 Copy"}
        </button>
      </div>

      {/* Translated text */}
      <div style={{padding:"14px 16px", background:"var(--bg-surface)", border:"1px solid var(--border)", borderRadius:14}}>
        <div style={{fontSize:10,fontWeight:600,color:"#6c8dfa",textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:8}}>Translation</div>
        <div style={{fontSize:14,color:"var(--text-primary)",lineHeight:1.75,fontWeight:400}}>{data.translated || "No translation returned."}</div>
      </div>

      {/* Key phrases */}
      {(data.keyPhrases ?? []).length > 0 && (
        <div style={{background:"var(--bg-surface)", border:"1px solid var(--border)", borderRadius:14, overflow:"hidden"}}>
          <div style={{padding:"10px 14px", borderBottom:"1px solid var(--border)", fontSize:12, fontWeight:700, color:"var(--text-primary)"}}>🔑 Key Phrases</div>
          {(data.keyPhrases ?? []).map((kp, i) => (
            <div key={i} style={{display:"grid", gridTemplateColumns:"1fr auto 1fr", alignItems:"center", gap:8, padding:"8px 14px", borderBottom: i < (data.keyPhrases?.length ?? 0)-1 ? "1px solid rgba(236,72,153,0.07)" : "none"}}>
              <span style={{fontSize:12,color:"var(--text-secondary)",fontStyle:"italic"}}>{kp.original}</span>
              <span style={{fontSize:11,color:"var(--text-muted)"}}>→</span>
              <span style={{fontSize:12,color:"var(--text-primary)",fontWeight:600}}>{kp.translated}</span>
            </div>
          ))}
        </div>
      )}

      {/* Translator notes */}
      {(data.notes ?? []).length > 0 && (
        <div style={{padding:"12px 14px", background:"rgba(245,158,11,0.06)", border:"1px solid rgba(245,158,11,0.18)", borderRadius:12}}>
          <div style={{fontSize:11,fontWeight:700,color:"var(--yellow)",marginBottom:8}}>📝 Translator Notes</div>
          <div style={{display:"flex", flexDirection:"column", gap:5}}>
            {(data.notes ?? []).map((note, i) => (
              <div key={i} style={{display:"flex", gap:7, fontSize:11.5, color:"var(--text-secondary)", lineHeight:1.55}}>
                <span style={{flexShrink:0, color:"var(--yellow)", fontWeight:700}}>·</span>
                <span>{note}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/* ── Styles ─────────────────────────────────────────── */
const ms: Record<string, React.CSSProperties> = {
  dotGrid:      { position:"absolute", inset:0, backgroundImage:"radial-gradient(circle,rgba(236,72,153,0.05) 1px,transparent 1px)", backgroundSize:"24px 24px", pointerEvents:"none", zIndex:0 } as React.CSSProperties,
  header:       { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", borderBottom:"1px solid rgba(236,72,153,0.1)", background:"rgba(255,240,247,0.96)", backdropFilter:"blur(20px)", boxShadow:"0 1px 0 rgba(236,72,153,0.06)" },
  iconBtn:      { width:30, height:30, display:"flex", alignItems:"center", justifyContent:"center", background:"var(--bg-elevated)", border:"1px solid var(--border)", borderRadius:8, color:"var(--text-secondary)", cursor:"pointer", position:"relative" },
  headerCenter: { display:"flex", alignItems:"center", gap:8 },
  headerIcon:   { width:24, height:24, background:"linear-gradient(135deg,rgba(163,116,255,0.2),rgba(163,116,255,0.08))", border:"1px solid rgba(163,116,255,0.25)", borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", color:"#a374ff" },
  livePill:     { display:"flex", alignItems:"center", gap:4, fontSize:9, fontWeight:700, letterSpacing:"0.8px", background:"rgba(16,185,129,0.12)", color:"var(--green)", border:"1px solid rgba(16,185,129,0.22)", borderRadius:20, padding:"2px 8px" },
  liveDot:      { width:5, height:5, borderRadius:"50%", background:"var(--green)", animation:"pulse-glow 2s ease-in-out infinite", flexShrink:0 },
};
