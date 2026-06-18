import { Router } from "express";
import Groq from "groq-sdk";

const router = Router();

function getGroq() {
  const apiKey = process.env["GROQ_API_KEY"];
  if (!apiKey) throw new Error("GROQ_API_KEY not set");
  return new Groq({ apiKey });
}

function extractJSON(text: string): unknown {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) return JSON.parse(jsonMatch[0]);
  throw new Error("No JSON found in response");
}

async function fetchUrlContent(url: string): Promise<{ text: string; title: string }> {
  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(9000),
    });
    if (!resp.ok) return { text: "", title: "" };
    const html = await resp.text();
    const titleMatch = html.match(/<title[^>]*>([^<]{0,200})<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, " ") : "";
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
      .replace(/<header[\s\S]*?<\/header>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "")
      .replace(/<aside[\s\S]*?<\/aside>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, 9000);
    return { text, title };
  } catch {
    return { text: "", title: "" };
  }
}

router.post("/analyze", async (req, res) => {
  try {
    const { productName } = req.body as { productName?: string };
    if (!productName?.trim()) {
      res.status(400).json({ error: "productName is required" });
      return;
    }

    const groq = getGroq();
    const safeProduct = (productName ?? "").replace(/['"]/g, "").replace(/\s+/g, "+");
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are DecisionAI — the world's most comprehensive product intelligence analyst. Your goal is to give the user EVERYTHING they need to make a purchase decision without searching anywhere else. Analyze the product deeply and return ONLY a valid JSON object (no markdown, no code fences) with this EXACT structure:
{
  "product": {
    "name": "full product name",
    "brand": "brand name",
    "price": "typical current market price e.g. $299",
    "priceRange": "price range e.g. $279–$329",
    "rating": "rating out of 5 e.g. 4.3",
    "reviewCount": "approximate review count e.g. 12,847",
    "image": "",
    "model": "model number if known, else empty string",
    "store": "primary retailer e.g. amazon.com",
    "category": "product category e.g. Wireless Headphones"
  },
  "analysisStats": {
    "reviewsAnalyzed": 12000,
    "sourcesScanned": 5,
    "dataPoints": 36000,
    "timeTaken": "2.1s"
  },
  "truthScore": 82,
  "scoreLabel": "Recommended",
  "summary": "4-5 sentence comprehensive verdict. Cover: overall recommendation, what it excels at, main weakness, who it is best for, and whether the price is justified. Be direct — no fluff or marketing language.",
  "keyFacts": [
    { "label": "Price", "value": "$299" },
    { "label": "Battery", "value": "30 hours" },
    { "label": "Connectivity", "value": "Bluetooth 5.3" },
    { "label": "Best For", "value": "Commuters, WFH" },
    { "label": "Rating", "value": "4.3 / 5" },
    { "label": "Released", "value": "2023" }
  ],
  "ratingBreakdown": { "5star": 58, "4star": 24, "3star": 10, "2star": 5, "1star": 3 },
  "sourcePlatforms": ["Reddit", "Amazon", "YouTube", "TechRadar", "Google"],
  "sourceInsights": [
    { "source": "Reddit", "insight": "Specific insight from the Reddit community — what subreddits say, top complaints or praises, any community consensus. Include a subreddit name if relevant.", "searchUrl": "https://www.reddit.com/search/?q=${safeProduct}+review" },
    { "source": "Amazon", "insight": "Amazon reviewer consensus — reference the actual star rating, most helpful review themes (positive and negative), common issues mentioned in 1-star reviews.", "searchUrl": "https://www.amazon.com/s?k=${safeProduct}" },
    { "source": "YouTube", "insight": "What major YouTube tech reviewers say — reference known channel names (MKBHD, Linus Tech Tips, JerryRigEverything, etc.) and their key verdict points.", "searchUrl": "https://www.youtube.com/results?search_query=${safeProduct}+review" },
    { "source": "TechRadar", "insight": "Expert tech publication verdict — include their rating score, headline verdict, and any cons they specifically called out.", "searchUrl": "https://www.google.com/search?q=TechRadar+${safeProduct}+review" },
    { "source": "Google", "insight": "Google Shopping, Q&A forums, and product discussion boards — pricing trends, in-stock availability notes, and buyer sentiment patterns.", "searchUrl": "https://www.google.com/search?q=${safeProduct}+review+2024" }
  ],
  "loves": [
    { "text": "Specific praised feature with a concrete measurable detail", "source": "YouTube" },
    { "text": "Specific praised feature with a concrete measurable detail", "source": "Amazon" },
    { "text": "Specific praised feature with a concrete measurable detail", "source": "Reddit" },
    { "text": "Specific praised feature with a concrete measurable detail", "source": "TechRadar" },
    { "text": "Specific praised feature with a concrete measurable detail", "source": "Google" }
  ],
  "hates": [
    { "text": "Specific criticism with a concrete measurable detail", "source": "Amazon" },
    { "text": "Specific criticism with a concrete measurable detail", "source": "Reddit" },
    { "text": "Specific criticism with a concrete measurable detail", "source": "YouTube" },
    { "text": "Specific criticism with a concrete measurable detail", "source": "TechRadar" }
  ],
  "customerReviews": [
    { "reviewer": "realistic_username_1", "rating": 5, "title": "Specific positive review title", "text": "2-3 sentence realistic review from a power user who uses it daily. Include a specific use case and concrete detail about performance.", "verified": true, "source": "Amazon", "date": "Nov 2024", "helpful": 234 },
    { "reviewer": "realistic_username_2", "rating": 4, "title": "Mostly positive review with one gripe", "text": "2-3 sentence review that loves most things but has one specific complaint. The complaint should be concrete and real, not vague.", "verified": true, "source": "Amazon", "date": "Oct 2024", "helpful": 147 },
    { "reviewer": "realistic_username_3", "rating": 5, "title": "Expert or enthusiast perspective title", "text": "2-3 sentence review from a tech-savvy user or enthusiast who compares to competitors and references specific specs.", "verified": false, "source": "Reddit", "date": "Dec 2024", "helpful": 89 },
    { "reviewer": "realistic_username_4", "rating": 3, "title": "Mixed review — a specific use case where it disappoints", "text": "2-3 sentence review from someone who found a specific scenario where it underperforms. Be specific about the use case and what failed.", "verified": true, "source": "Amazon", "date": "Sep 2024", "helpful": 203 }
  ],
  "whoShouldBuy": [
    "Specific persona 1 — concrete reason this product is perfect for them",
    "Specific persona 2 — concrete reason this product is perfect for them",
    "Specific persona 3 — concrete reason this product is perfect for them",
    "Specific persona 4 — concrete reason this product is perfect for them"
  ],
  "whoShouldSkip": [
    "Specific persona 1 — concrete reason why this product will disappoint them",
    "Specific persona 2 — concrete reason why this product will disappoint them",
    "Specific persona 3 — concrete reason why this product will disappoint them"
  ],
  "hiddenInsights": [
    { "type": "warning",  "text": "A specific hidden concern most buyers miss — something not in marketing materials or specs. Must be concrete and actionable.", "source": "Reddit" },
    { "type": "positive", "text": "A specific hidden advantage most buyers overlook. Must be concrete and verifiable.", "source": "YouTube" },
    { "type": "neutral",  "text": "An important nuance buyers should know before purchasing — not positive or negative, just important context.", "source": "Amazon" }
  ],
  "alternatives": [
    { "name": "Best Value Alternative Name", "brand": "Brand", "price": "$X", "why": "Specific advantage over main product — what you get and what you give up", "badge": "💰 Best Value", "amazonUrl": "https://www.amazon.com/s?k=Best+Value+Alternative+Name", "googleUrl": "https://www.google.com/search?q=buy+Best+Value+Alternative+Name" },
    { "name": "Smart Budget Pick Name", "brand": "Brand", "price": "$X", "why": "Specific advantage over main product — what you get and what you give up", "badge": "🔥 Smart Buy", "amazonUrl": "https://www.amazon.com/s?k=Smart+Budget+Pick+Name", "googleUrl": "https://www.google.com/search?q=buy+Smart+Budget+Pick+Name" },
    { "name": "Premium Alternative Name", "brand": "Brand", "price": "$X", "why": "Who should spend more and exactly what extra you get for it", "badge": "⭐ Premium", "amazonUrl": "https://www.amazon.com/s?k=Premium+Alternative+Name", "googleUrl": "https://www.google.com/search?q=buy+Premium+Alternative+Name" }
  ],
  "verdict": {
    "type": "recommended",
    "label": "Buy It",
    "emoji": "🟢",
    "reasoning": "2-3 sentence final verdict. Summarize who should buy it and who should skip it. Reference the score and key reasons. Be direct."
  }
}
RULES (follow strictly):
- truthScore: 0–100 integer. Be realistic — most products score 55–85. Perfect 90+ only for best-in-class.
- scoreLabel: "Highly Recommended" | "Recommended" | "Consider" | "Below Average" | "Avoid"
- summary: 4-5 sentences. First = overall verdict. Then: what it excels at (with a specific number/stat). Then: main weakness (concrete, not vague). Then: who it's for. Then: price justification.
- loves: exactly 5 items. Each must have a specific measurable detail (e.g. "30-hour battery, tested at 28.5h in real use").
- hates: exactly 4 items. Each must be a specific, verifiable complaint.
- customerReviews: exactly 4 reviews. Make them feel authentic — different personas, different use cases, different ratings. NOT all 5-star.
- ratingBreakdown: realistic star distribution that matches the product's overall rating. All 5 numbers must sum to 100.
- whoShouldBuy: exactly 4 specific personas with concrete reasons.
- whoShouldSkip: exactly 3 specific personas with concrete reasons.
- sourceInsights: 5 platform-specific insights. Reference real reviewer names, subreddits, or publication scores when possible.
- alternatives: exactly 3 real competing products with real Amazon search URLs.
- verdict.type: "recommended" | "consider" | "avoid"
- verdict.label: "Buy It" | "Consider It" | "Skip It"
- All prices must be realistic current market prices. No made-up numbers.
- NEVER use placeholder text like "Specific praised feature" — replace everything with real product facts.`
        },
        {
          role: "user",
          content: `Analyze this product: ${productName}`
        }
      ],
      temperature: 0.4,
      max_tokens: 3000,
    });

    const text = completion.choices[0]?.message?.content ?? "{}";
    const result = extractJSON(text);
    res.json(result);
  } catch (err) {
    console.error("Analyze error:", err);
    res.status(500).json({ error: String(err) });
  }
});

router.post("/smarty", async (req, res) => {
  try {
    const { query } = req.body as { query?: string };
    if (!query?.trim()) {
      res.status(400).json({ error: "query is required" });
      return;
    }

    const groq = getGroq();
    const isYouTube = query.includes("youtube.com") || query.includes("youtu.be");
    const isPDF    = query.toLowerCase().endsWith(".pdf");
    const isArxiv  = query.includes("arxiv.org");
    const isURL    = /^https?:\/\//i.test(query.trim());

    let contentType = "question";
    let sourceLabel = "💬 AI Analysis";
    let sourceColor = "#34d399";
    let userPrompt  = `Answer thoroughly and in detail: ${query}`;

    if (isYouTube) {
      contentType = "youtube";
      sourceLabel = "🎥 YouTube Video";
      sourceColor = "#f87171";
      // Extract video ID for better analysis
      const vidMatch = query.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      const vidId = vidMatch ? vidMatch[1] : "";
      userPrompt  = `Analyze this YouTube video (URL: ${query}${vidId ? `, Video ID: ${vidId}` : ""}). Based on your training knowledge about this specific video or the topic it covers, provide comprehensive structured notes including: the main topic, key points covered, important timestamps/segments if known, main arguments or demonstrations, practical takeaways, who should watch it, and your overall assessment.`;
    } else if (isArxiv) {
      contentType = "research";
      sourceLabel = "🔬 Research Paper";
      sourceColor = "#a374ff";
      const fetched = await fetchUrlContent(query);
      userPrompt = fetched.text.length > 200
        ? `Analyze this research paper. Title: "${fetched.title}". URL: ${query}\n\nContent:\n${fetched.text}`
        : `Analyze this research paper from arxiv: ${query}`;
    } else if (isPDF) {
      contentType = "pdf";
      sourceLabel = "📄 PDF Document";
      sourceColor = "#fbbf24";
      userPrompt  = `Analyze this PDF document at ${query}. Summarize its key contents, findings, and main points.`;
    } else if (isURL) {
      contentType = "article";
      sourceLabel = "🌐 Web Article";
      sourceColor = "#6c8dfa";
      // Actually fetch the URL content for real analysis
      const fetched = await fetchUrlContent(query);
      if (fetched.text.length > 200) {
        userPrompt = `Analyze this web article. Page title: "${fetched.title}". URL: ${query}\n\nExtracted article content:\n${fetched.text}\n\nProvide a thorough analysis of this SPECIFIC article's content above.`;
      } else {
        userPrompt = `Analyze this URL and provide detailed insights based on what you know about this source: ${query}`;
      }
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are Smarty — a world-class AI intelligence layer built into DecisionAI. Your job is to read content and deliver a crisp, insightful breakdown that makes the user feel like they have a brilliant analyst friend in their pocket.

TONE & STYLE RULES (strictly follow these):
- Write like a sharp, knowledgeable friend — not a textbook, not a robot.
- Every sentence must be clear, direct, and easy to understand immediately. No jargon unless you instantly explain it.
- Sound confident and polished. Think: Financial Times meets a trusted friend's WhatsApp message.
- Each point must feel genuinely useful — like something the user couldn't have gotten from a quick skim themselves.
- Never pad. Never repeat the same idea twice. Never write filler phrases like "It is important to note…" or "This highlights the fact that…"
- Points should feel fresh, specific, and a little surprising — give the user something they'll remember.

LENGTH RULE: Each content point = 1 clear, complete sentence. Not too short (no 5-word stubs), not too long (max ~25 words). Hit the sweet spot.

Return ONLY a valid JSON object (no markdown, no code fences, no explanation):
{
  "type": "${contentType}",
  "sourceLabel": "${sourceLabel}",
  "sourceColor": "${sourceColor}",
  "title": "a punchy, descriptive title (max 10 words) — what this content is actually about",
  "sections": [
    {
      "id": "summary",
      "icon": "📝",
      "label": "The Big Picture",
      "content": [
        "One sentence that captures the core message or what this is fundamentally about.",
        "One sentence on who made/wrote this and why it matters — context that frames everything.",
        "One sentence on the single most important fact, finding, or claim in this content.",
        "One sentence on what makes this piece different or worth paying attention to."
      ]
    },
    {
      "id": "takeaways",
      "icon": "🎯",
      "label": "What You Need to Know",
      "content": [
        "The #1 thing to walk away with — the headline insight in plain language.",
        "A specific fact, number, or detail that makes the point concrete and memorable.",
        "A nuance or tension that most readers would miss on a quick skim.",
        "A practical implication — what this means for someone in the real world.",
        "A forward-looking point — what to watch for next or what this signals going forward."
      ]
    },
    {
      "id": "insights",
      "icon": "💡",
      "label": "Deeper Insights",
      "content": [
        "A non-obvious connection or implication that goes one level deeper than the surface content.",
        "What the author is really arguing beneath the headline — the subtext or underlying thesis.",
        "A counterpoint or limitation worth keeping in mind — what this doesn't tell you.",
        "One concrete action or decision this insight should inform for a reader."
      ]
    },
    {
      "id": "facts",
      "icon": "🔢",
      "label": "Facts & Figures",
      "content": [
        "A specific statistic, date, name, or number from the content — stated precisely.",
        "Another key data point with brief context so it lands properly.",
        "A third concrete detail that adds credibility or scale to the story.",
        "One more fact that rounds out the picture — something useful to quote or reference."
      ]
    },
    {
      "id": "conclusion",
      "icon": "✅",
      "label": "The Verdict",
      "content": [
        "A direct, opinionated one-line verdict: is this worth acting on, worth knowing, worth sharing?",
        "Who gets the most value from this content — and why it matters to them specifically.",
        "One final thought that leaves the reader feeling informed, not just summarized."
      ]
    }
  ]
}

IMPORTANT: Replace every placeholder above with real, specific content from the actual input. Never leave generic phrases like 'a specific fact' — always replace with the actual fact from the content.`
        },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.65,
      max_tokens: 3000,
    });

    const text = completion.choices[0]?.message?.content ?? "{}";
    const result = extractJSON(text) as Record<string, unknown>;

    result["type"]        = contentType;
    result["sourceLabel"] = sourceLabel;
    result["sourceColor"] = sourceColor;

    res.json(result);
  } catch (err) {
    console.error("Smarty error:", err);
    res.status(500).json({ error: String(err) });
  }
});

router.post("/translate", async (req, res) => {
  try {
    const { text, targetLanguage } = req.body as { text?: string; targetLanguage?: string };
    if (!text?.trim()) {
      res.status(400).json({ error: "text is required" });
      return;
    }
    const lang = targetLanguage ?? "Spanish";
    const groq = getGroq();

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a professional translator. Translate the given text into ${lang} accurately and naturally. Return ONLY a valid JSON object (no markdown, no code fences) with this exact structure:
{
  "translated": "The complete, accurate translation of the text into ${lang}.",
  "language": "${lang}",
  "detectedLanguage": "the detected source language name",
  "keyPhrases": [
    { "original": "important phrase 1", "translated": "translation 1" },
    { "original": "important phrase 2", "translated": "translation 2" },
    { "original": "important phrase 3", "translated": "translation 3" }
  ],
  "notes": [
    "Brief contextual note about translation choices, tone, or cultural nuances — keep short and helpful."
  ]
}
Rules:
- Translate the full text faithfully and naturally — preserve tone and meaning.
- keyPhrases: pick 3-5 key or interesting phrases from the text and show their translations.
- notes: 1-2 brief observations about the translation (e.g., formality choices, idioms adapted, cultural adaptations). Skip if the text is simple.
- detectedLanguage: identify the source language accurately.`
        },
        { role: "user", content: `Translate this text to ${lang}:\n\n${text}` }
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const result = extractJSON(raw);
    res.json(result);
  } catch (err) {
    console.error("Translate error:", err);
    res.status(500).json({ error: String(err) });
  }
});

