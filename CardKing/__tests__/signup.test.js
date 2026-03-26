import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import SignUpScreen from '../app/signup';
import { replace } from 'expo-router/build/global-state/routing';

// Mock expo-router
const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
}));

// Mock Firebase signUp
const mockSignUp = jest.fn();

jest.mock('../components/config/FireBase', () => ({
  signUp: (...args) => mockSignUp(...args),
}));

// Mock Ionicons (used inside Input component)
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Spy on Alert.alert
jest.spyOn(Alert, 'alert');

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});

// ====================================================================
//  UI TESTS — Verify the signup interface renders correctly
// ====================================================================

describe('Signup Screen - UI Tests', () => {
  test('renders the Card King logo and title', () => {
    render(<SignUpScreen />);
    expect(screen.getByText('CK')).toBeTruthy();
    expect(screen.getByText('Card King')).toBeTruthy();
  });

  test('renders the "Create Your Account" subtitle', () => {
    render(<SignUpScreen />);
    expect(screen.getByText('Create Your Account')).toBeTruthy();
  });

  test('renders the form title and subtitle', () => {
    render(<SignUpScreen />);
    expect(screen.getByText('Sign Up')).toBeTruthy();
    expect(screen.getByText('Join the community')).toBeTruthy();
  });

  test('renders email input with correct placeholder', () => {
    render(<SignUpScreen />);
    expect(screen.getByPlaceholderText('your.email@example.com')).toBeTruthy();
  });

  test('renders password input with correct placeholder', () => {
    render(<SignUpScreen />);
    expect(screen.getByPlaceholderText('Create a password')).toBeTruthy();
  });

  test('renders confirm password input with correct placeholder', () => {
    render(<SignUpScreen />);
    expect(screen.getByPlaceholderText('Confirm your password')).toBeTruthy();
  });

  test('renders all three input labels', () => {
    render(<SignUpScreen />);
    expect(screen.getByText('Email Address')).toBeTruthy();
    expect(screen.getByText('Password')).toBeTruthy();
    expect(screen.getByText('Confirm Password')).toBeTruthy();
  });

  test('renders the Create Account button', () => {
    render(<SignUpScreen />);
    expect(screen.getByText('Create Account')).toBeTruthy();
  });

  test('renders the "Already have an account?" text and Sign In button', () => {
    render(<SignUpScreen />);
    expect(screen.getByText('Already have an account? ')).toBeTruthy();
    expect(screen.getByText('Sign In')).toBeTruthy();
  });

  test('password fields have secureTextEntry enabled', () => {
    render(<SignUpScreen />);
    const passwordInput = screen.getByPlaceholderText('Create a password');
    const confirmInput = screen.getByPlaceholderText('Confirm your password');
    expect(passwordInput.props.secureTextEntry).toBe(true);
    expect(confirmInput.props.secureTextEntry).toBe(true);
  });

  test('email field does not have secureTextEntry', () => {
    render(<SignUpScreen />);
    const emailInput = screen.getByPlaceholderText('your.email@example.com');
    expect(emailInput.props.secureTextEntry).toBeFalsy();
  });

  test('input fields accept and display typed text', () => {
    render(<SignUpScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('your.email@example.com'), 'vi@test.com');
    fireEvent.changeText(screen.getByPlaceholderText('Create a password'), 'mypass123');
    fireEvent.changeText(screen.getByPlaceholderText('Confirm your password'), 'mypass123');

    expect(screen.getByPlaceholderText('your.email@example.com').props.value).toBe('vi@test.com');
    expect(screen.getByPlaceholderText('Create a password').props.value).toBe('mypass123');
    expect(screen.getByPlaceholderText('Confirm your password').props.value).toBe('mypass123');
  });
});

// ====================================================================
//  FUNCTIONAL TESTS — Verify signup logic, validation, and navigation
// ====================================================================

