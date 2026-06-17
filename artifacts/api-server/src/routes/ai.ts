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

router.post("/analyze", async (req, res) => {
  try {
    const { productName } = req.body as { productName?: string };
    if (!productName?.trim()) {
      res.status(400).json({ error: "productName is required" });
      return;
    }

    const groq = getGroq();
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are DecisionAI, a professional product intelligence analyst. Analyze the given product and return ONLY a valid JSON object (no markdown, no explanation, no code fences) with this exact structure:
{
  "product": {
    "name": "full product name",
    "brand": "brand name",
    "price": "typical current market price like $299.99",
    "rating": "rating out of 5 like 4.3",
    "reviewCount": "approximate review count like 8,423",
    "image": "",
    "model": "model number if known, else empty string",
    "store": "primary store like amazon.com"
  },
  "analysisStats": {
    "reviewsAnalyzed": 5000,
    "sourcesScanned": 4,
    "dataPoints": 15000,
    "timeTaken": "2.1s"
  },
  "truthScore": 78,
  "scoreLabel": "Recommended",
  "truthSummary": "2-3 sentence professional cross-platform verdict. Concise and direct.",
  "sourcePlatforms": ["Reddit", "YouTube", "Quora", "Amazon", "Google"],
  "loves": [
    { "text": "top praised feature 1", "source": "Reddit" },
    { "text": "top praised feature 2", "source": "YouTube" },
    { "text": "top praised feature 3", "source": "Amazon" },
    { "text": "top praised feature 4", "source": "Quora" },
    { "text": "top praised feature 5", "source": "Google" }
  ],
  "hates": [
    { "text": "top criticism 1", "source": "Reddit" },
    { "text": "top criticism 2", "source": "YouTube" },
    { "text": "top criticism 3", "source": "Amazon" },
    { "text": "top criticism 4", "source": "Quora" }
  ],
  "hiddenInsights": [
    { "type": "warning",  "text": "a hidden concern most buyers miss — short and direct", "source": "Reddit" },
    { "type": "positive", "text": "a hidden positive most buyers miss — short and direct", "source": "YouTube" },
    { "type": "neutral",  "text": "a neutral insight — short and direct", "source": "Quora" }
  ],
  "competitors": [
    { "name": "Best competing product 1", "brand": "Brand", "price": "$249", "score": 75, "badge": "💰 Best Value", "badgeColor": "#34d399", "pros": "main advantage", "cons": "main disadvantage", "image": "" },
    { "name": "Best competing product 2", "brand": "Brand", "price": "$349", "score": 82, "badge": "⭐ Premium Pick", "badgeColor": "#6c8dfa", "pros": "main advantage", "cons": "main disadvantage", "image": "" },
    { "name": "Best competing product 3", "brand": "Brand", "price": "$199", "score": 70, "badge": "🔥 Smart Buy", "badgeColor": "#fbbf24", "pros": "main advantage", "cons": "main disadvantage", "image": "" }
  ],
  "verdict": {
    "type": "recommended",
    "label": "Recommended",
    "emoji": "🟢",
    "reasoning": "2-sentence honest final verdict. Direct and professional."
  }
}
Rules:
- truthScore: 0–100 integer
- scoreLabel: one of "Highly Recommended" / "Recommended" / "Average" / "Below Average" / "Avoid"
- loves: exactly 5 items, each under 70 characters
- hates: exactly 4 items, each under 70 characters
- verdict.type: one of "recommended" / "consider" / "avoid"
- Use real reviewer/publication names for sources when known`
        },
        {
          role: "user",
          content: `Analyze this product and return the JSON: ${productName}`
        }
      ],
      temperature: 0.5,
      max_tokens: 2500,
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
    const isPDF    = query.toLowerCase().includes(".pdf");
    const isArxiv  = query.includes("arxiv.org");
    const isURL    = query.startsWith("http");

    let contentType = "question";
    let sourceLabel = "💬 Direct Question";
    let sourceColor = "#34d399";
    let userPrompt  = `Answer this question thoroughly: ${query}`;

    if (isYouTube) {
      contentType = "youtube";
      sourceLabel = "🎥 YouTube Video";
      sourceColor = "#f87171";
      userPrompt  = `Analyze this YouTube video URL. Based on your knowledge of this content or similar content, provide detailed insights: ${query}`;
    } else if (isPDF || isArxiv) {
      if (isArxiv) {
        contentType = "research";
        sourceLabel = "🔬 Research Paper";
        sourceColor = "#a374ff";
        userPrompt  = `Analyze this research paper URL: ${query}`;
      } else {
        contentType = "pdf";
        sourceLabel = "📄 PDF Document";
        sourceColor = "#fbbf24";
        userPrompt  = `Analyze this PDF document: ${query}`;
      }
    } else if (isURL) {
      contentType = "article";
      sourceLabel = "🌐 Web Article";
      sourceColor = "#6c8dfa";
      userPrompt  = `Analyze this URL and provide insights about the content: ${query}`;
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are Smarty, an expert AI analyst. Analyze the given input and return ONLY a valid JSON object (no markdown, no code fences, no explanation) with this exact structure:
{
  "type": "${contentType}",
  "sourceLabel": "${sourceLabel}",
  "sourceColor": "${sourceColor}",
  "title": "a clear, descriptive title for this content",
  "sections": [
    { "id": "summary", "icon": "📝", "label": "30-Second Summary", "content": ["point 1", "point 2", "point 3", "point 4"] },
    { "id": "takeaways", "icon": "🎯", "label": "Key Takeaways", "content": ["takeaway 1", "takeaway 2", "takeaway 3", "takeaway 4", "takeaway 5"] },
    { "id": "insights", "icon": "💡", "label": "Actionable Insights", "content": ["insight 1", "insight 2", "insight 3", "insight 4"] },
    { "id": "facts", "icon": "🔢", "label": "Key Facts & Numbers", "content": ["fact 1", "fact 2", "fact 3", "fact 4"] },
    { "id": "conclusion", "icon": "✅", "label": "Final Conclusion", "content": ["conclusion 1", "conclusion 2", "conclusion 3"] }
  ]
}
Each content item must be a detailed, substantive sentence. Minimum 3 items per section.`
        },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2500,
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

export default router;
