import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Image,
  TouchableOpacity,
  Platform,
  StatusBar,
  Alert,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
import AntDesign from '@expo/vector-icons/AntDesign';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import ProfileIcon from '../components/common/ProfileIcon';
import { getCardsFromDB } from '../components/services/GetCardsFromDB';
import { auth } from '../components/config/FireBase';
import { signOut } from 'firebase/auth';

export default function ScannerScreen() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalValue, setTotalValue] = useState(0);
  const [gradedCount, setGradedCount] = useState(0);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const router = useRouter();

  // Calculate total collection value and graded count from cards
  const calculateCollectionStats = (cardsList) => {
    if (!cardsList || cardsList.length === 0) {
      setTotalValue(0);
      setGradedCount(0);
      return;
    }

    console.log('Calculating stats for', cardsList.length, 'cards');

    let graded = 0;
    
    const total = cardsList.reduce((sum, card) => {
      // Calculate graded count - check if card has a grade value
      if (card.grade || card.graded || card.isGraded) {
        graded++;
      }

      // Calculate total value
      let avgPrice = 0;
      
      if (card.cardPrice && card.cardPrice.average) {
        avgPrice = card.cardPrice.average;
      } else if (card.price) {
        avgPrice = card.price;
      }

      const numericPrice = typeof avgPrice === 'string'
        ? parseFloat(avgPrice) || 0
        : avgPrice || 0;

      return sum + numericPrice;
    }, 0);

    setTotalValue(total);
    setGradedCount(graded);
  };

  // Load cards function
  const loadCards = async () => {
    try {
      console.log('Loading cards...');
      const fetchedCards = await getCardsFromDB();
      console.log('Fetched cards count:', fetchedCards?.length);
      setCards(fetchedCards || []);
      calculateCollectionStats(fetchedCards || []);
    } catch (error) {
      console.error('Error loading cards:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    setLogoutModalVisible(false);
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  // Format currency
  const formatCurrency = (value) => {
    return `$${value.toFixed(2)}`;
  };

  // Initial load
  useEffect(() => {
    loadCards();
  }, []);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('Screen focused, reloading cards...');
      loadCards();
    }, [])
  );

  // Android navigation bar color fix
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
              <Text style={styles.statNumber}>{cards.length}</Text>
              <Text style={styles.statLabel}>Cards</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <AntDesign name="staro" size={24} color="#666" />
              <Text style={styles.statNumber}>{gradedCount}</Text>
              <Text style={styles.statLabel}>Graded</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <MaterialCommunityIcons name="trending-up" size={24} color="#666" />
              <Text style={styles.statNumber}>{formatCurrency(totalValue)}</Text>
              <Text style={styles.statLabel}>Total Value</Text>
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

      {/* Floating Logout Button */}
      <TouchableOpacity 
        style={styles.logoutButton} 
        onPress={() => setLogoutModalVisible(true)}
      >
        <MaterialCommunityIcons name="logout" size={24} color="#FF3B30" />
      </TouchableOpacity>

      {/* Custom Logout Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={logoutModalVisible}
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setLogoutModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContent}>
                <View style={styles.modalIconContainer}>
                  <MaterialCommunityIcons name="logout" size={50} color="#FF3B30" />
                </View>
                
                <Text style={styles.modalTitle}>Sign Out</Text>
                <Text style={styles.modalMessage}>
                  Are you sure you want to sign out? 
                </Text>

                <View style={styles.modalButtonContainer}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setLogoutModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.signOutButton]}
                    onPress={handleLogout}
                  >
                    <Text style={styles.signOutButtonText}>Sign Out</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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

  // Floating logout button
  logoutButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxWidth: 340,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },

  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A2E',
    marginBottom: 8,
  },

  modalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },

  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },

  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 6,
  },

  cancelButton: {
    backgroundColor: '#F0F0F0',
  },

  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },

  signOutButton: {
    backgroundColor: '#FF3B30',
  },

  signOutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});