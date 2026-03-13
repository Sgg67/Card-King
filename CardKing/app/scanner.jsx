import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Image,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
import AntDesign from '@expo/vector-icons/AntDesign';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import ProfileIcon from '../components/common/ProfileIcon';

export default function ScannerScreen() {
  const router = useRouter();

  // ✅ ANDROID NAVIGATION BAR COLOR FIX
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync('#F8F9FA');
      NavigationBar.setButtonStyleAsync('dark');
    }
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />

      {/* Main content */}
      <View style={styles.content}>
        <View style={styles.brandContainer}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/images/home_page_logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.companyName}>CARD KING</Text>
            <Text style={styles.tagline}>Scan. Grade. Collect.</Text>
          </View>

          <View style={styles.ctaContainer}>
            <Text style={styles.ctaText}>Ready to scan your cards?</Text>
            <TouchableOpacity
              style={styles.scanButton}
              onPress={() => router.push('/scan')}
            >
              <AntDesign name="camera" size={24} color="#FFFFFF" />
              <Text style={styles.scanButtonText}>Start Scanning</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="cards" size={24} color="#666" />
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Cards</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <AntDesign name="staro" size={24} color="#666" />
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Graded</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <MaterialCommunityIcons name="trending-up" size={24} color="#666" />
              <Text style={styles.statNumber}>$0</Text>
              <Text style={styles.statLabel}>Value</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Bottom Navigation */}
      <SafeAreaView edges={['bottom']} style={styles.bottomSafeArea}>
        <View style={styles.bottomNav}>
          {/* Grade */}
          <TouchableOpacity
            style={styles.iconContainer}
            onPress={() => router.push('/gradescan')}
          >
            <View style={styles.navIconWrapper}>
              <AntDesign name="linechart" size={24} color="#666" />
            </View>
            <Text style={styles.iconText}>Grade</Text>
          </TouchableOpacity>

          {/* Scan */}
          <TouchableOpacity
            style={styles.iconContainer}
            onPress={() => router.push('/scan')}
          >
            <View style={styles.navIconWrapper}>
              <AntDesign name="camera" size={24} color="#666" />
            </View>
            <Text style={styles.iconText}>Scan</Text>
          </TouchableOpacity>

          {/* Home */}
          <TouchableOpacity
            style={styles.iconContainer}
            onPress={() => router.push('/scanner')}
          >
            <View style={styles.homeIconWrapper}>
              <MaterialCommunityIcons name="crown" size={28} color="#FFD700" />
            </View>
            <Text style={[styles.iconText, styles.homeText]}>Home</Text>
          </TouchableOpacity>

          {/* Collection */}
          <TouchableOpacity
            style={styles.iconContainer}
            onPress={() => router.push('/collection')}
          >
            <View style={styles.navIconWrapper}>
              <MaterialCommunityIcons
                name="cards-outline"
                size={24}
                color="#666"
              />
            </View>
            <Text style={styles.iconText}>Collection</Text>
          </TouchableOpacity>

          {/* Profile */}
          <View style={styles.iconContainer}>
            <ProfileIcon
              size={38}
              onPress={() => router.push('/profile')}
              showPickerOnPress
            />
            <Text style={styles.iconText}>Profile</Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  content: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 60 : 80,
    paddingBottom: 120,
  },

  brandContainer: {
    alignItems: 'center',
    width: '100%',
  },

  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },

  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },

  companyName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A1A2E',
    letterSpacing: 2,
    marginBottom: 8,
  },

  tagline: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },

  ctaContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },

  ctaText: {
    fontSize: 18,
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },

  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    elevation: 3,
  },

  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },

  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 10,
    elevation: 2,
  },

  statItem: {
    alignItems: 'center',
    flex: 1,
  },

  statDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
    height: '80%',
  },

  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A2E',
  },

  statLabel: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  bottomSafeArea: {
    backgroundColor: '#FFFFFF',
  },

  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 10,
    paddingBottom: 4,
    paddingHorizontal: 15,
    backgroundColor: '#FFFFFF',
    elevation: 8,
  },

  iconContainer: {
    flex: 1,
    alignItems: 'center',
  },

  navIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },

  homeIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1A1A2E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
    transform: [{ translateY: -2 }],
    borderWidth: 3,
    borderColor: '#FFD700',
    elevation: 5,
  },

  iconText: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
    marginBottom: 2,
    fontWeight: '500',
  },

  homeText: {
    color: '#1A1A2E',
    fontWeight: '600',
  },
});
