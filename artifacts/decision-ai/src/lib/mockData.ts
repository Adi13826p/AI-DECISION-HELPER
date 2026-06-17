export interface TruthLayerResult {
  product: {
    name: string; brand: string; price: string; priceRange?: string;
    rating: string; reviewCount: string; image: string; model: string;
    store: string; category?: string;
  };
  analysisStats: { reviewsAnalyzed: number; sourcesScanned: number; dataPoints: number; timeTaken: string; };
  sourcePlatforms: string[];
  truthScore: number;
  scoreLabel: string;
  truthSummary: string;
  summary?: string;
  keyFacts?: { label: string; value: string }[];
  ratingBreakdown?: { "5star": number; "4star": number; "3star": number; "2star": number; "1star": number };
  sourceInsights?: { source: string; insight: string; searchUrl: string }[];
  loves: { text: string; source: string }[];
  hates: { text: string; source: string }[];
  customerReviews?: { reviewer: string; rating: number; title: string; text: string; verified: boolean; source: string; date: string; helpful: number }[];
  whoShouldBuy?: string[];
  whoShouldSkip?: string[];
  hiddenInsights: { type: 'warning' | 'positive' | 'neutral'; text: string; source: string }[];
  alternatives?: { name: string; brand: string; price: string; why: string; badge: string; badgeColor?: string; amazonUrl: string; googleUrl: string }[];
  competitors: { name: string; brand: string; price: string; score: number; badge: string; badgeColor: string; pros: string; cons: string; image: string }[];
  verdict: { type: 'recommended' | 'consider' | 'avoid'; label: string; emoji: string; reasoning: string };
}

