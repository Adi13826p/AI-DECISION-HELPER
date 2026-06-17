import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";

/* ══ Types ══════════════════════════════════════════ */
type Stage = "idle" | "overlay" | "detecting" | "workspace" | "profile" | "smarty";
type DemoId = "article" | "research" | "math" | "notes" | "job";
type PlanType = "study" | "interview" | "learning" | "project" | "career";

interface DemoScenario {
  id: DemoId;
  icon: string;
  label: string;
  tag: string;
  tagColor: string;
  preview: string;
  confidence: number;
  actions: ActionDef[];
  results: Partial<Record<string, ResultData>>;
}

interface ActionDef { id: string; icon: string; label: string; }
interface ResultData { type: string; content: unknown; }

/* ══ Demo Data ══════════════════════════════════════ */
const DEMOS: Record<DemoId, DemoScenario> = {
  article: {
    id: "article", icon: "📰", label: "Article / Blog", tag: "Article Detected", tagColor: "#6c8dfa",
    preview: "The Rise of AI Agents in 2025 — TechCrunch",
    confidence: 97,
    actions: [
      { id: "summary",    icon: "⚡", label: "30-sec Summary" },
      { id: "takeaways",  icon: "📌", label: "Key Takeaways" },
      { id: "facts",      icon: "📊", label: "Important Facts" },
      { id: "insights",   icon: "💡", label: "Main Insights" },
      { id: "conclusion", icon: "🎯", label: "Conclusion" },
      { id: "simplify",   icon: "🔤", label: "Simplify" },
      { id: "translate",  icon: "🌐", label: "Translate" },
      { id: "planner",    icon: "🧭", label: "Plan with Smarty" },
    ],
    results: {
      summary: { type: "paragraph", content: "AI agents in 2025 have moved from experimental tools to production-grade systems. Major tech companies are deploying autonomous agents that can browse the web, write code, manage files, and take multi-step actions without human intervention. The article highlights how OpenAI's GPT-4o, Anthropic's Claude, and Google's Gemini Ultra are now powering agents used by millions daily — fundamentally shifting how knowledge work gets done." },
      takeaways: { type: "bullets", content: [
        "AI agents are now being deployed at enterprise scale — not just in labs",
        "Multi-step task completion (research → write → send) is now mainstream",
        "The market for agentic AI tools is projected to reach $47B by 2027",
        "Key bottleneck is trust and verification, not capability",
        "Smaller, fine-tuned models are outperforming general models for specific agent tasks",
      ]},
      facts: { type: "facts", content: [
        { label: "Market Size (2025)", value: "$18.2B" },
        { label: "Projected by 2027",  value: "$47B" },
        { label: "Enterprise adoption", value: "34% of Fortune 500" },
        { label: "Top use case",       value: "Code generation & review" },
        { label: "Accuracy benchmark", value: "GPT-4o at 87.2% on SWE-bench" },
      ]},
      insights: { type: "insights", content: [
        { icon: "🔑", text: "Agentic AI is shifting the bottleneck from 'can AI do this?' to 'should we trust AI to do this?' — a governance problem, not a capability one." },
        { icon: "📈", text: "Companies that deployed agents in Q1 2025 report 40% faster product iteration cycles, with the biggest gains in code review and documentation." },
        { icon: "⚠️", text: "The article warns: as agents become more autonomous, the risk of 'prompt injection attacks' — malicious instructions hidden in web content — becomes a serious security concern." },
      ]},
      conclusion: { type: "paragraph", content: "AI agents are no longer a future promise — they are a present reality reshaping knowledge work. The winners will be organizations that invest in agent orchestration infrastructure today, while establishing clear human-in-the-loop checkpoints for high-stakes decisions. The next 18 months will determine which industries adopt agentic AI as a competitive moat versus those left scrambling to catch up." },
      simplify: { type: "paragraph", content: "Think of AI agents like very smart assistants that can do tasks on a computer by themselves — browsing websites, writing emails, and analyzing data — without needing you to guide every step. Companies are now using these agents for real work (not just demos), and the market is growing fast because they save massive amounts of time on repetitive tasks." },
      translate: { type: "translate", content: "Translation feature connects to a language model. Select your target language:" },
    },
  },

  research: {
    id: "research", icon: "🔬", label: "Research Paper", tag: "Research Paper", tagColor: "#a374ff",
    preview: "Attention Is All You Need — Vaswani et al.",
    confidence: 94,
    actions: [
      { id: "explain",      icon: "💬", label: "Plain English" },
      { id: "objective",    icon: "🎯", label: "Objective" },
      { id: "methodology",  icon: "🔧", label: "Methodology" },
      { id: "findings",     icon: "📊", label: "Key Findings" },
      { id: "limitations",  icon: "⚠️", label: "Limitations" },
      { id: "applications", icon: "🚀", label: "Applications" },
      { id: "summary",      icon: "⚡", label: "30-sec Summary" },
      { id: "flashcards",   icon: "🃏", label: "Flashcards" },
    ],
    results: {
      explain: { type: "paragraph", content: "Before this paper, AI language models read text one word at a time, sequentially. This was slow and made it hard to connect ideas that were far apart in a sentence. The Transformer architecture introduced 'attention' — a way for the model to look at every word simultaneously and decide which words are most relevant to each other. Imagine reading a whole paragraph at once and instantly knowing which words relate to which, rather than reading word by word. This breakthrough made AI much faster to train and dramatically better at understanding context." },
      objective: { type: "paragraph", content: "To propose a new neural network architecture — the Transformer — that relies entirely on attention mechanisms, completely eliminating recurrence and convolutions used in previous sequence-to-sequence models for language tasks." },
      methodology: { type: "bullets", content: [
        "Introduced the 'Scaled Dot-Product Attention' mechanism to compute relationships between all positions simultaneously",
        "Stacked 6 encoder and 6 decoder layers, each with multi-head attention + feed-forward sublayers",
        "Used positional encodings (sinusoidal) to inject sequence order information without recurrence",
        "Trained on WMT 2014 English-German (4.5M sentence pairs) and English-French (36M pairs)",
        "Evaluated on BLEU score benchmarks against RNN and CNN-based state-of-the-art models",
      ]},
      findings: { type: "bullets", content: [
        "Achieved 28.4 BLEU on English-German translation — surpassing all previous models",
        "Achieved 41.0 BLEU on English-French — a new state of the art at the time",
        "Training time: 12 hours on 8 P100 GPUs — significantly faster than competing models",
        "Multi-head attention proved superior to single attention, allowing learning of multiple relationship types simultaneously",
      ]},
      limitations: { type: "bullets", content: [
        "Quadratic memory complexity with sequence length — expensive for very long documents",
        "No inherent understanding of sequence order (requires external positional encoding)",
      ]},
      applications: { type: "insights", content: [
        { icon: "🤖", text: "Foundation of all modern LLMs: GPT, BERT, Claude, Gemini, and LLaMA all derive from this architecture." },
        { icon: "🖼️", text: "Extended to Vision Transformers (ViT) for image recognition — replacing CNNs in many computer vision tasks." },
        { icon: "🧬", text: "AlphaFold 2 used transformer-based attention for protein structure prediction — solving a 50-year biology problem." },
      ]},
      summary: { type: "paragraph", content: "A 2017 Google paper proposed replacing recurrent networks with 'attention' — letting models process all words in parallel while weighing their relevance to each other. The resulting Transformer architecture trained faster and performed better than everything before it. This single paper became the foundation for GPT, BERT, and essentially every modern AI language model you use today." },
      flashcards: { type: "flashcards", content: [
        { q: "What is the core innovation of the Transformer?", a: "Self-attention: the ability to look at all positions in a sequence simultaneously and weigh their relevance, replacing sequential recurrence." },
        { q: "What does 'multi-head attention' mean?", a: "Running attention multiple times in parallel with different learned projections, allowing the model to jointly attend to information from different representation subspaces." },
        { q: "How does the Transformer handle word order without recurrence?", a: "Positional encodings — sinusoidal functions added to word embeddings to inject information about each token's position in the sequence." },
        { q: "What are the two sublayers in each Transformer encoder layer?", a: "1) Multi-head self-attention mechanism, 2) Position-wise fully connected feed-forward network." },
        { q: "Why is the Transformer faster to train than RNNs?", a: "It processes all tokens in parallel rather than sequentially, making it highly parallelizable and more efficient on modern GPU hardware." },
      ]},
    },
  },

  math: {
    id: "math", icon: "🧮", label: "Math Equation", tag: "Equation Detected", tagColor: "#34d399",
    preview: "x² − 5x + 6 = 0",
    confidence: 99,
    actions: [
      { id: "solve",   icon: "🧮", label: "Step-by-Step" },
      { id: "explain", icon: "💬", label: "Explain Concept" },
      { id: "verify",  icon: "✅", label: "Verify Answer" },
      { id: "similar", icon: "📚", label: "Similar Problems" },
    ],
    results: {
      solve: { type: "math-steps", content: {
        equation: "x² − 5x + 6 = 0",
        type: "Quadratic Equation",
        method: "Factoring Method",
        steps: [
          { num: 1, title: "Identify the standard form", detail: "ax² + bx + c = 0", note: "Here: a = 1, b = −5, c = 6" },
          { num: 2, title: "Find two numbers that multiply to c and add to b", detail: "We need: m × n = 6 and m + n = −5", note: "Testing: (−2) × (−3) = 6 ✓ and (−2) + (−3) = −5 ✓" },
          { num: 3, title: "Factor the equation", detail: "(x − 2)(x − 3) = 0", note: "Expanded: x² − 3x − 2x + 6 = x² − 5x + 6 ✓" },
          { num: 4, title: "Apply Zero Product Property", detail: "x − 2 = 0  OR  x − 3 = 0", note: "If A × B = 0, then A = 0 or B = 0" },
          { num: 5, title: "Solve for x", detail: "x = 2  OR  x = 3", note: "These are the two roots of the equation" },
        ],
        answer: "x = 2  or  x = 3",
        verification: "Plug x=2: (2)²−5(2)+6 = 4−10+6 = 0 ✓   Plug x=3: (3)²−5(3)+6 = 9−15+6 = 0 ✓",
      }},
      explain: { type: "paragraph", content: "A quadratic equation is a polynomial where the highest power of x is 2. The solutions (called roots) represent where the parabola y = x²−5x+6 crosses the x-axis. Every quadratic has exactly 2 solutions (though they may be equal, or complex numbers). The discriminant (b²−4ac = 25−24 = 1 > 0) tells us there are 2 distinct real roots before we even solve." },
      similar: { type: "bullets", content: [
        "x² − 7x + 12 = 0  →  (x−3)(x−4) = 0  →  x = 3 or x = 4",
        "x² − 6x + 9 = 0   →  (x−3)² = 0      →  x = 3 (double root)",
        "x² + 5x + 6 = 0   →  (x+2)(x+3) = 0  →  x = −2 or x = −3",
        "x² − x − 6 = 0    →  (x−3)(x+2) = 0  →  x = 3 or x = −2",
      ]},
    },
  },

  notes: {
    id: "notes", icon: "📝", label: "Study Notes", tag: "Study Content", tagColor: "#fbbf24",
    preview: "Cell Division: Mitosis & Meiosis",
    confidence: 96,
    actions: [
      { id: "summary",    icon: "⚡", label: "Summary" },
      { id: "flashcards", icon: "🃏", label: "Flashcards" },
      { id: "quiz",       icon: "❓", label: "Quiz Me" },
      { id: "notes",      icon: "📝", label: "Clean Notes" },
      { id: "planner",    icon: "🧭", label: "Study Plan" },
    ],
    results: {
      summary: { type: "paragraph", content: "Cell division is the process by which a cell replicates its DNA and divides into daughter cells. Mitosis produces 2 genetically identical diploid cells (used for growth & repair), while Meiosis produces 4 genetically unique haploid cells (used for sexual reproduction). The key difference: meiosis includes crossing over and two division rounds, generating genetic diversity critical for evolution." },
      flashcards: { type: "flashcards", content: [
        { q: "What is the purpose of Mitosis?",            a: "Growth, tissue repair, and asexual reproduction — produces 2 genetically identical diploid (2n) cells." },
        { q: "What are the 4 phases of Mitosis?",          a: "Prophase → Metaphase → Anaphase → Telophase (+ Cytokinesis)." },
        { q: "How does Meiosis differ from Mitosis?",      a: "Meiosis has 2 division rounds (Meiosis I & II), produces 4 haploid (n) cells, and includes crossing over for genetic diversity." },
        { q: "What is 'crossing over' in Meiosis?",        a: "Exchange of genetic segments between homologous chromosomes during Prophase I — creates new gene combinations." },
        { q: "What is the result of Meiosis in humans?",   a: "4 haploid cells (n=23) — sperm or egg cells — each genetically unique." },
      ]},
      quiz: { type: "quiz", content: [
        { q: "How many cells does Mitosis produce?", options: ["1", "2", "4", "8"], answer: 1 },
        { q: "Which process produces gametes (sex cells)?", options: ["Mitosis", "Meiosis", "Both", "Neither"], answer: 1 },
        { q: "What is the chromosome number in human body cells?", options: ["23", "46", "92", "12"], answer: 1 },
        { q: "Crossing over occurs during which phase?", options: ["Mitosis Prophase", "Meiosis Prophase II", "Meiosis Prophase I", "Anaphase"], answer: 2 },
        { q: "Which type of cell division produces genetically identical cells?", options: ["Meiosis", "Mitosis", "Both", "Neither"], answer: 1 },
      ]},
      notes: { type: "clean-notes", content: {
        title: "Cell Division: Mitosis & Meiosis",
        sections: [
          { heading: "Mitosis", points: ["Purpose: Growth & repair", "Result: 2 identical diploid (2n) cells", "Phases: Prophase → Metaphase → Anaphase → Telophase", "No genetic variation produced"] },
          { heading: "Meiosis", points: ["Purpose: Sexual reproduction (gametes)", "Result: 4 unique haploid (n) cells", "Two rounds: Meiosis I + Meiosis II", "Crossing over → genetic diversity"] },
          { heading: "Key Differences", points: ["Mitosis: 1 division | Meiosis: 2 divisions", "Mitosis: 2 cells | Meiosis: 4 cells", "Mitosis: identical | Meiosis: unique", "Mitosis: diploid | Meiosis: haploid"] },
        ],
      }},
    },
  },

  job: {
    id: "job", icon: "💼", label: "Job Posting", tag: "Job Application", tagColor: "#34d399",
    preview: "Senior Frontend Engineer — Google",
    confidence: 98,
    actions: [
      { id: "match",     icon: "🎯", label: "Job Match" },
      { id: "autofill",  icon: "⚡", label: "Auto Fill" },
      { id: "resume",    icon: "📄", label: "Optimize Resume" },
      { id: "cover",     icon: "✉️", label: "Cover Letter" },
    ],
    results: {
      match: { type: "job-match", content: {
        score: 84,
        title: "Senior Frontend Engineer",
        company: "Google",
        strengths: [
          "5+ years React & TypeScript — exact match",
          "Performance optimization experience aligned",
          "Open-source contributions match culture fit",
          "Agile/Scrum team experience confirmed",
        ],
        gaps: [
          "GraphQL — listed as required, not in profile",
          "Google Cloud Platform — preferred but missing",
        ],
        suggestions: [
          { icon: "📚", text: "Complete Apollo GraphQL certification (2–3 weeks) to close the top skill gap." },
          { icon: "☁️", text: "Add a GCP free-tier project to your GitHub to demonstrate cloud familiarity." },
          { icon: "📝", text: "Reword 'built dashboards' → 'engineered data-driven interfaces serving 2M+ users' for ATS impact." },
        ],
      }},
      autofill: { type: "auto-fill", content: {
        fields: [
          { label: "Full Name",         value: "Alex Johnson",              status: "filled" },
          { label: "Email Address",     value: "alex@example.com",          status: "filled" },
          { label: "Phone Number",      value: "+1 (555) 234-5678",         status: "filled" },
          { label: "LinkedIn Profile",  value: "linkedin.com/in/alexj",     status: "filled" },
          { label: "GitHub Profile",    value: "github.com/alexj",          status: "filled" },
          { label: "Portfolio",         value: "alexjohnson.dev",           status: "filled" },
          { label: "Years of Experience", value: "6 years",                 status: "filled" },
          { label: "Current Location",  value: "San Francisco, CA",         status: "filled" },
          { label: "Resume Upload",     value: "Alex_Johnson_Resume.pdf",   status: "filled" },
          { label: "Work Authorization",value: "Authorized to work in US",  status: "filled" },
          { label: "Desired Salary",    value: "—",                         status: "missing" },
          { label: "Referral Source",   value: "—",                         status: "missing" },
        ],
        aiAnswers: [
          { q: "Tell us about yourself.", a: "I'm a frontend engineer with 6 years of experience building high-performance React applications at scale. I specialize in TypeScript, component architecture, and web performance, having led frontend development for products serving over 2M users. I'm passionate about writing clean, accessible, and maintainable code." },
          { q: "Why do you want to join Google?", a: "Google's engineering culture and commitment to building products that impact billions of users deeply resonates with me. I'm particularly excited about Google's investment in web performance and open standards — areas I've focused on throughout my career. Joining Google means working on problems at a scale that pushes the boundaries of what's technically possible." },
        ],
      }},
      resume: { type: "resume-opt", content: {
        atsScore: { before: 62, after: 91 },
        changes: [
          { type: "add",    text: "Added 'TypeScript', 'React 18', 'Core Web Vitals' to skills section — all in job description." },
          { type: "add",    text: "Rewrote impact statements with metrics: 'Reduced bundle size by 40%' → '↓40% bundle, +18% Lighthouse score'." },
          { type: "move",   text: "Moved Open Source Contributions above Work Experience — Google values it highly." },
          { type: "remove", text: "Removed 'References available upon request' — wastes space, implied." },
          { type: "add",    text: "Added 'Agile, Scrum, JIRA' keywords — present in job description, missing from original." },
        ],
        keywords: {
          matched:  ["React", "TypeScript", "JavaScript", "Performance", "REST API", "Agile", "Git"],
          missing:  ["GraphQL", "GCP", "Kubernetes"],
        },
      }},
      cover: { type: "paragraph", content: "Dear Hiring Team,\n\nI'm writing to express my strong interest in the Senior Frontend Engineer role at Google. With 6 years of experience building performant, scalable React applications — including leading the frontend architecture for a platform serving over 2M users — I bring the technical depth and product mindset this role demands.\n\nAt my current role, I reduced page load time by 40% through code splitting and lazy loading strategies, improved Core Web Vitals scores from 'Poor' to 'Good' across all metrics, and mentored a team of 3 junior engineers. These outcomes reflect the engineering excellence I would bring to Google's frontend organization.\n\nI'm particularly drawn to Google's culture of building for scale and its investment in open web standards — values I've championed throughout my career through open-source contributions and conference talks on web performance.\n\nI would love the opportunity to discuss how my background aligns with your team's goals.\n\nBest regards,\nAlex Johnson" },
    },
  },
};

