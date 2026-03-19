// app.config.js
import 'dotenv/config';

export default {
  expo: {
    name: "CardKing",
    slug: "cardking",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/images/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.yourname.cardking"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.yourname.cardking"
    },
    web: {
      favicon: "./assets/images/favicon.png"
    },
    scheme: "cardking",
    extra: {
      eas: {
        projectId: "d108afc6-1acb-4b8a-8204-f7155cfec596"
      },
      ximilarApiKey: process.env.EXPO_XIMILAR_API_KEY,
      googleVisionApiKey: process.env.GOOGLE_VISION_API_KEY,
      firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      firebaseMeasurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
    },
    packagerOpts: {
      sourceExts: ["js", "jsx", "ts", "tsx"]
    }
  }
};