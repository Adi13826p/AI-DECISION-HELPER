import React, { useState } from "react";
import { TruthLayerPanel } from "@/pages/TruthLayer";
import { MasterScanPanel } from "@/pages/MasterScan";

export default function Popup() {
  const [view, setView] = useState<"home" | "truth-layer" | "masterscan">("home");

  return (
    <div style={s.root}>
      {/* Layered ambient orbs */}
      <div style={s.blob1} />
      <div style={s.blob2} />
      <div style={s.blob3} />

      {/* Dot-grid overlay */}
      <div style={s.dotGrid} />

      <div style={s.popup}>
        {/* Animated top border */}
        <div style={s.topBorder} />

        {/* Header */}
        <header style={s.header}>
          <div style={s.logo}>
            <div style={s.logoIconWrap}>
              <svg style={s.logoIcon} viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
                <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
                <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={s.logoText}>
              Decision<span style={s.logoAccent}>AI</span>
            </span>
          </div>
          <div style={s.headerBadge}>
            <span style={s.headerBadgeDot} />
            BETA
          </div>
        </header>

        {/* Hero */}
        <div style={s.hero}>
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

        {/* Download Extension Banner */}
        <div style={s.downloadBanner}>
          <div style={s.downloadLeft}>
            <div style={s.downloadIconWrap}>
              <svg style={s.downloadIcon} viewBox="0 0 24 24" fill="none">
                <path d="M12 3v13M7 11l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 20h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div style={s.downloadTitle}>Install Chrome Extension</div>
              <div style={s.downloadSub}>Get the real browser overlay</div>
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
  desc, bullets, bulletDone, dimmed,
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
}) {
  const glowColor = accentScan ? "rgba(244,63,94,0.12)" : "rgba(236,72,153,0.12)";

  const handleEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    const el = e.currentTarget;
    el.style.background = `linear-gradient(135deg, ${accentColor}0a 0%, #fff 100%)`;
    el.style.borderColor = accentColor + "55";
    el.style.transform = "translateY(-2px)";
    el.style.boxShadow = `0 8px 32px ${accentColor}22, 0 0 0 1px ${accentColor}22`;
  };
  const handleLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    const el = e.currentTarget;
    el.style.background = "#ffffff";
    el.style.borderColor = "rgba(236,72,153,0.14)";
    el.style.transform = "translateY(0)";
    el.style.boxShadow = "0 2px 12px rgba(236,72,153,0.08)";
  };

  return (
    <button
      style={{ ...s.featureCard, opacity: dimmed ? 0.85 : 1 }}
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
    border: "1px solid rgba(236,72,153,0.18)",
    borderRadius: 26,
    overflow: "hidden",
    boxShadow: "0 20px 60px rgba(236,72,153,0.12), 0 4px 20px rgba(236,72,153,0.08)",
    animation: "slide-up 0.5s cubic-bezier(0.16,1,0.3,1)",
    position: "relative",
    zIndex: 1,
  },
  topBorder: {
    height: 2,
    background: "linear-gradient(90deg, transparent 0%, #ec4899 25%, #f472b6 50%, #f43f5e 75%, transparent 100%)",
    opacity: 1,
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
    width: 32, height: 32,
    background: "linear-gradient(135deg, rgba(236,72,153,0.2), rgba(244,63,94,0.12))",
    border: "1px solid rgba(236,72,153,0.3)",
    borderRadius: 10,
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 0 16px rgba(236,72,153,0.2)",
  },
  logoIcon: { width: 15, height: 15, color: "#ec4899" },
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
    display: "flex", alignItems: "flex-start", gap: 13, padding: "16px 15px",
    background: "#ffffff",
    border: "1px solid rgba(236,72,153,0.14)",
    borderRadius: 18, color: "inherit", textAlign: "left",
    transition: "background 0.25s, border-color 0.25s, transform 0.18s, box-shadow 0.25s",
    width: "100%",
    position: "relative",
    overflow: "hidden",
    boxShadow: "0 2px 12px rgba(236,72,153,0.08)",
  },
  featureIconWrap: {
    flexShrink: 0, width: 46, height: 46, borderRadius: 14,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  featureIconSvg: { width: 21, height: 21 },
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
    padding: "12px 14px",
    background: "linear-gradient(135deg, rgba(236,72,153,0.07) 0%, rgba(244,63,94,0.05) 100%)",
    border: "1px solid rgba(236,72,153,0.2)",
    borderRadius: 14,
    gap: 10,
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