/* ══ Main Component ══════════════════════════════════ */
export default function MasterScan() {
  const [, navigate] = useLocation();
  const [stage, setStage]         = useState<Stage>("idle");
  const [demo, setDemo]           = useState<DemoScenario | null>(null);
  const [detectStep, setDetect]   = useState(0);
  const [smartyQuery, setSmartyQ] = useState("");

  function startScan() {
    setDemo(DEMOS["article"]);
    setStage("overlay");
  }

  async function onCaptureDone() {
    setStage("detecting");
    setDetect(0);
    for (let i = 1; i <= 4; i++) {
      await delay(520);
      setDetect(i);
    }
    await delay(400);
    setStage("workspace");
  }

  function onSmartySubmit(q: string) {
    setSmartyQ(q);
    setStage("smarty");
  }

  return (
    <div style={s.root}>
      <div style={s.blob} />
      <div style={s.blob2} />
      <div style={s.dotGrid} />
      <div style={s.page}>
        <Header
          onBack={() => {
            if (stage === "idle") navigate("/");
            else if (stage === "profile") setStage("idle");
            else { setStage("idle"); setDemo(null); setSmartyQ(""); }
          }}
          stage={stage}
          onProfile={() => setStage("profile")}
        />

        {stage === "idle"      && <IdleView onStart={startScan} onJobApply={() => { setDemo(DEMOS["job"]); setStage("overlay"); }} onSmarty={onSmartySubmit} />}
        {stage === "overlay"   && demo && <CaptureOverlay demo={demo} onDone={onCaptureDone} />}
        {stage === "detecting" && demo && <DetectingView demo={demo} step={detectStep} />}
        {stage === "workspace" && demo && <WorkspaceView demo={demo} onRescan={() => setStage("idle")} onSwitch={(id) => setDemo(DEMOS[id])} onProfile={() => setStage("profile")} />}
        {stage === "profile"   && <ProfileVault onClose={() => setStage("idle")} />}
        {stage === "smarty"    && <SmartyView query={smartyQuery} onBack={() => { setStage("idle"); setSmartyQ(""); }} />}
      </div>
    </div>
  );
}

/* ─── Header ────────────────────────────────────────── */
function Header({ onBack, stage, onProfile }: { onBack: () => void; stage: Stage; onProfile: () => void }) {
  return (
    <header style={s.header}>
      <button style={s.backBtn} onClick={onBack}>
        <svg style={{width:15,height:15}} viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <div style={s.headerCenter}>
        <div style={s.headerIconWrap}>
          <svg style={{width:12,height:12}} viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M14 14h2v2h-2zM18 14h3M14 18h2M18 18h3M14 21h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <span style={{fontSize:14,fontWeight:700,letterSpacing:"-0.2px"}}>MasterScan</span>
        {stage === "workspace" && <div style={s.livePill}><span style={s.liveDot}/>LIVE</div>}
      </div>
      <button style={{...s.backBtn, color: stage==="profile" ? "var(--accent-scan)" : "var(--text-secondary)"}} onClick={onProfile} title="Profile Vault">
        <svg style={{width:15,height:15}} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6"/>
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
      </button>
    </header>
  );
}

/* ─── Idle ───────────────────────────────────────────── */
const CAPS = [
  { icon: "📰", label: "Articles" }, { icon: "🔬", label: "Research" },
  { icon: "🧮", label: "Math" },     { icon: "📝", label: "Notes" },
  { icon: "🖼️", label: "Images" },  { icon: "📄", label: "PDFs" },
  { icon: "💼", label: "Job Posts" },{ icon: "📊", label: "Infographics" },
];

