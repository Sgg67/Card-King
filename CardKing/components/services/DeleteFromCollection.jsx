import { getDoc, doc, deleteDoc } from 'firebase/firestore';
import { firestore } from '../config/FireBase';

export const DeleteFromCollection = async (user) => {
    try {
        const userDocRef = doc(firestore, 'card_collection', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            await deleteDoc(userDocRef);
            console.log('Document successfully deleted!');
        } else {
            console.log('No document to delete');
        }
    } catch (error) {
        console.error('Error deleting document:', error);
    }
};