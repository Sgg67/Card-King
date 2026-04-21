import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import CollectionView from '../components/common/CollectionView';

// Mock expo-router
const mockPush = jest.fn();
jest.mock('expo-router', () => {
  const push = (...args) => mockPush(...args);
  return {
    __esModule: true,
    router: { push },
    useRouter: () => ({ push }),
  };
});

// Mock @react-navigation/native
// useFocusEffect wraps useEffect internally, so we replicate that
jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return {
    useFocusEffect: (cb) => {
      useEffect(() => {
        const cleanup = cb();
        return typeof cleanup === 'function' ? cleanup : undefined;
      }, []);
    },
  };
});

// Mock react-native-gesture-handler
// Replace TapGestureHandler with a simple View that exposes onDoubleTap via testID
jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  return {
    GestureHandlerRootView: ({ children }) => children,
    TapGestureHandler: ({ children, onHandlerStateChange, numberOfTaps }) => {
      // Wrap children so we can simulate the double tap
      // State 5 = END state in gesture handler
      return (
        <View
          testID={numberOfTaps === 2 ? 'double-tap-handler' : 'tap-handler'}
          onTouchEnd={() => {
            if (numberOfTaps === 2 && onHandlerStateChange) {
              onHandlerStateChange({ nativeEvent: { state: 5 } });
            }
          }}
        >
          {children}
        </View>
      );
    },
  };
});

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
}));

// Mock react-native-event-listeners
jest.mock('react-native-event-listeners', () => ({
  EventRegister: {
    addEventListener: jest.fn(() => 'listener-id'),
    removeEventListener: jest.fn(),
  },
}));

// Mock icons
jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
  AntDesign: 'AntDesign',
}));

// Mock GetCardsFromDB
const mockGetCardsFromDB = jest.fn();
jest.mock('../components/services/GetCardsFromDB', () => ({
  getCardsFromDB: (...args) => mockGetCardsFromDB(...args),
}));

// Mock DeleteFromCollection
const mockDeleteFromCollection = jest.fn();
jest.mock('../components/services/DeleteFromCollection', () => ({
  DeleteFromCollection: (...args) => mockDeleteFromCollection(...args),
}));

// Spy on Alert
jest.spyOn(Alert, 'alert');

// Sample card data
const sportsCards = [
  {
    id: 'card-1',
    player: 'Mike Trout',
    year: '2023',
    manufacturer: 'Topps',
    card_number: '150',
    image: 'https://firebase.storage/trout.jpg',
    price: 25.50,
    grade: null,
    cardType: 'sports',
    addedAt: '2026-03-01T00:00:00.000Z',
  },
  {
    id: 'card-2',
    player: 'Shohei Ohtani',
    year: '2022',
    manufacturer: 'Panini',
    card_number: '200',
    image: 'https://firebase.storage/ohtani.jpg',
    price: 45.00,
    grade: 9.5,
    cardType: 'sports',
    addedAt: '2026-02-15T00:00:00.000Z',
  },
];

const pokemonCards = [
  {
    id: 'card-3',
    character: 'Charizard',
    year: '1999',
    manufacturer: 'Pokémon',
    image: 'https://firebase.storage/charizard.jpg',
    price: 40.00,
    grade: null,
    cardType: 'pokemon',
    addedAt: '2026-03-10T00:00:00.000Z',
  },
];

const mixedCards = [...sportsCards, ...pokemonCards];

beforeEach(() => {
  jest.clearAllMocks();
  mockDeleteFromCollection.mockResolvedValue(true);
});

// ====================================================================
//  UI TESTS — Collection Display
// ====================================================================

