import React from 'react';
import { render, fireEvent, waitFor, screen, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import CardScan from '../components/common/CardScan';

// Mock expo-router
const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

// Mock expo-camera
const mockTakePictureAsync = jest.fn();

jest.mock('expo-camera', () => {
  const React = require('react');
  return {
    CameraView: React.forwardRef((props, ref) => {
      React.useImperativeHandle(ref, () => ({
        takePictureAsync: mockTakePictureAsync,
      }));
      return <>{props.children}</>;
    }),
    useCameraPermissions: () => [
      { granted: true },
      jest.fn(),
    ],
  };
});

// Mock Firebase
jest.mock('../components/config/FireBase', () => ({
  auth: { currentUser: { uid: 'user123', email: 'vi@test.com' } },
  storage: {},
  firestore: {},
}));

// Mock Firebase Storage
const mockUploadBytes = jest.fn().mockResolvedValue({});
const mockGetDownloadURL = jest.fn().mockResolvedValue('https://firebase.storage/image.jpg');

jest.mock('firebase/storage', () => ({
  ref: jest.fn(() => ({})),
  uploadBytes: (...args) => mockUploadBytes(...args),
  getDownloadURL: (...args) => mockGetDownloadURL(...args),
}));

// Mock Firebase Firestore
const mockSetDoc = jest.fn().mockResolvedValue({});
const mockUpdateDoc = jest.fn().mockResolvedValue({});
const mockGetDoc = jest.fn().mockResolvedValue({
  exists: () => true,
  data: () => ({ scans: [], frontScans: [], backScans: [] }),
});

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({})),
  setDoc: (...args) => mockSetDoc(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  getDoc: (...args) => mockGetDoc(...args),
  arrayUnion: jest.fn(val => val),
}));

// Mock AsyncStorage
const mockAsyncGetItem = jest.fn();
const mockAsyncSetItem = jest.fn().mockResolvedValue(undefined);

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: (...args) => mockAsyncGetItem(...args),
  setItem: (...args) => mockAsyncSetItem(...args),
}));

// Mock icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialIcons: 'MaterialIcons',
}));

jest.mock('@expo/vector-icons/AntDesign', () => 'AntDesign');
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');

// Mock XMLHttpRequest for blob conversion
const mockXHR = {
  open: jest.fn(),
  send: jest.fn(),
  responseType: '',
  onload: null,
  onerror: null,
  onabort: null,
  response: { size: 1024, close: jest.fn() },
};

global.XMLHttpRequest = jest.fn(() => mockXHR);

// Spy on Alert
jest.spyOn(Alert, 'alert');

// Reset mocks
beforeEach(() => {
  jest.clearAllMocks();

  // Default: returning user (instructions already seen)
  mockAsyncGetItem.mockResolvedValue('true');

  // XHR auto-resolves onload
  mockXHR.open = jest.fn();
  mockXHR.send = jest.fn(function () {
    if (mockXHR.onload) mockXHR.onload();
  });
  mockXHR.response = { size: 1024, close: jest.fn() };

  // Camera returns a photo
  mockTakePictureAsync.mockResolvedValue({
    uri: 'file:///tmp/photo.jpg',
    width: 1080,
    height: 1920,
  });

  // Firebase mocks reset to success defaults
  mockUploadBytes.mockResolvedValue({});
  mockGetDownloadURL.mockResolvedValue('https://firebase.storage/image.jpg');
  mockGetDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({ scans: [], frontScans: [], backScans: [] }),
  });
  mockUpdateDoc.mockResolvedValue({});
  mockSetDoc.mockResolvedValue({});
});

// Helper: press the capture button via testID
// NOTE: Muse have testID="capture-button" to the capture
// TouchableOpacity in CardScan.jsx for this to work.
const pressCaptureButton = () => {
  fireEvent.press(screen.getByTestId('capture-button'));
};

// ====================================================================
//  UI TESTS — Camera Scanner Interface
// ====================================================================
describe('Card Scan - UI Tests', () => {
  test('renders the camera view with scan guide', () => {
    render(<CardScan />);
    expect(screen.getByText('Scan Front Side')).toBeTruthy();
  });

  test('renders front/back status indicators', () => {
    render(<CardScan />);
    expect(screen.getByText('Front')).toBeTruthy();
    expect(screen.getByText('Back')).toBeTruthy();
  });

  test('renders Reset button', () => {
    render(<CardScan />);
    expect(screen.getByText('Reset')).toBeTruthy();
  });

  test('renders Flip button', () => {
    render(<CardScan />);
    expect(screen.getByText('Flip')).toBeTruthy();
  });

  test('renders capture button', () => {
    render(<CardScan />);
    expect(screen.getByTestId('capture-button')).toBeTruthy();
  });

  test('shows "Scan Front Side" guide text initially', () => {
    render(<CardScan />);
    expect(screen.getByText('Scan Front Side')).toBeTruthy();
  });

  test('does not show "Value Card" button initially', () => {
    render(<CardScan />);
    expect(screen.queryByText('Value Card')).toBeNull();
  });

  test('Reset button is disabled when no scan has been taken', () => {
    render(<CardScan />);
    const resetTouchable = screen.getByText('Reset').parent.parent;
    expect(resetTouchable.props.accessibilityState?.disabled).toBe(true);
  });
});

