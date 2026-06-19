import React, { useState } from "react";
import { TruthLayerPanel } from "@/pages/TruthLayer";
import { MasterScanPanel } from "@/pages/MasterScan";

const POPUP_KEYFRAMES = `
  @keyframes gradient-flow {
    0%, 100% { background-position: 0% 50%; }
    50%       { background-position: 100% 50%; }
  }
  @keyframes shimmer-sweep {
    0%   { transform: translateX(-160%) skewX(-12deg); }
    100% { transform: translateX(260%) skewX(-12deg); }
  }
  @keyframes sparkle-twinkle {
    0%, 100% { opacity: 0;   transform: scale(0.4) rotate(0deg); }
    25%       { opacity: 1;   transform: scale(1.4) rotate(60deg); }
    55%       { opacity: 0.6; transform: scale(0.95) rotate(130deg); }
    80%       { opacity: 0.9; transform: scale(1.2) rotate(195deg); }
  }
  @keyframes float-ping {
    0%   { transform: scale(1);   opacity: 0.55; }
    100% { transform: scale(2.6); opacity: 0; }
  }
  @keyframes card-enter {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes orb-float {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33%       { transform: translate(12px, -16px) scale(1.09); }
    66%       { transform: translate(-9px, 7px) scale(0.94); }
  }
  @keyframes top-bar-flow {
    0%, 100% { background-position: 0% 50%; }
    50%       { background-position: 100% 50%; }
  }
  @keyframes hero-up {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes logo-grad {
    0%, 100% { background-position: 0% 50%; }
    50%       { background-position: 100% 50%; }
  }
  /* Card shimmer */
  .popup-card-shimmer::after {
    content: '';
    position: absolute; inset: 0;
    background: linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.72) 50%, transparent 80%);
    transform: translateX(-160%) skewX(-12deg);
    pointer-events: none; z-index: 2; border-radius: 20px;
  }
  .popup-card-shimmer:hover::after {
    animation: shimmer-sweep 0.55s ease-out forwards;
  }
  /* Staggered card entrance */
  .popup-card-1 { animation: card-enter 0.45s cubic-bezier(0.16,1,0.3,1) 0.10s both; }
  .popup-card-2 { animation: card-enter 0.45s cubic-bezier(0.16,1,0.3,1) 0.22s both; }
  /* Hero entrance */
  .popup-hero   { animation: hero-up 0.4s cubic-bezier(0.16,1,0.3,1) 0.05s both; }
  /* Sparkle ping ring */
  .sparkle-ping-1::after {
    content: '';
    position: absolute; inset: -6px; border-radius: 50%;
    border: 1px solid rgba(236,72,153,0.45);
    animation: float-ping 2.3s ease-out infinite;
    pointer-events: none;
  }
  /* Logo accent gradient */
  .popup-logo-accent {
    background: linear-gradient(90deg, #ec4899, #f43f5e, #a855f7, #f472b6, #ec4899);
    background-size: 300% 100%;
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: logo-grad 4s ease-in-out infinite;
  }
`;

