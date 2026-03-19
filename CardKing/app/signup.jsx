// app/signup.jsx (FIXED - No cutting off)
// import use state from react
import React, { useState } from 'react';
// import UI components from react native
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    Platform,
    Alert,
    ScrollView,
    TouchableWithoutFeedback,
    Keyboard
} from 'react-native';
// import routing from expo
import { useRouter } from 'expo-router';
// import signup from config using firebase
import { signUp } from '../components/config/FireBase';
// import common components
import Input from '../components/common/Input';
import Button from '../components/common/Button';

export default function SignUpScreen() {
    // declare const useState variables
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // signup functionality
    const handleSignUp = async () => {
        // error checking ensuring password must be entered
        if (!email || !password || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        // if password is not confirmed properly show an error saying password is not confirmed properly
        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        // password is less than 6 characters thrown an error
        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            // try to create an account
            const result = await signUp(email, password);
            // if result is success acount is properly created
            if (result.success) {
                Alert.alert('Success', 'Account created successfully!');
                router.replace('/scanner');
            } else {
                const errorMessage = result.userMessage || result.error || 'Sign up failed';
                Alert.alert('Sign Up Failed', errorMessage);
            }

        } catch (error) {
            console.error('Sign up error:', error);
            Alert.alert('Sign Up Failed', error.message || 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const dismissKeyboard = () => {
        Keyboard.dismiss();
    };

    return (
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
            <SafeAreaView style={styles.container}>
                {/* Remove KeyboardAvoidingView or keep it with adjusted settings */}
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    bounces={false}
                    automaticallyAdjustContentInsets={false}
                    contentInsetAdjustmentBehavior="never"
                >
                    <View style={styles.header}>
                        <View style={styles.logoContainer}>
                            <View style={styles.logoCircle}>
                                <Text style={styles.logoText}>CK</Text>
                            </View>
                            <Text style={styles.title}>Card King</Text>
                        </View>
                        <Text style={styles.subtitle}>Create Your Account</Text>
                    </View>

                    {/* Remove the form wrapper's padding if it's causing issues */}
                    <View style={styles.form}>
                        <Text style={styles.formTitle}>Sign Up</Text>
                        <Text style={styles.formSubtitle}>Join the community</Text>

                        {/* Make sure Input components have proper width */}
                        <View style={styles.inputContainer}>
                            {/*Enter email input form*/}
                            <Input
                                label="Email Address"
                                placeholder="your.email@example.com"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                containerStyle={styles.input}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            {/*Enter Password input form*/}
                            <Input
                                label="Password"
                                placeholder="Create a password"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                showPasswordToggle
                                containerStyle={styles.input}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            {/*Confirm password input form*/}
                            <Input
                                label="Confirm Password"
                                placeholder="Confirm your password"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry
                                showPasswordToggle
                                containerStyle={styles.input}
                            />
                        </View>

                        <Button
                            title={loading ? "Creating Account..." : "Create Account"}
                            onPress={handleSignUp}
                            loading={loading}
                            disabled={loading}
                            style={styles.signUpButton}
                        />

                        <View style={styles.loginContainer}>
                            <Text style={styles.loginText}>Already have an account? </Text>
                            <Button
                                title="Sign In"
                                onPress={() => router.push('/')}
                                variant="primary"
                                style={styles.signInButton}
                            />
                        </View>
                    </View>

                    <View style={styles.bottomSpacer} />
                </ScrollView>
            </SafeAreaView>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 20, // Reduced from 24
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
        paddingBottom: 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    logoCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    logoText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#1A1A1A',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        color: '#666666',
        fontWeight: '500',
    },
    form: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20, // Reduced from 24
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F0F0F0',
        width: '100%', // Ensure it takes full width
    },
    formTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 6,
    },
    formSubtitle: {
        fontSize: 14,
        color: '#666666',
        marginBottom: 20, // Reduced from 24
        fontWeight: '400',
    },
    inputContainer: {
        marginBottom: 16,
    },
    input: {
        width: '100%', // Ensure inputs take full width
    },
    signUpButton: {
        marginTop: 8,
        marginBottom: 20,
    },
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        flexWrap: 'wrap', // Allow wrapping on small screens
    },
    loginText: {
        color: '#666666',
        fontSize: 14,
        marginRight: 6,
    },
    signInButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        minHeight: 36,
    },
    bottomSpacer: {
        height: 40,
    },
});