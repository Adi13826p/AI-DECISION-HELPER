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
  sourcePlatforms: string[];
  truthScore: number;
  scoreLabel: string;
  truthSummary: string;
  loves: { text: string; source: string }[];
  hates: { text: string; source: string }[];
  hiddenInsights: {
    type: 'warning' | 'positive' | 'neutral';
    text: string;
    source: string;
  }[];
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
    image: '',
    model: 'WH-1000XM5/B',
    store: 'amazon.com',
  },
  analysisStats: {
    reviewsAnalyzed: 12847,
    sourcesScanned: 5,
    dataPoints: 38204,
    timeTaken: '2.3s',
  },
  sourcePlatforms: ['Reddit', 'YouTube', 'Quora', 'Amazon', 'Google'],
  truthScore: 82,
  scoreLabel: 'Recommended',
  truthSummary:
    "Expert consensus strongly favors this product. Best-in-class ANC, 30-hour battery, and consistent praise across Reddit and YouTube reviews. Hinge fragility is a known long-term concern — not a dealbreaker at this price.",
  loves: [
    { text: 'Best-in-class noise cancellation under $400', source: 'Reddit' },
    { text: '30-hour battery — top of the entire category', source: 'YouTube' },
    { text: 'AI voice isolation on calls, rated highly', source: 'Amazon' },
    { text: 'Premium comfort for 8+ hour sessions', source: 'Quora' },
    { text: 'Companion app with customizable EQ', source: 'Google' },
  ],
  hates: [
    { text: 'Non-foldable — harder to pack vs XM4', source: 'Reddit' },
    { text: 'Hinge fragility reported after 12+ months', source: 'YouTube' },
    { text: 'Ear pads retain heat in warm climates', source: 'Amazon' },
    { text: 'Touch controls occasionally misfire', source: 'Quora' },
  ],
  hiddenInsights: [
    { type: 'warning',  text: 'Hinge fragility increases after 12+ months of daily use — not mentioned in any official review.', source: 'Reddit' },
    { type: 'warning',  text: 'Battery life degrades to ~22h after 18 months of regular use.', source: 'YouTube' },
    { type: 'positive', text: 'Sony warranty support replaces defective units quickly — great post-purchase experience.', source: 'Quora' },
  ],
  competitors: [
    {
      name: 'Bose QuietComfort 45',
      brand: 'Bose',
      price: '$249',
      score: 79,
      badge: '💰 Best Value',
      badgeColor: '#34d399',
      pros: 'More comfortable. Foldable design.',
      cons: 'ANC slightly weaker than XM5.',
      image: '',
    },
    {
      name: 'Apple AirPods Max',
      brand: 'Apple',
      price: '$449',
      score: 85,
      badge: '⭐ Premium Pick',
      badgeColor: '#6c8dfa',
      pros: 'Superior audio. Seamless Apple ecosystem.',
      cons: 'Very expensive. Heavy. No foldable case.',
      image: '',
    },
    {
      name: 'Sony WH-1000XM4',
      brand: 'Sony',
      price: '$198',
      score: 80,
      badge: '🔥 Smart Buy',
      badgeColor: '#fbbf24',
      pros: '92% of XM5 performance at 30% less. Foldable.',
      cons: 'Older chipset. Slightly worse call quality.',
      image: '',
    },
  ],
  verdict: {
    type: 'recommended',
    label: 'Recommended',
    emoji: '🟢',
    reasoning: 'Best-in-class ANC and battery with strong cross-platform consensus. Minor durability concerns exist but do not outweigh the value at this price point.',
  },
};