// ====================================================================
//  UI TESTS — Instructions Modal
// ====================================================================
describe('Card Scan - Instructions Modal', () => {
  beforeEach(() => {
    // First-time user: no flag in AsyncStorage
    mockAsyncGetItem.mockResolvedValue(null);
  });

  test('shows instructions modal for first-time users', async () => {
    render(<CardScan />);
    await waitFor(() => {
      expect(screen.getByText('How to Scan')).toBeTruthy();
    });
  });

  test('renders all four instruction steps', async () => {
    render(<CardScan />);
    await waitFor(() => {
      expect(screen.getByText('Place the card inside the rectangle')).toBeTruthy();
      expect(screen.getByText('Ensure good lighting and no glare')).toBeTruthy();
      expect(screen.getByText('Tap the camera button to scan front')).toBeTruthy();
      expect(screen.getByText('Flip the card and scan the back')).toBeTruthy();
    });
  });

  test('renders "Start Scanning" button in instructions', async () => {
    render(<CardScan />);
    await waitFor(() => {
      expect(screen.getByText('Start Scanning')).toBeTruthy();
    });
  });

  test('closes instructions when "Start Scanning" is pressed', async () => {
    render(<CardScan />);
    await waitFor(() => {
      expect(screen.getByText('How to Scan')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Start Scanning'));

    await waitFor(() => {
      expect(screen.queryByText('How to Scan')).toBeNull();
    });
  });

  test('saves preference after dismissing instructions', async () => {
    render(<CardScan />);
    await waitFor(() => {
      expect(screen.getByText('Start Scanning')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Start Scanning'));

    await waitFor(() => {
      expect(mockAsyncSetItem).toHaveBeenCalledWith('hasSeenInstructions', 'true');
    });
  });

  test('does not show instructions for returning users', async () => {
    mockAsyncGetItem.mockResolvedValue('true');

    render(<CardScan />);

    await waitFor(() => {
      expect(screen.getByText('Scan Front Side')).toBeTruthy();
    });

    expect(screen.queryByText('How to Scan')).toBeNull();
  });
});

// ====================================================================
//  FUNCTIONAL TESTS — Scanning Flow
// ====================================================================
describe('Card Scan - Functional Tests', () => {

  // Front scan
  test('takes a picture when capture button is pressed', async () => {
    render(<CardScan />);

    await act(async () => {
      pressCaptureButton();
    });

    await waitFor(() => {
      expect(mockTakePictureAsync).toHaveBeenCalledWith({
        quality: 0.8,
        skipProcessing: false,
        exif: true,
      });
    });
  });

  test('uploads front image to Firebase Storage', async () => {
    render(<CardScan />);

    await act(async () => {
      pressCaptureButton();
    });

    await waitFor(() => {
      expect(mockUploadBytes).toHaveBeenCalled();
      const callArgs = mockUploadBytes.mock.calls[0];
      expect(callArgs[2]).toEqual(
        expect.objectContaining({
          contentType: 'image/jpeg',
          customMetadata: expect.objectContaining({
            userId: 'user123',
            side: 'front',
          }),
        })
      );
    });
  });

  test('saves front scan record to Firestore', async () => {
    render(<CardScan />);

    await act(async () => {
      pressCaptureButton();
    });

    await waitFor(() => {
      expect(mockUpdateDoc).toHaveBeenCalled();
    });
  });

  test('changes guide text to "Scan Back Side" after front scan', async () => {
    render(<CardScan />);

    await act(async () => {
      pressCaptureButton();
    });

    await waitFor(() => {
      expect(screen.getByText('Scan Back Side')).toBeTruthy();
    });
  });

  test('shows success alert after front scan', async () => {
    render(<CardScan />);

    await act(async () => {
      pressCaptureButton();
    });

    await waitFor(() => {
      expect(screen.getByText('Front Scanned!')).toBeTruthy();
    });
  });

  // Back scan
  test('uploads back image after second capture', async () => {
    render(<CardScan />);

    // Front scan
    await act(async () => {
      pressCaptureButton();
    });
    await waitFor(() => expect(screen.getByText('Scan Back Side')).toBeTruthy());

    mockUploadBytes.mockClear();

    // Back scan
    await act(async () => {
      pressCaptureButton();
    });

    await waitFor(() => {
      expect(mockUploadBytes).toHaveBeenCalled();
      const callArgs = mockUploadBytes.mock.calls[0];
      expect(callArgs[2]).toEqual(
        expect.objectContaining({
          customMetadata: expect.objectContaining({
            side: 'back',
          }),
        })
      );
    });
  });

  test('shows "Scan Complete!" after both sides scanned', async () => {
    render(<CardScan />);

    await act(async () => {
      pressCaptureButton();
    });
    await waitFor(() => expect(screen.getByText('Scan Back Side')).toBeTruthy());

    await act(async () => {
      pressCaptureButton();
    });

    await waitFor(() => {
      expect(screen.getByText('Scan Complete!')).toBeTruthy();
    });
  });

  test('shows "Value Card" button after both sides scanned', async () => {
    render(<CardScan />);

    await act(async () => {
      pressCaptureButton();
    });
    await waitFor(() => expect(screen.getByText('Scan Back Side')).toBeTruthy());

    await act(async () => {
      pressCaptureButton();
    });

    await waitFor(() => {
      expect(screen.getByText('Value Card')).toBeTruthy();
    });
  });

  // Value Card navigation
  test('navigates to /card-value when "Value Card" is pressed', async () => {
    render(<CardScan />);

    await act(async () => {
      pressCaptureButton();
    });
    await waitFor(() => expect(screen.getByText('Scan Back Side')).toBeTruthy());

    await act(async () => {
      pressCaptureButton();
    });
    await waitFor(() => expect(screen.getByText('Value Card')).toBeTruthy());

    fireEvent.press(screen.getByText('Value Card'));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/card-value');
    });
  });

  // Reset functionality
  test('resets scan state when Reset is pressed', async () => {
    render(<CardScan />);

    await act(async () => {
      pressCaptureButton();
    });
    await waitFor(() => expect(screen.getByText('Scan Back Side')).toBeTruthy());

    fireEvent.press(screen.getByText('Reset'));

    await waitFor(() => {
      expect(screen.getByText('Scan Front Side')).toBeTruthy();
    });
  });

  test('reset after full scan hides "Value Card" button', async () => {
    render(<CardScan />);

    await act(async () => {
      pressCaptureButton();
    });
    await waitFor(() => expect(screen.getByText('Scan Back Side')).toBeTruthy());

    await act(async () => {
      pressCaptureButton();
    });
    await waitFor(() => expect(screen.getByText('Value Card')).toBeTruthy());

    fireEvent.press(screen.getByText('Reset'));

    await waitFor(() => {
      expect(screen.getByText('Scan Front Side')).toBeTruthy();
      expect(screen.queryByText('Value Card')).toBeNull();
    });
  });

  // Flip camera
  test('Flip button toggles camera facing', () => {
    render(<CardScan />);
    fireEvent.press(screen.getByText('Flip'));
    expect(screen.getByText('Flip')).toBeTruthy();
  });

  // Authentication guard
  test('shows error if user is not authenticated', async () => {
    const FireBase = require('../components/config/FireBase');
    const originalAuth = FireBase.auth;
    FireBase.auth = { currentUser: null };

    render(<CardScan />);

    await act(async () => {
      pressCaptureButton();
    });

    await waitFor(() => {
      expect(screen.getByText('Authentication Required')).toBeTruthy();
    });

    FireBase.auth = originalAuth;
  });

  // Camera error handling
  test('shows error when camera fails to capture', async () => {
    mockTakePictureAsync.mockRejectedValueOnce(new Error('Camera failed'));
    jest.spyOn(console, 'log').mockImplementation(() => {});

    render(<CardScan />);

    await act(async () => {
      pressCaptureButton();
    });

    await waitFor(() => {
      expect(screen.getByText('Camera Error')).toBeTruthy();
    });

    console.log.mockRestore();
  });

  // Upload error handling
  test('shows error when Firebase upload fails', async () => {
    // Make uploadBytes always reject for this test
    mockUploadBytes.mockRejectedValue(new Error('Upload failed'));
    jest.spyOn(console, 'log').mockImplementation(() => {});

    render(<CardScan />);

    await act(async () => {
      pressCaptureButton();
    });

    await waitFor(() => {
      expect(screen.getByText('Upload Error')).toBeTruthy();
    });

    console.log.mockRestore();
  });
});
