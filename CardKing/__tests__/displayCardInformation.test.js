import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';
import ValueCard from '../components/common/ValueCard';

// Mock expo-router
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

// Mock expo-image-manipulator
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn().mockResolvedValue({ uri: 'file:///processed.jpg' }),
  SaveFormat: { JPEG: 'jpeg' },
}));

// Mock RetrieveScans — returns front/back URLs
const mockGetLatestScans = jest.fn();
jest.mock('../components/services/RetrieveScans', () => ({
  getLatestScans: (...args) => mockGetLatestScans(...args),
}));

// Mock AnalyzeCard — returns Google Vision results
const mockAnalyzeCard = jest.fn();
jest.mock('../components/services/AnalyzeCard', () => ({
  AnalyzeCard: (...args) => mockAnalyzeCard(...args),
}));

// Mock ExtractCardInfo
const mockExtractCardInfo = jest.fn();
jest.mock('../components/services/ExtractCardInfo', () => ({
  extractCardInfo: (...args) => mockExtractCardInfo(...args),
}));

// Mock ExtractPokemonCardInfo
const mockExtractPokemonCardInfo = jest.fn();
jest.mock('../components/services/ExtractPokemonCardInfo', () => ({
  extractPokemonCardInfo: (...args) => mockExtractPokemonCardInfo(...args),
}));

// Mock CardLookupService
const mockLookupCard = jest.fn();
const mockBuildQuery = jest.fn();
jest.mock('../components/services/CardLookupService', () => ({
  lookupCardFromWebMatches: (...args) => mockLookupCard(...args),
  buildAccurateSearchQuery: (...args) => mockBuildQuery(...args),
}));

// Mock GetCardPrice
const mockGetCardPrice = jest.fn();
const mockGetPokemonCardPrice = jest.fn();
jest.mock('../components/services/GetCardPrice', () => ({
  getCardPrice: (...args) => mockGetCardPrice(...args),
  getPokemonCardPrice: (...args) => mockGetPokemonCardPrice(...args),
}));

// Mock AddToCollection
const mockAddToCollection = jest.fn();
jest.mock('../components/services/AddToCollection', () => ({
  AddToCollection: (...args) => mockAddToCollection(...args),
}));

// Mock AddToCollectionPokemon
const mockAddToCollectionPokemon = jest.fn();
jest.mock('../components/services/AddToCollectionPokemon', () => ({
  AddToCollectionPokemon: (...args) => mockAddToCollectionPokemon(...args),
}));

// Spy on Alert and Linking
jest.spyOn(Alert, 'alert');
jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

// Default mock data for a sports card
const setupSportsCardMocks = (priceData = null) => {
  mockGetLatestScans.mockResolvedValue({
    frontUrl: 'https://firebase.storage/front.jpg',
    backUrl: 'https://firebase.storage/back.jpg',
  });

  // Vision results with no Pokemon keywords = sports card
  mockAnalyzeCard.mockResolvedValue({
    front: { textAnnotations: [{ description: '2023 Topps Baseball' }] },
    back: { textAnnotations: [{ description: 'Card #150' }] },
  });

  mockExtractCardInfo.mockReturnValue({
    name: 'Mike Trout',
    year: '2023',
    manufacturer: 'Topps',
    cardNumber: '150',
    parallel: null,
    rookie: false,
    autograph: false,
    relic: false,
    webMatches: [],
  });

  mockLookupCard.mockResolvedValue({
    searchQuery: '2023 Topps Mike Trout #150',
    bestGuess: '2023 Topps Mike Trout',
  });

  mockBuildQuery.mockReturnValue('2023 Topps Mike Trout #150');

  mockGetCardPrice.mockResolvedValue(priceData || {
    average: 25.50,
    median: 22.00,
    displayValue: 22.00,
    min: 10.00,
    max: 45.00,
    sampleSize: 30,
    confidence: 85,
    sources: ['ebay'],
  });
};

