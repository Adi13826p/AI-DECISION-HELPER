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
  loves: string[];
  hates: string[];
  hiddenInsights: {
    type: 'warning' | 'positive' | 'neutral';
    text: string;
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
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop&auto=format',
    model: 'WH-1000XM5/B',
    store: 'amazon.com',
  },
  analysisStats: {
    reviewsAnalyzed: 12847,
    sourcesScanned: 4,
    dataPoints: 38204,
    timeTaken: '2.3s',
  },
  truthScore: 82,
  scoreLabel: 'Recommended',
  truthSummary:
    "Expert consensus strongly favors this product. Best-in-class ANC, 30-hour battery, and consistent praise across Google and YouTube reviews. Hinge fragility is a known long-term concern — not a dealbreaker at this price.",
  loves: [
    'Best-in-class noise cancellation under $400',
    '30-hour battery — top of category',
    'AI voice isolation on calls, rated highly',
    'Premium comfort for extended wear',
    'Companion app with customizable EQ',
  ],
  hates: [
    'Non-foldable — harder to pack vs XM4',
    'Hinge fragility reported after 12+ months',
    'Ear pads retain heat in warm climates',
    'Touch controls occasionally misfire',
  ],
  hiddenInsights: [
    { type: 'warning',  text: 'Hinge fragility increases after 12+ months of daily use.' },
    { type: 'warning',  text: 'Battery degrades to ~22h after 18 months of regular use.' },
    { type: 'positive', text: 'Sony warranty support replaces defective units quickly.' },
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
      image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=80&h=80&fit=crop&auto=format',
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
      image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=80&h=80&fit=crop&auto=format',
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
      image: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=80&h=80&fit=crop&auto=format',
    },
  ],
  verdict: {
    type: 'recommended',
    label: 'Recommended',
    emoji: '🟢',
    reasoning: 'Best-in-class ANC and battery with strong cross-platform consensus. Minor durability concerns exist but do not outweigh the value at this price point.',
  },
};