export default function Popup() {
  const [view, setView] = useState<"home" | "truth-layer" | "masterscan">("home");

  return (
    <div style={s.root}>
      <style dangerouslySetInnerHTML={{ __html: POPUP_KEYFRAMES }} />

      {/* Layered ambient orbs */}
      <div style={s.blob1} />
      <div style={s.blob2} />
      <div style={s.blob3} />

      {/* Dot-grid overlay */}
      <div style={s.dotGrid} />

      <div style={s.popup}>
        {/* Animated rainbow top border */}
        <div style={s.topBorder} />

        {/* Ambient orbs inside popup card */}
        <div style={s.popupOrb1} />
        <div style={s.popupOrb2} />
        <div style={s.popupOrb3} />

        {/* Floating sparkle particles */}
        <span style={s.sp1} className="sparkle-ping-1">✦</span>
        <span style={s.sp2}>✦</span>
        <span style={s.sp3}>✶</span>
        <span style={s.sp4}>✦</span>
        <span style={s.sp5}>✦</span>

        {/* Header */}
        <header style={s.header}>
          <div style={s.logo}>
            <div style={s.logoIconWrap}>
              <svg style={s.logoIcon} viewBox="0 0 24 24" fill="none">
                {/* 4-pointed AI sparkle — main */}
                <path d="M12 1C10.8 6.8 6.8 10.8 1 12C6.8 13.2 10.8 17.2 12 23C13.2 17.2 17.2 13.2 23 12C17.2 10.8 13.2 6.8 12 1Z" fill="white"/>
                {/* small accent sparkle */}
                <path d="M19.5 3C19.2 4.6 18 5.8 16.5 6.1C18 6.4 19.2 7.6 19.5 9.2C19.8 7.6 21 6.4 22.5 6.1C21 5.8 19.8 4.6 19.5 3Z" fill="white" fillOpacity="0.65"/>
              </svg>
            </div>
            <span style={s.logoText}>
              Decision<span style={s.logoAccent} className="popup-logo-accent">AI</span>
            </span>
          </div>
          <div style={s.headerBadge}>
            <span style={s.headerBadgeDot} />
            BETA
          </div>
        </header>

        {/* Hero */}
        <div style={s.hero} className="popup-hero">
          <div style={s.heroEyebrow}>
            <div style={s.eyebrowLine} />
            <span>AI-powered browser intelligence</span>
            <div style={s.eyebrowLine} />
          </div>
          <h1 style={s.heroTitle}>
            Decide smarter.<br/>
            <span style={s.heroGrad}>Every time.</span>
          </h1>
          <p style={s.heroSub}>Real-time AI analysis for every product, article, and decision you browse.</p>
        </div>

        {/* Feature Cards */}
        <main style={s.features}>
          <FeatureCard
            onClick={() => setView("truth-layer")}
            accentColor="#FF4FD8"
            accentScan={false}
            cardClassName="popup-card-shimmer popup-card-1"
            icon={
              <svg style={s.featureIconSvg} viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.6"/>
                <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                <path d="M8 11h6M11 8v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            }
            title="Truth Layer"
            tag={{ label: "Live", color: "#34d399", dot: "#34d399" }}
            desc="Deep-dive analysis of any product. Reviews, pricing, red flags, and a final buy recommendation."
            bullets={["Price comparison across stores", "Red flag detection", "Buy recommendation"]}
            bulletDone
          />

          <FeatureCard
            onClick={() => setView("masterscan")}
            accentColor="#a374ff"
            accentScan
            dimmed
            cardClassName="popup-card-shimmer popup-card-2"
            icon={
              <svg style={s.featureIconSvg} viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.6"/>
                <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.6"/>
                <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.6"/>
                <path d="M14 14h2v2h-2zM18 14h3M14 18h2M18 18h3M14 21h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            }
            title="MasterScan"
            tag={{ label: "New", color: "#a374ff", dot: "#a374ff" }}
            desc="Universal AI copilot. Summarize videos, papers, and articles. Auto-fill job applications."
            bullets={["YouTube & PDF intelligence", "Smarty AI search bar", "Auto Job Apply"]}
            bulletDone
          />
        </main>

        {/* Download Extension Banner — upgraded */}
        <div style={s.downloadBanner}>
          {/* Background shimmer line */}
          <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,transparent,rgba(138,92,255,0.6),rgba(255,79,216,0.6),transparent)",borderRadius:"14px 14px 0 0"}} />

          <div style={s.downloadLeft}>
            <div style={s.downloadIconWrap}>
              <svg style={s.downloadIcon} viewBox="0 0 24 24" fill="none">
                <path d="M12 3v13M7 11l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 20h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div style={s.downloadTitle}>Install Chrome Extension</div>
              <div style={s.downloadSub}>Get the real browser overlay — free</div>
              <div style={{display:"flex", gap:5, marginTop:5}}>
                {["Product scanner","AI notes","Resume auto-fill"].map(f => (
                  <span key={f} style={{fontSize:9, fontWeight:600, padding:"2px 7px", borderRadius:10, background:"rgba(138,92,255,0.1)", color:"#8A5CFF", border:"1px solid rgba(138,92,255,0.2)"}}>
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <DownloadButton />
        </div>

        <footer style={s.footer}>
          <div style={s.footerLeft}>
            <span style={s.footerDot} />
            <span>All systems operational</span>
          </div>
          <span style={s.footerVersion}>v1.0.0</span>
        </footer>

        {/* Inline overlays — slide up over popup content */}
        {view === "truth-layer" && (
          <div style={{ position:"absolute", inset:0, zIndex:10, borderRadius:26, overflow:"hidden", animation:"slide-up 0.3s cubic-bezier(0.16,1,0.3,1)" }}>
            <TruthLayerPanel onClose={() => setView("home")} />
          </div>
        )}
        {view === "masterscan" && (
          <div style={{ position:"absolute", inset:0, zIndex:10, borderRadius:26, overflow:"hidden", animation:"slide-up 0.3s cubic-bezier(0.16,1,0.3,1)" }}>
            <MasterScanPanel onClose={() => setView("home")} />
          </div>
        )}
      </div>
    </div>
  );
}

function DownloadButton() {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  const handleDownload = async () => {
    if (state === "loading") return;
    setState("loading");
    try {
      const res = await fetch("/api/extension/download");
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "decision-ai-extension.zip";
      a.click();
      URL.revokeObjectURL(url);
      setState("done");
      setTimeout(() => setState("idle"), 3000);
    } catch {
      setState("idle");
    }
  };

  return (
    <button
      onClick={handleDownload}
      style={{
        ...s.dlBtn,
        background: state === "done"
          ? "linear-gradient(135deg, #34d399, #059669)"
          : "linear-gradient(135deg, #FF4FD8, #8A5CFF)",
        opacity: state === "loading" ? 0.7 : 1,
        cursor: state === "loading" ? "wait" : "pointer",
      }}
    >
      {state === "loading" ? (
        <svg style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="32" strokeDashoffset="10"/>
        </svg>
      ) : state === "done" ? (
        <svg style={{ width: 13, height: 13 }} viewBox="0 0 24 24" fill="none">
          <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : (
        <svg style={{ width: 13, height: 13 }} viewBox="0 0 24 24" fill="none">
          <path d="M12 3v13M7 11l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      )}
      <span>{state === "loading" ? "Zipping…" : state === "done" ? "Downloaded!" : "Download .zip"}</span>
    </button>
  );
}

function FeatureCard({
  onClick, accentColor, accentScan, icon, title, tag,
  desc, bullets, bulletDone, dimmed, cardClassName,
}: {
  onClick: () => void;
  accentColor: string; accentScan: boolean;
  icon: React.ReactNode;
  title: string;
  tag: { label: string; color: string; dot: string };
  desc: string;
  bullets: string[];
  bulletDone: boolean;
  dimmed?: boolean;
  cardClassName?: string;
}) {
  const glowColor = accentScan ? "rgba(244,63,94,0.12)" : "rgba(236,72,153,0.12)";

  const handleEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    const el = e.currentTarget;
    el.style.background = `linear-gradient(135deg, ${accentColor}0a 0%, #fff 100%)`;
    el.style.borderColor = accentColor + "44";
    el.style.transform = "translateY(-2px)";
    el.style.boxShadow = `0 10px 36px ${accentColor}28`;
  };
  const handleLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    const el = e.currentTarget;
    el.style.background = "#ffffff";
    el.style.borderColor = "rgba(236,72,153,0.14)";
    el.style.transform = "translateY(0)";
    el.style.boxShadow = "0 2px 16px rgba(236,72,153,0.07)";
  };

  return (
    <button
      style={{ ...s.featureCard, opacity: dimmed ? 0.85 : 1 }}
      className={cardClassName}
      onClick={onClick}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {/* Corner glow */}
      <div style={{
        position:"absolute", top:-30, right:-30, width:120, height:120,
        borderRadius:"50%", background:`radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
        pointerEvents:"none",
      }}/>

      <div style={{ ...s.featureIconWrap, background: `linear-gradient(135deg, ${accentColor}18, ${accentColor}08)`, color: accentColor, border: `1px solid ${accentColor}25` }}>
        {icon}
      </div>

      <div style={s.featureContent}>
        <div style={s.featureHeader}>
          <h2 style={s.featureTitle}>{title}</h2>
          <span style={{ ...s.featureTag, background: tag.color + "15", color: tag.color, border: `1px solid ${tag.color}30` }}>
            <span style={{ ...s.tagDot, background: tag.dot, boxShadow: `0 0 6px ${tag.dot}` }} />
            {tag.label}
          </span>
        </div>
        <p style={s.featureDesc}>{desc}</p>
        <ul style={s.featureBullets}>
          {bullets.map(b => (
            <li key={b} style={s.bulletItem}>
              {bulletDone ? (
                <svg style={{ ...s.bulletIcon, color: accentColor }} viewBox="0 0 16 16" fill="none">
                  <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg style={{ ...s.bulletIcon, color: "var(--text-muted)" }} viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.2"/>
                </svg>
              )}
              <span style={{ color: bulletDone ? "var(--text-secondary)" : "var(--text-muted)", fontSize: 11 }}>{b}</span>
            </li>
          ))}
        </ul>
      </div>

      <div style={s.featureArrow}>
        <svg style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="none">
          <path d="M9 18l6-6-6-6" stroke={accentColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </button>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    background: "var(--bg-base)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 16px",
    position: "relative",
    overflow: "hidden",
  },

  // Background layers
  blob1: {
    position: "fixed", top: "-5%", left: "5%",
    width: 500, height: 500, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(236,72,153,0.12) 0%, transparent 65%)",
    animation: "orb-drift 20s ease-in-out infinite",
    pointerEvents: "none", zIndex: 0,
  },
  blob2: {
    position: "fixed", bottom: "5%", right: "5%",
    width: 480, height: 480, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(244,63,94,0.10) 0%, transparent 65%)",
    animation: "orb-drift-2 24s ease-in-out infinite",
    pointerEvents: "none", zIndex: 0,
  },
  blob3: {
    position: "fixed", top: "50%", left: "50%",
    width: 600, height: 300,
    transform: "translate(-50%, -50%)",
    background: "radial-gradient(ellipse, rgba(236,72,153,0.06) 0%, transparent 70%)",
    pointerEvents: "none", zIndex: 0,
  },
  dotGrid: {
    position: "fixed", inset: 0,
    backgroundImage: "radial-gradient(circle, rgba(236,72,153,0.08) 1px, transparent 1px)",
    backgroundSize: "28px 28px",
    pointerEvents: "none", zIndex: 0,
    maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
    WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
  },

  // Card shell
  popup: {
    width: 430,
    background: "#ffffff",
    backdropFilter: "blur(40px)",
    WebkitBackdropFilter: "blur(40px)",
    border: "1px solid rgba(236,72,153,0.14)",
    borderRadius: 26,
    overflow: "hidden",
    boxShadow: "0 32px 80px rgba(236,72,153,0.10), 0 8px 28px rgba(0,0,0,0.04)",
    animation: "slide-up 0.5s cubic-bezier(0.16,1,0.3,1)",
    position: "relative",
    zIndex: 1,
  },
  topBorder: {
    height: 2.5, flexShrink: 0,
    background: "linear-gradient(90deg, #ec4899, #f472b6, #a855f7, #f43f5e, #f472b6, #ec4899)",
    backgroundSize: "300% 100%",
    animation: "top-bar-flow 3.5s ease-in-out infinite",
  },

  // Inline popup orbs
  popupOrb1: {
    position: "absolute", borderRadius: "50%", pointerEvents: "none", zIndex: 0,
    width: 220, height: 220, top: -70, right: -55,
    background: "radial-gradient(circle, rgba(236,72,153,0.10) 0%, transparent 68%)",
    animation: "orb-float 15s ease-in-out infinite",
  },
  popupOrb2: {
    position: "absolute", borderRadius: "50%", pointerEvents: "none", zIndex: 0,
    width: 160, height: 160, bottom: -45, left: -45,
    background: "radial-gradient(circle, rgba(168,85,247,0.09) 0%, transparent 68%)",
    animation: "orb-float 20s ease-in-out infinite reverse",
  },
  popupOrb3: {
    position: "absolute", borderRadius: "50%", pointerEvents: "none", zIndex: 0,
    width: 120, height: 120, top: "42%", right: -25,
    background: "radial-gradient(circle, rgba(244,63,94,0.07) 0%, transparent 68%)",
    animation: "orb-float 13s ease-in-out infinite 2s",
  },

  // Sparkle particles
  sp1: {
    position: "absolute", pointerEvents: "none", zIndex: 5, userSelect: "none",
    top: 15, right: 22, fontSize: 9, color: "#ec4899",
    animation: "sparkle-twinkle 3.8s ease-in-out infinite 0s",
  },
  sp2: {
    position: "absolute", pointerEvents: "none", zIndex: 5, userSelect: "none",
    top: 48, right: 15, fontSize: 5.5, color: "#f472b6",
    animation: "sparkle-twinkle 3.8s ease-in-out infinite 1.1s",
  },
  sp3: {
    position: "absolute", pointerEvents: "none", zIndex: 5, userSelect: "none",
    top: 30, left: 20, fontSize: 6, color: "#f43f5e",
    animation: "sparkle-twinkle 3.8s ease-in-out infinite 0.55s",
  },
  sp4: {
    position: "absolute", pointerEvents: "none", zIndex: 5, userSelect: "none",
    bottom: 100, right: 24, fontSize: 7.5, color: "#a855f7",
    animation: "sparkle-twinkle 3.8s ease-in-out infinite 2.2s",
  },
  sp5: {
    position: "absolute", pointerEvents: "none", zIndex: 5, userSelect: "none",
    bottom: 148, left: 26, fontSize: 5, color: "#ec4899",
    animation: "sparkle-twinkle 3.8s ease-in-out infinite 1.65s",
  },

  // Header
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "18px 22px 16px",
    borderBottom: "1px solid rgba(236,72,153,0.12)",
    background: "#fff",
  },
  logo: { display: "flex", alignItems: "center", gap: 10 },
  logoIconWrap: {
    width: 36, height: 36,
    background: "linear-gradient(145deg, #f472b6 0%, #ec4899 45%, #f43f5e 100%)",
    borderRadius: 11,
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 4px 18px rgba(236,72,153,0.55), 0 1px 4px rgba(244,63,94,0.3), inset 0 1px 0 rgba(255,255,255,0.35)",
    flexShrink: 0,
  },
  logoIcon: { width: 20, height: 20 },
  logoText: { fontSize: 17, fontWeight: 800, letterSpacing: "-0.6px", color: "var(--text-primary)" },
  logoAccent: {
    background: "linear-gradient(135deg, #ec4899, #f43f5e)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  headerBadge: {
    display: "flex", alignItems: "center", gap: 5,
    fontSize: 9, fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase",
    color: "var(--text-muted)",
    background: "var(--bg-elevated)",
    border: "1px solid var(--border)",
    borderRadius: 20,
    padding: "4px 10px",
  },
  headerBadgeDot: {
    width: 5, height: 5, borderRadius: "50%",
    background: "#10b981",
    boxShadow: "0 0 8px #10b981",
    animation: "pulse-glow 2.5s ease-in-out infinite",
    flexShrink: 0,
  },

  // Hero
  hero: { padding: "22px 22px 10px" },
  heroEyebrow: {
    display: "flex", alignItems: "center", gap: 10, marginBottom: 14,
    fontSize: 10.5, fontWeight: 600, letterSpacing: "0.4px",
    color: "var(--text-muted)", textTransform: "uppercase",
  },
  eyebrowLine: { flex: 1, height: 1, background: "linear-gradient(90deg, transparent, rgba(236,72,153,0.2))" },
  heroTitle: {
    fontSize: 24, fontWeight: 800, lineHeight: 1.2,
    letterSpacing: "-0.8px", color: "var(--text-primary)", marginBottom: 10,
  },
  heroGrad: {
    background: "linear-gradient(135deg, #ec4899 0%, #f472b6 40%, #f43f5e 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  heroSub: {
    fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.65, fontWeight: 400,
  },

  // Feature cards
  features: { display: "flex", flexDirection: "column", gap: 8, padding: "14px 12px 4px" },
  featureCard: {
    display: "flex", alignItems: "flex-start", gap: 14, padding: "18px 16px",
    background: "#ffffff",
    border: "1.5px solid rgba(236,72,153,0.14)",
    borderRadius: 20, color: "inherit", textAlign: "left",
    transition: "background 0.25s, border-color 0.25s, transform 0.18s, box-shadow 0.25s",
    width: "100%",
    position: "relative",
    overflow: "hidden",
    boxShadow: "0 2px 16px rgba(236,72,153,0.07)",
    cursor: "pointer",
  },
  featureIconWrap: {
    flexShrink: 0, width: 52, height: 52, borderRadius: 16,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  featureIconSvg: { width: 24, height: 24 },
  featureContent: { flex: 1, minWidth: 0 },
  featureHeader: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6 },
  featureTitle: { fontSize: 14.5, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.3px" },
  featureTag: {
    display: "flex", alignItems: "center", gap: 4,
    fontSize: 9.5, fontWeight: 700, letterSpacing: "0.4px",
    borderRadius: 20, padding: "3px 9px",
  },
  tagDot: { width: 5, height: 5, borderRadius: "50%", flexShrink: 0, animation: "pulse-glow 2s ease-in-out infinite" },
  featureDesc: { fontSize: 11.5, color: "var(--text-secondary)", marginBottom: 11, lineHeight: 1.65 },
  featureBullets: { display: "flex", flexDirection: "column", gap: 5 },
  bulletItem: { display: "flex", alignItems: "center", gap: 7 },
  bulletIcon: { width: 13, height: 13, flexShrink: 0 },
  featureArrow: {
    flexShrink: 0, display: "flex", alignItems: "center",
    alignSelf: "center", opacity: 0.7,
  },

  // Footer
  footer: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "13px 22px 16px",
    fontSize: 10.5,
    color: "var(--text-muted)",
    borderTop: "1px solid rgba(236,72,153,0.1)",
    marginTop: 10,
    background: "var(--bg-elevated)",
  },
  footerLeft: { display: "flex", alignItems: "center", gap: 6 },
  footerDot: {
    display: "inline-block", width: 5, height: 5, borderRadius: "50%",
    background: "#10b981",
    boxShadow: "0 0 8px #10b981",
    animation: "pulse-glow 3s ease-in-out infinite",
    flexShrink: 0,
  },
  footerVersion: {
    background: "#fff",
    border: "1px solid rgba(236,72,153,0.15)",
    borderRadius: 6,
    padding: "2px 7px",
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.3px",
    color: "var(--text-muted)",
  },

  downloadBanner: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    margin: "8px 12px 0",
    padding: "14px 16px",
    background: "linear-gradient(135deg, rgba(138,92,255,0.09) 0%, rgba(255,79,216,0.06) 100%)",
    border: "1.5px solid rgba(138,92,255,0.22)",
    borderRadius: 18,
    gap: 10,
    position: "relative",
    overflow: "hidden",
    boxShadow: "0 4px 20px rgba(138,92,255,0.10)",
  },
  downloadLeft: {
    display: "flex", alignItems: "center", gap: 10, minWidth: 0,
  },
  downloadIconWrap: {
    flexShrink: 0,
    width: 34, height: 34, borderRadius: 10,
    background: "linear-gradient(135deg, rgba(236,72,153,0.15), rgba(244,63,94,0.1))",
    border: "1px solid rgba(236,72,153,0.25)",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#ec4899",
  },
  downloadIcon: { width: 16, height: 16 },
  downloadTitle: {
    fontSize: 12, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.2px",
  },
  downloadSub: {
    fontSize: 10.5, color: "var(--text-muted)", marginTop: 1,
  },
  dlBtn: {
    flexShrink: 0,
    display: "flex", alignItems: "center", gap: 6,
    padding: "7px 13px",
    borderRadius: 10,
    border: "none",
    color: "#fff",
    fontSize: 11.5,
    fontWeight: 700,
    letterSpacing: "-0.1px",
    transition: "opacity 0.2s, transform 0.15s",
    boxShadow: "0 4px 16px rgba(236,72,153,0.35)",
    whiteSpace: "nowrap" as const,
  },
};
