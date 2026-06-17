export interface TruthLayerResult {
  product: {
    name: string;
    brand: string;
    price: string;
    rating: string;
    reviewCount: string;
    image: string;
    model: string;
    store: string;
  };
  analysisStats: {
    reviewsAnalyzed: number;
    sourcesScanned: number;
    dataPoints: number;
    timeTaken: string;
  };
  truthScore: number;
  scoreLabel: string;
  truthSummary: string;
  fakeReviewAnalysis: {
    fakePercentage: number;
    realPercentage: number;
    totalAnalyzed: number;
    confidence: number;
    patterns: { label: string; count: number; severity: 'high' | 'medium' | 'low' }[];
    monthlySpike: { month: string; fake: number }[];
  };
  buyTiming: {
    recommendation: 'buy-now' | 'wait';
    confidence: number;
    reason: string;
    priceHistory: { month: string; price: number }[];
    prediction: string;
  };
  loves: string[];
  hates: string[];
  platforms: {
    name: string;
    icon: string;
    sentiment: number;
    label: string;
    summary: string;
    color: string;
  }[];
  hiddenInsights: {
    type: 'warning' | 'positive' | 'neutral';
    text: string;
  }[];
  priceIntel: {
    hasBetterDeal: boolean;
    currentPlatform: string;
    currentPrice: string;
    betterDeal?: {
      platform: string;
      price: string;
      savings: string;
      link: string;
    };
  };
  competitors: {
    name: string;
    brand: string;
    price: string;
    score: number;
    badge: string;
    badgeColor: string;
    pros: string;
    cons: string;
    image: string;
  }[];
  verdict: {
    type: 'recommended' | 'consider' | 'avoid';
    label: string;
    emoji: string;
    reasoning: string;
  };
}