function SmartyBar({ onSubmit }: { onSubmit: (q: string) => void }) {
  const [val, setVal] = useState("");
  const detected = detectSmartyType(val);
  const inputRef = useRef<HTMLInputElement>(null);

  function submit() { if (val.trim()) onSubmit(val.trim()); }

  return (
    <div style={s.smartyBarWrap}>
      <div style={{fontSize:11,fontWeight:700,color:"#a374ff",letterSpacing:"0.5px",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
        <span>✨</span> SMARTY — Universal AI Search
      </div>
      <div style={s.smartyBarRow}>
        <div style={s.smartyBarInner}>
          <span style={{fontSize:14,flexShrink:0}}>{detected.icon}</span>
          <input
            ref={inputRef}
            style={s.smartyInput}
            placeholder="Paste a YouTube URL, PDF link, or ask anything…"
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()}
          />
          {val && <button style={s.smartyClear} onClick={() => { setVal(""); inputRef.current?.focus(); }}>✕</button>}
        </div>
        <button style={{...s.smartySend, opacity: val.trim() ? 1 : 0.4}} onClick={submit} disabled={!val.trim()}>
          <svg style={{width:14,height:14}} viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
      {val && (
        <div style={s.smartyDetected}>
          <span style={{fontSize:10,color:"var(--text-muted)"}}>Detected:</span>
          <span style={{fontSize:11,fontWeight:600,color:detected.color,background:detected.color+"18",border:`1px solid ${detected.color}30`,borderRadius:20,padding:"1px 8px"}}>{detected.label}</span>
        </div>
      )}
      <div style={s.smartyChips}>
        {SMARTY_QUICK.map(q => (
          <button key={q.label} style={s.smartyChip} onClick={() => onSubmit(q.val)}>
            <span style={{fontSize:10}}>{q.icon}</span>{q.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const SMARTY_QUICK = [
  { icon:"🎥", label:"YouTube Demo",  val:"https://youtube.com/watch?v=dQw4w9WgXcQ" },
  { icon:"📄", label:"PDF Demo",      val:"https://arxiv.org/pdf/2303.08774.pdf" },
  { icon:"🔬", label:"Paper Demo",    val:"https://arxiv.org/abs/1706.03762" },
  { icon:"💬", label:"Ask a question",val:"What are the key differences between supervised and unsupervised learning?" },
];

function detectSmartyType(val: string): { icon:string; label:string; color:string; type:string } {
  const v = val.toLowerCase();
  if (v.includes("youtube.com") || v.includes("youtu.be"))
    return { icon:"🎥", label:"YouTube Video", color:"#f87171", type:"youtube" };
  if (v.endsWith(".pdf") || v.includes("/pdf/") || v.includes("pdf"))
    return { icon:"📄", label:"PDF Document", color:"#fbbf24", type:"pdf" };
  if (v.includes("arxiv.org") || v.includes("doi.org") || v.includes("paper") || v.includes("research"))
    return { icon:"🔬", label:"Research Paper", color:"#a374ff", type:"research" };
  if (v.startsWith("http"))
    return { icon:"🌐", label:"Web Article", color:"#6c8dfa", type:"article" };
  if (v.length > 0)
    return { icon:"💬", label:"Direct Question", color:"#34d399", type:"question" };
  return { icon:"✨", label:"", color:"#a374ff", type:"" };
}

function IdleView({ onStart, onJobApply, onSmarty }: { onStart: () => void; onJobApply: () => void; onSmarty: (q:string) => void }) {
  return (
    <div style={s.idle}>
      {/* Smarty bar — top of idle */}
      <SmartyBar onSubmit={onSmarty} />

      <div style={s.idleDivider}>
        <div style={{flex:1,height:1,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.1))"}}/>
        <span style={s.idleDividerText}>or capture your screen</span>
        <div style={{flex:1,height:1,background:"linear-gradient(90deg,rgba(255,255,255,0.1),transparent)"}}/>
      </div>

      <div style={s.scannerAnim}>
        <div style={s.scannerCornerTL}/><div style={s.scannerCornerTR}/>
        <div style={s.scannerCornerBL}/><div style={s.scannerCornerBR}/>
        <div style={s.scannerLine}/>
        <span style={{fontSize:28}}>🧠</span>
      </div>

      <h1 style={s.idleTitle}>Capture Any Screen.<br/><span style={s.gradText}>AI Does the Rest.</span></h1>
      <p style={s.idleDesc}>Select any content on your screen. MasterScan instantly detects what it is and unlocks the right AI tools — all in one workspace.</p>

      <div style={s.capsPills}>
        {CAPS.map(c => (
          <div key={c.label} style={s.capPill}><span style={{fontSize:11}}>{c.icon}</span>{c.label}</div>
        ))}
      </div>

      <button style={s.startBtn} onClick={onStart}>
        <svg style={{width:15,height:15}} viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
          <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
          <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M14 14h2v2h-2zM18 14h3M14 18h2M18 18h3M14 21h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        Start Master Scan
      </button>

      {/* Job Apply CTA */}
      <div style={s.jobCta}>
        <div style={s.jobCtaLeft}>
          <span style={{fontSize:18}}>💼</span>
          <div>
            <div style={{fontSize:12,fontWeight:700,marginBottom:1}}>Auto Job Apply</div>
            <div style={{fontSize:11,color:"var(--text-muted)"}}>Scan any job post → AI fills the form</div>
          </div>
        </div>
        <button style={s.jobCtaBtn} onClick={onJobApply}>Try Demo</button>
      </div>

      <p style={{fontSize:11,color:"var(--text-muted)",marginTop:6}}>Demo mode — simulates a real screen capture</p>
    </div>
  );
}

/* ─── Capture Overlay ────────────────────────────────── */
function CaptureOverlay({ demo, onDone }: { demo: DemoScenario; onDone: () => void }) {
  const [phase, setPhase] = useState<"aim"|"selecting"|"done">("aim");
  const [boxSize, setBoxSize] = useState({w:0,h:0});

  useEffect(() => {
    const t1 = setTimeout(() => {
      setPhase("selecting");
      const start = performance.now();
      const animate = (now: number) => {
        const t = Math.min((now - start) / 700, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        setBoxSize({ w: ease * 82, h: ease * 48 });
        if (t < 1) requestAnimationFrame(animate);
        else setTimeout(() => { setPhase("done"); setTimeout(onDone, 600); }, 300);
      };
      requestAnimationFrame(animate);
    }, 700);
    return () => clearTimeout(t1);
  }, []);

  return (
    <div style={s.overlayWrap}>
      <div style={s.overlayHint}>
        {phase === "aim" && <><span style={s.overlayDot}/>Targeting content…</>}
        {phase === "selecting" && <><span style={{...s.overlayDot,background:"#fbbf24"}}/>Selecting area…</>}
        {phase === "done" && <><span style={{...s.overlayDot,background:"#34d399"}}/>Captured!</>}
      </div>

      <div style={s.fakeScreen}>
        <div style={s.fakeScreenBar}>
          <div style={{...s.fakeBarDot,background:"#f87171"}}/><div style={{...s.fakeBarDot,background:"#fbbf24"}}/><div style={{...s.fakeBarDot,background:"#34d399"}}/>
          <div style={s.fakeUrl}>techcrunch.com · article</div>
        </div>
        <div style={s.fakeContent}>
          {[80,55,90,40,70,50,85,35,60,45].map((w,i)=>(
            <div key={i} style={{height:i===0?10:7,width:`${w}%`,background:"rgba(255,255,255,0.07)",borderRadius:3,marginBottom:6}}/>
          ))}
          {phase !== "aim" && (
            <div style={{
              position:"absolute",
              top:"18%",left:"9%",
              width:`${boxSize.w}%`,height:`${boxSize.h}%`,
              border:`2px solid ${phase==="done"?"#34d399":"#6c8dfa"}`,
              borderRadius:4,
              boxShadow:`0 0 0 2000px rgba(0,0,0,0.4), 0 0 20px ${phase==="done"?"rgba(52,211,153,0.4)":"rgba(108,141,250,0.4)"}`,
              transition:"border-color 0.3s",
              zIndex:10,
            }}>
              <span style={{position:"absolute",top:-22,left:0,fontSize:11,fontWeight:600,color:phase==="done"?"#34d399":"#6c8dfa",whiteSpace:"nowrap"}}>
                {phase==="done"?"✓ Captured":"Selecting…"}
              </span>
              <CornerHandle pos={{top:-3,left:-3}}/><CornerHandle pos={{top:-3,right:-3}}/>
              <CornerHandle pos={{bottom:-3,left:-3}}/><CornerHandle pos={{bottom:-3,right:-3}}/>
            </div>
          )}
        </div>
      </div>

      <div style={s.demoPreviewTag}>
        <span style={{fontSize:13}}>{demo.icon}</span>
        <span style={{fontSize:12,color:"var(--text-secondary)"}}>{demo.preview}</span>
      </div>
    </div>
  );
}

function CornerHandle({ pos }: { pos: React.CSSProperties }) {
  return <div style={{position:"absolute",width:8,height:8,border:"2px solid currentColor",borderRadius:1,...pos,color:"inherit"}}/>;
}

/* ─── Detecting ──────────────────────────────────────── */
const DETECT_STEPS = [
  "Extracting content from capture…",
  "Running content type classifier…",
  "Identifying entities & structure…",
  "Loading AI workspace…",
];

function DetectingView({ demo, step }: { demo: DemoScenario; step: number }) {
  return (
    <div style={s.detecting}>
      <div style={s.detectOrb}>
        <div style={s.detectOrbRing1}/><div style={s.detectOrbRing2}/>
        <span style={{fontSize:24,position:"relative",zIndex:1}}>🧠</span>
      </div>
      <h2 style={{fontSize:16,fontWeight:700,marginBottom:6}}>Analyzing Capture…</h2>
      <div style={s.detectSteps}>
        {DETECT_STEPS.map((t,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:8,opacity:i>step?0.25:1,transition:"opacity 0.3s"}}>
            <div style={{width:6,height:6,borderRadius:"50%",flexShrink:0,background:i<step?"#34d399":i===step?"#6c8dfa":"rgba(255,255,255,0.15)",boxShadow:i===step?"0 0 8px rgba(108,141,250,0.6)":"none",transition:"background 0.3s"}}/>
            <span style={{fontSize:12,color:i<step?"#34d399":i===step?"var(--text-primary)":"var(--text-muted)"}}>{t}</span>
            {i<step && <span style={{fontSize:10,color:"#34d399",marginLeft:"auto"}}>✓</span>}
          </div>
        ))}
      </div>
      {step >= 2 && (
        <div style={s.detectResult}>
          <span style={{fontSize:18}}>{demo.icon}</span>
          <div>
            <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:2}}>Detected Content Type</div>
            <div style={{fontSize:14,fontWeight:700,color:demo.tagColor}}>{demo.tag}</div>
          </div>
          <div style={{marginLeft:"auto",fontSize:12,fontWeight:700,color:"#34d399"}}>{demo.confidence}%</div>
        </div>
      )}
    </div>
  );
}

/* ─── Workspace ──────────────────────────────────────── */
const SWITCH_TYPES = [
  { id: "article"  as DemoId, icon: "📰", label: "Article" },
  { id: "research" as DemoId, icon: "🔬", label: "Research" },
  { id: "math"     as DemoId, icon: "🧮", label: "Math" },
  { id: "notes"    as DemoId, icon: "📝", label: "Notes" },
  { id: "job"      as DemoId, icon: "💼", label: "Job Apply" },
];

function WorkspaceView({ demo, onRescan, onSwitch }: { demo: DemoScenario; onRescan: () => void; onSwitch: (id: DemoId) => void }) {
  const [action, setAction] = useState(demo.actions[0].id);

  const isPlannerAction = action === "planner";

  useEffect(() => { setAction(demo.actions[0].id); }, [demo.id]);

  return (
    <div style={s.workspace}>
      {/* Action pills */}
      <div style={s.actionBar}>
        {demo.actions.map(a => (
          <button key={a.id} style={{...s.actionPill, ...(action===a.id ? s.actionPillActive : {})}}
            onClick={() => setAction(a.id)}
          >
            <span style={{fontSize:12}}>{a.icon}</span>
            <span>{a.label}</span>
          </button>
        ))}
      </div>

      {/* Results */}
      <div style={s.resultsPanel}>
        {isPlannerAction
          ? <PlannerView demoId={demo.id} />
          : <ResultsPanel demo={demo} actionId={action} />
        }
      </div>
    </div>
  );
}

/* ─── Results Panel ──────────────────────────────────── */
function ResultsPanel({ demo, actionId }: { demo: DemoScenario; actionId: string }) {
  const result = demo.results[actionId];

  if (!result) return (
    <div style={s.noResult}>
      <span style={{fontSize:22}}>🤖</span>
      <p style={{fontSize:13,color:"var(--text-secondary)",textAlign:"center"}}>AI is generating this analysis…<br/><span style={{color:"var(--text-muted)",fontSize:11}}>Connect to a live AI model to enable this action.</span></p>
    </div>
  );

  if (result.type === "paragraph")   return <ParagraphResult text={result.content as string} />;
  if (result.type === "bullets")     return <BulletsResult items={result.content as string[]} />;
  if (result.type === "facts")       return <FactsResult items={result.content as {label:string;value:string}[]} />;
  if (result.type === "insights")    return <InsightsResult items={result.content as {icon:string;text:string}[]} />;
  if (result.type === "flashcards")  return <FlashcardsResult cards={result.content as {q:string;a:string}[]} />;
  if (result.type === "quiz")        return <QuizResult qs={result.content as {q:string;options:string[];answer:number}[]} />;
  if (result.type === "math-steps")  return <MathStepsResult data={result.content as MathData} />;
  if (result.type === "clean-notes") return <CleanNotesResult data={result.content as NotesData} />;
  if (result.type === "translate")   return <TranslateResult />;
  if (result.type === "job-match")   return <JobMatchResult data={result.content as JobMatchData} />;
  if (result.type === "auto-fill")   return <AutoFillResult data={result.content as AutoFillData} />;
  if (result.type === "resume-opt")  return <ResumeOptResult data={result.content as ResumeOptData} />;

  return null;
}

function ParagraphResult({ text }: { text: string }) {
  return (
    <div style={s.resultCard}>
      <CopyButton text={text} />
      <p style={{fontSize:13,color:"var(--text-secondary)",lineHeight:1.75}}>{text}</p>
    </div>
  );
}

function BulletsResult({ items }: { items: string[] }) {
  return (
    <div style={s.resultCard}>
      <CopyButton text={items.join("\n")} />
      {items.map((item,i) => (
        <div key={i} style={{display:"flex",gap:10,marginBottom:10,alignItems:"flex-start"}}>
          <div style={{width:5,height:5,borderRadius:"50%",background:"var(--accent)",marginTop:6,flexShrink:0}}/>
          <span style={{fontSize:13,color:"var(--text-secondary)",lineHeight:1.65}}>{item}</span>
        </div>
      ))}
    </div>
  );
}

function FactsResult({ items }: { items: {label:string;value:string}[] }) {
  return (
    <div style={s.resultCard}>
      {items.map((f,i) => (
        <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:i<items.length-1?"1px solid var(--border)":"none"}}>
          <span style={{fontSize:12,color:"var(--text-muted)"}}>{f.label}</span>
          <span style={{fontSize:13,fontWeight:700,color:"var(--accent)"}}>{f.value}</span>
        </div>
      ))}
    </div>
  );
}

function InsightsResult({ items }: { items: {icon:string;text:string}[] }) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {items.map((ins,i) => (
        <div key={i} style={{...s.resultCard,display:"flex",gap:12,alignItems:"flex-start",padding:"12px 14px"}}>
          <span style={{fontSize:18,flexShrink:0}}>{ins.icon}</span>
          <p style={{fontSize:12.5,color:"var(--text-secondary)",lineHeight:1.7}}>{ins.text}</p>
        </div>
      ))}
    </div>
  );
}

function FlashcardsResult({ cards }: { cards: {q:string;a:string}[] }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const card = cards[idx];
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:2}}>
        <span style={{fontSize:11,color:"var(--text-muted)"}}>Card {idx+1} of {cards.length}</span>
        <span style={{fontSize:11,color:"var(--text-muted)"}}>{flipped?"Answer":"Question"}</span>
      </div>

      <div style={{...s.flashcard, background: flipped ? "rgba(108,141,250,0.1)" : "var(--bg-surface)", borderColor: flipped ? "rgba(108,141,250,0.25)" : "var(--border)"}} onClick={() => setFlipped(f => !f)}>
        <div style={{fontSize:11,color:flipped?"var(--accent)":"var(--text-muted)",marginBottom:8,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px"}}>{flipped?"A":"Q"}</div>
        <p style={{fontSize:13,color:"var(--text-secondary)",lineHeight:1.7,textAlign:"center"}}>{flipped ? card.a : card.q}</p>
        <div style={{fontSize:10,color:"var(--text-muted)",marginTop:10}}>Tap to {flipped?"see question":"reveal answer"}</div>
      </div>

      <div style={{display:"flex",gap:8}}>
        <button style={{...s.navBtn, opacity: idx===0?0.4:1}} onClick={() => { setIdx(i=>Math.max(0,i-1)); setFlipped(false); }} disabled={idx===0}>← Prev</button>
        <button style={{...s.navBtn,flex:1}} onClick={() => { setFlipped(false); setIdx(i=>(i+1)%cards.length); }}>Shuffle</button>
        <button style={{...s.navBtn, opacity: idx===cards.length-1?0.4:1}} onClick={() => { setIdx(i=>Math.min(cards.length-1,i+1)); setFlipped(false); }} disabled={idx===cards.length-1}>Next →</button>
      </div>
    </div>
  );
}

function QuizResult({ qs }: { qs: {q:string;options:string[];answer:number}[] }) {
  const [idx, setIdx]     = useState(0);
  const [selected, setSel] = useState<number|null>(null);
  const [score, setScore]  = useState(0);
  const [done, setDone]    = useState(false);

  function pick(i: number) {
    if (selected !== null) return;
    setSel(i);
    if (i === qs[idx].answer) setScore(s => s+1);
  }

  function next() {
    if (idx+1 >= qs.length) { setDone(true); return; }
    setIdx(i => i+1); setSel(null);
  }

  if (done) return (
    <div style={{...s.resultCard,textAlign:"center",padding:"28px 20px"}}>
      <div style={{fontSize:32,marginBottom:8}}>🎉</div>
      <div style={{fontSize:18,fontWeight:800,color:"var(--accent)",marginBottom:6}}>{score}/{qs.length} Correct</div>
      <p style={{fontSize:12.5,color:"var(--text-muted)",marginBottom:16}}>{score===qs.length?"Perfect score! You know this topic well.":score>=3?"Good job — review the ones you missed.":"Keep studying — try the flashcards first!"}</p>
      <button style={s.retryBtn} onClick={() => { setIdx(0); setSel(null); setScore(0); setDone(false); }}>Try Again</button>
    </div>
  );

  const q = qs[idx];
  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
        <span style={{fontSize:11,color:"var(--text-muted)"}}>Question {idx+1}/{qs.length}</span>
        <span style={{fontSize:11,color:"var(--accent)"}}>Score: {score}</span>
      </div>
      <div style={{...s.resultCard,marginBottom:4}}><p style={{fontSize:13,fontWeight:600,lineHeight:1.6}}>{q.q}</p></div>
      {q.options.map((opt,i) => {
        const isCorrect = i === q.answer;
        const isPicked  = i === selected;
        const revealed  = selected !== null;
        return (
          <button key={i} style={{...s.quizOption,
            background: revealed ? isCorrect ? "rgba(52,211,153,0.1)" : isPicked ? "rgba(248,113,113,0.1)" : "var(--bg-surface)" : "var(--bg-surface)",
            borderColor: revealed ? isCorrect ? "#34d399" : isPicked ? "#f87171" : "var(--border)" : "var(--border)",
            color: revealed && isCorrect ? "#34d399" : revealed && isPicked ? "#f87171" : "var(--text-secondary)",
          }} onClick={() => pick(i)}>
            <span style={{width:18,height:18,borderRadius:"50%",border:"1.5px solid currentColor",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:10}}>
              {revealed ? isCorrect ? "✓" : isPicked ? "✗" : String.fromCharCode(65+i) : String.fromCharCode(65+i)}
            </span>
            {opt}
          </button>
        );
      })}
      {selected !== null && (
        <button style={s.nextBtn} onClick={next}>{idx+1>=qs.length?"See Results":"Next Question →"}</button>
      )}
    </div>
  );
}

