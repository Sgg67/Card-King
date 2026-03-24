// config/FireBase.jsx
import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendPasswordResetEmail as firebaseSendResetEmail
} from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';
import Constants from 'expo-constants';

// Get config from app.config.js
const extra = Constants.expoConfig?.extra || {};

const firebaseConfig = {
  apiKey: extra.firebaseApiKey,
  authDomain: extra.firebaseAuthDomain,
  projectId: extra.firebaseProjectId,
  storageBucket: extra.firebaseStorageBucket,
  messagingSenderId: extra.firebaseMessagingSenderId,
  appId: extra.firebaseAppId,
  measurementId: extra.firebaseMeasurementId
};

// Validate config silently
const isConfigValid = firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId;

// Singleton pattern - prevents multiple initializations
let app;
let auth;
let storage; 
let firestore;

try {
  if (!getApps().length) {
    if (!isConfigValid) {
      throw new Error('Firebase configuration is invalid. Check environment variables.');
    }
    
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  auth = getAuth(app);
  storage = getStorage(app);
  firestore = getFirestore(app);
  
} catch (error) {
  console.error('Firebase initialization failed');
  // Don't throw - let the app continue
}

// Auth functions
export const signUp = async (email, password) => {
  if (!auth) {
    return { 
      success: false, 
      error: 'Authentication service not available.',
      userMessage: 'Authentication service not available.',
      code: 'auth/not-initialized'
    };
  }
  
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Auto-create user document in Firestore
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      await setDoc(doc(firestore, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        profileImage: null
      });
    } catch (firestoreError) {
      // Silently handle Firestore error
    }
    
    return { 
      success: true, 
      user: userCredential.user,
      userMessage: 'Account created successfully!' 
    };
  } catch (error) {
    let userMessage = 'Sign up failed. Please try again.';
    switch (error.code) {
      case 'auth/email-already-in-use':
        userMessage = 'This email is already registered.';
        break;
      case 'auth/invalid-email':
        userMessage = 'Please enter a valid email address.';
        break;
      case 'auth/weak-password':
        userMessage = 'Password must be at least 6 characters.';
        break;
    }
    
    return { 
      success: false, 
      error: error.message,
      userMessage,
      code: error.code
    };
  }
};

export const signIn = async (email, password) => {
  if (!auth) {
    return { 
      success: false, 
      error: 'Authentication service not available.',
      userMessage: 'Authentication service not available.',
      code: 'auth/not-initialized'
    };
  }
  
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { 
      success: true, 
      user: userCredential.user,
      userMessage: 'Signed in successfully!' 
    };
  } catch (error) {
    let userMessage = 'Sign in failed. Please check your credentials.';
    switch (error.code) {
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        userMessage = 'Invalid email or password.';
        break;
    }
    
    return { 
      success: false, 
      error: error.message,
      userMessage,
      code: error.code
    };
  }
};

// Password reset function
export const sendPasswordResetEmail = async (email) => {
  if (!auth) {
    return { 
      success: false, 
      error: 'Authentication service not available.',
      userMessage: 'Authentication service not available.',
      code: 'auth/not-initialized'
    };
  }
  
  try {
    // try to send password reset email
    await firebaseSendResetEmail(auth, email);
    return { 
      success: true,
      userMessage: 'Password reset email sent! Check your inbox.' 
    };
  } catch (error) {
    let userMessage = 'Failed to send reset email. Please try again.';
    switch (error.code) {
      case 'auth/user-not-found':
        userMessage = 'No account found with this email address.';
        break;
      case 'auth/invalid-email':
        userMessage = 'Please enter a valid email address.';
        break;
      case 'auth/too-many-requests':
        userMessage = 'Too many attempts. Please try again later.';
        break;
    }
    
    return { 
      success: false, 
      error: error.message,
      userMessage,
      code: error.code
    };
  }
};

export { auth, storage, firestore };

// Helper to check if config is loaded
export const getFirebaseConfig = () => ({
  isConfigured: !!auth,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  firestoreDatabaseId: 'default',
});