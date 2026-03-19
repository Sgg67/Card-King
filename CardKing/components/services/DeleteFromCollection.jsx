import { doc, deleteDoc } from 'firebase/firestore';
import { firestore } from '../config/FireBase';
import { getAuth } from 'firebase/auth';

export const DeleteFromCollection = async (cardId) => {
    try {
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (!user) {
            throw new Error('No authenticated user found');
        }
        
        // Correct path: card_collection/{userId}/cards/{cardId}
        const cardDocRef = doc(firestore, 'card_collection', user.uid, 'cards', cardId);
        await deleteDoc(cardDocRef);
        console.log('Document successfully deleted!');
        return true;
    } catch (error) {
        console.error('Error deleting document:', error);
        throw error;
    }
};