// components/common/ProfileIcon.jsx
import React, { useState, useEffect } from 'react';
import { View, Image, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { storage, auth, firestore } from '../config/FireBase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AntDesign } from '@expo/vector-icons';

const ProfileIcon = ({ size = 40, onPress, showPickerOnPress = true, style }) => {
    // intialize const useState variables
    const [profileImage, setProfileImage] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUserProfile();
    }, []);

    const loadUserProfile = async () => {
        try {
            const user = auth.currentUser;
            
            if (user) {
                // First, ensure user document exists
                await ensureUserDocument(user);
                
                // Try to load profile image
                const userDoc = await getDoc(doc(firestore, 'users', user.uid));
                
                if (userDoc.exists() && userDoc.data().profileImage && userDoc.data().profileImage.trim() !== '') {
                    setProfileImage({ uri: userDoc.data().profileImage });
                } else {
                    setProfileImage(null);
                }
            } else {
                setProfileImage(null);
            }
        } catch (error) {
            setProfileImage(null);
        } finally {
            setLoading(false);
        }
    };

    const ensureUserDocument = async (user) => {
        try {
            const userDoc = await getDoc(doc(firestore, 'users', user.uid));
            
            if (!userDoc.exists()) {
                await setDoc(doc(firestore, 'users', user.uid), {
                    uid: user.uid,
                    email: user.email,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    profileImage: null
                });
            }
        } catch (error) {
            // Silently fail - user can continue without document
        }
    };

    const handlePress = async () => {
        const user = auth.currentUser;
        
        if (!user) {
            Alert.alert(
                'Sign In Required',
                'Please sign in to change your profile picture.',
                [
                    { text: 'Sign In', onPress: () => onPress?.() },
                    { text: 'Cancel', style: 'cancel' }
                ]
            );
            return;
        }

        if (!showPickerOnPress) {
            onPress?.();
            return;
        }

        // Request permissions
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (status !== 'granted') {
            Alert.alert(
                'Permission Required',
                'We need access to your photos to change your profile picture.',
                [{ text: 'OK' }]
            );
            return;
        }

        // Show options
        Alert.alert(
            'Change Profile Picture',
            'What would you like to do?',
            [
                {
                    text: 'Choose from Gallery',
                    onPress: pickImage
                },
                profileImage ? {
                    text: 'Remove Current',
                    onPress: removeProfileImage,
                    style: 'destructive'
                } : null,
                {
                    text: 'Cancel',
                    style: 'cancel'
                }
            ].filter(Boolean)
        );
    };

    const pickImage = async () => {
        const user = auth.currentUser;
        if (!user) {
            Alert.alert('Not Signed In', 'Please sign in first.');
            return;
        }

        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });
            
            if (!result.canceled && result.assets && result.assets.length > 0) {
                await uploadImage(result.assets[0].uri);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick image. Please try again.');
        }
    };

    const uploadImage = async (imageUri) => {
        const user = auth.currentUser;
        if (!user) {
            Alert.alert('Not Signed In', 'Please sign in to upload a profile picture.');
            return;
        }

        setUploading(true);
        
        try {
            const response = await fetch(imageUri);
            const blob = await response.blob();
            
            const filename = `profile_${Date.now()}.jpg`;
            const storagePath = `users/${user.uid}/profile/${filename}`;
            const storageRef = ref(storage, storagePath);
            
            await uploadBytes(storageRef, blob);
            const downloadURL = await getDownloadURL(storageRef);
            
            await setDoc(doc(firestore, 'users', user.uid), {
                profileImage: downloadURL,
                updatedAt: new Date().toISOString(),
                uid: user.uid,
                email: user.email
            }, { merge: true });
            
            setProfileImage({ uri: downloadURL });
            Alert.alert('Success', 'Profile picture updated!');
            
        } catch (error) {
            Alert.alert('Upload Failed', 'Failed to upload image. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const removeProfileImage = async () => {
        const user = auth.currentUser;
        if (!user) {
            Alert.alert('Not Signed In', 'Please sign in first.');
            return;
        }

        try {
            await setDoc(doc(firestore, 'users', user.uid), {
                profileImage: null,
                updatedAt: new Date().toISOString()
            }, { merge: true });
            
            setProfileImage(null);
            Alert.alert('Removed', 'Profile picture removed.');
            
        } catch (error) {
            Alert.alert('Error', 'Failed to remove profile picture.');
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { width: size, height: size }, style]}>
                <ActivityIndicator size="small" color="#666" />
            </View>
        );
    }

    return (
        <TouchableOpacity 
            onPress={handlePress}
            style={[styles.container, { width: size, height: size }, style]}
            activeOpacity={0.7}
        >
            {uploading ? (
                <View style={[styles.imageContainer, { width: size, height: size }]}>
                    <ActivityIndicator color="#FFFFFF" />
                </View>
            ) : profileImage && profileImage.uri ? (
                <Image 
                    source={{ uri: profileImage.uri }} 
                    style={[styles.profileImage, { 
                        width: size, 
                        height: size, 
                        borderRadius: size / 2 
                    }]}
                    onError={() => {
                        setProfileImage(null);
                    }}
                />
            ) : (
                <View style={[
                    styles.placeholder, { 
                        width: size, 
                        height: size, 
                        borderRadius: size / 2 
                    }
                ]}>
                    <AntDesign name="user" size={size * 0.5} color="#666" />
                </View>
            )}
            
            {/* Camera overlay icon */}
            <View style={styles.cameraOverlay}>
                <MaterialCommunityIcons name="camera" size={size * 0.25} color="#FFFFFF" />
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
    },
    imageContainer: {
        borderRadius: 50,
        backgroundColor: 'rgba(26, 26, 46, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileImage: {
        borderWidth: 2,
        borderColor: '#1A1A2E',
    },
    placeholder: {
        backgroundColor: '#E0E0E0',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#CCCCCC',
    },
    cameraOverlay: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#1A1A2E',
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
});

export default ProfileIcon;