type MathData = { equation:string; type:string; method:string; steps:{num:number;title:string;detail:string;note:string}[]; answer:string; verification:string; };
function MathStepsResult({ data }: { data: MathData }) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{...s.resultCard,textAlign:"center",padding:"14px"}}>
        <div style={{fontSize:22,fontWeight:800,letterSpacing:"-0.5px",color:"var(--accent)",marginBottom:4}}>{data.equation}</div>
        <div style={{fontSize:11,color:"var(--text-muted)"}}>{data.type} · {data.method}</div>
      </div>
      {data.steps.map(step => (
        <div key={step.num} style={{...s.resultCard,padding:"12px 14px",display:"flex",gap:12}}>
          <div style={{width:22,height:22,borderRadius:"50%",background:"rgba(108,141,250,0.15)",color:"var(--accent)",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{step.num}</div>
          <div>
            <div style={{fontSize:12,fontWeight:600,marginBottom:4}}>{step.title}</div>
            <div style={{fontSize:14,fontWeight:700,color:"var(--accent)",marginBottom:4,letterSpacing:"-0.3px"}}>{step.detail}</div>
            <div style={{fontSize:11,color:"var(--text-muted)",fontStyle:"italic"}}>{step.note}</div>
          </div>
        </div>
      ))}
      <div style={{...s.resultCard,background:"rgba(52,211,153,0.07)",borderColor:"rgba(52,211,153,0.2)",padding:"14px"}}>
        <div style={{fontSize:11,color:"#34d399",fontWeight:600,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.5px"}}>✓ Answer</div>
        <div style={{fontSize:18,fontWeight:800,color:"#34d399",marginBottom:8}}>{data.answer}</div>
        <div style={{fontSize:11,color:"var(--text-muted)"}}>{data.verification}</div>
      </div>
    </div>
  );
}

type NotesData = { title:string; sections:{heading:string;points:string[]}[] };
function CleanNotesResult({ data }: { data: NotesData }) {
  return (
    <div style={s.resultCard}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontSize:13,fontWeight:700}}>{data.title}</div>
        <CopyButton text={data.sections.flatMap(s=>[s.heading,...s.points]).join("\n")} />
      </div>
      {data.sections.map(sec => (
        <div key={sec.heading} style={{marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,color:"var(--accent)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6}}>{sec.heading}</div>
          {sec.points.map((p,i) => (
            <div key={i} style={{display:"flex",gap:8,marginBottom:5}}>
              <span style={{color:"var(--text-muted)",fontSize:12}}>›</span>
              <span style={{fontSize:12.5,color:"var(--text-secondary)",lineHeight:1.6}}>{p}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

const LANGUAGES = ["Spanish","French","German","Hindi","Japanese","Chinese","Arabic","Portuguese"];
function TranslateResult() {
  const [lang, setLang] = useState("Spanish");
  const [done, setDone] = useState(false);
  return (
    <div style={s.resultCard}>
      <p style={{fontSize:12,color:"var(--text-muted)",marginBottom:12}}>Select a target language to translate the captured content:</p>
      <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:14}}>
        {LANGUAGES.map(l => (
          <button key={l} style={{...s.langPill,...(lang===l?{background:"rgba(108,141,250,0.15)",borderColor:"rgba(108,141,250,0.35)",color:"var(--accent)"}:{})}} onClick={() => { setLang(l); setDone(false); }}>
            {l}
          </button>
        ))}
      </div>
      <button style={s.translateBtn} onClick={() => setDone(true)}>
        {done ? `✓ Translated to ${lang}` : `Translate to ${lang}`}
      </button>
      {done && <p style={{fontSize:12,color:"var(--text-muted)",marginTop:10,fontStyle:"italic"}}>Connect to a live translation model (DeepL, Google Translate, or an AI API) to see the full translated output here.</p>}
    </div>
  );
}

/* ─── Smarty Planner ─────────────────────────────────── */
const PLAN_TYPES: {id: PlanType; icon: string; label: string}[] = [
  { id: "study",     icon: "📚", label: "Study Plan" },
  { id: "interview", icon: "💼", label: "Interview Prep" },
  { id: "learning",  icon: "🎯", label: "Learning Roadmap" },
  { id: "project",   icon: "🚀", label: "Project Plan" },
  { id: "career",    icon: "⭐", label: "Career Plan" },
];

const PLAN_QA: Record<PlanType, {q:string;placeholder:string}[]> = {
  study:     [{q:"What exam or subject are you preparing for?",placeholder:"e.g. SAT, NEET, JEE, IELTS"},{q:"What's your target score or grade?",placeholder:"e.g. 700+, A grade"},{q:"How many hours can you study per day?",placeholder:"e.g. 3 hours"},{q:"When is your exam or deadline?",placeholder:"e.g. 15 Aug 2025"}],
  interview: [{q:"Which company are you interviewing at?",placeholder:"e.g. Google, Amazon, startup"},{q:"What role are you applying for?",placeholder:"e.g. Software Engineer, Product Manager"},{q:"What's your experience level?",placeholder:"e.g. Fresher, 3 years, Senior"},{q:"When is your interview?",placeholder:"e.g. Next Friday, 20 Jul 2025"}],
  learning:  [{q:"What skill do you want to learn?",placeholder:"e.g. Machine Learning, React, Photography"},{q:"What's your current level?",placeholder:"e.g. Complete beginner, some experience"},{q:"How much time can you dedicate weekly?",placeholder:"e.g. 5 hours/week"},{q:"What's your goal outcome?",placeholder:"e.g. Build a project, get a job, hobby"}],
  project:   [{q:"What is your project about?",placeholder:"e.g. E-commerce app, mobile game"},{q:"What's the team size?",placeholder:"e.g. Solo, 3 people"},{q:"What's your timeline?",placeholder:"e.g. 3 months, end of quarter"},{q:"What's the main deliverable?",placeholder:"e.g. MVP, full product, prototype"}],
  career:    [{q:"What career path are you targeting?",placeholder:"e.g. Data Scientist, UX Designer"},{q:"Where are you now professionally?",placeholder:"e.g. Student, career switch, early career"},{q:"What's your target timeline?",placeholder:"e.g. 6 months, 1 year"},{q:"What's your biggest gap or challenge?",placeholder:"e.g. No experience, need portfolio"}],
};

const PLAN_OUTPUT: Record<PlanType, (answers: string[]) => string> = {
  study: ([subject,target,hours,date]) => `📚 **Personalized Study Plan — ${subject || "Your Exam"}**\n\nTarget: ${target || "Top score"} · Daily study: ${hours || "3 hrs"} · Deadline: ${date || "TBD"}\n\n**Week 1–2: Foundation**\n• Complete all syllabus topics with concept maps\n• 30 min daily on weak areas + 20 min revision\n• Take 1 mock test per week\n\n**Week 3–4: Practice**\n• Past 5 years' papers (timed practice)\n• Focus on high-weightage topics\n• Daily 50 MCQs with error analysis\n\n**Week 5–6: Revision Sprint**\n• Quick revision of all formulas and key concepts\n• 2 full mock tests per week with deep review\n• Prioritize mistake patterns\n\n**Final Week: Consolidation**\n• Light revision only — no new topics\n• Sleep 8 hrs, eat well, confidence-build\n• Review notes on exam morning`,
  interview: ([company,role,level,date]) => `💼 **Interview Prep Plan — ${role || "Target Role"} at ${company || "Top Company"}**\n\nLevel: ${level || "Mid"} · Interview date: ${date || "TBD"}\n\n**Days 1–3: Company Research**\n• Study ${company || "the company"}'s products, mission, and recent news\n• Understand the team structure and your role's scope\n• Prepare 3 impactful stories using the STAR method\n\n**Days 4–7: Technical Prep**\n• Review core concepts for ${role || "the role"} (DSA, system design, domain knowledge)\n• LeetCode: 2 Easy + 1 Medium per day\n• Practice behavioral questions out loud\n\n**Days 8–10: Mock Interviews**\n• Full mock interview with a friend or Pramp.com\n• Record yourself answering common questions\n• Polish your "Tell me about yourself" (90-second version)\n\n**Day Before:** Light review, prepare questions to ask the panel, and rest well.`,
  learning: ([skill,level,hours,goal]) => `🎯 **Learning Roadmap — ${skill || "Your Skill"}**\n\nStarting from: ${level || "beginner"} · Time: ${hours || "5 hrs/week"} · Goal: ${goal || "Proficiency"}\n\n**Month 1: Core Fundamentals**\n• Complete a structured beginner course (Udemy / official docs)\n• Build 1 tiny project to apply each new concept\n• Join a community (Discord, Reddit, YouTube comments)\n\n**Month 2: Building Depth**\n• Work through intermediate tutorials and real projects\n• Contribute to or clone 1 open-source project\n• Start a learning log (Notion, GitHub, blog)\n\n**Month 3: Portfolio Project**\n• Design and build 1 substantial project from scratch\n• Document your process and decisions\n• Share publicly and gather feedback\n\n**Ongoing:** ${goal === "get a job" ? "Apply for roles, contribute to OSS, network on LinkedIn." : "Keep building — depth comes from sustained practice."}`,
  project: ([desc,team,timeline,deliverable]) => `🚀 **Project Plan — ${desc || "Your Project"}**\n\nTeam: ${team || "Solo"} · Timeline: ${timeline || "3 months"} · Goal: ${deliverable || "MVP"}\n\n**Phase 1 — Discovery (Week 1–2)**\n• Define requirements, user personas, and success metrics\n• Sketch wireframes and validate with 3+ potential users\n• Set up project management (Linear, Notion, or GitHub Issues)\n\n**Phase 2 — Build (Week 3–8)**\n• Sprint 1: Core data models + basic API + auth\n• Sprint 2: Primary user flows + UI components\n• Sprint 3: Polish, edge cases, and error handling\n• Daily standups (even solo) + weekly progress review\n\n**Phase 3 — Ship (Week 9–10)**\n• Beta testing with 10+ users → collect feedback\n• Fix critical bugs, optimize performance\n• Deploy to production (Vercel, Railway, AWS)\n\n**Phase 4 — Iterate**\n• Analyze usage data and user feedback\n• Prioritize next features based on impact vs. effort`,
  career: ([path,current,timeline,challenge]) => `⭐ **Career Plan — ${path || "Target Career"}**\n\nCurrent status: ${current || "Exploring"} · Timeline: ${timeline || "1 year"} · Key challenge: ${challenge || "Building experience"}\n\n**Month 1–2: Foundations**\n• Audit your current skills vs. job descriptions for ${path || "target role"}\n• Identify the top 3 skill gaps — start filling them\n• Rewrite LinkedIn profile and resume for the target role\n\n**Month 3–5: Build Credibility**\n• Complete 1 project or certification relevant to ${path || "the field"}\n• Reach out to 5 people in the field (coffee chats, LinkedIn)\n• Start creating content (write about what you're learning)\n\n**Month 6–9: Active Job Search**\n• Apply to 3–5 roles per week with tailored applications\n• Do 2+ mock interviews per month\n• Track all applications and follow up consistently\n\n**Month 10–12: Close the Loop**\n• Negotiate offers confidently — know your market rate\n• Keep building skills even after landing the role`,
};

function PlannerView({ demoId }: { demoId: DemoId }) {
  const [planType, setPlanType] = useState<PlanType|null>(null);
  const [qIdx, setQIdx]         = useState(0);
  const [answers, setAnswers]   = useState<string[]>([]);
  const [input, setInput]       = useState("");
  const [plan, setPlan]         = useState<string|null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  function selectPlan(t: PlanType) { setPlanType(t); setQIdx(0); setAnswers([]); setInput(""); setPlan(null); }

  function submit() {
    const newAnswers = [...answers, input.trim()];
    setAnswers(newAnswers);
    setInput("");
    const qs = PLAN_QA[planType!];
    if (qIdx + 1 >= qs.length) {
      setTimeout(() => setPlan(PLAN_OUTPUT[planType!](newAnswers)), 800);
    } else {
      setQIdx(i => i+1);
    }
  }

  useEffect(() => { scrollRef.current?.scrollTo({top:9999,behavior:"smooth"}); }, [qIdx, plan]);

  if (!planType) return (
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:6}}>
        <span style={{fontSize:16}}>🧭</span>
        <div>
          <div style={{fontSize:13,fontWeight:700}}>Smarty Planner</div>
          <div style={{fontSize:11,color:"var(--text-muted)"}}>AI-powered personalized plans with follow-up questions</div>
        </div>
      </div>
      {PLAN_TYPES.map(pt => (
        <button key={pt.id} style={s.planTypeBtn} onClick={() => selectPlan(pt.id)}>
          <span style={{fontSize:16}}>{pt.icon}</span>
          <span style={{fontSize:13,fontWeight:600}}>{pt.label}</span>
          <svg style={{width:13,height:13,marginLeft:"auto",color:"var(--text-muted)"}} viewBox="0 0 24 24" fill="none">
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      ))}
    </div>
  );

  const qs = PLAN_QA[planType];
  const label = PLAN_TYPES.find(p=>p.id===planType)!.label;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <button style={s.backSmBtn} onClick={() => setPlanType(null)}>← Back</button>
        <span style={{fontSize:12,fontWeight:600,color:"var(--accent)"}}>{label}</span>
        <span style={{fontSize:10,color:"var(--text-muted)",marginLeft:"auto"}}>{plan?"Done":`${qIdx+1}/${qs.length} questions`}</span>
      </div>

      <div ref={scrollRef} style={{display:"flex",flexDirection:"column",gap:8,maxHeight:320,overflowY:"auto",paddingRight:2}}>
        {answers.map((ans,i) => (
          <div key={i} style={{display:"flex",flexDirection:"column",gap:5}}>
            <div style={s.smartyMsg}>
              <span style={s.smartyAvatar}>S</span>
              <div style={{...s.smartyBubble,background:"rgba(163,116,255,0.1)",borderColor:"rgba(163,116,255,0.2)"}}><p style={{fontSize:12.5,color:"var(--text-secondary)"}}>{qs[i].q}</p></div>
            </div>
            <div style={{...s.smartyMsg,flexDirection:"row-reverse"}}>
              <div style={{...s.smartyBubble,background:"rgba(108,141,250,0.1)",borderColor:"rgba(108,141,250,0.2)",textAlign:"right"}}><p style={{fontSize:12.5,color:"var(--text-secondary)"}}>{ans}</p></div>
            </div>
          </div>
        ))}

        {!plan && (
          <div style={s.smartyMsg}>
            <span style={s.smartyAvatar}>S</span>
            <div style={{...s.smartyBubble,background:"rgba(163,116,255,0.1)",borderColor:"rgba(163,116,255,0.2)"}}><p style={{fontSize:12.5,color:"var(--text-secondary)"}}>{qs[qIdx].q}</p></div>
          </div>
        )}

        {plan && (
          <div style={{...s.resultCard,whiteSpace:"pre-line",fontSize:12.5,lineHeight:1.75,color:"var(--text-secondary)"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
              <span style={{fontSize:13,fontWeight:700,color:"var(--text-primary)"}}>Your Personalized Plan</span>
              <CopyButton text={plan} />
            </div>
            {plan}
          </div>
        )}
      </div>

      {!plan && (
        <div style={{display:"flex",gap:8}}>
          <input
            style={s.planInput} value={input} autoFocus
            placeholder={qs[qIdx].placeholder}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key==="Enter" && input.trim() && submit()}
          />
          <button style={{...s.planSendBtn, opacity: input.trim()?1:0.4}} onClick={submit} disabled={!input.trim()}>
            <svg style={{width:14,height:14}} viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Job Result Renderers ───────────────────────────── */
type JobMatchData = { score:number; title:string; company:string; strengths:string[]; gaps:string[]; suggestions:{icon:string;text:string}[] };
type AutoFillData = { fields:{label:string;value:string;status:string}[]; aiAnswers:{q:string;a:string}[] };
type ResumeOptData = { atsScore:{before:number;after:number}; changes:{type:string;text:string}[]; keywords:{matched:string[];missing:string[]} };

function JobMatchResult({ data }: { data: JobMatchData }) {
  const color = data.score >= 80 ? "#34d399" : data.score >= 60 ? "#fbbf24" : "#f87171";
  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {/* Score card */}
      <div style={{...s.resultCard,display:"flex",alignItems:"center",gap:16,padding:"16px 18px"}}>
        <div style={{position:"relative",width:64,height:64,flexShrink:0}}>
          <svg width="64" height="64" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5"/>
            <circle cx="32" cy="32" r="26" fill="none" stroke={color} strokeWidth="5"
              strokeDasharray={`${2*Math.PI*26*data.score/100} ${2*Math.PI*26}`}
              strokeDashoffset={2*Math.PI*26*0.25} strokeLinecap="round"/>
          </svg>
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color}}>{data.score}%</div>
        </div>
        <div>
          <div style={{fontSize:15,fontWeight:800,marginBottom:2}}>Match Score</div>
          <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:4}}>{data.title} at {data.company}</div>
          <div style={{fontSize:11,color,fontWeight:600}}>{data.score>=80?"Strong Match 🎯":data.score>=60?"Good Match ✓":"Needs Work ⚠️"}</div>
        </div>
      </div>
      {/* Strengths */}
      <div style={s.resultCard}>
        <div style={{fontSize:11,fontWeight:700,color:"#34d399",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:10}}>✓ Strengths</div>
        {data.strengths.map((t,i) => (
          <div key={i} style={{display:"flex",gap:8,marginBottom:8,alignItems:"flex-start"}}>
            <span style={{color:"#34d399",fontSize:12,flexShrink:0}}>✓</span>
            <span style={{fontSize:12.5,color:"var(--text-secondary)",lineHeight:1.6}}>{t}</span>
          </div>
        ))}
      </div>
      {/* Gaps */}
      <div style={s.resultCard}>
        <div style={{fontSize:11,fontWeight:700,color:"#f87171",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:10}}>✗ Skill Gaps</div>
        {data.gaps.map((t,i) => (
          <div key={i} style={{display:"flex",gap:8,marginBottom:8,alignItems:"flex-start"}}>
            <span style={{color:"#f87171",fontSize:12,flexShrink:0}}>✗</span>
            <span style={{fontSize:12.5,color:"var(--text-secondary)",lineHeight:1.6}}>{t}</span>
          </div>
        ))}
      </div>
      {/* Suggestions */}
      <div style={s.resultCard}>
        <div style={{fontSize:11,fontWeight:700,color:"#fbbf24",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:10}}>💡 Suggestions</div>
        {data.suggestions.map((sg,i) => (
          <div key={i} style={{display:"flex",gap:10,marginBottom:10,alignItems:"flex-start"}}>
            <span style={{fontSize:16,flexShrink:0}}>{sg.icon}</span>
            <span style={{fontSize:12.5,color:"var(--text-secondary)",lineHeight:1.65}}>{sg.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AutoFillResult({ data }: { data: AutoFillData }) {
  const filled  = data.fields.filter(f => f.status==="filled").length;
  const [open, setOpen] = useState<number|null>(null);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {/* Progress */}
      <div style={{...s.resultCard,padding:"14px 16px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontSize:13,fontWeight:700}}>Form Fields Filled</div>
          <div style={{fontSize:12,fontWeight:700,color:"#34d399"}}>{filled}/{data.fields.length}</div>
        </div>
        <div style={{height:6,background:"rgba(255,255,255,0.07)",borderRadius:10,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${filled/data.fields.length*100}%`,background:"linear-gradient(90deg,#34d399,#6c8dfa)",borderRadius:10,transition:"width 0.5s"}}/>
        </div>
      </div>
      {/* Field rows */}
      <div style={s.resultCard}>
        <div style={{fontSize:11,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:10}}>Auto-Filled Fields</div>
        {data.fields.map((f,i) => (
          <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:i<data.fields.length-1?"1px solid rgba(255,255,255,0.05)":"none"}}>
            <span style={{fontSize:12,flexShrink:0}}>{f.status==="filled"?"✅":"⚠️"}</span>
            <span style={{flex:1,fontSize:12,color:"var(--text-muted)"}}>{f.label}</span>
            <span style={{fontSize:12,color:f.status==="filled"?"var(--text-primary)":"var(--text-muted)",fontStyle:f.status==="missing"?"italic":"normal",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.value}</span>
          </div>
        ))}
      </div>
      {/* AI Answers */}
      <div style={{fontSize:11,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.5px",paddingLeft:2}}>🤖 AI-Generated Answers</div>
      {data.aiAnswers.map((qa,i) => (
        <div key={i} style={{...s.resultCard,padding:"12px 14px"}}>
          <button style={{width:"100%",textAlign:"left",background:"none",border:"none",color:"inherit",padding:0,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}} onClick={() => setOpen(open===i?null:i)}>
            <span style={{fontSize:12,fontWeight:600,color:"var(--accent)",lineHeight:1.5,flex:1}}>{qa.q}</span>
            <span style={{fontSize:14,color:"var(--text-muted)",flexShrink:0}}>{open===i?"▲":"▼"}</span>
          </button>
          {open===i && (
            <p style={{fontSize:12.5,color:"var(--text-secondary)",lineHeight:1.7,marginTop:10,paddingTop:10,borderTop:"1px solid var(--border)"}}>{qa.a}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function ResumeOptResult({ data }: { data: ResumeOptData }) {
  const changeColor = (t:string) => t==="add"?"#34d399":t==="remove"?"#f87171":"#fbbf24";
  const changeIcon  = (t:string) => t==="add"?"✚":t==="remove"?"−":"↕";
  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {/* ATS score card */}
      <div style={{...s.resultCard,padding:"16px 18px"}}>
        <div style={{fontSize:11,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:12}}>ATS Compatibility Score</div>
        <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:12}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:22,fontWeight:800,color:"#f87171"}}>{data.atsScore.before}%</div>
            <div style={{fontSize:10,color:"var(--text-muted)"}}>Before</div>
          </div>
          <div style={{flex:1,height:6,background:"rgba(255,255,255,0.07)",borderRadius:10,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",left:0,top:0,height:"100%",width:`${data.atsScore.before}%`,background:"#f87171",borderRadius:10}}/>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:22,fontWeight:800,color:"#34d399"}}>{data.atsScore.after}%</div>
            <div style={{fontSize:10,color:"var(--text-muted)"}}>After</div>
          </div>
          <div style={{flex:1,height:6,background:"rgba(255,255,255,0.07)",borderRadius:10,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",left:0,top:0,height:"100%",width:`${data.atsScore.after}%`,background:"linear-gradient(90deg,#6c8dfa,#34d399)",borderRadius:10}}/>
          </div>
        </div>
      </div>
      {/* Changes */}
      <div style={s.resultCard}>
        <div style={{fontSize:11,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:10}}>Recommended Changes</div>
        {data.changes.map((c,i) => (
          <div key={i} style={{display:"flex",gap:10,marginBottom:10,alignItems:"flex-start"}}>
            <span style={{width:18,height:18,borderRadius:"50%",background:changeColor(c.type)+"20",color:changeColor(c.type),fontSize:10,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>{changeIcon(c.type)}</span>
            <span style={{fontSize:12.5,color:"var(--text-secondary)",lineHeight:1.65}}>{c.text}</span>
          </div>
        ))}
      </div>
      {/* Keywords */}
      <div style={s.resultCard}>
        <div style={{fontSize:11,fontWeight:700,color:"#34d399",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>Keywords Matched</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
          {data.keywords.matched.map(k => <span key={k} style={{fontSize:11,padding:"3px 9px",borderRadius:20,background:"rgba(52,211,153,0.1)",border:"1px solid rgba(52,211,153,0.2)",color:"#34d399"}}>{k}</span>)}
        </div>
        <div style={{fontSize:11,fontWeight:700,color:"#f87171",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>Keywords Missing</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {data.keywords.missing.map(k => <span key={k} style={{fontSize:11,padding:"3px 9px",borderRadius:20,background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.2)",color:"#f87171"}}>{k}</span>)}
        </div>
      </div>
    </div>
  );
}

/* ─── Profile Vault ──────────────────────────────────── */
const PROFILE_FIELDS = [
  { id:"name",       label:"Full Name",          placeholder:"Alex Johnson",           section:"Personal" },
  { id:"email",      label:"Email Address",       placeholder:"alex@example.com",       section:"Personal" },
  { id:"phone",      label:"Phone Number",        placeholder:"+1 (555) 234-5678",      section:"Personal" },
  { id:"address",    label:"Address",             placeholder:"San Francisco, CA",       section:"Personal" },
  { id:"linkedin",   label:"LinkedIn URL",        placeholder:"linkedin.com/in/alexj",  section:"Links" },
  { id:"github",     label:"GitHub URL",          placeholder:"github.com/alexj",        section:"Links" },
  { id:"portfolio",  label:"Portfolio Website",   placeholder:"alexjohnson.dev",         section:"Links" },
  { id:"education",  label:"Education",           placeholder:"B.S. Computer Science, MIT 2018", section:"Background" },
  { id:"experience", label:"Work Experience",     placeholder:"Senior Engineer @ Acme Corp (2020–present)", section:"Background" },
  { id:"skills",     label:"Skills",              placeholder:"React, TypeScript, Node.js, Python…", section:"Background" },
  { id:"certs",      label:"Certifications",      placeholder:"AWS Certified, Google Cloud Professional…", section:"Background" },
  { id:"achievements",label:"Achievements",       placeholder:"Led team that scaled product to 2M users…", section:"Background" },
  { id:"interests",  label:"Interests",           placeholder:"Open source, web performance, music…", section:"Background" },
];
const SECTIONS = ["Personal","Links","Background"];

function ProfileVault({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<Record<string,string>>(() => {
    try { return JSON.parse(localStorage.getItem("ms_profile") || "{}"); } catch { return {}; }
  });
  const [saved, setSaved] = useState(false);

  function save() {
    localStorage.setItem("ms_profile", JSON.stringify(data));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const filled = PROFILE_FIELDS.filter(f => data[f.id]?.trim()).length;

  return (
    <div style={s.vaultWrap}>
      {/* Hero */}
      <div style={s.vaultHero}>
        <div style={s.vaultAvatarWrap}>
          <div style={s.vaultAvatar}>
            <svg style={{width:22,height:22}} viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6"/>
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:800,marginBottom:2}}>{data["name"] || "Your Profile"}</div>
          <div style={{fontSize:11,color:"var(--text-muted)"}}>{filled}/{PROFILE_FIELDS.length} fields filled</div>
          <div style={{height:4,background:"rgba(255,255,255,0.07)",borderRadius:10,marginTop:7,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${filled/PROFILE_FIELDS.length*100}%`,background:"linear-gradient(90deg,#a374ff,#6c8dfa)",borderRadius:10,transition:"width 0.3s"}}/>
          </div>
        </div>
      </div>

      <div style={s.vaultBody}>
        {SECTIONS.map(sec => (
          <div key={sec} style={{marginBottom:22}}>
            <div style={s.vaultSectionLabel}>{sec}</div>
            {PROFILE_FIELDS.filter(f => f.section===sec).map(field => (
              <div key={field.id} style={s.vaultFieldRow}>
                <label style={s.vaultLabel}>{field.label}</label>
                {field.id==="experience" || field.id==="achievements" ? (
                  <textarea
                    style={{...s.vaultInput, height:68, resize:"none" as React.CSSProperties["resize"]}}
                    placeholder={field.placeholder}
                    value={data[field.id] || ""}
                    onChange={e => setData(d => ({...d,[field.id]:e.target.value}))}
                  />
                ) : (
                  <input
                    style={s.vaultInput}
                    placeholder={field.placeholder}
                    value={data[field.id] || ""}
                    onChange={e => setData(d => ({...d,[field.id]:e.target.value}))}
                  />
                )}
              </div>
            ))}
          </div>
        ))}

        {/* Resume upload row */}
        <div style={{marginBottom:22}}>
          <div style={s.vaultSectionLabel}>Resume</div>
          <div style={s.resumeUploadBox}>
            <span style={{fontSize:22,marginBottom:6}}>📄</span>
            <div style={{fontSize:12.5,fontWeight:600,marginBottom:2}}>Upload Resume</div>
            <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:10}}>PDF, DOC, or DOCX — max 5MB</div>
            <button style={s.resumeUploadBtn}>Choose File</button>
            <div style={{fontSize:10,color:"var(--text-muted)",marginTop:8,fontStyle:"italic"}}>File upload available in the full extension</div>
          </div>
        </div>

        <button style={{...s.startBtn, width:"100%", justifyContent:"center", marginBottom:20}} onClick={save}>
          {saved ? "✓ Saved!" : "Save Profile"}
        </button>
      </div>
    </div>
  );
}

/* ─── Smarty View ────────────────────────────────────── */
const SMARTY_DATA: Record<string, SmartyResult> = {
  youtube: {
    type: "youtube",
    sourceLabel: "🎥 YouTube Video",
    sourceColor: "#f87171",
    title: "The Future of AI Agents — Sam Altman at MIT (2024)",
    sections: [
      { id: "summary",    icon: "📝", label: "30-Second Summary", content: [
        "Sam Altman argues we are entering the 'agentic era' of AI — where models don't just answer questions but execute long, multi-step tasks autonomously.",
        "He predicts AI agents will soon handle entire workflows: writing code, conducting research, managing emails, and making decisions with minimal human input.",
        "The biggest challenge isn't capability — it's trust, safety, and building the right feedback loops so humans stay in control.",
        "OpenAI's focus is on making agents reliable enough to be genuinely delegated to, not just impressive in demos.",
      ]},
      { id: "takeaways",  icon: "🎯", label: "Key Takeaways", content: [
        "AI agents that can complete full tasks end-to-end will be more valuable than any single AI model output.",
        "The bottleneck is trust: people need to know when to let AI proceed vs. pause for human confirmation.",
        "AGI might arrive sooner than most expect — Altman wouldn't rule out 2025–2027 timelines.",
        "The economic impact of AI agents could compress decades of scientific progress into years.",
        "Safety research must scale alongside capability — it's not optional, it's existential.",
      ]},
      { id: "points",     icon: "📌", label: "Important Points", content: [
        "Altman defines 'agents' as AI systems capable of taking actions in the world — browsing, coding, emailing, managing files.",
        "Current models (GPT-4 class) can already handle 30-minute tasks; future models may handle days-long projects.",
        "He distinguishes between 'copilot' AI (assists humans) and 'autopilot' AI (executes independently).",
        "OpenAI is building frameworks for agents to request permission before high-stakes actions.",
        "He notes the 'context window' problem: agents need persistent memory across long tasks.",
        "Hallucination rates are falling but must reach near-zero before agents can be trusted with critical tasks.",
      ]},
      { id: "insights",   icon: "💡", label: "Actionable Insights", content: [
        "Start delegating simple, reversible tasks to AI agents today — file organization, email drafts, research summaries.",
        "Build human checkpoints into any agentic workflow; never fully remove oversight for irreversible actions.",
        "Invest time in learning 'prompt engineering for agents' — it's a new skill distinct from chatbot prompting.",
        "Organizations should audit which tasks are high-stakes before automating them with agents.",
        "Follow OpenAI's safety publications — their agent frameworks will likely become industry standards.",
      ]},
      { id: "facts",      icon: "🔢", label: "Key Numbers, Dates & Facts", content: [
        "2024 — Year Altman calls the beginning of the 'agentic transition' in AI development.",
        "~30 min — Current maximum reliable task duration for state-of-the-art AI agents.",
        "10x — Altman's estimate of productivity gain when agents become fully reliable.",
        "$100B+ — OpenAI's projected compute investment over the next few years.",
        "2027 — Altman's rough outer bound for when AGI-level systems may arrive.",
        "80% — Estimated share of white-collar tasks that contain an agentic component.",
      ]},
      { id: "conclusion", icon: "✅", label: "Final Conclusion", content: [
        "We are at the beginning of a fundamental shift — from AI as a tool you use, to AI as an agent you employ.",
        "The winners will be individuals and organizations that learn to delegate intelligently, maintain oversight, and adapt quickly.",
        "Altman's core message: the future belongs to those who understand how to work with AI agents, not just use AI models.",
      ]},
    ],
  },
  pdf: {
    type: "pdf",
    sourceLabel: "📄 PDF Document",
    sourceColor: "#fbbf24",
    title: "GPT-4 Technical Report — OpenAI (2023)",
    sections: [
      { id: "summary",    icon: "📝", label: "30-Second Summary", content: [
        "GPT-4 is a large multimodal model capable of processing both text and image inputs, producing text outputs.",
        "It achieves human-level performance on numerous professional and academic benchmarks.",
        "Significant alignment and safety work was done via RLHF and red-teaming before deployment.",
        "The report intentionally omits model architecture and training details for competitive and safety reasons.",
      ]},
      { id: "takeaways",  icon: "🎯", label: "Key Takeaways", content: [
        "GPT-4 scores in the top 10% on the bar exam, top 7% on the SAT, and achieves near-perfect AP exam scores.",
        "Vision capability allows analysis of charts, diagrams, screenshots, and photos.",
        "Despite improvements, GPT-4 still 'hallucinates' facts and must not be trusted for critical factual tasks without verification.",
        "RLHF dramatically reduces harmful outputs but introduces new alignment failure modes.",
        "GPT-4's capabilities were largely predictable from smaller models via scaling laws.",
      ]},
      { id: "points",     icon: "📌", label: "Important Points", content: [
        "GPT-4 underwent 6+ months of safety testing before public release.",
        "It was evaluated on over 50 benchmarks spanning language, reasoning, coding, and science.",
        "The model shows 'sparks of general intelligence' — solving novel problems outside its training data.",
        "Red teamers found GPT-4 could provide synthesis routes for dangerous chemicals without safety training.",
        "Post-RLHF refusal rate on harmful requests improved by 82% vs. base model.",
      ]},
      { id: "insights",   icon: "💡", label: "Actionable Insights", content: [
        "Use GPT-4's vision capability to automate document analysis, chart reading, and UI review tasks.",
        "Always verify factual outputs — especially for legal, medical, or financial use cases.",
        "GPT-4 is reliable for code generation, translation, and summarization at production scale.",
        "Fine-tuning GPT-4 on domain-specific data yields much better results than prompt engineering alone.",
      ]},
      { id: "facts",      icon: "🔢", label: "Key Numbers, Dates & Facts", content: [
        "March 2023 — GPT-4 public release date.",
        "Top 10% — Bar exam (Uniform Bar Exam) performance percentile.",
        "5-shot — Standard evaluation protocol used across most benchmarks.",
        "82% — Improvement in refusing harmful requests post-RLHF alignment.",
        "1,000+ — Number of human red teamers who tested the model pre-release.",
        "50+ — Number of academic/professional benchmarks GPT-4 was evaluated on.",
      ]},
      { id: "conclusion", icon: "✅", label: "Final Conclusion", content: [
        "GPT-4 marks a clear step-change in AI capability — not incremental, but qualitative.",
        "The safety-capability tradeoff remains an active challenge: more capable models require proportionally more safety work.",
        "GPT-4's full technical details remain undisclosed — this is both a competitive decision and a deliberate safety choice.",
      ]},
    ],
  },
  research: {
    type: "research",
    sourceLabel: "🔬 Research Paper",
    sourceColor: "#a374ff",
    title: "Attention Is All You Need — Vaswani et al. (2017)",
    sections: [
      { id: "summary",    icon: "📝", label: "30-Second Summary", content: [
        "Proposes the Transformer — a novel neural network architecture based entirely on attention mechanisms, discarding recurrence and convolutions.",
        "Enables fully parallel processing of sequences, dramatically improving training speed and translation quality.",
        "Became the foundation of every major language model: GPT, BERT, Claude, Gemini, and LLaMA.",
        "Achieved new state-of-the-art on WMT 2014 English-German (28.4 BLEU) and English-French (41.0 BLEU) translation tasks.",
      ]},
      { id: "takeaways",  icon: "🎯", label: "Key Takeaways", content: [
        "Self-attention lets a model look at all tokens simultaneously, not word-by-word like RNNs.",
        "Multi-head attention runs attention multiple times in parallel — each head learns different relationships.",
        "Positional encodings inject order information without recurrence.",
        "The Transformer trains faster than RNNs because it's highly parallelizable on GPUs.",
        "The encoder-decoder architecture handles seq-to-seq tasks (translation, summarization) directly.",
      ]},
      { id: "points",     icon: "📌", label: "Important Points", content: [
        "6 encoder + 6 decoder layers, each with multi-head attention and feed-forward sublayers.",
        "Scaled dot-product attention: Q·Kᵀ / √dₖ, preventing gradient vanishing in deep layers.",
        "Positional encodings use sinusoidal functions — deterministic, no learned parameters.",
        "Dropout (0.1) and label smoothing (0.1) used for regularization.",
        "Trained on 4.5M English-German pairs and 36M English-French pairs.",
      ]},
      { id: "insights",   icon: "💡", label: "Actionable Insights", content: [
        "Any sequence modeling task (code, DNA, music, time series) can leverage Transformer architecture.",
        "Pre-training + fine-tuning on Transformers beats training from scratch for most NLP tasks.",
        "Understanding attention maps provides interpretability into what the model focuses on.",
        "Multi-head attention count and model dimension (dₘₒdₑₗ) are the primary hyperparameters to tune.",
      ]},
      { id: "facts",      icon: "🔢", label: "Key Numbers, Dates & Facts", content: [
        "2017 — Year published at NeurIPS.",
        "28.4 BLEU — Score on English-German translation (prior SOTA was 26.3).",
        "41.0 BLEU — Score on English-French translation (new state-of-the-art).",
        "12 hours — Training time on 8 NVIDIA P100 GPUs.",
        "8 — Number of attention heads in the base model.",
        "512 — Model dimensionality (dₘₒdₑₗ) in the base Transformer.",
      ]},
      { id: "conclusion", icon: "✅", label: "Final Conclusion", content: [
        "The Transformer is arguably the most impactful AI architecture ever published — it enabled the entire LLM revolution.",
        "Its core insight: attention over full sequences is sufficient; recurrence is unnecessary.",
        "Every major AI model in production today (ChatGPT, Gemini, Claude) descends directly from this 8-page paper.",
      ]},
    ],
  },
  question: {
    type: "question",
    sourceLabel: "💬 Direct Question",
    sourceColor: "#34d399",
    title: "Supervised vs. Unsupervised Learning",
    sections: [
      { id: "summary",    icon: "📝", label: "Quick Summary", content: [
        "Supervised learning uses labeled data (input → correct output pairs) to train models that make predictions.",
        "Unsupervised learning finds hidden patterns in unlabeled data without being told what to look for.",
        "The choice depends on data availability, the task type, and whether ground-truth labels exist.",
      ]},
      { id: "takeaways",  icon: "🎯", label: "Key Differences", content: [
        "Supervised: requires labeled data. Unsupervised: works with raw, unlabeled data.",
        "Supervised: predicts known outcomes (classification, regression). Unsupervised: discovers unknown structure (clustering, compression).",
        "Supervised: loss function is well-defined. Unsupervised: evaluation is harder and often subjective.",
        "Supervised learning dominates production ML. Unsupervised is key for exploration and pre-training.",
      ]},
      { id: "points",     icon: "📌", label: "Examples of Each", content: [
        "Supervised: Email spam detection, image recognition, price prediction, sentiment analysis.",
        "Unsupervised: Customer segmentation, anomaly detection, topic modeling, dimensionality reduction (PCA, t-SNE).",
        "Semi-supervised (hybrid): Uses a small amount of labeled data + large unlabeled dataset — common in NLP.",
        "Self-supervised (special case): Model creates its own labels from data structure — used in GPT pre-training.",
      ]},
      { id: "insights",   icon: "💡", label: "When to Use Each", content: [
        "Use supervised when you have labeled data and a specific prediction target (e.g., fraud detection).",
        "Use unsupervised when exploring new data, reducing dimensionality, or when labeling is expensive.",
        "Consider self-supervised pre-training + supervised fine-tuning for limited labeled data scenarios.",
        "Clustering (unsupervised) is great for initial data exploration before committing to a supervised approach.",
      ]},
      { id: "facts",      icon: "🔢", label: "Key Facts", content: [
        "~80% of production ML systems use supervised learning due to reliable evaluation.",
        "Labeling cost: it costs ~$0.01–$1 per labeled example depending on domain complexity.",
        "GPT models use self-supervised pre-training on trillions of tokens before any supervised fine-tuning.",
        "k-means clustering (unsupervised) dates to 1957 — still widely used today.",
      ]},
      { id: "conclusion", icon: "✅", label: "Bottom Line", content: [
        "Supervised learning = teach by example with answers. Unsupervised = discover patterns on your own.",
        "Most real-world ML projects combine both: unsupervised for exploration, supervised for production.",
        "The line is blurring — self-supervised and semi-supervised methods are replacing the strict binary.",
      ]},
    ],
  },
};

type SmartySection = { id:string; icon:string; label:string; content:string[] };
type SmartyResult  = { type:string; sourceLabel:string; sourceColor:string; title:string; sections:SmartySection[] };

function pickSmartyData(query: string): SmartyResult {
  const t = detectSmartyType(query).type;
  return SMARTY_DATA[t] ?? SMARTY_DATA["question"];
}

function SmartyView({ query, onBack }: { query: string; onBack: () => void }) {
  const [loading, setLoading]       = useState(true);
  const [progress, setProgress]     = useState(0);
  const [savedSections, setSaved]   = useState<Set<string>>(new Set());
  const [flashMode, setFlashMode]   = useState(false);
  const [flashIdx, setFlashIdx]     = useState(0);
  const [flashFlipped, setFlashFlp] = useState(false);
  const data = pickSmartyData(query);

  useEffect(() => {
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 18 + 8;
      if (p >= 100) { p = 100; clearInterval(iv); setTimeout(() => setLoading(false), 300); }
      setProgress(Math.min(p, 100));
    }, 150);
    return () => clearInterval(iv);
  }, [query]);

  const allText = data.sections.map(sec =>
    `${sec.icon} ${sec.label}\n${sec.content.map(c=>`• ${c}`).join("\n")}`
  ).join("\n\n");

  function downloadNotes() {
    const blob = new Blob([`${data.title}\n${"─".repeat(50)}\n\n${allText}`], { type:"text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `smarty-notes-${data.type}.txt`;
    a.click();
  }

  function toggleSave(id: string) {
    setSaved(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const flashCards = data.sections.flatMap(sec =>
    sec.content.map(c => ({ q: `${sec.icon} ${sec.label}`, a: c }))
  );

  if (loading) return (
    <div style={s.smartyLoading}>
      <div style={s.smartyLoadingOrb}>
        <svg style={{width:28,height:28,opacity:0.6}} viewBox="0 0 24 24" fill="none">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="#a374ff" strokeWidth="1.2"/>
          <path d="M12 6v6l4 2" stroke="#a374ff" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        <span style={{fontSize:22}}>✨</span>
      </div>
      <div style={{fontSize:13,fontWeight:700,marginBottom:4}}>Smarty is analyzing…</div>
      <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:18}}>{data.sourceLabel} · {data.title.length > 40 ? data.title.slice(0,40)+"…" : data.title}</div>
      <div style={{width:220,height:4,background:"rgba(255,255,255,0.07)",borderRadius:10,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${progress}%`,background:"linear-gradient(90deg,#a374ff,#6c8dfa)",borderRadius:10,transition:"width 0.15s"}}/>
      </div>
      <div style={{fontSize:11,color:"var(--text-muted)",marginTop:8}}>{Math.round(progress)}% complete</div>
    </div>
  );

  if (flashMode) return (
    <div style={{display:"flex",flexDirection:"column",flex:1}}>
      <div style={{padding:"10px 14px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontSize:12,fontWeight:700,color:"#a374ff"}}>✨ Flashcards — {data.title.length>36?data.title.slice(0,36)+"…":data.title}</span>
        <button style={{fontSize:11,color:"var(--text-muted)",background:"var(--bg-elevated)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",padding:"3px 9px"}} onClick={()=>{setFlashMode(false);setFlashIdx(0);setFlashFlp(false);}}>✕ Close</button>
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",padding:"20px 16px",gap:12}}>
        <div style={{fontSize:11,color:"var(--text-muted)",textAlign:"center"}}>Card {flashIdx+1} of {flashCards.length} · {flashFlipped?"Answer":"Topic"}</div>
        <div style={{...s.flashcard,flex:1,minHeight:180,background:flashFlipped?"rgba(163,116,255,0.08)":"var(--bg-surface)",borderColor:flashFlipped?"rgba(163,116,255,0.25)":"var(--border)"}} onClick={()=>setFlashFlp(f=>!f)}>
          <div style={{fontSize:11,color:flashFlipped?"#a374ff":"var(--text-muted)",fontWeight:700,marginBottom:10}}>{flashFlipped?"💡 Answer":"📌 Topic"}</div>
          <p style={{fontSize:13,color:"var(--text-secondary)",lineHeight:1.7,textAlign:"center"}}>{flashFlipped ? flashCards[flashIdx].a : flashCards[flashIdx].q}</p>
          <div style={{fontSize:10,color:"var(--text-muted)",marginTop:12}}>Tap to {flashFlipped?"see topic":"reveal answer"}</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button style={{...s.navBtn,opacity:flashIdx===0?0.4:1}} disabled={flashIdx===0} onClick={()=>{setFlashIdx(i=>i-1);setFlashFlp(false);}}>← Prev</button>
          <button style={s.navBtn} onClick={()=>{setFlashFlp(false);setFlashIdx(i=>(i+1)%flashCards.length);}}>Shuffle</button>
          <button style={{...s.navBtn,opacity:flashIdx===flashCards.length-1?0.4:1}} disabled={flashIdx===flashCards.length-1} onClick={()=>{setFlashIdx(i=>i+1);setFlashFlp(false);}}>Next →</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",flex:1,overflowY:"auto"}}>
      {/* Source + title banner */}
      <div style={{padding:"10px 16px 10px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"flex-start",gap:10}}>
        <span style={{fontSize:10,fontWeight:700,color:data.sourceColor,background:data.sourceColor+"18",border:`1px solid ${data.sourceColor}30`,borderRadius:20,padding:"3px 9px",whiteSpace:"nowrap",flexShrink:0}}>{data.sourceLabel}</span>
        <div style={{fontSize:12,fontWeight:600,color:"var(--text-secondary)",lineHeight:1.5,overflow:"hidden"}}>{data.title}</div>
      </div>

      {/* Action bar */}
      <div style={s.smartyActionBar}>
        <SmartyActionBtn icon="📋" label="Copy All" onClick={() => navigator.clipboard?.writeText(allText)} />
        <SmartyActionBtn icon="⬇️" label="Download" onClick={downloadNotes} />
        <SmartyActionBtn icon="🃏" label="Flashcards" onClick={()=>setFlashMode(true)} />
      </div>

      {/* Sections */}
      <div style={{padding:"12px 14px 28px",display:"flex",flexDirection:"column",gap:10}}>
        {data.sections.map(sec => (
          <div key={sec.id} style={{...s.resultCard,padding:"14px 14px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:7}}>
                <span style={{fontSize:14}}>{sec.icon}</span>
                <span style={{fontSize:12,fontWeight:700,color:"var(--text-primary)"}}>{sec.label}</span>
              </div>
              <button
                style={{fontSize:10,fontWeight:600,color:savedSections.has(sec.id)?"#34d399":"var(--text-muted)",background:"var(--bg-elevated)",border:`1px solid ${savedSections.has(sec.id)?"rgba(52,211,153,0.3)":"var(--border)"}`,borderRadius:"var(--radius-sm)",padding:"2px 8px",transition:"all 0.15s"}}
                onClick={() => toggleSave(sec.id)}
              >{savedSections.has(sec.id)?"✓ Saved":"Save"}</button>
            </div>
            {sec.content.map((line,i) => (
              <div key={i} style={{display:"flex",gap:8,marginBottom:8,alignItems:"flex-start"}}>
                <div style={{width:4,height:4,borderRadius:"50%",background:"#a374ff",marginTop:6,flexShrink:0}}/>
                <span style={{fontSize:12.5,color:"var(--text-secondary)",lineHeight:1.7}}>{line}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function SmartyActionBtn({ icon, label, onClick }: { icon:string; label:string; onClick:()=>void }) {
  const [flash, setFlash] = useState(false);
  return (
    <button style={{...s.smartyAct, background: flash?"rgba(163,116,255,0.15)":"var(--bg-elevated)"}}
      onClick={() => { onClick(); setFlash(true); setTimeout(()=>setFlash(false),800); }}>
      <span style={{fontSize:12}}>{icon}</span>{label}
    </button>
  );
}

/* ─── Shared helpers ─────────────────────────────────── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button style={{...s.copyBtn, color: copied?"#34d399":"var(--text-muted)"}} onClick={() => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(()=>setCopied(false),1800); }}>
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

/* ══ Styles ══════════════════════════════════════════ */
const s: Record<string, React.CSSProperties> = {
  root:    { minHeight:"100vh", background:"var(--bg-base)", display:"flex", justifyContent:"center", position:"relative" },
  blob:    { position:"fixed", top:"-5%", left:"40%", transform:"translateX(-50%)", width:560, height:560, background:"radial-gradient(circle,rgba(163,116,255,0.13) 0%,transparent 68%)", pointerEvents:"none", zIndex:0, animation:"orb-drift 20s ease-in-out infinite" },
  blob2:   { position:"fixed", bottom:"5%", right:"5%", width:400, height:400, background:"radial-gradient(circle,rgba(108,141,250,0.09) 0%,transparent 68%)", pointerEvents:"none", zIndex:0, animation:"orb-drift-2 26s ease-in-out infinite" },
  dotGrid: { position:"fixed", inset:0, backgroundImage:"radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize:"28px 28px", pointerEvents:"none", zIndex:0, maskImage:"radial-gradient(ellipse 80% 80% at 50% 30%, black 30%, transparent 100%)", WebkitMaskImage:"radial-gradient(ellipse 80% 80% at 50% 30%, black 30%, transparent 100%)" } as React.CSSProperties,
  page:    { width:"100%", maxWidth:480, minHeight:"100vh", display:"flex", flexDirection:"column", position:"relative", zIndex:1 },

  header: {
    display:"flex", alignItems:"center", justifyContent:"space-between",
    padding:"14px 18px",
    borderBottom:"1px solid rgba(255,255,255,0.07)",
    position:"sticky", top:0, zIndex:20,
    background:"rgba(6,8,14,0.88)",
    backdropFilter:"blur(28px)",
    WebkitBackdropFilter:"blur(28px)",
    boxShadow:"0 1px 0 rgba(163,116,255,0.1), 0 4px 24px rgba(0,0,0,0.3)",
  },
  backBtn: {
    display:"flex", alignItems:"center", justifyContent:"center",
    width:32, height:32,
    background:"rgba(255,255,255,0.05)",
    border:"1px solid rgba(255,255,255,0.09)",
    borderRadius:"var(--radius-sm)",
    color:"rgba(255,255,255,0.5)",
    boxShadow:"inset 0 1px 0 rgba(255,255,255,0.06)",
    transition:"all 0.15s",
  },
  headerCenter: { display:"flex", alignItems:"center", gap:8 },
  headerIconWrap: {
    width:26, height:26,
    background:"linear-gradient(135deg,rgba(163,116,255,0.25),rgba(108,141,250,0.15))",
    color:"#c49eff",
    borderRadius:8,
    border:"1px solid rgba(163,116,255,0.25)",
    display:"flex", alignItems:"center", justifyContent:"center",
    boxShadow:"0 0 14px rgba(163,116,255,0.2)",
  },
  livePill: {
    display:"flex", alignItems:"center", gap:4,
    fontSize:9, fontWeight:700, letterSpacing:"0.8px", color:"#34d399",
    background:"rgba(52,211,153,0.08)",
    border:"1px solid rgba(52,211,153,0.22)",
    borderRadius:20, padding:"2px 9px",
    boxShadow:"0 0 10px rgba(52,211,153,0.12)",
  },
  liveDot: { width:5, height:5, borderRadius:"50%", background:"#34d399", flexShrink:0, boxShadow:"0 0 7px #34d399", animation:"pulse-glow 2s ease-in-out infinite" } as React.CSSProperties,

  // Idle
  idle:        { display:"flex", flexDirection:"column", alignItems:"center", padding:"32px 22px 36px", textAlign:"center" },
  scannerAnim: {
    position:"relative", width:100, height:100,
    display:"flex", alignItems:"center", justifyContent:"center",
    marginBottom:24,
    border:"1px solid rgba(163,116,255,0.18)",
    borderRadius:20,
    background:"linear-gradient(135deg,rgba(163,116,255,0.08),rgba(108,141,250,0.05))",
    boxShadow:"0 0 40px rgba(163,116,255,0.12), inset 0 1px 0 rgba(255,255,255,0.06)",
  },
  scannerCornerTL: { position:"absolute", top:-2, left:-2, width:16, height:16, borderTop:"2.5px solid #a374ff", borderLeft:"2.5px solid #a374ff", borderRadius:"4px 0 0 0", filter:"drop-shadow(0 0 4px #a374ff)" } as React.CSSProperties,
  scannerCornerTR: { position:"absolute", top:-2, right:-2, width:16, height:16, borderTop:"2.5px solid #a374ff", borderRight:"2.5px solid #a374ff", borderRadius:"0 4px 0 0", filter:"drop-shadow(0 0 4px #a374ff)" } as React.CSSProperties,
  scannerCornerBL: { position:"absolute", bottom:-2, left:-2, width:16, height:16, borderBottom:"2.5px solid #a374ff", borderLeft:"2.5px solid #a374ff", borderRadius:"0 0 0 4px", filter:"drop-shadow(0 0 4px #a374ff)" } as React.CSSProperties,
  scannerCornerBR: { position:"absolute", bottom:-2, right:-2, width:16, height:16, borderBottom:"2.5px solid #a374ff", borderRight:"2.5px solid #a374ff", borderRadius:"0 0 4px 0", filter:"drop-shadow(0 0 4px #a374ff)" } as React.CSSProperties,
  scannerLine: { position:"absolute", left:8, right:8, height:2, background:"linear-gradient(90deg,transparent,#c49eff,#a374ff,#c49eff,transparent)", boxShadow:"0 0 12px #a374ff, 0 0 24px rgba(163,116,255,0.5)", animation:"scan-y 2s ease-in-out infinite alternate", top:"30%" } as React.CSSProperties,
  idleTitle:   { fontSize:23, fontWeight:800, letterSpacing:"-0.7px", lineHeight:1.28, marginBottom:10, color:"#eef0ff" },
  gradText:    { background:"linear-gradient(90deg,#c49eff,#7fa3ff)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" } as React.CSSProperties,
  idleDesc:    { fontSize:12.5, color:"rgba(255,255,255,0.38)", lineHeight:1.75, maxWidth:320, marginBottom:22 },
  capsPills:   { display:"flex", flexWrap:"wrap", gap:6, justifyContent:"center", marginBottom:26 },
  capPill:     { display:"flex", alignItems:"center", gap:5, fontSize:11, color:"rgba(255,255,255,0.35)", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:20, padding:"5px 11px", boxShadow:"inset 0 1px 0 rgba(255,255,255,0.05)" },
  startBtn:    { display:"flex", alignItems:"center", gap:8, padding:"12px 28px", fontSize:13.5, fontWeight:700, background:"linear-gradient(135deg,#b084ff,#7fa3ff)", color:"#fff", border:"none", borderRadius:14, boxShadow:"0 0 32px rgba(163,116,255,0.4), 0 8px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)", letterSpacing:"-0.2px" },

  // Overlay
  overlayWrap:  { display:"flex", flexDirection:"column", alignItems:"center", padding:"20px 18px 32px", gap:16, flex:1 },
  overlayHint:  { display:"flex", alignItems:"center", gap:6, fontSize:12, color:"var(--text-secondary)", background:"var(--bg-surface)", border:"1px solid var(--border)", borderRadius:20, padding:"5px 12px" },
  overlayDot:   { width:6, height:6, borderRadius:"50%", background:"#6c8dfa", flexShrink:0 } as React.CSSProperties,
  fakeScreen:   { width:"100%", background:"var(--bg-surface)", border:"1px solid var(--border)", borderRadius:"var(--radius-lg)", overflow:"hidden", position:"relative" },
  fakeScreenBar:{ display:"flex", alignItems:"center", gap:6, padding:"8px 12px", borderBottom:"1px solid var(--border)", background:"var(--bg-elevated)" },
  fakeBarDot:   { width:8, height:8, borderRadius:"50%" },
  fakeUrl:      { fontSize:10, color:"var(--text-muted)", background:"rgba(255,255,255,0.04)", borderRadius:4, padding:"2px 8px", marginLeft:4 },
  fakeContent:  { padding:"16px 14px 14px", display:"flex", flexDirection:"column", gap:0, position:"relative" },
  demoPreviewTag: { display:"flex", alignItems:"center", gap:8, background:"var(--bg-surface)", border:"1px solid var(--border)", borderRadius:20, padding:"5px 12px" },

  // Detecting
  detecting:     { display:"flex", flexDirection:"column", alignItems:"center", padding:"40px 20px 32px", gap:16, flex:1 },
  detectOrb:     { position:"relative", width:70, height:70, display:"flex", alignItems:"center", justifyContent:"center" },
  detectOrbRing1:{ position:"absolute", inset:0, borderRadius:"50%", border:"1.5px solid rgba(163,116,255,0.3)", animation:"spin 3s linear infinite" } as React.CSSProperties,
  detectOrbRing2:{ position:"absolute", inset:8, borderRadius:"50%", border:"1.5px dashed rgba(108,141,250,0.25)", animation:"spin 5s linear infinite reverse" } as React.CSSProperties,
  detectSteps:   { display:"flex", flexDirection:"column", gap:10, width:"100%", maxWidth:340, background:"var(--bg-surface)", border:"1px solid var(--border)", borderRadius:"var(--radius-lg)", padding:"14px 16px" },
  detectResult:  { display:"flex", alignItems:"center", gap:12, background:"rgba(52,211,153,0.06)", border:"1px solid rgba(52,211,153,0.2)", borderRadius:"var(--radius-md)", padding:"12px 14px", width:"100%", maxWidth:340 },

  // Workspace
  workspace:      { display:"flex", flexDirection:"column", flex:1, overflowY:"auto" },
  capturedBanner: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 16px", borderBottom:"1px solid var(--border)" },
  detectedBadge:  { display:"flex", alignItems:"center", gap:6, fontSize:11, fontWeight:600, borderRadius:20, padding:"4px 10px" },
  rescanBtn:      { display:"flex", alignItems:"center", gap:5, fontSize:11, fontWeight:600, color:"var(--text-muted)", background:"var(--bg-elevated)", border:"1px solid var(--border)", borderRadius:"var(--radius-sm)", padding:"5px 10px" },
  switcherBar:    { display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderBottom:"1px solid var(--border)", background:"rgba(255,255,255,0.012)", overflowX:"auto", scrollbarWidth:"none" } as React.CSSProperties,
  switchPill:     { display:"flex", alignItems:"center", gap:4, fontSize:11, fontWeight:600, padding:"4px 10px", borderRadius:20, background:"var(--bg-elevated)", border:"1px solid var(--border)", color:"var(--text-muted)", whiteSpace:"nowrap", flexShrink:0, transition:"all 0.15s" },
  switchPillActive:{ background:"rgba(163,116,255,0.12)", borderColor:"rgba(163,116,255,0.35)", color:"#a374ff" },
  capturedPreview:{ display:"flex", alignItems:"center", gap:7, padding:"7px 16px", borderBottom:"1px solid var(--border)", background:"rgba(255,255,255,0.015)" },
  actionBar:      { display:"flex", gap:6, padding:"10px 14px", overflowX:"auto", borderBottom:"1px solid var(--border)", scrollbarWidth:"none" } as React.CSSProperties,
  actionPill:     { display:"flex", alignItems:"center", gap:5, padding:"6px 11px", fontSize:11.5, fontWeight:600, background:"var(--bg-elevated)", border:"1px solid var(--border)", borderRadius:20, color:"var(--text-secondary)", whiteSpace:"nowrap", flexShrink:0, transition:"all 0.15s" },
  actionPillActive:{ background:"rgba(108,141,250,0.12)", borderColor:"rgba(108,141,250,0.3)", color:"var(--accent)" },
  resultsPanel:   { padding:"14px 14px 28px", display:"flex", flexDirection:"column", gap:10, flex:1 },

  // Result cards
  resultCard:   { background:"linear-gradient(135deg,rgba(20,22,32,0.95),rgba(16,18,28,0.98))", border:"1px solid rgba(255,255,255,0.08)", borderRadius:14, padding:"14px", position:"relative", boxShadow:"0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)" },
  noResult:     { display:"flex", flexDirection:"column", alignItems:"center", gap:12, padding:"40px 20px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14 },
  copyBtn:      { position:"absolute", top:10, right:10, fontSize:10, fontWeight:600, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"var(--radius-sm)", padding:"3px 8px", transition:"color 0.2s", boxShadow:"inset 0 1px 0 rgba(255,255,255,0.04)" } as React.CSSProperties,
  flashcard:    { border:"1px solid var(--border)", borderRadius:"var(--radius-md)", padding:"20px", display:"flex", flexDirection:"column", alignItems:"center", minHeight:130, justifyContent:"center", cursor:"pointer", transition:"background 0.2s, border-color 0.2s", position:"relative" },
  navBtn:       { flex:1, fontSize:11.5, fontWeight:600, background:"var(--bg-elevated)", border:"1px solid var(--border)", borderRadius:"var(--radius-sm)", padding:"7px 10px", color:"var(--text-secondary)" },
  quizOption:   { display:"flex", alignItems:"center", gap:10, padding:"10px 12px", fontSize:12.5, border:"1px solid var(--border)", borderRadius:"var(--radius-sm)", background:"var(--bg-surface)", textAlign:"left", transition:"all 0.15s", color:"var(--text-secondary)" },
  nextBtn:      { padding:"9px 14px", fontSize:12.5, fontWeight:600, background:"var(--accent)", color:"#fff", border:"none", borderRadius:"var(--radius-md)" },
  retryBtn:     { padding:"9px 20px", fontSize:12.5, fontWeight:600, background:"var(--accent)", color:"#fff", border:"none", borderRadius:"var(--radius-md)" },
  langPill:     { fontSize:11.5, fontWeight:500, padding:"5px 11px", borderRadius:20, background:"var(--bg-elevated)", border:"1px solid var(--border)", color:"var(--text-secondary)", transition:"all 0.15s" },
  translateBtn: { width:"100%", padding:"10px", fontSize:12.5, fontWeight:600, background:"rgba(108,141,250,0.12)", border:"1px solid rgba(108,141,250,0.25)", borderRadius:"var(--radius-md)", color:"var(--accent)" },

  // Planner
  planTypeBtn:  { display:"flex", alignItems:"center", gap:10, padding:"11px 14px", background:"var(--bg-surface)", border:"1px solid var(--border)", borderRadius:"var(--radius-md)", textAlign:"left", color:"var(--text-primary)", transition:"border-color 0.2s" },
  smartyMsg:    { display:"flex", alignItems:"flex-start", gap:8 },
  smartyAvatar: { width:22, height:22, borderRadius:"50%", background:"linear-gradient(135deg,#a374ff,#6c8dfa)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, color:"#fff", flexShrink:0 } as React.CSSProperties,
  smartyBubble: { flex:1, background:"var(--bg-surface)", border:"1px solid var(--border)", borderRadius:"var(--radius-md)", padding:"9px 12px" },
  planInput:    { flex:1, background:"var(--bg-elevated)", border:"1px solid var(--border)", borderRadius:"var(--radius-md)", padding:"9px 12px", fontSize:12.5, color:"var(--text-primary)", outline:"none", fontFamily:"inherit" },
  planSendBtn:  { width:36, height:36, background:"var(--accent)", border:"none", borderRadius:"var(--radius-md)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"opacity 0.2s" },
  backSmBtn:    { fontSize:11, fontWeight:600, color:"var(--text-muted)", background:"var(--bg-elevated)", border:"1px solid var(--border)", borderRadius:"var(--radius-sm)", padding:"4px 9px" },

  // Job Apply CTA
  jobCta:       { display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, width:"100%", background:"linear-gradient(135deg,rgba(52,211,153,0.07),rgba(52,211,153,0.03))", border:"1px solid rgba(52,211,153,0.2)", borderRadius:14, padding:"13px 15px", marginTop:16, boxShadow:"0 0 24px rgba(52,211,153,0.06), inset 0 1px 0 rgba(52,211,153,0.08)" },
  jobCtaLeft:   { display:"flex", alignItems:"center", gap:12 },
  jobCtaBtn:    { fontSize:12, fontWeight:700, padding:"7px 16px", borderRadius:20, background:"rgba(52,211,153,0.15)", border:"1px solid rgba(52,211,153,0.35)", color:"#34d399", whiteSpace:"nowrap", flexShrink:0, boxShadow:"0 0 14px rgba(52,211,153,0.15)" },

  // Profile Vault
  vaultWrap:    { display:"flex", flexDirection:"column", flex:1, overflowY:"auto" },
  vaultHero:    { display:"flex", alignItems:"center", gap:14, padding:"18px 18px 16px", borderBottom:"1px solid var(--border)", background:"rgba(163,116,255,0.04)" },
  vaultAvatarWrap: { flexShrink:0 },
  vaultAvatar:  { width:48, height:48, borderRadius:"50%", background:"linear-gradient(135deg,rgba(163,116,255,0.25),rgba(108,141,250,0.25))", border:"1.5px solid rgba(163,116,255,0.25)", display:"flex", alignItems:"center", justifyContent:"center", color:"#a374ff" },
  vaultBody:    { padding:"18px 18px 32px", display:"flex", flexDirection:"column" },
  vaultSectionLabel: { fontSize:10, fontWeight:700, color:"var(--accent-scan)", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:10, marginTop:4 },
  vaultFieldRow:{ display:"flex", flexDirection:"column", gap:5, marginBottom:12 },
  vaultLabel:   { fontSize:11, color:"var(--text-muted)", fontWeight:600 },
  vaultInput:   { background:"var(--bg-elevated)", border:"1px solid var(--border)", borderRadius:"var(--radius-sm)", padding:"8px 11px", fontSize:12.5, color:"var(--text-primary)", outline:"none", fontFamily:"inherit", width:"100%", boxSizing:"border-box" } as React.CSSProperties,
  resumeUploadBox: { display:"flex", flexDirection:"column", alignItems:"center", padding:"20px", background:"var(--bg-elevated)", border:"1.5px dashed rgba(163,116,255,0.25)", borderRadius:"var(--radius-md)", textAlign:"center" },
  resumeUploadBtn: { fontSize:12, fontWeight:600, padding:"7px 18px", background:"rgba(163,116,255,0.12)", border:"1px solid rgba(163,116,255,0.3)", borderRadius:20, color:"#a374ff" },

  // Idle divider
  idleDivider:     { display:"flex", alignItems:"center", gap:10, width:"100%", margin:"20px 0 20px" },
  idleDividerText: { fontSize:10.5, color:"rgba(255,255,255,0.2)", whiteSpace:"nowrap", padding:"0 10px", letterSpacing:"0.4px", fontWeight:500 },

  // Smarty Bar (on idle screen)
  smartyBarWrap: {
    width:"100%",
    background:"linear-gradient(145deg,rgba(163,116,255,0.08),rgba(108,141,250,0.04))",
    border:"1px solid rgba(163,116,255,0.25)",
    borderRadius:18,
    padding:"16px 15px 13px",
    boxShadow:"0 0 40px rgba(163,116,255,0.1), inset 0 1px 0 rgba(255,255,255,0.06)",
    animation:"smarty-border-glow 4s ease-in-out infinite",
  },
  smartyBarRow:    { display:"flex", gap:8, marginBottom:7 },
  smartyBarInner:  { flex:1, display:"flex", alignItems:"center", gap:9, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(163,116,255,0.28)", borderRadius:12, padding:"10px 13px", boxShadow:"inset 0 1px 0 rgba(255,255,255,0.05), 0 0 20px rgba(163,116,255,0.06)" },
  smartyInput:     { flex:1, background:"none", border:"none", outline:"none", fontSize:13, color:"#eef0ff", fontFamily:"inherit", letterSpacing:"-0.1px" },
  smartyClear:     { fontSize:12, color:"rgba(255,255,255,0.25)", background:"none", border:"none", padding:"0 3px", cursor:"pointer", flexShrink:0 },
  smartySend:      { width:42, height:42, background:"linear-gradient(135deg,#b084ff,#7fa3ff)", border:"none", borderRadius:12, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"opacity 0.15s, box-shadow 0.15s", boxShadow:"0 0 20px rgba(163,116,255,0.4), inset 0 1px 0 rgba(255,255,255,0.2)" },
  smartyDetected:  { display:"flex", alignItems:"center", gap:6, marginBottom:9 },
  smartyChips:     { display:"flex", gap:6, flexWrap:"wrap" as React.CSSProperties["flexWrap"] },
  smartyChip:      { display:"flex", alignItems:"center", gap:5, fontSize:10.5, fontWeight:600, color:"rgba(255,255,255,0.35)", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:20, padding:"4px 10px", transition:"all 0.15s", boxShadow:"inset 0 1px 0 rgba(255,255,255,0.04)" },

  // Smarty loading screen
  smartyLoading:    { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", flex:1, padding:"40px 24px", gap:14, textAlign:"center" },
  smartyLoadingOrb: { position:"relative", width:80, height:80, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:4 },

  // Smarty action bar
  smartyActionBar: { display:"flex", gap:6, padding:"9px 15px", borderBottom:"1px solid rgba(255,255,255,0.07)", borderTop:"1px solid rgba(255,255,255,0.04)", background:"rgba(163,116,255,0.04)", overflowX:"auto", scrollbarWidth:"none" } as React.CSSProperties,
  smartyAct:       { display:"flex", alignItems:"center", gap:5, fontSize:11.5, fontWeight:600, color:"rgba(255,255,255,0.5)", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:20, padding:"6px 12px", whiteSpace:"nowrap", flexShrink:0, transition:"background 0.2s", boxShadow:"inset 0 1px 0 rgba(255,255,255,0.05)" },
};