router.post("/resume", async (req, res) => {
  try {
    const { profile, jobContext } = req.body as { profile?: string; jobContext?: string };
    const groq = getGroq();

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a professional resume writer and job application expert. Given a user profile and job context, generate auto-fill data for job applications. Return ONLY a valid JSON object (no markdown, no code fences) with this exact structure:
{
  "fields": [
    { "label": "Full Name",            "value": "...", "status": "filled" },
    { "label": "Email Address",        "value": "...", "status": "filled" },
    { "label": "Phone Number",         "value": "...", "status": "filled" },
    { "label": "LinkedIn Profile",     "value": "...", "status": "filled" },
    { "label": "GitHub / Portfolio",   "value": "...", "status": "filled" },
    { "label": "Current Location",     "value": "...", "status": "filled" },
    { "label": "Years of Experience",  "value": "...", "status": "filled" },
    { "label": "Skills Summary",       "value": "...", "status": "filled" },
    { "label": "Highest Qualification","value": "...", "status": "filled" },
    { "label": "Desired Salary",       "value": "—",   "status": "missing" },
    { "label": "Work Authorization",   "value": "...", "status": "filled" }
  ],
  "aiAnswers": [
    { "q": "Tell us about yourself.", "a": "2-3 sentence professional summary tailored to the role." },
    { "q": "Why are you interested in this role?", "a": "2-3 sentence answer tailored to the job context." },
    { "q": "What are your key strengths?", "a": "3-4 key strengths with brief examples." },
    { "q": "Describe a challenge you overcame.", "a": "Brief STAR-format answer relevant to the role." }
  ],
  "coverLetter": "Full professional cover letter tailored to the job. 3-4 paragraphs. Use the user's actual name if provided. End with 'Best regards,\\n[Name]'."
}
Rules:
- Use the user's actual profile data for all fields. If a field has no data, set status to "missing" and value to "—".
- Tailor all AI answers to the job context.
- Cover letter should be warm, professional, and specific to the role.`
        },
        {
          role: "user",
          content: `User Profile:\n${profile || "No profile provided"}\n\nJob Context:\n${jobContext || "General job application"}\n\nGenerate the auto-fill data.`
        }
      ],
      temperature: 0.7,
      max_tokens: 2500,
    });

    const text = completion.choices[0]?.message?.content ?? "{}";
    const result = extractJSON(text);
    res.json(result);
  } catch (err) {
    console.error("Resume error:", err);
    res.status(500).json({ error: String(err) });
  }
});

export default router;
