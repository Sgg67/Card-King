import React, { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    Platform,
    ScrollView,
    Image,
    ActivityIndicator,
    Alert,
    TouchableOpacity,
    Linking
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AnalyzeCard } from "../services/AnalyzeCard";
import { AddToCollection } from "../services/AddToCollection";
import { extractCardInfo } from "../services/ExtractCardInfo";
import { getLatestScans } from "../services/RetrieveScans";
import { buildAccurateSearchQuery, lookupCardFromWebMatches } from "../services/CardLookupService";
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';


const ValueCard = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [imageLoading, setImageLoading] = useState(true);
    const [imageZoomed, setImageZoomed] = useState(false);
    const [imageRotation, setImageRotation] = useState(0);
    const [processedImageUrl, setProcessedImageUrl] = useState(null);
    const scrollViewRef = useRef(null);
    const [cardData, setCardData] = useState({
        playerName: null,
        year: null,
        manufacturer: null,
        cardNumber: null,
        parallel: null,
        isRookie: false,
        isAutograph: false,
        isRelic: false,
        searchQuery: null,
        ebaySearchUrl: null,
        frontImageUrl: null
    });

    useEffect(() => {
        analyzeCardImages();
    }, []);

    useEffect(() => {
        if (cardData.frontImageUrl) {
            processImageOrientation(cardData.frontImageUrl);
        }
    }, [cardData.frontImageUrl]);

    const processImageOrientation = async (imageUri) => {
        try {
            setImageLoading(true);
            
            // Manipulate the image to ensure correct orientation
            const manipResult = await ImageManipulator.manipulateAsync(
                imageUri,
                [
                    { rotate: 0 }, // This will apply auto-orientation based on EXIF data
                ],
                { compress: 1, format: ImageManipulator.SaveFormat.JPEG, base64: false }
            );
            
            setProcessedImageUrl(manipResult.uri);
        } catch (error) {
            console.error('Error processing image orientation:', error);
            // Fall back to original image if manipulation fails
            setProcessedImageUrl(imageUri);
        } finally {
            setImageLoading(false);
        }
    };

    const analyzeCardImages = async () => {
        try {
            setLoading(true);

            // Get the latest scanned images
            const { frontUrl, backUrl } = await getLatestScans();

            if (!frontUrl || !backUrl) {
                Alert.alert('Error', 'No card images found. Please scan a card first.');
                return;
            }

            // Analyze images with Vision API
            const visionResults = await AnalyzeCard(frontUrl, backUrl);

            // Extract basic card information
            const cardInfo = extractCardInfo(visionResults);

            // Look up card from web matches
            const lookupResults = await lookupCardFromWebMatches(cardInfo, cardInfo.webMatches || []);

            // Build search query
            const searchQuery = lookupResults.searchQuery ||
                lookupResults.bestGuess ||
                buildAccurateSearchQuery(cardInfo);

            // Create eBay Search URL
            const ebaySearchUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(searchQuery + ' trading card')}`;

            // Update card data with all information
            setCardData({
                playerName: cardInfo.name || 'Unknown Player',
                year: cardInfo.year || 'Unknown Year',
                manufacturer: cardInfo.manufacturer || 'Unknown Manufacturer',
                cardNumber: cardInfo.cardNumber || 'N/A',
                parallel: cardInfo.parallel || null,
                isRookie: cardInfo.rookie || false,
                isAutograph: cardInfo.autograph || false,
                isRelic: cardInfo.relic || false,
                searchQuery: searchQuery,
                ebaySearchUrl: ebaySearchUrl,
                frontImageUrl: frontUrl
            });

        } catch (error) {
            console.error('Error analyzing card:', error);
            Alert.alert('Error', 'Failed to analyze card images');
        } finally {
            setLoading(false);
        }
    };

    const rotateImage = () => {
        setImageRotation((prev) => (prev + 90) % 360);
    };

    const toggleZoom = () => {
        setImageZoomed(!imageZoomed);
        // Scroll to top when zooming
        if (!imageZoomed && scrollViewRef.current) {
            setTimeout(() => {
                scrollViewRef.current.scrollTo({ y: 0, animated: true });
            }, 100);
        }
    };

    const addToCollection = () => {
        AddToCollection(cardData.playerName,cardData.year,cardData.manufacturer,cardData.cardNumber,cardData.frontImageUrl);
        router.push("./collection");
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <View style={styles.loadingContent}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={styles.loadingText}>Analyzing your card...</Text>
                    <Text style={styles.loadingSubtext}>This may take a few moments</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                ref={scrollViewRef}
                style={styles.scrollView}
                contentContainerStyle={imageZoomed ? styles.zoomedScrollContent : styles.scrollContent}
                showsVerticalScrollIndicator={false}
                scrollEnabled={!imageZoomed}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Card Details</Text>
                </View>

                {/* Front Scan Image with Controls */}
                <View style={[styles.imageContainer, imageZoomed && styles.imageContainerZoomed]}>
                    <View style={styles.imageHeader}>
                        <View style={styles.imageHeaderLeft}>
                            <Ionicons name="scan" size={20} color="#4285F4" />
                            <Text style={styles.imageHeaderText}>Card Scan</Text>
                        </View>
                        <View style={styles.imageControls}>
                            <TouchableOpacity
                                style={styles.controlButton}
                                onPress={rotateImage}
                            >
                                <Ionicons name="refresh" size={20} color="#4285F4" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.controlButton}
                                onPress={toggleZoom}
                            >
                                <Ionicons
                                    name={imageZoomed ? "contract" : "expand"}
                                    size={20}
                                    color="#4285F4"
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity
                        activeOpacity={1}
                        onPress={toggleZoom}
                        style={[
                            styles.imageWrapper,
                            imageZoomed && styles.imageWrapperZoomed
                        ]}
                        disabled={imageLoading}
                    >
                        {imageLoading ? (
                            <View style={styles.imageLoadingContainer}>
                                <ActivityIndicator size="large" color="#4285F4" />
                                <Text style={styles.imageLoadingText}>Adjusting orientation...</Text>
                            </View>
                        ) : (
                            <View style={[
                                styles.imageRotateContainer,
                                { transform: [{ rotate: `${imageRotation}deg` }] }
                            ]}>
                                <Image
                                    source={{ uri: processedImageUrl || cardData.frontImageUrl }}
                                    style={[
                                        styles.cardImage,
                                        imageZoomed && styles.cardImageZoomed
                                    ]}
                                    resizeMode={imageZoomed ? "contain" : "contain"}
                                />
                            </View>
                        )}
                    </TouchableOpacity>

                    <View style={styles.imageFooter}>
                        <Text style={styles.imageHint}>
                            Tap image to {imageZoomed ? 'zoom out' : 'zoom in'} •
                            Rotate button to adjust orientation
                        </Text>
                    </View>
                </View>

                {/* Card Information */}
                <View style={styles.cardContainer}>
                    <Text style={styles.sectionTitle}>Card Information</Text>

                    {/* Player Name */}
                    <View style={styles.infoRow}>
                        <View style={styles.infoIcon}>
                            <Ionicons name="person" size={20} color="#007AFF" />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Player</Text>
                            <Text style={styles.infoValue}>{cardData.playerName}</Text>
                        </View>
                    </View>

                    {/* Year & Manufacturer Row */}
                    <View style={styles.doubleRow}>
                        <View style={[styles.infoRow, styles.halfWidth]}>
                            <View style={styles.infoIcon}>
                                <Ionicons name="calendar" size={20} color="#FF9500" />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Year</Text>
                                <Text style={styles.infoValue}>{cardData.year}</Text>
                            </View>
                        </View>

                        <View style={[styles.infoRow, styles.halfWidth]}>
                            <View style={styles.infoIcon}>
                                <Ionicons name="business" size={20} color="#5856D6" />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Manufacturer</Text>
                                <Text style={styles.infoValue}>{cardData.manufacturer}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Card Number */}
                    <View style={styles.infoRow}>
                        <View style={styles.infoIcon}>
                            <Ionicons name="pricetag" size={20} color="#FF3B30" />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Card Number</Text>
                            <Text style={styles.infoValue}>{cardData.cardNumber}</Text>
                        </View>
                    </View>

                    {/* Parallel (if exists) */}
                    {cardData.parallel && (
                        <View style={styles.infoRow}>
                            <View style={styles.infoIcon}>
                                <Ionicons name="sparkles" size={20} color="#AF52DE" />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Parallel</Text>
                                <Text style={styles.infoValue}>{cardData.parallel}</Text>
                            </View>
                        </View>
                    )}

                    {/* Card Features */}
                    {(cardData.isRookie || cardData.isAutograph || cardData.isRelic) && (
                        <View style={styles.featuresSection}>
                            <Text style={styles.featuresTitle}>Features</Text>
                            <View style={styles.featuresContainer}>
                                {cardData.isRookie && (
                                    <View style={[styles.featureBadge, styles.rookieBadge]}>
                                        <Ionicons name="star" size={14} color="#FFF" />
                                        <Text style={styles.featureText}>Rookie</Text>
                                    </View>
                                )}
                                {cardData.isAutograph && (
                                    <View style={[styles.featureBadge, styles.autographBadge]}>
                                        <Ionicons name="create" size={14} color="#FFF" />
                                        <Text style={styles.featureText}>Autograph</Text>
                                    </View>
                                )}
                                {cardData.isRelic && (
                                    <View style={[styles.featureBadge, styles.relicBadge]}>
                                        <Ionicons name="shirt" size={14} color="#FFF" />
                                        <Text style={styles.featureText}>Relic</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionsContainer}>
                    {/* eBay Button */}
                    <TouchableOpacity
                        style={styles.ebayButton}
                        onPress={() => {
                            Linking.openURL(cardData.ebaySearchUrl);
                        }}
                    >
                        <View style={styles.buttonContent}>
                            <Ionicons name="logo-ebay" size={24} color="#0063D1" />
                            <Text style={styles.ebayButtonText}>View on eBay</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Add to Collection Button - Single Color */}
                    <TouchableOpacity
                        style={styles.collectionButton}
                        onPress={addToCollection}
                    >
                        <View style={styles.buttonContent}>
                            <Ionicons name="add-circle" size={24} color="#6B4F8C" />
                            <Text style={styles.collectionButtonText}>Add to Collection</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Add spacing for bottom */}
                <View style={styles.bottomSpacer} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingContent: {
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 20,
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    loadingSubtext: {
        marginTop: 8,
        fontSize: 14,
        color: '#666',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 30,
    },
    zoomedScrollContent: {
        flexGrow: 1,
        paddingBottom: 30,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'ios' ? 20 : 30,
        paddingBottom: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1A1A1A',
        textAlign: 'center',
    },
    imageContainer: {
        backgroundColor: '#FFFFFF',
        marginTop: 16,
        marginHorizontal: 24,
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    imageContainerZoomed: {
        marginHorizontal: 0,
        marginTop: 0,
        borderRadius: 0,
        flex: 1,
        minHeight: '100%',
    },
    imageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    imageHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    imageHeaderText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginLeft: 8,
    },
    imageControls: {
        flexDirection: 'row',
        gap: 12,
    },
    controlButton: {
        padding: 8,
        backgroundColor: '#F0F8FF',
        borderRadius: 20,
    },
    imageWrapper: {
        width: '100%',
        height: 280,
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    imageWrapperZoomed: {
        height: 500,
        width: '100%',
    },
    imageRotateContainer: {
        width: '100%',
        height: '100%',
    },
    cardImage: {
        width: '100%',
        height: '100%',
    },
    cardImageZoomed: {
        width: '100%',
        height: '100%',
    },
    imageLoadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
    },
    imageLoadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#666',
    },
    imageFooter: {
        marginTop: 12,
        alignItems: 'center',
    },
    imageHint: {
        fontSize: 12,
        color: '#999',
        fontStyle: 'italic',
    },
    cardContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginHorizontal: 24,
        marginTop: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333',
        marginBottom: 20,
    },
    doubleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    halfWidth: {
        width: '48%',
    },
    infoRow: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    infoIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F0F8FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    infoContent: {
        flex: 1,
        justifyContent: 'center',
    },
    infoLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 2,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    infoValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    featuresSection: {
        marginTop: 8,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    featuresTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    featuresContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    featureBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginRight: 8,
        gap: 4,
    },
    rookieBadge: {
        backgroundColor: '#007AFF',
    },
    autographBadge: {
        backgroundColor: '#FF9500',
    },
    relicBadge: {
        backgroundColor: '#FF3B30',
    },
    featureText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    actionsContainer: {
        marginHorizontal: 24,
        marginTop: 20,
        gap: 12,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    ebayButton: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#0063D1',
        paddingVertical: 14,
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    ebayButtonText: {
        color: '#0063D1',
        fontSize: 18,
        fontWeight: '700',
        marginLeft: 10,
    },
    collectionButton: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#6B4F8C',
        paddingVertical: 14,
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    collectionButtonText: {
        color: '#6B4F8C',
        fontSize: 18,
        fontWeight: '700',
        marginLeft: 10,
    },
    bottomSpacer: {
        height: 30,
    },
});

export default ValueCard;