export const MOCK_RESULT: TruthLayerResult = {
  product: { name: 'Sony WH-1000XM5 Wireless Headphones', brand: 'Sony', price: '$279.99', priceRange: '$249–$329', rating: '4.4', reviewCount: '12,847', image: '', model: 'WH-1000XM5/B', store: 'amazon.com', category: 'Wireless Headphones' },
  analysisStats: { reviewsAnalyzed: 12847, sourcesScanned: 5, dataPoints: 38204, timeTaken: '2.3s' },
  sourcePlatforms: ['Reddit', 'Amazon', 'YouTube', 'TechRadar', 'Google'],
  truthScore: 82,
  scoreLabel: 'Recommended',
  truthSummary: "Best-in-class ANC at this price. 30-hour battery, excellent call quality, top marks across Reddit and YouTube. Main concerns: non-foldable design for travel and reported hinge fragility after 12+ months. If ANC is your priority, this is the best choice under $350.",
  summary: "Best-in-class ANC at this price. 30-hour battery, excellent call quality, top marks across Reddit and YouTube. Main concerns: non-foldable design for travel and reported hinge fragility after 12+ months. If ANC is your priority, this is the best choice under $350.",
  keyFacts: [
    { label: "Price", value: "$279" }, { label: "Battery", value: "30 hours" },
    { label: "Bluetooth", value: "5.2" }, { label: "Best For", value: "Commuters, WFH" },
    { label: "Rating", value: "4.4 / 5" }, { label: "Weight", value: "250g" },
  ],
  ratingBreakdown: { "5star": 58, "4star": 24, "3star": 10, "2star": 5, "1star": 3 },
  sourceInsights: [
    { source: "Reddit", insight: "r/headphones calls it the #1 ANC headphone under $400. Top complaint: hinge fragility after 12+ months of daily use.", searchUrl: "https://www.reddit.com/search/?q=Sony+WH-1000XM5+review" },
    { source: "Amazon", insight: "4.4/5 from 12K+ reviews. Most praised: ANC blocks airplane noise completely. Most cited issue: ear pads retain heat.", searchUrl: "https://www.amazon.com/s?k=Sony+WH-1000XM5" },
    { source: "YouTube", insight: "MKBHD and Linus Tech Tips both rank it #1 for ANC. Balanced sound signature praised by all major reviewers.", searchUrl: "https://www.youtube.com/results?search_query=Sony+WH-1000XM5+review" },
    { source: "TechRadar", insight: "4.5/5 — 'Best noise cancelling headphones for most people.' Flagged lack of full foldability as a travel con.", searchUrl: "https://www.google.com/search?q=TechRadar+Sony+WH-1000XM5+review" },
  ],
  loves: [
    { text: "Industry-leading ANC — blocks 95%+ of ambient noise", source: "YouTube" },
    { text: "30-hour battery with 3-min quick charge (3 hours playback)", source: "Amazon" },
    { text: "AI voice isolation makes calls clearer in loud environments", source: "Reddit" },
    { text: "Comfortable ear cushions for 8+ hour sessions", source: "Quora" },
    { text: "Companion app with EQ, adaptive sound, multipoint Bluetooth", source: "Google" },
  ],
  hates: [
    { text: "Doesn't fold flat — bulkier to travel with vs XM4", source: "Amazon" },
    { text: "Hinge fragility reported after 12+ months of heavy use", source: "Reddit" },
    { text: "Ear pads retain heat in warm environments", source: "Amazon" },
    { text: "Touch controls occasionally misfire mid-session", source: "Quora" },
  ],
  customerReviews: [
    { reviewer: "DailyCommuter_NYC", rating: 5, title: "Changed my daily commute completely", text: "I ride the subway 90 minutes daily. The ANC is so good I can hold a conversation in my head without shouting. Battery hasn't died on me in two weeks of heavy use. Worth every penny.", verified: true, source: "Amazon", date: "Nov 2024", helpful: 312 },
    { reviewer: "TechMom_Sandra", rating: 4, title: "Great sound, but runs warm after 2 hours", text: "Love everything about these — sound quality is amazing, app is intuitive, and they pair instantly. My only real issue is the ear pads get uncomfortably warm after 2+ hours. Taking off one star for that.", verified: true, source: "Amazon", date: "Oct 2024", helpful: 147 },
    { reviewer: "AudiophileJay", rating: 5, title: "Best ANC money can buy under $400", text: "Tested against QC45 and AirPods Max. The Sony wins on ANC by a significant margin. Sound signature is neutral and detailed — great for critical listening. Build feels premium too.", verified: false, source: "Reddit", date: "Dec 2024", helpful: 89 },
    { reviewer: "FrequentFlyer_K", rating: 3, title: "Good but the case is a step back", text: "ANC is phenomenal on flights, easily the best I've used. But I miss the foldable design from the XM4 — the case is now bigger and less convenient for carry-on bags. Downgrade in travel usability.", verified: true, source: "Amazon", date: "Sep 2024", helpful: 203 },
  ],
  whoShouldBuy: [
    "Daily commuters — ANC on subways, buses, and trains is genuinely life-changing",
    "Work-from-home professionals — call quality and mic noise isolation is among the best",
    "Frequent flyers — ANC blocks cabin noise completely, battery lasts full long-haul flights",
    "Music lovers who want detailed sound — neutral, studio-accurate audio signature",
  ],
  whoShouldSkip: [
    "Travelers needing compact gear — doesn't fold flat, case is larger than competitors",
    "Budget buyers — the Sony XM4 gives 90% of the performance at 30% lower price",
    "Gamers — no low-latency mode makes it unsuitable for competitive gaming",
    "Buyers with long-term durability concerns — hinge issues reported after 12+ months",
  ],
  hiddenInsights: [
    { type: 'warning', text: 'Battery degrades to ~22h after 18 months of regular use — not disclosed in official specs.', source: 'Reddit' },
    { type: 'positive', text: 'Sony warranty support replaces defective units quickly — strong post-purchase track record.', source: 'Quora' },
  ],
  alternatives: [
    { name: "Bose QuietComfort 45", brand: "Bose", price: "$229", why: "More comfortable cushions, foldable for travel, slightly weaker ANC but better ergonomics for all-day wear", badge: "💰 Best Value", amazonUrl: "https://www.amazon.com/s?k=Bose+QuietComfort+45", googleUrl: "https://www.google.com/search?q=buy+Bose+QuietComfort+45" },
    { name: "Sony WH-1000XM4", brand: "Sony", price: "$198", why: "92% of XM5 performance at 30% lower price — foldable design, nearly identical ANC, great for budget-conscious buyers", badge: "🔥 Smart Buy", amazonUrl: "https://www.amazon.com/s?k=Sony+WH-1000XM4", googleUrl: "https://www.google.com/search?q=buy+Sony+WH-1000XM4" },
    { name: "Apple AirPods Max", brand: "Apple", price: "$449", why: "Best for Apple ecosystem users — premium materials, spatial audio, seamless iPhone integration but 2x the price", badge: "⭐ Premium", amazonUrl: "https://www.amazon.com/s?k=Apple+AirPods+Max", googleUrl: "https://www.google.com/search?q=buy+Apple+AirPods+Max" },
  ],
  competitors: [],
  verdict: { type: 'recommended', label: 'Buy It', emoji: '🟢', reasoning: "Best-in-class ANC at this price. Unless you need foldability for travel or you're already in the Apple ecosystem, this is the best headphone under $350." },
};