describe('Collection View - UI Tests', () => {
  test('shows loading spinner initially', () => {
    mockGetCardsFromDB.mockReturnValue(new Promise(() => {})); // never resolves
    render(<CollectionView />);
    expect(screen.UNSAFE_getByType(require('react-native').ActivityIndicator)).toBeTruthy();
  });

  test('displays empty state when no cards in collection', async () => {
    mockGetCardsFromDB.mockResolvedValue([]);
    render(<CollectionView />);

    await waitFor(() => {
      expect(screen.getByText('No cards in your collection yet.')).toBeTruthy();
    });
  });

  test('displays "Scan Your First Card" button when collection is empty', async () => {
    mockGetCardsFromDB.mockResolvedValue([]);
    render(<CollectionView />);

    await waitFor(() => {
      expect(screen.getByText('Scan Your First Card')).toBeTruthy();
    });
  });

  test('displays sports card player name', async () => {
    mockGetCardsFromDB.mockResolvedValue(sportsCards);
    render(<CollectionView />);

    await waitFor(() => {
      expect(screen.getByText('Mike Trout')).toBeTruthy();
      expect(screen.getByText('Shohei Ohtani')).toBeTruthy();
    });
  });

  test('displays card year', async () => {
    mockGetCardsFromDB.mockResolvedValue(sportsCards);
    render(<CollectionView />);

    await waitFor(() => {
      expect(screen.getByText('2023')).toBeTruthy();
      expect(screen.getByText('2022')).toBeTruthy();
    });
  });

  test('displays card manufacturer', async () => {
    mockGetCardsFromDB.mockResolvedValue(sportsCards);
    render(<CollectionView />);

    await waitFor(() => {
      expect(screen.getByText('Topps')).toBeTruthy();
      expect(screen.getByText('Panini')).toBeTruthy();
    });
  });

  test('displays card number for sports cards', async () => {
    mockGetCardsFromDB.mockResolvedValue(sportsCards);
    render(<CollectionView />);

    await waitFor(() => {
      expect(screen.getByText('#150')).toBeTruthy();
      expect(screen.getByText('#200')).toBeTruthy();
    });
  });

  test('displays card price', async () => {
    mockGetCardsFromDB.mockResolvedValue(sportsCards);
    render(<CollectionView />);

    await waitFor(() => {
      expect(screen.getByText('$25.50')).toBeTruthy();
      expect(screen.getByText('$45.00')).toBeTruthy();
    });
  });

  test('displays card grade when available', async () => {
    mockGetCardsFromDB.mockResolvedValue(sportsCards);
    render(<CollectionView />);

    await waitFor(() => {
      expect(screen.getByText('Grade: 9.5')).toBeTruthy();
    });
  });

  test('displays Pokémon card character name', async () => {
    mockGetCardsFromDB.mockResolvedValue(pokemonCards);
    render(<CollectionView />);

    await waitFor(() => {
      expect(screen.getByText('Charizard')).toBeTruthy();
    });
  });

  test('displays POKÉMON type badge for Pokémon cards', async () => {
    mockGetCardsFromDB.mockResolvedValue(pokemonCards);
    render(<CollectionView />);

    await waitFor(() => {
      expect(screen.getByText('POKÉMON')).toBeTruthy();
    });
  });

  test('displays SPORTS type badge for sports cards', async () => {
    mockGetCardsFromDB.mockResolvedValue(sportsCards);
    render(<CollectionView />);

    await waitFor(() => {
      const badges = screen.getAllByText('SPORTS');
      expect(badges.length).toBe(2);
    });
  });

  test('displays all cards in a mixed collection', async () => {
    mockGetCardsFromDB.mockResolvedValue(mixedCards);
    render(<CollectionView />);

    await waitFor(() => {
      expect(screen.getByText('Mike Trout')).toBeTruthy();
      expect(screen.getByText('Shohei Ohtani')).toBeTruthy();
      expect(screen.getByText('Charizard')).toBeTruthy();
    });
  });

  test('displays "double tap to delete" hint on each card', async () => {
    mockGetCardsFromDB.mockResolvedValue([sportsCards[0]]);
    render(<CollectionView />);

    await waitFor(() => {
      expect(screen.getByText('Double tap to delete')).toBeTruthy();
    });
  });

  test('displays Home button', async () => {
    mockGetCardsFromDB.mockResolvedValue([]);
    render(<CollectionView />);

    await waitFor(() => {
      expect(screen.getByText('Home')).toBeTruthy();
    });
  });
});

// ====================================================================
//  FUNCTIONAL TESTS — Delete and Navigation
// ====================================================================

