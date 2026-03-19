import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Image,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  Platform,
  Modal,
  Dimensions,
} from 'react-native';
import { GestureHandlerRootView, TapGestureHandler } from 'react-native-gesture-handler';

import { getCardsFromDB } from '../services/GetCardsFromDB';
import { DeleteFromCollection } from '../services/DeleteFromCollection';
import { MaterialCommunityIcons, AntDesign } from '@expo/vector-icons';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

export default function CollectionView() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const doubleTapRef = useRef({});

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      const fetchedCards = await getCardsFromDB();
      setCards(fetchedCards || []);
    } catch (error) {
      console.error('Error loading cards:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadCards();
  };

  // Handle double tap to show delete modal
  const handleDoubleTap = (card) => {
    setSelectedCard(card);
    setDeleteModalVisible(true);
  };

  // Handle actual deletion
  const handleDelete = async () => {
    if (!selectedCard) return;
    
    setIsDeleting(true);
    try {
      await DeleteFromCollection(selectedCard.id);
      await loadCards();
      setDeleteModalVisible(false);
      setSelectedCard(null);
    } catch (error) {
      console.error('Error deleting card:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Format currency
  const formatCurrency = (value) => {
    if (!value) return '$0.00';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return `$${numValue.toFixed(2)}`;
  };

  // Format grade
  const formatGrade = (grade) => {
    if (!grade) return null;
    return typeof grade === 'number' ? grade.toFixed(1) : grade;
  };

  const renderCard = ({ item }) => {
    const hasPrice = item.cardPrice?.average || item.price;
    const hasGrade = item.grade || item.graded || item.isGraded;
    const priceValue = item.cardPrice?.average || item.price;
    const gradeValue = item.grade || item.graded || item.isGraded;

    if (!doubleTapRef.current[item.id]) {
      doubleTapRef.current[item.id] = React.createRef();
    }

    return (
      <GestureHandlerRootView key={item.id}>
        <TapGestureHandler
          ref={doubleTapRef.current[item.id]}
          onHandlerStateChange={(event) => {
            if (event.nativeEvent.state === 5) {
              handleDoubleTap(item);
            }
          }}
          numberOfTaps={2}
        >
          <View style={styles.card}>
            <View style={styles.imageContainer}>
              {item.image ? (
                <Image
                  source={{ uri: item.image }}
                  style={styles.cardImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.placeholderImage}>
                  <MaterialCommunityIcons name="image-off" size={40} color="#ccc" />
                </View>
              )}
              
              {item.condition && (
                <View style={styles.conditionBadge}>
                  <Text style={styles.conditionText}>{item.condition}</Text>
                </View>
              )}
            </View>

            <View style={styles.cardContent}>
              <View style={styles.headerRow}>
                <Text style={styles.playerName} numberOfLines={1}>
                  {item.player || 'Unknown Player'}
                </Text>
                <Text style={styles.yearText}>{item.year || 'N/A'}</Text>
              </View>

              <Text style={styles.manufacturer}>
                {item.manufacturer || 'Unknown Brand'}
              </Text>
              
              <Text style={styles.cardNumber}>
                #{item.card_number || 'N/A'}
              </Text>

              <View style={styles.statsRow}>
                {hasPrice && (
                  <View style={styles.statBadge}>
                    <MaterialCommunityIcons name="currency-usd" size={16} color="#1976d2" />
                    <Text style={styles.statText}>{formatCurrency(priceValue)}</Text>
                  </View>
                )}
                
                {hasGrade && (
                  <View style={[styles.statBadge, styles.gradeBadge]}>
                    <AntDesign name="staro" size={16} color="#FFA000" />
                    <Text style={[styles.statText, styles.gradeText]}>
                      Grade: {formatGrade(gradeValue)}
                    </Text>
                  </View>
                )}
                
                {!hasPrice && !hasGrade && (
                  <View style={styles.statBadge}>
                    <MaterialCommunityIcons name="help-circle" size={16} color="#999" />
                    <Text style={[styles.statText, styles.noValueText]}>No value</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.doubleTapContainer}>
                <MaterialCommunityIcons name="gesture-tap" size={14} color="#999" />
                <Text style={styles.doubleTapHint}>Double tap to delete</Text>
              </View>
            </View>
          </View>
        </TapGestureHandler>
      </GestureHandlerRootView>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1976d2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={cards}
        renderItem={renderCard}
        keyExtractor={(item) => item.id || item.card_number || Math.random().toString()}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            colors={["#1976d2"]}
            tintColor="#1976d2"
          />
        }
        contentContainerStyle={cards.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="cards-outline" size={80} color="#ccc" />
            <Text style={styles.emptyText}>
              No cards in your collection yet.
            </Text>
            <TouchableOpacity 
              style={styles.emptyScanButton}
              onPress={() => router.push('/scan')}
            >
              <Text style={styles.emptyScanText}>Scan Your First Card</Text>
            </TouchableOpacity>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Modern Delete Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={deleteModalVisible}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <MaterialCommunityIcons name="alert-circle-outline" size={50} color="#FF3B30" />
            </View>
            
            <Text style={styles.modalTitle}>Delete Card</Text>
            
            {selectedCard && (
              <Text style={styles.modalMessage}>
                Are you sure you want to delete <Text style={styles.modalHighlight}>{selectedCard.player || 'this card'}</Text>? This action cannot be undone.
              </Text>
            )}
            
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setSelectedCard(null);
                }}
                disabled={isDeleting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalDeleteButton]}
                onPress={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="delete" size={18} color="#fff" />
                    <Text style={styles.modalDeleteText}>Delete</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Home Button */}
      <SafeAreaView edges={['bottom']} style={styles.bottomSafeArea}>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => router.push('/scanner')}
        >
          <View style={styles.homeIconWrapper}>
            <MaterialCommunityIcons name="crown" size={24} color="#FFD700" />
          </View>
          <Text style={styles.homeButtonText}>Home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  imageContainer: {
    position: 'relative',
    height: 200,
    backgroundColor: '#f0f0f0',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  conditionBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  conditionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  cardContent: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  playerName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
    marginRight: 8,
  },
  yearText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
  },
  manufacturer: {
    fontSize: 15,
    color: '#64748b',
    marginBottom: 4,
  },
  cardNumber: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 12,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  gradeBadge: {
    backgroundColor: '#fff7e6',
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976d2',
  },
  gradeText: {
    color: '#FFA000',
  },
  noValueText: {
    color: '#999',
  },
  doubleTapContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 4,
  },
  doubleTapHint: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.85,
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalHighlight: {
    fontWeight: '700',
    color: '#1e293b',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  modalCancelButton: {
    backgroundColor: '#f1f5f9',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  modalDeleteButton: {
    backgroundColor: '#FF3B30',
  },
  modalDeleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  emptyScanButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
    elevation: 2,
  },
  emptyScanText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Bottom Home Button Styles
  bottomSafeArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'box-none',
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#FFD700',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    marginBottom: Platform.OS === 'ios' ? 40 : 35,
    gap: 8,
  },
  homeIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,215,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFD700',
    letterSpacing: 0.5,
  },
});