export const MOCK_RESULT: TruthLayerResult = {
  product: {
    name: 'Sony WH-1000XM5 Wireless Noise Canceling Headphones',
    brand: 'Sony',
    price: '$279.99',
    rating: '4.4',
    reviewCount: '12,847',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop&auto=format',
    model: 'WH-1000XM5/B',
    store: 'amazon.com',
  },
  analysisStats: {
    reviewsAnalyzed: 12847,
    sourcesScanned: 5,
    dataPoints: 38204,
    timeTaken: '2.3s',
  },
  truthScore: 82,
  scoreLabel: 'Recommended',
  truthSummary:
    "Although Sony WH-1000XM5 maintains a strong marketplace rating, long-term users across Reddit and YouTube consistently praise its class-leading noise cancellation but flag a known hinge fragility issue. Professional reviewers universally recommend it for commuters and travelers. Battery life concerns after 12+ months appear in 14% of long-term Reddit threads, yet overall value remains strong at this price point.",
  fakeReviewAnalysis: {
    fakePercentage: 18,
    realPercentage: 82,
    totalAnalyzed: 12847,
    confidence: 94,
    patterns: [
      { label: 'Incentivized reviews detected',   count: 847,  severity: 'high'   },
      { label: 'Unverified purchase accounts',    count: 1203, severity: 'high'   },
      { label: 'Repeated phrase clusters',        count: 529,  severity: 'medium' },
      { label: 'Burst posting (same-day flood)',  count: 312,  severity: 'medium' },
      { label: 'Generic 5★ with no detail',       count: 418,  severity: 'low'    },
    ],
    monthlySpike: [
      { month: 'Aug', fake: 12 }, { month: 'Sep', fake: 15 }, { month: 'Oct', fake: 31 },
      { month: 'Nov', fake: 44 }, { month: 'Dec', fake: 28 }, { month: 'Jan', fake: 14 },
    ],
  },
  buyTiming: {
    recommendation: 'buy-now',
    confidence: 78,
    reason: 'Price is near its 6-month low. Holiday discounts have passed and prices are trending back up. Historically prices rise 12–18% between February and April.',
    priceHistory: [
      { month: 'Aug', price: 349 }, { month: 'Sep', price: 329 }, { month: 'Oct', price: 299 },
      { month: 'Nov', price: 249 }, { month: 'Dec', price: 259 }, { month: 'Now', price: 280 },
    ],
    prediction: 'Expected to rise to ~$319 by April. Buy now to save ~$39.',
  },
  loves: [
    'Best-in-class noise cancellation outperforms all rivals under $400',
    'Exceptional 30-hour battery life praised consistently across platforms',
    'Crystal-clear call quality with AI-powered voice isolation',
    'Premium build and comfort for extended wear sessions',
    'Companion app with customizable EQ is highly rated by audiophiles',
  ],
  hates: [
    'Non-foldable design makes it harder to pack vs. previous XM4 model',
    'Ear cup hinge fragility reported in 8% of long-term Reddit posts',
    'Premium price point — cheaper alternatives perform at 90% of its level',
    'Ear pads retain heat during long listening sessions in warm climates',
    'Touch controls occasionally misfire, pausing music unintentionally',
  ],
  platforms: [
    { name: 'Amazon',        icon: '🛒', sentiment: 88, label: 'Very Positive',   summary: '4.4★ avg from 12,847 verified buyers. Dominant praise for ANC and battery.',           color: '#f97316' },
    { name: 'Reddit',        icon: '💬', sentiment: 76, label: 'Mostly Positive', summary: 'r/headphones rates it top ANC pick. Hinge concerns flagged in 2023–2024 threads.',      color: '#ff6a3d' },
    { name: 'Quora',         icon: '❓', sentiment: 79, label: 'Positive',        summary: 'Experts recommend for travel & office. Some suggest XM4 for budget-conscious buyers.',  color: '#e54040' },
    { name: 'Google Reviews',icon: '🔍', sentiment: 85, label: 'Very Positive',   summary: 'Featured in "Best of 2024" by The Verge, Wirecutter & RTINGS. #1 in ANC category.',    color: '#6c8dfa' },
    { name: 'YouTube',       icon: '▶', sentiment: 81, label: 'Positive',        summary: 'Top reviewers (MKBHD, Linus) rate it highly. Build quality concerns noted in 3 videos.', color: '#f43f5e' },
  ],
  hiddenInsights: [
    { type: 'warning',  text: 'Hinge fragility becomes more common after 12+ months of daily use — handle with care when folding.' },
    { type: 'warning',  text: 'Battery capacity reported to degrade to ~22 hours after 18 months in 14% of long-term Reddit threads.' },
    { type: 'positive', text: 'Sony customer service replaces defective units within warranty quickly — strong support reputation.' },
  ],
  priceIntel: {
    hasBetterDeal: true,
    currentPlatform: 'Amazon',
    currentPrice: '$279.99',
    betterDeal: { platform: 'Flipkart', price: '$249.00', savings: '$30.99', link: '#' },
  },
  competitors: [
    {
      name: 'Bose QuietComfort 45',
      brand: 'Bose',
      price: '$249',
      score: 79,
      badge: '💰 Best Value',
      badgeColor: '#34d399',
      pros: 'More comfortable for long sessions. Foldable design.',
      cons: 'ANC slightly weaker than XM5.',
      image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=80&h=80&fit=crop&auto=format',
    },
    {
      name: 'Apple AirPods Max',
      brand: 'Apple',
      price: '$449',
      score: 85,
      badge: '⭐ Premium Pick',
      badgeColor: '#6c8dfa',
      pros: 'Superior audio quality. Seamless Apple ecosystem.',
      cons: 'Very expensive. No foldable case. Heavy.',
      image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=80&h=80&fit=crop&auto=format',
    },
    {
      name: 'Sony WH-1000XM4',
      brand: 'Sony',
      price: '$198',
      score: 80,
      badge: '🔥 Smart Buy',
      badgeColor: '#fbbf24',
      pros: '92% of XM5 performance at 30% less cost. Foldable.',
      cons: 'Older chipset. Slightly worse call quality.',
      image: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=80&h=80&fit=crop&auto=format',
    },
  ],
  verdict: {
    type: 'recommended',
    label: 'Recommended',
    emoji: '🟢',
    reasoning: 'Cross-platform consensus strongly favors this product. Best-in-class ANC, excellent battery, and consistent praise across Amazon, Reddit, Google, and YouTube make it the top pick in its price range. Minor durability concerns exist but do not outweigh the overall value proposition.',
  },
};