describe('Collection View - Functional Tests', () => {

  // Double tap opens delete modal

  test('shows delete modal on double tap', async () => {
    mockGetCardsFromDB.mockResolvedValue([sportsCards[0]]);
    render(<CollectionView />);

    await waitFor(() => {
      expect(screen.getByText('Mike Trout')).toBeTruthy();
    });

    // Simulate double tap via our mock's onTouchEnd
    const doubleTapHandlers = screen.getAllByTestId('double-tap-handler');
    fireEvent(doubleTapHandlers[0], 'touchEnd');

    await waitFor(() => {
      expect(screen.getByText('Delete Card')).toBeTruthy();
      expect(screen.getByText(/Are you sure you want to delete/)).toBeTruthy();
    });
  });

  test('delete modal shows selected card name', async () => {
    mockGetCardsFromDB.mockResolvedValue([sportsCards[0]]);
    render(<CollectionView />);

    await waitFor(() => {
      expect(screen.getByText('Mike Trout')).toBeTruthy();
    });

    const doubleTapHandlers = screen.getAllByTestId('double-tap-handler');
    fireEvent(doubleTapHandlers[0], 'touchEnd');

    await waitFor(() => {
      // The modal message includes the player name in bold
      const allMikeTrout = screen.getAllByText('Mike Trout');
      // Should appear both in card list and in modal
      expect(allMikeTrout.length).toBeGreaterThanOrEqual(2);
    });
  });

  test('delete modal has Cancel and Delete buttons', async () => {
    mockGetCardsFromDB.mockResolvedValue([sportsCards[0]]);
    render(<CollectionView />);

    await waitFor(() => {
      expect(screen.getByText('Mike Trout')).toBeTruthy();
    });

    const doubleTapHandlers = screen.getAllByTestId('double-tap-handler');
    fireEvent(doubleTapHandlers[0], 'touchEnd');

    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeTruthy();
      expect(screen.getByText('Delete')).toBeTruthy();
    });
  });

  // Cancel closes modal

  test('closes delete modal when Cancel is pressed', async () => {
    mockGetCardsFromDB.mockResolvedValue([sportsCards[0]]);
    render(<CollectionView />);

    await waitFor(() => {
      expect(screen.getByText('Mike Trout')).toBeTruthy();
    });

    const doubleTapHandlers = screen.getAllByTestId('double-tap-handler');
    fireEvent(doubleTapHandlers[0], 'touchEnd');

    await waitFor(() => {
      expect(screen.getByText('Delete Card')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(screen.queryByText('Delete Card')).toBeNull();
    });
  });

  // Delete calls Firebase and refreshes list

  test('calls DeleteFromCollection when Delete is pressed', async () => {
    mockGetCardsFromDB.mockResolvedValue([sportsCards[0]]);
    render(<CollectionView />);

    await waitFor(() => {
      expect(screen.getByText('Mike Trout')).toBeTruthy();
    });

    const doubleTapHandlers = screen.getAllByTestId('double-tap-handler');
    fireEvent(doubleTapHandlers[0], 'touchEnd');

    await waitFor(() => {
      expect(screen.getByText('Delete')).toBeTruthy();
    });

    // After delete, return empty list
    mockGetCardsFromDB.mockResolvedValue([]);

    await act(async () => {
      fireEvent.press(screen.getByText('Delete'));
    });

    await waitFor(() => {
      expect(mockDeleteFromCollection).toHaveBeenCalledWith('card-1');
    });
  });

  test('refreshes card list after successful delete', async () => {
    mockGetCardsFromDB.mockResolvedValue([sportsCards[0]]);
    render(<CollectionView />);

    await waitFor(() => {
      expect(screen.getByText('Mike Trout')).toBeTruthy();
    });

    const doubleTapHandlers = screen.getAllByTestId('double-tap-handler');
    fireEvent(doubleTapHandlers[0], 'touchEnd');

    await waitFor(() => {
      expect(screen.getByText('Delete')).toBeTruthy();
    });

    // After delete, DB returns empty
    mockGetCardsFromDB.mockResolvedValue([]);

    await act(async () => {
      fireEvent.press(screen.getByText('Delete'));
    });

    await waitFor(() => {
      expect(screen.getByText('No cards in your collection yet.')).toBeTruthy();
    });
  });

  test('closes modal after successful delete', async () => {
    mockGetCardsFromDB.mockResolvedValue([sportsCards[0]]);
    render(<CollectionView />);

    await waitFor(() => {
      expect(screen.getByText('Mike Trout')).toBeTruthy();
    });

    const doubleTapHandlers = screen.getAllByTestId('double-tap-handler');
    fireEvent(doubleTapHandlers[0], 'touchEnd');

    await waitFor(() => {
      expect(screen.getByText('Delete Card')).toBeTruthy();
    });

    mockGetCardsFromDB.mockResolvedValue([]);

    await act(async () => {
      fireEvent.press(screen.getByText('Delete'));
    });

    await waitFor(() => {
      expect(screen.queryByText('Delete Card')).toBeNull();
    });
  });

  // Empty state navigation

  test('navigates to /scan when "Scan Your First Card" is pressed', async () => {
    mockGetCardsFromDB.mockResolvedValue([]);
    render(<CollectionView />);

    await waitFor(() => {
      expect(screen.getByText('Scan Your First Card')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Scan Your First Card'));
    expect(mockPush).toHaveBeenCalledWith('/scan');
  });

  // Home button

  test('navigates to /scanner when Home is pressed', async () => {
    mockGetCardsFromDB.mockResolvedValue([]);
    render(<CollectionView />);

    await waitFor(() => {
      expect(screen.getByText('Home')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Home'));
    expect(mockPush).toHaveBeenCalledWith('/scanner');
  });

  // Cards load from Firebase on mount

  test('calls getCardsFromDB on mount', async () => {
    mockGetCardsFromDB.mockResolvedValue([]);
    render(<CollectionView />);

    await waitFor(() => {
      expect(mockGetCardsFromDB).toHaveBeenCalled();
    });
  });
});