// Default mock data for a Pokemon card
const setupPokemonCardMocks = (priceData = null) => {
  mockGetLatestScans.mockResolvedValue({
    frontUrl: 'https://firebase.storage/front.jpg',
    backUrl: 'https://firebase.storage/back.jpg',
  });

  mockAnalyzeCard.mockResolvedValue({
    front: {
      textAnnotations: [{ description: 'Charizard HP 150 POKEMON WEAKNESS RESISTANCE' }],
      webDetection: { bestGuessLabels: [{ label: 'Pokemon card' }] },
    },
    back: { textAnnotations: [{ description: 'Nintendo Creatures Game Freak' }] },
  });

  mockExtractPokemonCardInfo.mockReturnValue({
    name: 'Charizard',
    set: 'Base Set',
    year: '1999',
    cardNumber: '4/102',
    parallel: null,
    autograph: false,
    relic: false,
    fullText: 'Charizard HP 150',
    webMatches: [],
  });

  mockLookupCard.mockResolvedValue({
    searchQuery: '1999 Base Set Charizard Pokemon Card',
  });

  mockGetPokemonCardPrice.mockResolvedValue(priceData || {
    average: 45.00,
    median: 40.00,
    displayValue: 40.00,
    min: 20.00,
    max: 80.00,
    sampleSize: 25,
    confidence: 80,
    sources: ['ebay'],
  });
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ====================================================================
//  UI TESTS — Card Information Display
// ====================================================================

describe('Value Card - UI Tests (Sports Card)', () => {
  beforeEach(() => {
    setupSportsCardMocks();
  });

  test('shows loading state initially', () => {
    render(<ValueCard />);
    expect(screen.getByText('Analyzing your card...')).toBeTruthy();
    expect(screen.getByText('This may take a few moments')).toBeTruthy();
  });

  test('displays "Card Details" header for sports cards', async () => {
    render(<ValueCard />);
    await waitFor(() => {
      expect(screen.getByText('Card Details')).toBeTruthy();
    });
  });

  test('displays player name', async () => {
    render(<ValueCard />);
    await waitFor(() => {
      expect(screen.getByText('Mike Trout')).toBeTruthy();
    });
  });

  test('displays year', async () => {
    render(<ValueCard />);
    await waitFor(() => {
      expect(screen.getByText('2023')).toBeTruthy();
    });
  });

  test('displays manufacturer', async () => {
    render(<ValueCard />);
    await waitFor(() => {
      expect(screen.getByText('Topps')).toBeTruthy();
    });
  });

  test('displays card number', async () => {
    render(<ValueCard />);
    await waitFor(() => {
      expect(screen.getByText('150')).toBeTruthy();
    });
  });

  test('displays all info labels', async () => {
    render(<ValueCard />);
    await waitFor(() => {
      expect(screen.getByText('Player')).toBeTruthy();
      expect(screen.getByText('Year')).toBeTruthy();
      expect(screen.getByText('Manufacturer')).toBeTruthy();
      expect(screen.getByText('Card Number')).toBeTruthy();
      expect(screen.getByText('Market Value')).toBeTruthy();
    });
  });

  test('displays "Card Information" section title', async () => {
    render(<ValueCard />);
    await waitFor(() => {
      expect(screen.getByText('Card Information')).toBeTruthy();
    });
  });

  test('displays market price', async () => {
    render(<ValueCard />);
    await waitFor(() => {
      expect(screen.getByText('$22.00')).toBeTruthy();
    });
  });

  test('displays sample size info', async () => {
    render(<ValueCard />);
    await waitFor(() => {
      expect(screen.getByText('Based on 30 recent sales')).toBeTruthy();
    });
  });

  test('displays price range', async () => {
    render(<ValueCard />);
    await waitFor(() => {
      expect(screen.getByText('Range: $10.00 - $45.00')).toBeTruthy();
    });
  });

  test('displays price source', async () => {
    render(<ValueCard />);
    await waitFor(() => {
      expect(screen.getByText('Sources: ebay')).toBeTruthy();
    });
  });

  test('renders "View on eBay" button', async () => {
    render(<ValueCard />);
    await waitFor(() => {
      expect(screen.getByText('View on eBay')).toBeTruthy();
    });
  });

  test('renders "Add to Collection" button', async () => {
    render(<ValueCard />);
    await waitFor(() => {
      expect(screen.getByText('Add to Collection')).toBeTruthy();
    });
  });

  test('renders "Home" button', async () => {
    render(<ValueCard />);
    await waitFor(() => {
      expect(screen.getByText('Home')).toBeTruthy();
    });
  });
});

describe('Value Card - UI Tests (Pokémon Card)', () => {
  beforeEach(() => {
    setupPokemonCardMocks();
  });

  test('displays "Pokémon Card Details" header', async () => {
    render(<ValueCard />);
    await waitFor(() => {
      expect(screen.getByText('Pokémon Card Details')).toBeTruthy();
    });
  });

  test('displays Pokémon type badge', async () => {
    render(<ValueCard />);
    await waitFor(() => {
      // "Pokémon" appears in type badge, info label, and manufacturer
      const matches = screen.getAllByText('Pokémon');
      expect(matches.length).toBeGreaterThanOrEqual(2);
    });
  });

  test('displays Pokémon name', async () => {
    render(<ValueCard />);
    await waitFor(() => {
      expect(screen.getByText('Charizard')).toBeTruthy();
    });
  });

  test('displays set name', async () => {
    render(<ValueCard />);
    await waitFor(() => {
      expect(screen.getByText('Base Set')).toBeTruthy();
    });
  });

  test('displays Pokémon-specific labels', async () => {
    render(<ValueCard />);
    await waitFor(() => {
      // "Pokémon" appears multiple times (badge, label, manufacturer)
      const matches = screen.getAllByText('Pokémon');
      expect(matches.length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText('Set')).toBeTruthy();
    });
  });

  test('displays Pokémon card price', async () => {
    render(<ValueCard />);
    await waitFor(() => {
      expect(screen.getByText('$40.00')).toBeTruthy();
    });
  });
});

describe('Value Card - UI Tests (Price Edge Cases)', () => {
  test('shows "Market price unavailable" when no price data', async () => {
    setupSportsCardMocks({ average: null, median: null });
    render(<ValueCard />);
    await waitFor(() => {
      expect(screen.getByText('Market price unavailable')).toBeTruthy();
    });
  });

  test('shows "Insufficient sales data" when confidence is below 30', async () => {
    setupSportsCardMocks({
      average: 25.00,
      median: 22.00,
      displayValue: 22.00,
      confidence: 20,
      sampleSize: 3,
      sources: ['ebay'],
    });
    render(<ValueCard />);
    await waitFor(() => {
      expect(screen.getByText('Insufficient sales data')).toBeTruthy();
    });
  });

  test('shows "Value varies - check eBay" when price is too high for sports', async () => {
    setupSportsCardMocks({
      average: 600.00,
      median: 550.00,
      displayValue: 550.00,
      confidence: 90,
      sampleSize: 10,
      sources: ['ebay'],
    });
    render(<ValueCard />);
    await waitFor(() => {
      expect(screen.getByText('Value varies - check eBay')).toBeTruthy();
    });
  });
});

// ====================================================================
//  FUNCTIONAL TESTS — Buttons and Actions
// ====================================================================

describe('Value Card - Functional Tests', () => {
  beforeEach(() => {
    setupSportsCardMocks();
  });

  // eBay button

  test('opens eBay URL when "View on eBay" is pressed', async () => {
    render(<ValueCard />);
    await waitFor(() => {
      expect(screen.getByText('View on eBay')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('View on eBay'));

    expect(Linking.openURL).toHaveBeenCalledWith(
      expect.stringContaining('https://www.ebay.com/sch/i.html?_nkw=')
    );
  });

  test('eBay URL contains the card search query', async () => {
    render(<ValueCard />);
    await waitFor(() => {
      expect(screen.getByText('View on eBay')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('View on eBay'));

    const calledUrl = Linking.openURL.mock.calls[0][0];
    expect(calledUrl).toContain(encodeURIComponent('2023 Topps Mike Trout #150'));
  });

  // Add to Collection button (sports)

  test('calls AddToCollection with correct data for sports card', async () => {
    render(<ValueCard />);
    await waitFor(() => {
      expect(screen.getByText('Add to Collection')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Add to Collection'));

    expect(mockAddToCollection).toHaveBeenCalledWith(
      'Mike Trout',           // name
      '2023',                 // year
      'Topps',                // manufacturer
      '150',                  // card number
      'https://firebase.storage/front.jpg', // front image URL
      22.00,                  // price (displayValue)
      null                    // grade
    );
  });

  test('navigates to collection after adding sports card', async () => {
    render(<ValueCard />);
    await waitFor(() => {
      expect(screen.getByText('Add to Collection')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Add to Collection'));

    expect(mockPush).toHaveBeenCalledWith('./collection');
  });

  // Add to Collection button (Pokémon)

  test('calls AddToCollectionPokemon with correct data for Pokémon card', async () => {
    setupPokemonCardMocks();
    render(<ValueCard />);
    await waitFor(() => {
      expect(screen.getByText('Add to Collection')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Add to Collection'));

    expect(mockAddToCollectionPokemon).toHaveBeenCalledWith(
      'Charizard',            // character name
      '1999',                 // year
      'Pokémon',              // manufacturer
      '4/102',                // card number
      'https://firebase.storage/front.jpg', // front image URL
      40.00,                  // price (displayValue)
      null                    // grade
    );
  });

  // Home button

  test('navigates to /scanner when "Home" is pressed', async () => {
    render(<ValueCard />);
    await waitFor(() => {
      expect(screen.getByText('Home')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Home'));

    expect(mockPush).toHaveBeenCalledWith('/scanner');
  });

  // Error handling

  test('shows error when no scan images found', async () => {
    mockGetLatestScans.mockResolvedValue({ frontUrl: null, backUrl: null });
    render(<ValueCard />);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'No card images found. Please scan a card first.'
      );
    });
  });

  test('shows error when card analysis fails', async () => {
    mockGetLatestScans.mockResolvedValue({
      frontUrl: 'https://firebase.storage/front.jpg',
      backUrl: 'https://firebase.storage/back.jpg',
    });
    mockAnalyzeCard.mockRejectedValue(new Error('Vision API failed'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<ValueCard />);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to analyze card images'
      );
    });

    console.error.mockRestore();
  });

  // Fetches correct price service based on card type

  test('calls getCardPrice for sports cards', async () => {
    render(<ValueCard />);
    await waitFor(() => {
      expect(mockGetCardPrice).toHaveBeenCalled();
      expect(mockGetPokemonCardPrice).not.toHaveBeenCalled();
    });
  });

  test('calls getPokemonCardPrice for Pokémon cards', async () => {
    setupPokemonCardMocks();
    render(<ValueCard />);
    await waitFor(() => {
      expect(mockGetPokemonCardPrice).toHaveBeenCalled();
      expect(mockGetCardPrice).not.toHaveBeenCalled();
    });
  });
});