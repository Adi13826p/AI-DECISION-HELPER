import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use("/api", router);

app.get("/", (_req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DecisionAI — Chrome Extension</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #0d0010;
      color: #f1e8f5;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
    }
    .card {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(236,72,153,0.2);
      border-radius: 24px;
      padding: 48px 40px;
      max-width: 480px;
      width: 100%;
      text-align: center;
      box-shadow: 0 0 80px rgba(236,72,153,0.08);
    }
    .logo {
      width: 72px; height: 72px;
      border-radius: 18px;
      background: linear-gradient(135deg, #ec4899, #a855f7);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 24px;
      font-size: 36px;
    }
    h1 { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 8px; }
    .version { font-size: 12px; color: rgba(241,232,245,0.4); margin-bottom: 12px; }
    p { font-size: 15px; color: rgba(241,232,245,0.6); line-height: 1.6; margin-bottom: 32px; }
    .download-btn {
      display: inline-flex; align-items: center; gap: 10px;
      background: linear-gradient(135deg, #ec4899, #a855f7);
      color: #fff; font-size: 15px; font-weight: 700;
      padding: 14px 32px; border-radius: 14px;
      text-decoration: none;
      box-shadow: 0 4px 24px rgba(236,72,153,0.35);
      transition: opacity 0.15s, transform 0.15s;
    }
    .download-btn:hover { opacity: 0.9; transform: translateY(-1px); }
    .steps {
      margin-top: 36px;
      text-align: left;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 14px;
      padding: 20px 24px;
    }
    .steps h2 { font-size: 12px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: rgba(241,232,245,0.4); margin-bottom: 14px; }
    .step { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; font-size: 14px; color: rgba(241,232,245,0.7); }
    .step:last-child { margin-bottom: 0; }
    .step-num {
      width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg, #ec4899, #a855f7);
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 800; color: #fff;
    }
    code { background: rgba(255,255,255,0.08); border-radius: 5px; padding: 1px 6px; font-size: 12.5px; color: #f9a8d4; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">🧠</div>
    <h1>DecisionAI</h1>
    <div class="version">Chrome Extension · v1.7.0</div>
    <p>AI-powered browser intelligence. Analyze anything on screen — products, articles, research papers, and more.</p>
    <a class="download-btn" href="/api/extension/download">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 3v13M6 11l6 6 6-6" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 21h18" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg>
      Download Extension (.zip)
    </a>
    <div class="steps">
      <h2>How to install</h2>
      <div class="step"><div class="step-num">1</div><span>Unzip the downloaded file</span></div>
      <div class="step"><div class="step-num">2</div><span>Open Chrome and go to <code>chrome://extensions</code></span></div>
      <div class="step"><div class="step-num">3</div><span>Enable <strong>Developer mode</strong> (top-right toggle)</span></div>
      <div class="step"><div class="step-num">4</div><span>Click <strong>Load unpacked</strong> and select the unzipped folder</span></div>
      <div class="step"><div class="step-num">5</div><span>Click the extension icon and add your Groq API key in ⚙ Settings</span></div>
    </div>
  </div>
</body>
</html>`);
});

export default app;
