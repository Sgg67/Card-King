// components/common/GradeCard.jsx
// import useState from react
import React, { useState, useEffect, useRef } from "react";
// import UI components from react native
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
// import components from services
import { gradeCard } from "../services/GradeCardService";
import { useRouter } from 'expo-router';
import { AnalyzeCard } from "../services/AnalyzeCard";
import { AddToCollection } from "../services/AddToCollection";
import { AddToCollectionPokemon } from "../services/AddToCollectionPokemon";
import { extractCardInfo } from "../services/ExtractCardInfo";
import { extractPokemonCardInfo } from "../services/ExtractPokemonCardInfo";
import { getLatestScans } from "../services/RetrieveScans";
import { buildAccurateSearchQuery, lookupCardFromWebMatches } from "../services/CardLookupService";
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';

const GradeCard = () => {
    // create a constant router
    const router = useRouter();
    // create useState constants
    const [loading, setLoading] = useState(true);
    const [gradeLoading, setGradeLoading] = useState(false);
    const [cardGrade, setCardGrade] = useState(null);
    const [imageLoading, setImageLoading] = useState(true);
    const [imageZoomed, setImageZoomed] = useState(false);
    const [imageRotation, setImageRotation] = useState(0);
    const [processedImageUrl, setProcessedImageUrl] = useState(null);
    const [cardType, setCardType] = useState('sports');
    const scrollViewRef = useRef(null);
    const [cardData, setCardData] = useState({
        // Sports card fields
        playerName: null,
        year: null,
        manufacturer: null,
        cardNumber: null,
        parallel: null,
        isRookie: false,
        isAutograph: false,
        isRelic: false,
        
        // Pokémon card fields
        character: null,
        set: null,
        
        // Common fields
        searchQuery: null,
        ebaySearchUrl: null,
        frontImageUrl: null,
        backImageUrl: null
    });

    useEffect(() => {
        analyzeCardImages();
    }, []);

    useEffect(() => {
        if (cardData.frontImageUrl) {
            processImageOrientation(cardData.frontImageUrl);
        }
    }, [cardData.frontImageUrl]);

    useEffect(() => {
        if (cardData.frontImageUrl && cardData.backImageUrl) {
            fetchCardGrade();
        }
    }, [cardData.frontImageUrl, cardData.backImageUrl]);

    const processImageOrientation = async (imageUri) => {
        try {
            setImageLoading(true);
            
            const manipResult = await ImageManipulator.manipulateAsync(
                imageUri,
                [{ rotate: 0 }],
                { compress: 1, format: ImageManipulator.SaveFormat.JPEG, base64: false }
            );
            
            setProcessedImageUrl(manipResult.uri);
        } catch (error) {
            console.error('Error processing image orientation:', error);
            setProcessedImageUrl(imageUri);
        } finally {
            setImageLoading(false);
        }
    };

    // detect wether the card is pokemon or sports
    const detectCardType = (visionResults) => {
        const frontText = visionResults.front?.textAnnotations?.[0]?.description || '';
        const backText = visionResults.back?.textAnnotations?.[0]?.description || '';
        const combinedText = (frontText + ' ' + backText).toUpperCase();
        
        const pokemonKeywords = [
            'POKEMON', 'HP', 'WEAKNESS', 'RESISTANCE', 'RETREAT',
            'ILLUSTRATOR', 'BASIC', 'STAGE 1', 'STAGE 2', 'POKEMON POWER',
            'BODY', 'POKE-BODY', 'POKE-POWER', 'ABILITY', 'NINTENDO',
            'CREATURES', 'GAME FREAK', 'ENERGY', 'TRAINER', 'SUPPORTER'
        ];
        
        for (const keyword of pokemonKeywords) {
            if (combinedText.includes(keyword)) {
                console.log('🎴 Detected Pokémon card by keyword:', keyword);
                return 'pokemon';
            }
        }
        
        if (visionResults.front?.webDetection?.bestGuessLabels) {
            const guesses = visionResults.front.webDetection.bestGuessLabels;
            for (const guess of guesses) {
                const guessLower = guess.label.toLowerCase();
                if (guessLower.includes('pokemon') || guessLower.includes('pokémon')) {
                    return 'pokemon';
                }
            }
        }
        
        return 'sports';
    };

    const extractYearManually = (text) => {
        const copyrightMatch = text.match(/©\s*(\d{4})/i);
        if (copyrightMatch) return copyrightMatch[1];
        
        const yearMatch = text.match(/\b(19|20)\d{2}\b/);
        if (yearMatch) return yearMatch[0];
        
        return null;
    };

    const extractCardNumberManually = (text) => {
        const slashPattern = text.match(/\b(\d{1,4}\s*\/\s*\d{1,4})\b/);
        if (slashPattern) return slashPattern[1];
        
        const setPrefixPattern = text.match(/\b(SWSH|SM|XY|BW|DP|SSH|RCL|DAA|VIV|EVO)\d{1,4}\b/i);
        if (setPrefixPattern) return setPrefixPattern[0];
        
        return null;
    };
    // get the images from the card
    const analyzeCardImages = async () => {
        try {
            setLoading(true);

            const { frontUrl, backUrl } = await getLatestScans();

            if (!frontUrl || !backUrl) {
                Alert.alert('Error', 'No card images found. Please scan a card first.');
                return;
            }

            const visionResults = await AnalyzeCard(frontUrl, backUrl);
            
            const detectedType = detectCardType(visionResults);
            setCardType(detectedType);
            
            // if the card is pokemon analyze the Pokemon card using the extractPokemonCardInfo function
            let cardInfo;
            if (detectedType === 'pokemon') {
                cardInfo = extractPokemonCardInfo(visionResults);
                console.log('📋 Using Pokémon card extractor');
                
                if (!cardInfo.year) {
                    const manualYear = extractYearManually(cardInfo.fullText);
                    if (manualYear) {
                        cardInfo.year = manualYear;
                        console.log('📅 Manually extracted year:', manualYear);
                    }
                }
                
                if (!cardInfo.cardNumber || cardInfo.cardNumber === 'N/A') {
                    const manualCardNumber = extractCardNumberManually(cardInfo.fullText);
                    if (manualCardNumber) {
                        cardInfo.cardNumber = manualCardNumber;
                        console.log('🔢 Manually extracted card number:', manualCardNumber);
                    }
                }
                
                console.log('📦 Extracted Set:', cardInfo.set);
                console.log('🎴 Extracted Name:', cardInfo.name);
                console.log('🔢 Final Card Number:', cardInfo.cardNumber);
                console.log('📅 Final Year:', cardInfo.year);
            } else {
                cardInfo = extractCardInfo(visionResults);
                console.log('📋 Using sports card extractor');
            }
            
            const lookupResults = await lookupCardFromWebMatches(cardInfo, cardInfo.webMatches || []);
            
            let searchQuery;
            if (detectedType === 'pokemon') {
                searchQuery = lookupResults.searchQuery ||
                    `${cardInfo.year || ''} ${cardInfo.set || ''} ${cardInfo.name || ''} Pokemon Card`.trim();
            } else {
                searchQuery = lookupResults.searchQuery ||
                    lookupResults.bestGuess ||
                    buildAccurateSearchQuery(cardInfo);
            }

            const ebaySearchUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(searchQuery + ' trading card')}`;
            // set the card data with neccesary fields for pokemon data
            if (detectedType === 'pokemon') {
                setCardData({
                    playerName: cardInfo.name || 'Unknown Pokémon',
                    manufacturer: 'Pokémon',
                    character: cardInfo.name || 'Unknown Pokémon',
                    set: cardInfo.set || 'Unknown Set',
                    year: cardInfo.year || 'Unknown Year',
                    cardNumber: cardInfo.cardNumber || 'N/A',
                    parallel: cardInfo.parallel || null,
                    isRookie: false,
                    isAutograph: cardInfo.autograph || false,
                    isRelic: cardInfo.relic || false,
                    searchQuery: searchQuery,
                    ebaySearchUrl: ebaySearchUrl,
                    frontImageUrl: frontUrl,
                    backImageUrl: backUrl
                });
            } else {
                // otherwise set the data as a sports card
                setCardData({
                    playerName: cardInfo.name || 'Unknown Player',
                    manufacturer: cardInfo.manufacturer || 'Unknown Manufacturer',
                    year: cardInfo.year || 'Unknown Year',
                    cardNumber: cardInfo.cardNumber || 'N/A',
                    parallel: cardInfo.parallel || null,
                    isRookie: cardInfo.rookie || false,
                    isAutograph: cardInfo.autograph || false,
                    isRelic: cardInfo.relic || false,
                    character: null,
                    set: null,
                    searchQuery: searchQuery,
                    ebaySearchUrl: ebaySearchUrl,
                    frontImageUrl: frontUrl,
                    backImageUrl: backUrl
                });
            }

        } catch (error) {
            console.error('Error analyzing card:', error);
            Alert.alert('Error', 'Failed to analyze card images');
        } finally {
            setLoading(false);
        }
    };

    // this function calls the Ximilar API and gets back the grade
    const fetchCardGrade = async () => {
        if (!cardData.frontImageUrl || !cardData.backImageUrl) return;
        
        setGradeLoading(true);
        try {
            const gradeResult = await gradeCard(cardData.frontImageUrl, cardData.backImageUrl);
            console.log('Grade result:', JSON.stringify(gradeResult, null, 2));
            setCardGrade(gradeResult);
        } catch (error) {
            console.error('Error fetching card grade:', error);
            setCardGrade(null);
            Alert.alert(
                'Grading Error',
                'Unable to grade the card at this time. Please try again.',
                [{ text: 'OK' }]
            );
        } finally {
            setGradeLoading(false);
        }
    };

    const rotateImage = () => {
        setImageRotation((prev) => (prev + 90) % 360);
    };

    const toggleZoom = () => {
        setImageZoomed(!imageZoomed);
        if (!imageZoomed && scrollViewRef.current) {
            setTimeout(() => {
                scrollViewRef.current.scrollTo({ y: 0, animated: true });
            }, 100);
        }
    };

    // set color cordination for grading
    const getGradeDetails = (grade) => {
        if (grade >= 9.5) return { color: '#1B5E20', text: 'Gem Mint', range: '9.5-10' };
        if (grade >= 9) return { color: '#2E7D32', text: 'Mint', range: '9' };
        if (grade >= 8) return { color: '#388E3C', text: 'Near Mint-Mint', range: '8' };
        if (grade >= 7) return { color: '#F57C00', text: 'Near Mint', range: '7' };
        if (grade >= 6) return { color: '#F9A825', text: 'Excellent-Mint', range: '6' };
        if (grade >= 5) return { color: '#FBC02D', text: 'Excellent', range: '5' };
        if (grade >= 4) return { color: '#E64A19', text: 'Very Good', range: '4' };
        if (grade >= 3) return { color: '#D32F2F', text: 'Good', range: '3' };
        if (grade >= 2) return { color: '#C2185B', text: 'Fair', range: '2' };
        return { color: '#7B1FA2', text: 'Poor', range: '1' };
    };

    const formatGradeDisplay = () => {
        if (gradeLoading) {
            return (
                <View style={styles.gradeLoadingContainer}>
                    <ActivityIndicator size="small" color="#4CAF50" />
                    <Text style={styles.gradeLoadingText}>Grading card...</Text>
                </View>
            );
        }
        
        if (!cardGrade || !cardGrade.grade) {
            return (
                <View style={styles.noGradeContainer}>
                    <Ionicons name="alert-circle-outline" size={24} color="#999" />
                    <Text style={styles.infoValueNoGrade}>Grade unavailable</Text>
                </View>
            );
        }
        
        const finalGrade = cardGrade.grade;
        const gradeDetails = getGradeDetails(finalGrade);
        
        return (
            <View style={styles.gradeContainer}>
                <View style={styles.gradeHeader}>
                    <View style={[styles.gradeBadge, { backgroundColor: gradeDetails.color }]}>
                        <Text style={styles.gradeBadgeText}>{gradeDetails.text}</Text>
                    </View>
                    <Text style={[styles.infoValueGrade, { color: gradeDetails.color }]}>
                        {finalGrade.toFixed(1)}
                    </Text>
                </View>
                
                {cardGrade.subgrades && (
                    <View style={styles.subgradesGrid}>
                        {cardGrade.subgrades.centering !== undefined && (
                            <View style={styles.subgradeCard}>
                                <Text style={styles.subgradeLabel}>Centering</Text>
                                <Text style={styles.subgradeValue}>{cardGrade.subgrades.centering}</Text>
                            </View>
                        )}
                        {cardGrade.subgrades.corners !== undefined && (
                            <View style={styles.subgradeCard}>
                                <Text style={styles.subgradeLabel}>Corners</Text>
                                <Text style={styles.subgradeValue}>{cardGrade.subgrades.corners}</Text>
                            </View>
                        )}
                        {cardGrade.subgrades.edges !== undefined && (
                            <View style={styles.subgradeCard}>
                                <Text style={styles.subgradeLabel}>Edges</Text>
                                <Text style={styles.subgradeValue}>{cardGrade.subgrades.edges}</Text>
                            </View>
                        )}
                        {cardGrade.subgrades.surface !== undefined && (
                            <View style={styles.subgradeCard}>
                                <Text style={styles.subgradeLabel}>Surface</Text>
                                <Text style={styles.subgradeValue}>{cardGrade.subgrades.surface}</Text>
                            </View>
                        )}
                    </View>
                )}
                
                {cardGrade.condition && (
                    <View style={styles.conditionContainer}>
                        <Text style={styles.conditionText}>Condition: {cardGrade.condition}</Text>
                    </View>
                )}
            </View>
        );
    };

    const addToCollection = () => {
        if (cardType === 'pokemon') {
            AddToCollectionPokemon(
                cardData.character,
                cardData.year,
                'Pokémon',
                cardData.cardNumber,
                cardData.frontImageUrl,
                null,
                cardGrade?.grade 
            );
        } else {
            AddToCollection(
                cardData.playerName,
                cardData.year,
                cardData.manufacturer,
                cardData.cardNumber,
                cardData.frontImageUrl,
                null,
                cardGrade?.grade 
            );
        }
        router.push("./collection");
    };

    const goHome = () => {
        router.push('/scanner');
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
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>
                        {cardType === 'pokemon' ? 'Pokémon Card Details' : 'Card Details'}
                    </Text>
                    {cardType === 'pokemon' && (
                        <View style={styles.typeBadge}>
                            <Text style={styles.typeBadgeText}>Pokémon</Text>
                        </View>
                    )}
                </View>

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
                            Tap image to {imageZoomed ? 'zoom out' : 'zoom in'} • Rotate to adjust
                        </Text>
                    </View>
                </View>

                <View style={styles.cardContainer}>
                    <Text style={styles.sectionTitle}>Card Information</Text>

                    {cardType === 'pokemon' ? (
                        <>
                            <View style={styles.infoRow}>
                                <View style={styles.infoIcon}>
                                    <Ionicons name="person" size={20} color="#007AFF" />
                                </View>
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Pokémon</Text>
                                    <Text style={styles.infoValue}>{cardData.character}</Text>
                                </View>
                            </View>

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
                                        <Ionicons name="cube" size={20} color="#5856D6" />
                                    </View>
                                    <View style={styles.infoContent}>
                                        <Text style={styles.infoLabel}>Set</Text>
                                        <Text style={styles.infoValue}>{cardData.set}</Text>
                                    </View>
                                </View>
                            </View>
                        </>
                    ) : (
                        <>
                            <View style={styles.infoRow}>
                                <View style={styles.infoIcon}>
                                    <Ionicons name="person" size={20} color="#007AFF" />
                                </View>
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Player</Text>
                                    <Text style={styles.infoValue}>{cardData.playerName}</Text>
                                </View>
                            </View>

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
                        </>
                    )}

                    <View style={styles.infoRow}>
                        <View style={styles.infoIcon}>
                            <Ionicons name="pricetag" size={20} color="#FF3B30" />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Card Number</Text>
                            <Text style={styles.infoValue}>{cardData.cardNumber}</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <View style={styles.infoIcon}>
                            <Ionicons name="ribbon" size={20} color="#4CAF50" />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Card Grade</Text>
                            {formatGradeDisplay()}
                        </View>
                    </View>

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

                    {cardType === 'sports' && (cardData.isRookie || cardData.isAutograph || cardData.isRelic) && (
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

                <View style={styles.actionsContainer}>
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

                    <TouchableOpacity
                        style={styles.collectionButton}
                        onPress={addToCollection}
                    >
                        <View style={styles.buttonContent}>
                            <Ionicons name="add-circle" size={24} color="#6B4F8C" />
                            <Text style={styles.collectionButtonText}>Add to Collection</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.homeButton}
                        onPress={goHome}
                    >
                        <View style={styles.buttonContent}>
                            <MaterialCommunityIcons name="crown" size={24} color="#FFD700" />
                            <Text style={styles.homeButtonText}>Home</Text>
                        </View>
                    </TouchableOpacity>
                </View>

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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1A1A1A',
        flex: 1,
    },
    typeBadge: {
        backgroundColor: '#FFD700',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginLeft: 12,
    },
    typeBadgeText: {
        color: '#1A1A2E',
        fontSize: 14,
        fontWeight: '700',
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
        marginBottom: 30,
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
    homeButton: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#FFD700',
        paddingVertical: 14,
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    homeButtonText: {
        color: '#FFD700',
        fontSize: 18,
        fontWeight: '700',
        marginLeft: 10,
    },
    bottomSpacer: {
        height: 30,
    },
    gradeLoadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    gradeLoadingText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#666',
        fontStyle: 'italic',
    },
    noGradeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    infoValueNoGrade: {
        fontSize: 16,
        color: '#999',
        fontStyle: 'italic',
    },
    gradeContainer: {
        marginTop: 4,
    },
    gradeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    gradeBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    gradeBadgeText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    infoValueGrade: {
        fontSize: 36,
        fontWeight: '800',
    },
    subgradesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginTop: 8,
        gap: 8,
    },
    subgradeCard: {
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        padding: 12,
        width: '48%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    subgradeLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    subgradeValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
    },
    conditionContainer: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        alignItems: 'center',
    },
    conditionText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
});

export default GradeCard;