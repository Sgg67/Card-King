import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import LoginForm from '../components/common/LoginForm';

// Mock expo-router
const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
}));

// Mock Firebase functions
const mockSignIn = jest.fn();
const mockSendPasswordResetEmail = jest.fn();

jest.mock('../components/config/FireBase', () => ({
  signIn: (...args) => mockSignIn(...args),
  sendPasswordResetEmail: (...args) => mockSendPasswordResetEmail(...args),
}));

// Mock Ionicons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Spy on Alert
jest.spyOn(Alert, 'alert');

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});

// Helper: opens the reset modal and optionally pre-fills the login email
const openResetModal = (loginEmail = '') => {
  render(<LoginForm onSignUp={jest.fn()} />);

  // If a login email is provided, type it into the login form first
  // so it pre-fills the reset modal
  if (loginEmail) {
    fireEvent.changeText(
      screen.getByPlaceholderText('your.email@example.com'),
      loginEmail
    );
  }

  fireEvent.press(screen.getByText('Forgot Password?'));
};

// ====================================================================
//  UI TESTS — Reset Password Modal
// ====================================================================

describe('Reset Password - UI Tests', () => {
  test('renders "Forgot Password?" link on login form', () => {
    render(<LoginForm onSignUp={jest.fn()} />);
    expect(screen.getByText('Forgot Password?')).toBeTruthy();
  });

  test('opens reset modal when "Forgot Password?" is pressed', () => {
    openResetModal();
    expect(screen.getByText('Reset Password')).toBeTruthy();
    expect(
      screen.getByText('Enter your email and we will send you a link to reset your password.')
    ).toBeTruthy();
  });

  test('renders email input inside the modal', () => {
    openResetModal();
    // There are now two inputs with this placeholder (login + modal),
    // so we get all and check the modal one exists
    const inputs = screen.getAllByPlaceholderText('your.email@example.com');
    expect(inputs.length).toBe(2);
  });

  test('renders "Send Reset Link" button inside the modal', () => {
    openResetModal();
    expect(screen.getByText('Send Reset Link')).toBeTruthy();
  });

  test('renders "Cancel" button inside the modal', () => {
    openResetModal();
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  test('pre-fills modal email with login email if already typed', () => {
    openResetModal('vi@test.com');

    // The modal input should have the pre-filled value
    const inputs = screen.getAllByPlaceholderText('your.email@example.com');
    // Second input is the modal's TextInput
    const modalInput = inputs[1];
    expect(modalInput.props.value).toBe('vi@test.com');
  });

  test('modal email is empty when no login email was typed', () => {
    openResetModal();

    const inputs = screen.getAllByPlaceholderText('your.email@example.com');
    const modalInput = inputs[1];
    expect(modalInput.props.value).toBe('');
  });

  test('closes modal when "Cancel" is pressed', () => {
    openResetModal();
    expect(screen.getByText('Reset Password')).toBeTruthy();

    fireEvent.press(screen.getByText('Cancel'));

    // Modal title should no longer be visible
    expect(screen.queryByText('Reset Password')).toBeNull();
  });
});

// ====================================================================
//  FUNCTIONAL TESTS — Reset Password Logic
// ====================================================================

describe('Reset Password - Functional Tests', () => {

  // Empty email validation

  test('shows error when reset email is empty', () => {
    openResetModal();
    fireEvent.press(screen.getByText('Send Reset Link'));

    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter your email address');
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
  });

  // Successful reset

  test('calls sendPasswordResetEmail with the entered email', async () => {
    mockSendPasswordResetEmail.mockResolvedValueOnce({
      success: true,
      userMessage: 'Password reset email sent! Check your inbox.',
    });

    openResetModal();

    // Type into the modal's email input (second one with this placeholder)
    const inputs = screen.getAllByPlaceholderText('your.email@example.com');
    fireEvent.changeText(inputs[1], 'vi@test.com');
    fireEvent.press(screen.getByText('Send Reset Link'));

    await waitFor(() => {
      expect(mockSendPasswordResetEmail).toHaveBeenCalledWith('vi@test.com');
    });
  });

  test('shows success alert when reset email is sent', async () => {
    mockSendPasswordResetEmail.mockResolvedValueOnce({
      success: true,
      userMessage: 'Password reset email sent! Check your inbox.',
    });

    openResetModal();

    const inputs = screen.getAllByPlaceholderText('your.email@example.com');
    fireEvent.changeText(inputs[1], 'vi@test.com');
    fireEvent.press(screen.getByText('Send Reset Link'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        'Password reset email sent! Check your inbox.'
      );
    });
  });

  test('closes modal after successful reset email', async () => {
    mockSendPasswordResetEmail.mockResolvedValueOnce({
      success: true,
      userMessage: 'Password reset email sent! Check your inbox.',
    });

    openResetModal();

    const inputs = screen.getAllByPlaceholderText('your.email@example.com');
    fireEvent.changeText(inputs[1], 'vi@test.com');
    fireEvent.press(screen.getByText('Send Reset Link'));

    // After success, the modal's visible prop is set to false.
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        'Password reset email sent! Check your inbox.'
      );
    });

    // Verify the modal state reset by re-opening — if the modal had
    // stayed open, resetEmail would still have the old value
    fireEvent.press(screen.getByText('Forgot Password?'));
    await waitFor(() => {
      const newInputs = screen.getAllByPlaceholderText('your.email@example.com');
      expect(newInputs[1].props.value).toBe('');
    });
  });

  // Firebase error handling

  test('shows error when no account found with email', async () => {
    mockSendPasswordResetEmail.mockResolvedValueOnce({
      success: false,
      userMessage: 'No account found with this email address.',
      code: 'auth/user-not-found',
    });

    openResetModal();

    const inputs = screen.getAllByPlaceholderText('your.email@example.com');
    fireEvent.changeText(inputs[1], 'nobody@test.com');
    fireEvent.press(screen.getByText('Send Reset Link'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'No account found with this email address.'
      );
    });
  });

  test('shows error for invalid email format', async () => {
    mockSendPasswordResetEmail.mockResolvedValueOnce({
      success: false,
      userMessage: 'Please enter a valid email address.',
      code: 'auth/invalid-email',
    });

    openResetModal();

    const inputs = screen.getAllByPlaceholderText('your.email@example.com');
    fireEvent.changeText(inputs[1], 'not-an-email');
    fireEvent.press(screen.getByText('Send Reset Link'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Please enter a valid email address.'
      );
    });
  });

  test('shows error when too many reset attempts', async () => {
    mockSendPasswordResetEmail.mockResolvedValueOnce({
      success: false,
      userMessage: 'Too many attempts. Please try again later.',
      code: 'auth/too-many-requests',
    });

    openResetModal();

    const inputs = screen.getAllByPlaceholderText('your.email@example.com');
    fireEvent.changeText(inputs[1], 'vi@test.com');
    fireEvent.press(screen.getByText('Send Reset Link'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Too many attempts. Please try again later.'
      );
    });
  });

  test('shows generic error when reset fails without userMessage', async () => {
    mockSendPasswordResetEmail.mockResolvedValueOnce({
      success: false,
      error: 'Something went wrong',
    });

    openResetModal();

    const inputs = screen.getAllByPlaceholderText('your.email@example.com');
    fireEvent.changeText(inputs[1], 'vi@test.com');
    fireEvent.press(screen.getByText('Send Reset Link'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Something went wrong');
    });
  });

  test('shows fallback error when sendPasswordResetEmail throws', async () => {
    mockSendPasswordResetEmail.mockRejectedValueOnce(new Error('Network error'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    openResetModal();

    const inputs = screen.getAllByPlaceholderText('your.email@example.com');
    fireEvent.changeText(inputs[1], 'vi@test.com');
    fireEvent.press(screen.getByText('Send Reset Link'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Network error');
    });

    // Wait for setResetLoading(false) to settle
    await waitFor(() => {
      expect(screen.getByText('Send Reset Link')).toBeTruthy();
    });

    console.error.mockRestore();
  });

  // Modal stays open on failure

  test('keeps modal open when reset fails', async () => {
    mockSendPasswordResetEmail.mockResolvedValueOnce({
      success: false,
      userMessage: 'No account found with this email address.',
    });

    openResetModal();

    const inputs = screen.getAllByPlaceholderText('your.email@example.com');
    fireEvent.changeText(inputs[1], 'nobody@test.com');
    fireEvent.press(screen.getByText('Send Reset Link'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });

    // Modal should still be visible
    expect(screen.getByText('Reset Password')).toBeTruthy();
  });

  // Loading state

  test('shows loading spinner while sending reset email', async () => {
    let resolveReset;
    mockSendPasswordResetEmail.mockImplementation(
      () => new Promise(res => { resolveReset = res; })
    );

    openResetModal();

    const inputs = screen.getAllByPlaceholderText('your.email@example.com');
    fireEvent.changeText(inputs[1], 'vi@test.com');
    fireEvent.press(screen.getByText('Send Reset Link'));

    await waitFor(() => {
      // Button text disappears, replaced by ActivityIndicator
      expect(screen.queryByText('Send Reset Link')).toBeNull();
      expect(
        screen.UNSAFE_getByType(require('react-native').ActivityIndicator)
      ).toBeTruthy();
    });

    // Clean up
    resolveReset({ success: true, userMessage: 'Sent!' });
  });

  // Clears email after successful reset

  test('clears reset email field after successful send', async () => {
    mockSendPasswordResetEmail.mockResolvedValueOnce({
      success: true,
      userMessage: 'Password reset email sent! Check your inbox.',
    });

    openResetModal();

    const inputs = screen.getAllByPlaceholderText('your.email@example.com');
    fireEvent.changeText(inputs[1], 'vi@test.com');
    fireEvent.press(screen.getByText('Send Reset Link'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Success', expect.any(String));
    });

    // Re-open the modal — email should be cleared
    fireEvent.press(screen.getByText('Forgot Password?'));

    await waitFor(() => {
      const newInputs = screen.getAllByPlaceholderText('your.email@example.com');
      const modalInput = newInputs[1];
      expect(modalInput.props.value).toBe('');
    });
  });
});