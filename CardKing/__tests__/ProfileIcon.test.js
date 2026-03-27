import React from 'react'
import {render, fireEvent, waitFor } from '@testing-library/react-native'
import ProfileIcon from '../components/common/ProfileIcon'
import { ActivityIndicator, Alert, TouchableOpacity, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { AntDesign } from '@expo/vector-icons'

jest.spyOn(Alert, 'alert').mockImplementation(()=>{})

jest.mock('../components/config/FireBase', () => ({
    auth: {currentUser: { uid: '123', email: 'valid@example.com'}},
    firestore: {},
    storage: {}
}))

jest.mock('firebase/firestore', () => ({
    doc: jest.fn(),
    getDoc: jest.fn(()=>
    Promise.resolve({ exists:() => false, data: () => ({})})),
    setDoc: jest.fn()
}))

jest.mock('firebase/storage', () => ({
    ref: jest.fn(),
    uploadBytes: jest.fn(() => Promise.resolve()),
    getDownloadURL: jest.fn(() => Promise.resolve('https://test-image.com/photo.png'))
}))

describe ('ProfileIcon', () => {
    test('default profile image is silhouette', async () => {
        const { queryByRole } = render(<ProfileIcon></ProfileIcon>)

        await waitFor(() => {
            expect(queryByRole('image')).toBeNull()
        })
    }),
    test('user can change profile picture', async ()=> {
        jest.spyOn(ImagePicker, 'requestMediaLibraryPermissionsAsync').mockResolvedValue({status: 'granted'})

        const { UNSAFE_getByType } = render(<ProfileIcon></ProfileIcon>)

        const button = await waitFor(() => UNSAFE_getByType(TouchableOpacity))

        fireEvent.press(button)

        await waitFor(() => {
            expect(Alert.alert).toHaveBeenCalledWith(
                'Change Profile Picture',
                expect.any(String),
                expect.any(Array)
            )
        })
    }),
    test('standard picture format is accepted', async ()=> {
        jest.spyOn(ImagePicker, 'requestMediaLibraryPermissionsAsync').mockResolvedValue({status: 'granted'})

        jest.spyOn(ImagePicker, 'launchImageLibraryAsync').mockResolvedValue({
            canceled: false,
            assets: [{ uri: 'file://test.jpg' }]
        })

        global.fetch = jest.fn(() => 
        Promise.resolve({
            blob: () => Promise.resolve(new Blob())
        })
        )

        jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
            const chooseGalleryButton = buttons?.find(b => b?.text === "Choose from Gallery")
            chooseGalleryButton?.onPress()
        })

        const { UNSAFE_getByType } = render(<ProfileIcon></ProfileIcon>)
        const button = await waitFor(() => UNSAFE_getByType(TouchableOpacity))
        fireEvent.press(button)

        await waitFor(() => {
            expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled()
        })
    })
})



describe('ProfileIcon UI', () => {
    test('silhouette is displayed when there is no profile icon', async () => {
        const { UNSAFE_getAllByProps } = render(<ProfileIcon></ProfileIcon>)

        await waitFor(() => {
            const silhouetteIcons = UNSAFE_getAllByProps({ name: 'user' })
            expect(silhouetteIcons.length).toBeGreaterThan(0)
            expect(silhouetteIcons[0].type).toBe(AntDesign)
        })

    }),
    test('spinner is displayed on screen', async () => {
        const {UNSAFE_getByType} = render(<ProfileIcon></ProfileIcon>)
        const spinner = UNSAFE_getByType(ActivityIndicator)
        expect(spinner).toBeTruthy()
    })
})