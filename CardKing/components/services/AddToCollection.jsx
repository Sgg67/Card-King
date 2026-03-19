import { getDoc } from 'firebase/firestore';
import { storage, auth, firestore } from '../config/FireBase';
import { Alert } from 'react-native';
import { doc, setDoc, collection, addDoc } from 'firebase/firestore';
import { EventRegister } from 'react-native-event-listeners';

// This function ensures the user document exists
const ensureUserDocument = async (user) => {
    try {
        const userDoc = await getDoc(doc(firestore, 'card_collection', user.uid));

        if (!userDoc.exists()) {
            await setDoc(doc(firestore, 'card_collection', user.uid), {
                uid: user.uid,
                createdAt: new Date().toISOString(),
            });
        }
    } catch (error) {
        console.error("Error ensuring user document:", error);
        Alert.alert('Error', 'Failed to initialize user collection');
    }
};

// AddToCollection function for sports cards
export const AddToCollection = async (name, year, manufacturer, card_number, front_scan, price, grade) => {
    
    const user = auth.currentUser;
    
    if (!user) {
        Alert.alert('Not Signed In', 'Please sign in to add cards to profile');
        return;
    }
    
    try {
        // First, ensure the user document exists
        await ensureUserDocument(user);
        
        // Create a reference to the user's cards subcollection
        const userCardsRef = collection(firestore, 'card_collection', user.uid, 'cards');
        
        // Add a new document to the subcollection with auto-generated ID
        const cardData = {
            player: name,
            year: year,
            manufacturer: manufacturer,
            card_number: card_number,
            image: front_scan,
            addedAt: new Date().toISOString(),
            price: price,
            grade: grade,
            cardType: 'sports' // Add type identifier
        };
        
        // Use addDoc to create a new card document
        const docRef = await addDoc(userCardsRef, cardData);
        
        // Emit event to refresh collection view
        EventRegister.emit('cardAdded');
        
        Alert.alert('Success', 'Card added to collection!');
        return docRef.id; // Return the new document ID
        
    } catch (error) {
        console.error("Error adding card to collection:", error);
        Alert.alert('Error', 'Failed to add card to collection');
        throw error;
    }
};