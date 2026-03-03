import {  getDocs, doc, getDoc, collection, query, orderBy } from 'firebase/firestore';
import { firestore, auth } from '../config/FireBase';

export const getCardsFromDB = async() => {
    const user = auth.currentUser;

    if(!user){
        return [];
    }

    try{
        const cardsRef = collection(firestore, 'card_collection', user.uid, 'cards');
        const q = query(cardsRef, orderBy('addedAt', 'desc'));
        const querySnapshot = await getDocs(q);

        const cards = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        return cards;
    } catch(error){
        console.error('Error fetching cards:', error);
        return [];
    }
};

export const getCardById = async(cardId) => {
    const user = auth.currentUser;

    if(!user) return null;

    try{
        const cardRef = doc(firestore, 'card_collection', user.uid, 'cards', cardId);
        const cardDoc = await getDoc(cardRef);

        if(cardDoc.exists()){
            return{
                id: cardDoc.id,
                ...cardDoc.data()
            };
        }
        return;
    } catch(error){
        console.error("Error fetching card:", error);
        return null;
    }
}