describe('Signup Screen - Functional Tests', () => {

  // Empty field validation

  test('shows error when all fields are empty', () => {
    render(<SignUpScreen />);
    fireEvent.press(screen.getByText('Create Account'));

    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please fill in all fields');
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  test('shows error when only email is filled', () => {
    render(<SignUpScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('your.email@example.com'), 'vi@test.com');
    fireEvent.press(screen.getByText('Create Account'));

    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please fill in all fields');
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  test('shows error when confirm password is empty', () => {
    render(<SignUpScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('your.email@example.com'), 'vi@test.com');
    fireEvent.changeText(screen.getByPlaceholderText('Create a password'), 'pass123');
    fireEvent.press(screen.getByText('Create Account'));

    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please fill in all fields');
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  // Password mismatch validation

  test('shows error when passwords do not match', () => {
    render(<SignUpScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('your.email@example.com'), 'vi@test.com');
    fireEvent.changeText(screen.getByPlaceholderText('Create a password'), 'password1');
    fireEvent.changeText(screen.getByPlaceholderText('Confirm your password'), 'password2');
    fireEvent.press(screen.getByText('Create Account'));

    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Passwords do not match');
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  // Password length validation

  test('shows error when password is less than 6 characters', () => {
    render(<SignUpScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('your.email@example.com'), 'vi@test.com');
    fireEvent.changeText(screen.getByPlaceholderText('Create a password'), '12345');
    fireEvent.changeText(screen.getByPlaceholderText('Confirm your password'), '12345');
    fireEvent.press(screen.getByText('Create Account'));

    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Password must be at least 6 characters');
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  test('accepts password that is exactly 6 characters', async () => {
    mockSignUp.mockResolvedValueOnce({ success: true, user: { uid: '1' } });

    render(<SignUpScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('your.email@example.com'), 'vi@test.com');
    fireEvent.changeText(screen.getByPlaceholderText('Create a password'), '123456');
    fireEvent.changeText(screen.getByPlaceholderText('Confirm your password'), '123456');
    fireEvent.press(screen.getByText('Create Account'));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('vi@test.com', '123456');
    });
  });

  // Successful signup

  test('calls signUp with email and password on valid input', async () => {
    mockSignUp.mockResolvedValueOnce({ success: true, user: { uid: '123' } });

    render(<SignUpScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('your.email@example.com'), 'new@test.com');
    fireEvent.changeText(screen.getByPlaceholderText('Create a password'), 'securepass');
    fireEvent.changeText(screen.getByPlaceholderText('Confirm your password'), 'securepass');
    fireEvent.press(screen.getByText('Create Account'));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('new@test.com', 'securepass');
    });
  });

  test('shows success alert after account creation', async () => {
    mockSignUp.mockResolvedValueOnce({ success: true, user: { uid: '123' } });

    render(<SignUpScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('your.email@example.com'), 'new@test.com');
    fireEvent.changeText(screen.getByPlaceholderText('Create a password'), 'securepass');
    fireEvent.changeText(screen.getByPlaceholderText('Confirm your password'), 'securepass');
    fireEvent.press(screen.getByText('Create Account'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Success', 'Account created successfully!');
    });
  });

  test('redirects to /scanner after successful signup', async () => {
    mockSignUp.mockResolvedValueOnce({ success: true, user: { uid: '123' } });

    render(<SignUpScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('your.email@example.com'), 'new@test.com');
    fireEvent.changeText(screen.getByPlaceholderText('Create a password'), 'securepass');
    fireEvent.changeText(screen.getByPlaceholderText('Confirm your password'), 'securepass');
    fireEvent.press(screen.getByText('Create Account'));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/scanner');
    });
  });

  // Firebase error handling

  test('shows error when email is already registered', async () => {
    mockSignUp.mockResolvedValueOnce({
      success: false,
      userMessage: 'This email is already registered.',
      code: 'auth/email-already-in-use',
    });

    render(<SignUpScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('your.email@example.com'), 'existing@test.com');
    fireEvent.changeText(screen.getByPlaceholderText('Create a password'), 'securepass');
    fireEvent.changeText(screen.getByPlaceholderText('Confirm your password'), 'securepass');
    fireEvent.press(screen.getByText('Create Account'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Sign Up Failed', 'This email is already registered.');
    });
  });

  test('shows error for invalid email format', async () => {
    mockSignUp.mockResolvedValueOnce({
      success: false,
      userMessage: 'Please enter a valid email address.',
      code: 'auth/invalid-email',
    });

    render(<SignUpScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('your.email@example.com'), 'not-an-email');
    fireEvent.changeText(screen.getByPlaceholderText('Create a password'), 'securepass');
    fireEvent.changeText(screen.getByPlaceholderText('Confirm your password'), 'securepass');
    fireEvent.press(screen.getByText('Create Account'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Sign Up Failed', 'Please enter a valid email address.');
    });
  });

  test('shows generic error when signUp returns failure without userMessage', async () => {
    mockSignUp.mockResolvedValueOnce({
      success: false,
      error: 'Something went wrong',
    });

    render(<SignUpScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('your.email@example.com'), 'vi@test.com');
    fireEvent.changeText(screen.getByPlaceholderText('Create a password'), 'securepass');
    fireEvent.changeText(screen.getByPlaceholderText('Confirm your password'), 'securepass');
    fireEvent.press(screen.getByText('Create Account'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Sign Up Failed', 'Something went wrong');
    });
  });

  test('shows fallback error when signUp throws an exception', async () => {
    mockSignUp.mockRejectedValueOnce(new Error('Network error'));

    render(<SignUpScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('your.email@example.com'), 'vi@test.com');
    fireEvent.changeText(screen.getByPlaceholderText('Create a password'), 'securepass');
    fireEvent.changeText(screen.getByPlaceholderText('Confirm your password'), 'securepass');
    fireEvent.press(screen.getByText('Create Account'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Sign Up Failed', 'Network error');
    });
  });

  // Does NOT redirect on failure

  test('does not redirect when signup fails', async () => {
    mockSignUp.mockResolvedValueOnce({
      success: false,
      userMessage: 'This email is already registered.',
    });

    render(<SignUpScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('your.email@example.com'), 'existing@test.com');
    fireEvent.changeText(screen.getByPlaceholderText('Create a password'), 'securepass');
    fireEvent.changeText(screen.getByPlaceholderText('Confirm your password'), 'securepass');
    fireEvent.press(screen.getByText('Create Account'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });

  // Loading state

  test('shows loading spinner and disables button while signing up', async () => {
    // Make signUp hang so we can check the loading state
    let resolveSignUp;
    mockSignUp.mockImplementation(() => new Promise(res => { resolveSignUp = res; }));

    render(<SignUpScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('your.email@example.com'), 'vi@test.com');
    fireEvent.changeText(screen.getByPlaceholderText('Create a password'), 'securepass');
    fireEvent.changeText(screen.getByPlaceholderText('Confirm your password'), 'securepass');
    fireEvent.press(screen.getByText('Create Account'));

    await waitFor(() => {
      // Button component shows ActivityIndicator when loading
      expect(screen.UNSAFE_getByType(require('react-native').ActivityIndicator)).toBeTruthy();
      // The "Create Account" text should no longer be visible
      expect(screen.queryByText('Create Account')).toBeNull();
    });

    // Clean up: resolve the pending promise
    resolveSignUp({ success: true, user: { uid: '1' } });
  });

  // Navigation: Sign In link

  test('navigates to login (index) when Sign In is pressed', () => {
    render(<SignUpScreen />);
    fireEvent.press(screen.getByText('Sign In'));

    expect(mockPush).toHaveBeenCalledWith('/');
  });
});