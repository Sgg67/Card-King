import { getDoc } from 'firebase/firestore';
import { storage, auth, firestore } from '../config/FireBase';
import { Alert } from 'react-native';
import { doc, setDoc, collection, addDoc } from 'firebase/firestore';

// This function ensures the user document exists, but you're mixing schema with data
const ensureUserDocument = async (user) => {
    try {
        const userDoc = await getDoc(doc(firestore, 'card_collection', user.uid));

        if (!userDoc.exists()) {
            // Create a user document with just the UID initially
            // Don't put schema definitions (String, Number) as values
            await setDoc(doc(firestore, 'card_collection', user.uid), {
                uid: user.uid,
                createdAt: new Date().toISOString(),
                // cards will be stored in a subcollection instead
            });
        }
    } catch (error) {
        console.error("Error ensuring user document:", error);
        Alert.alert('Error', 'Failed to initialize user collection');
    }
};


// Fixed AddToCollection function
export const AddToCollection = async (name, year, manufacturer, card_number, front_scan) => {
    
    const user = auth.currentUser;
    
    if (!user) {
        Alert.alert('Not Signed In', 'Please sign in to add cards to profile');
        return;
    }
    
    try {
        // First, ensure the user document exists
        await ensureUserDocument(user);
        
        // Create a reference to the user's cards subcollection
        // This is better than overwriting the user document for each card
        const userCardsRef = collection(firestore, 'card_collection', user.uid, 'cards');
        
        // Add a new document to the subcollection with auto-generated ID
        const cardData = {
            player: name,
            year: year,
            manufacturer: manufacturer,
            card_number: card_number,
            image: front_scan,
            addedAt: new Date().toISOString(),
        };
        
        // Use addDoc to create a new card document instead of overwriting the user doc
        const docRef = await addDoc(userCardsRef, cardData);
        
        
        Alert.alert('Success', 'Card added to collection!');
        return docRef.id; // Return the new document ID
        
    } catch (error) {
        console.error("Error adding card to collection:", error);
        Alert.alert('Error', 'Failed to add card to collection');
        throw error; // Re-throw if you want to handle it in the calling component
    }
};