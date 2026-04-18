import React from 'react'
import {render, fireEvent, waitFor } from '@testing-library/react-native'
import LoginForm from '../components/common/LoginForm'
import { TextInput, Alert } from 'react-native'
import { signIn } from '../components/config/FireBase'
import { sendPasswordResetEmail } from '../components/config/FireBase'

const mockedReplace = jest.fn()

jest.mock('expo-router', () => ({
    useRouter: () => ({
        replace: mockedReplace,
    }),
}));

jest.mock('../components/config/FireBase', () => ({
    signIn: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
}));

describe('LoginForm', () => {
    test('user can enter email and password', () => {
        const { UNSAFE_getAllByType } = render(<LoginForm></LoginForm>);
        //might want to find way to do this without UNSAFE method
        const fields = UNSAFE_getAllByType(TextInput)
        const emailField = fields[0]
        const passwordField = fields[1]

        fireEvent.changeText(emailField, 'valid@example.com')
        fireEvent.changeText(passwordField, 'validpassword')

        expect(emailField.props.value).toBe('valid@example.com')
        expect(passwordField.props.value).toBe('validpassword')
    }),
    test('user is shown an alert if a field is missing', () => {
        const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(()=> {});

        const { getByText } = render(<LoginForm></LoginForm>)

        fireEvent.press(getByText('Sign In'))

        expect(alertSpy).toHaveBeenCalledWith('Error', 'Please fill in all fields')
    }),
    test('user is directed to home page upon valid credentials', async () => {

        signIn.mockResolvedValue({success: true, user: {email: 'valid@example.com'},})
        const { UNSAFE_getAllByType, getByText } = render(<LoginForm></LoginForm>)

        const fields = UNSAFE_getAllByType(TextInput)
        fireEvent.changeText(fields[0], 'valid@example.com')
        fireEvent.changeText(fields[1], 'validpassword')

        fireEvent.press(getByText('Sign In'));


        await waitFor(() => {
            expect(mockedReplace).toHaveBeenCalledWith('/scanner')
        })
    }),
    test('user is shown error message upon invalid credentials', async () => {
        signIn.mockResolvedValue({success: false, userMessage: 'Invalid email or password',})
        const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(()=> {});

        const { UNSAFE_getAllByType, getByText } = render(<LoginForm></LoginForm>)

        const fields = UNSAFE_getAllByType(TextInput)
        fireEvent.changeText(fields[0], 'invalid@example.com')
        fireEvent.changeText(fields[1], 'invalidpassword')

        fireEvent.press(getByText('Sign In'));

        await waitFor(() => {
            expect(alertSpy).toHaveBeenCalledWith('Login Failed', 'Invalid email or password')
        })
    })
})

describe('Login UI', () => {
    test('all main UI elements render', () => {
        const { getByText, getByPlaceholderText } = render(<LoginForm></LoginForm>);

        expect(getByText('Welcome Back')).toBeTruthy();
        expect(getByText('Sign in to continue')).toBeTruthy();
        expect(getByPlaceholderText('your.email@example.com')).toBeTruthy();
        expect(getByPlaceholderText('Enter your password')).toBeTruthy();
        expect(getByText('Sign In')).toBeTruthy();
        expect(getByText('Forgot Password?')).toBeTruthy();
        expect(getByText('Create Account')).toBeTruthy();
    }),
    test('clicking "Forgot Password" result in reset password modal openning', () => {
        const { getByText, getByText: getByTextInModal } = render(<LoginForm></LoginForm>);
        fireEvent.press(getByText('Forgot Password?'));

        expect(getByTextInModal('Reset Password')).toBeTruthy();
        expect(getByTextInModal('Enter your email and we will send you a link to reset your password.')).toBeTruthy();
    }),
    test('Reset password modal has email if email was entered previously', () => {
        const { getByPlaceholderText, getAllByPlaceholderText, getByText } = render(<LoginForm></LoginForm>);

        fireEvent.changeText(getByPlaceholderText('your.email@example.com'),'test@example.com');

        fireEvent.press(getByText('Forgot Password?'));

        const inputs = getAllByPlaceholderText('your.email@example.com');

        expect(inputs[1].props.value).toBe('test@example.com');
    }),
    test('alert if reset email is empty', () => {
        const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
        const { getByText } = render(<LoginForm></LoginForm>);
      
        fireEvent.press(getByText('Forgot Password?'));
        fireEvent.press(getByText('Send Reset Link'));
        expect(alertSpy).toHaveBeenCalledWith('Error', 'Please enter your email address');
    }),
    test('reset email successfully sends an email', async () => {
        sendPasswordResetEmail.mockResolvedValue({ success: true });

        const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

        const { getByText, getByTestId, queryByText } = render(<LoginForm></LoginForm>);
      
        fireEvent.press(getByText('Forgot Password?'));
      
        fireEvent.changeText(getByTestId('reset-email-input'), 'test@example.com');

        fireEvent.press(getByText('Send Reset Link'));
      
        await waitFor(() => {
          expect(alertSpy).toHaveBeenCalledWith('Success','Password reset email sent!');
        });

        expect(queryByText('Reset Password')).toBeNull();
    })
})