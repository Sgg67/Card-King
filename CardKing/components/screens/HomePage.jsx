// components/screens/HomePage.jsx (FIXED - No screen movement)
import React from "react";
// import UI components from react native
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    Platform,
    ScrollView,
    TouchableWithoutFeedback,
    Keyboard
} from 'react-native';
import { useRouter } from 'expo-router';
import LoginForm from '../common/LoginForm';

const HomePage = () => {
    const router = useRouter();

    const handleSignUp = () => {
        router.push('/signup');
    };

    // Function to dismiss keyboard when tapping outside
    const dismissKeyboard = () => {
        Keyboard.dismiss();
    };

    return (
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
            <SafeAreaView style={styles.container}>
                {/* REMOVED KeyboardAvoidingView - This is causing the movement */}
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled" // This allows taps to persist
                    keyboardDismissMode="on-drag" // Dismiss keyboard when dragging
                    bounces={false}
                    // These prevent automatic scrolling to focused input
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
                        <Text style={styles.subtitle}>Your Ultimate Card Scanner</Text>
                    </View>

                    <LoginForm
                        onSignUp={handleSignUp}
                    />

                    <View style={styles.bottomSpacer} />
                </ScrollView>
            </SafeAreaView>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
        paddingBottom: 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    logoCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    logoText: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '700',
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#1A1A1A',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        color: '#666666',
        fontWeight: '500',
    },
    bottomSpacer: {
        height: 40,
    },
});

export default HomePage;