import React from 'react'
import {render, fireEvent, waitFor } from '@testing-library/react-native'
import LoginForm from '../components/common/LoginForm'
import { TextInput, Alert } from 'react-native'
import { signIn } from '../components/config/FireBase'

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