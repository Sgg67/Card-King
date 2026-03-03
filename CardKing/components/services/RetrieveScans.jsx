import { firestore, auth } from "../config/FireBase";
import {doc, getDoc } from "firebase/firestore";
export const getLatestScans = async () => {
    try {
        const user = auth?.currentUser;
        if (!user) {
            throw new Error('No user logged in');
        }

        const userRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            return { front: null, back: null };
        }

        const userData = userDoc.data();

        // Get the front and back of cards from array and sort by the date
        const frontScans = userData.frontScans || [];
        const sortedFront = frontScans.sort((a, b) =>
            new Date(b.uploadedAt) - new Date(a.uploadedAt)
        );

        const backScans = userData.backScans || [];
        const sortedBack = backScans.sort((a, b) =>
            new Date(b.uploadedAt) - new Date(a.uploadedAt)
        );

        return {
            frontUrl: sortedFront[0]?.imageUrl || null,
            backUrl: sortedBack[0]?.imageUrl || null
        };
    } catch (error){
        console.error('Error retrieving scan URLs: ', error);
        return { frontUrl: null, backUrl: null, error: error.message};
    }
}