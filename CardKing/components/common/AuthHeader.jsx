// components/common/AuthHeader.jsx (FIXED)
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const AuthHeader = ({ title, subtitle }) => {
    return (
        <View style={styles.logoContainer}>  {/* Fixed: styles instead of StyleSheet */}
            <Text style={styles.logoText}>{title}</Text>  {/* Fixed */}
            <Text style={styles.tagline}>{subtitle}</Text>  {/* Fixed */}
        </View>
    );
};

const styles = StyleSheet.create({
   logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
   },
   logoText: {
    fontSize: 42,
    fontWeight: '800',
    color: "#FFFFFF",  // Fixed: added # before color
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5, 
   },
   tagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 8,
    fontWeight: '500',
   }, 
});

export default AuthHeader;