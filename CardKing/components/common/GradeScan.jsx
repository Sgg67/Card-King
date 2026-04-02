// components/common/GradeScan.jsx
// import camera and permissions from expo
import { CameraView, useCameraPermissions } from 'expo-camera';
// import useState from react
import { useState, useRef, useEffect } from 'react';
// import UI components from React
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  Modal,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Animated
} from 'react-native';
import { useRouter } from 'expo-router'
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AntDesign from '@expo/vector-icons/AntDesign';
// import auth, storage, and firestore form FireBase config file
import { auth, storage, firestore } from '../config/FireBase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const SCAN_RECT_WIDTH = width * 0.8;
const SCAN_RECT_HEIGHT = SCAN_RECT_WIDTH * 1.4;

// Custom Alert Component
const CustomAlert = ({ visible, title, message, onClose, type = 'success' }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 10,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto close after 1 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 1000);

      return () => clearTimeout(timer);
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <AntDesign name="checkcircle" size={40} color="#4CAF50" />;
      case 'error':
        return <AntDesign name="closecircle" size={40} color="#FF3B30" />;
      case 'info':
        return <Ionicons name="information-circle" size={40} color="#2196F3" />;
      default:
        return <AntDesign name="checkcircle" size={40} color="#4CAF50" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return '#E8F5E9';
      case 'error':
        return '#FFEBEE';
      case 'info':
        return '#E3F2FD';
      default:
        return '#E8F5E9';
    }
  };

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={styles.customAlertOverlay}>
        <Animated.View 
          style={[
            styles.customAlertContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
              backgroundColor: getBackgroundColor(),
            }
          ]}
        >
          <View style={styles.customAlertIcon}>
            {getIcon()}
          </View>
          <Text style={styles.customAlertTitle}>{title}</Text>
          <Text style={styles.customAlertMessage}>{message}</Text>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default function GradeScan() {
  const router = useRouter();
  // intialize const useState variables
  const [showFinishButton, setShowFinishButton] = useState(false);
  const [facing, setFacing] = useState('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [isFrontScanned, setIsFrontScanned] = useState(false);
  const [isBackScanned, setIsBackScanned] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [scanSessionId, setScanSessionId] = useState(null);
  const [customAlert, setCustomAlert] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'success'
  });
  const cameraRef = useRef(null);

  // Check if user has seen instructions before
  useEffect(() => {
    checkFirstTimeUser();
  }, []);

  const checkFirstTimeUser = async () => {
    try {
      const hasSeenInstructions = await AsyncStorage.getItem('hasSeenInstructions');
      if (!hasSeenInstructions) {
        setShowInstructions(true);
      }
    } catch (error) {
      console.log('Error checking first time user:', error);
    }
  };

  const handleInstructionsComplete = async () => {
    setShowInstructions(false);
    try {
      await AsyncStorage.setItem('hasSeenInstructions', 'true');
    } catch (error) {
      console.log('Error saving instructions preference:', error);
    }
  };

  const showCustomAlert = (title, message, type = 'success') => {
    setCustomAlert({
      visible: true,
      title,
      message,
      type
    });
  };

  const uploadImageToFirebase = async (imageUri, side, sessionId) => {
    try {
      const user = auth?.currentUser;
      if (!user) {
        showCustomAlert('Authentication Required', 'Please sign in to scan cards', 'error');
        return null;
      }

      // Convert image to blob
      const blob = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function () {
          resolve(xhr.response);
        };
        xhr.onerror = function (e) {
          reject(new Error('Failed to convert image'));
        };
        xhr.onabort = function () {
          reject(new Error('Aborted'));
        };
        xhr.open('GET', imageUri);
        xhr.responseType = 'blob';
        xhr.send();
      });

      // Store blob size BEFORE closing it
      const blobSize = blob.size;

      const timestamp = Date.now();
      const fileName = `${sessionId}_${timestamp}.jpg`;

      // Store in separate folders based on side
      const storagePath = `card_scans/${user.uid}/${side}/${fileName}`;
      const storageRef = ref(storage, storagePath);

      await uploadBytes(storageRef, blob, {
        contentType: 'image/jpeg',
        customMetadata: {
          userId: user.uid,
          side: side,
          sessionId: sessionId,
          timestamp: timestamp.toString()
        }
      });

      // Close blob AFTER upload is complete
      blob.close();

      const downloadURL = await getDownloadURL(storageRef);

      // Save to Firestore
      const userRef = doc(firestore, 'users', user.uid);

      const scanRecord = {
        sessionId,
        side,
        imageUrl: downloadURL,
        storagePath: storagePath,
        uploadedAt: new Date().toISOString(),
        fileSize: blobSize,
        fileName: fileName
      };

      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();

        const updates = {
          updatedAt: new Date().toISOString()
        };

        if (side === 'front') {
          updates.frontScans = arrayUnion(scanRecord);
          if (userData.scans && Array.isArray(userData.scans)) {
            updates.scans = arrayUnion(scanRecord);
          } else {
            updates.scans = [scanRecord];
          }
        } else {
          updates.backScans = arrayUnion(scanRecord);
          if (userData.scans && Array.isArray(userData.scans)) {
            updates.scans = arrayUnion(scanRecord);
          } else {
            updates.scans = [scanRecord];
          }
        }

        await updateDoc(userRef, updates);
      } else {
        const scanData = {
          uid: user.uid,
          email: user.email,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          scans: [scanRecord]
        };

        if (side === 'front') {
          scanData.frontScans = [scanRecord];
          scanData.backScans = [];
        } else {
          scanData.frontScans = [];
          scanData.backScans = [scanRecord];
        }

        await setDoc(userRef, scanData);
      }

      // Update scan session
      const sessionRef = doc(firestore, 'scan_sessions', sessionId);
      const sessionData = {
        userId: user.uid,
        [`${side}ImageUrl`]: downloadURL,
        [`${side}StoragePath`]: storagePath,
        [`${side}UploadedAt`]: new Date().toISOString(),
        [`${side}FileSize`]: blobSize,
        [`${side}FileName`]: fileName,
        status: side === 'front' ? 'front_completed' : 'back_completed',
        updatedAt: new Date().toISOString()
      };

      const sessionDoc = await getDoc(sessionRef);

      if (sessionDoc.exists()) {
        await updateDoc(sessionRef, sessionData);
      } else {
        sessionData.createdAt = new Date().toISOString();
        await setDoc(sessionRef, sessionData);
      }

      return downloadURL;

    } catch (error) {
      console.log('Upload error:', error);
      showCustomAlert('Upload Error', 'Failed to upload image. Please try again.', 'error');
      return null;
    }
  };

  const handleScan = async () => {
    if (cameraRef.current) {
      try {
        setIsUploading(true);

        if (!auth?.currentUser) {
          setIsUploading(false);
          showCustomAlert('Authentication Required', 'Please sign in to scan cards', 'error');
          return;
        }

        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          skipProcessing: false,
          exif: true,
        });

        if (!isFrontScanned) {
          const sessionId = `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          setScanSessionId(sessionId);
          // send the front of the card image to firebase
          await uploadImageToFirebase(photo.uri, 'front', sessionId);

          setIsFrontScanned(true);
          showCustomAlert('Front Scanned!', 'Front image uploaded successfully. Now flip the card and scan the back side.', 'success');
        } else {
          // send the back of the card image to firebase
          await uploadImageToFirebase(photo.uri, 'back', scanSessionId);

          setIsBackScanned(true);
          setShowFinishButton(true);
          showCustomAlert('Scan Complete!', 'Both sides have been scanned and uploaded successfully.', 'success');
        }
      } catch (error) {
        console.log('Camera error:', error);
        showCustomAlert('Camera Error', 'Failed to capture image. Please try again.', 'error');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleFinishScan = () => {
    // Simply navigate to the grade page - it will handle all the analysis
    router.push('/grade');
  };

  const resetScan = () => {
    setIsFrontScanned(false);
    setIsBackScanned(false);
    setScanSessionId(null);
    setIsUploading(false);
    setShowFinishButton(false);
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  return (
    <View style={styles.container}>
      {/* Custom Alert */}
      <CustomAlert
        visible={customAlert.visible}
        title={customAlert.title}
        message={customAlert.message}
        type={customAlert.type}
        onClose={() => setCustomAlert({ ...customAlert, visible: false })}
      />

      {/* Instructions Modal */}
      <Modal
        visible={showInstructions}
        transparent={true}
        animationType='slide'
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleInstructionsComplete}
            >
              <Ionicons name='close' size={24} color='#666' />
            </TouchableOpacity>

            <View style={styles.instructionIcon}>
              <View style={styles.tradingCard}>
                <View style={[styles.cardCorner, styles.tl]} />
                <View style={[styles.cardCorner, styles.tr]} />
                <View style={styles.cardContent}>
                  <View style={styles.cardStripe} />
                  <View style={styles.cardCircle} />
                  <View style={styles.cardLines}>
                    <View style={styles.cardLine} />
                    <View style={[styles.cardLine, styles.cardLineShort]} />
                  </View>
                </View>
                <View style={[styles.cardCorner, styles.bl]} />
                <View style={[styles.cardCorner, styles.br]} />
              </View>
            </View>

            <Text style={styles.modalTitle}>How to Scan</Text>

            <View style={styles.instructionStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.instructionText}>
                Place the card inside the rectangle
              </Text>
            </View>

            <View style={styles.instructionStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.instructionText}>
                Ensure good lighting and no glare
              </Text>
            </View>

            <View style={styles.instructionStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.instructionText}>
                Tap the camera button to scan front
              </Text>
            </View>

            <View style={styles.instructionStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <Text style={styles.instructionText}>
                Flip the card and scan the back
              </Text>
            </View>

            <TouchableOpacity
              style={styles.startButton}
              onPress={handleInstructionsComplete}
            >
              <Text style={styles.startButtonText}>Start Scanning</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Camera View */}
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
      >
        <SafeAreaView style={styles.statusBar}>
          <View style={styles.statusContainer}>
            <View style={styles.statusItem}>
              <View style={[
                styles.statusDot,
                isFrontScanned && styles.statusDotActive
              ]} />
              <Text style={styles.statusText}>Front</Text>
            </View>
            <View style={styles.statusItem}>
              <View style={[
                styles.statusDot,
                isBackScanned && styles.statusDotActive
              ]} />
              <Text style={styles.statusText}>Back</Text>
            </View>
          </View>

          {isUploading && (
            <View style={styles.uploadIndicator}>
              <ActivityIndicator size="small" color="#FFD700" />
              <Text style={styles.uploadText}>
                {isFrontScanned ? 'Uploading back...' : 'Uploading front...'}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.helpButton}
            onPress={() => setShowInstructions(true)}
          >
            <Ionicons name="help-circle-outline" size={24} color="white" />
          </TouchableOpacity>
        </SafeAreaView>

        <View style={styles.overlay}>
          <View style={styles.scanRectContainer}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={styles.scanRect}>
              <Text style={styles.scanGuideText}>
                {isFrontScanned ? 'Scan Back Side' : 'Scan Front Side'}
              </Text>
              {/* Removed the middle-of-screen upload indicator */}
            </View>
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>
        </View>

        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={resetScan}
            disabled={(!isFrontScanned && !isBackScanned) || isUploading}
          >
            <MaterialIcons
              name="refresh"
              size={24}
              color={(isFrontScanned || isBackScanned) && !isUploading ? "white" : "#666"}
            />
            <Text style={[
              styles.secondaryButtonText,
              ((!isFrontScanned && !isBackScanned) || isUploading) && styles.disabledText
            ]}>
              Reset
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.captureButton,
              (isFrontScanned && isBackScanned) && styles.captureButtonDisabled,
              isUploading && styles.captureButtonDisabled
            ]}
            onPress={handleScan}
            disabled={isUploading || (isFrontScanned && isBackScanned)}
          >
            <View style={styles.captureButtonInner}>
              {isUploading && (
                <ActivityIndicator size="small" color="#1A1A2E" />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.secondaryButton,
              isUploading && styles.disabledButton
            ]}
            onPress={toggleCameraFacing}
            disabled={isUploading}
          >
            <Ionicons
              name="camera-reverse"
              size={24}
              color={isUploading ? "#666" : "white"}
            />
            <Text style={[
              styles.secondaryButtonText,
              isUploading && styles.disabledText
            ]}>
              Flip
            </Text>
          </TouchableOpacity>
        </View>

        {/* FINISH BUTTON */}
        {showFinishButton && (
          <TouchableOpacity
            style={styles.finishButton}
            onPress={handleFinishScan}
            disabled={isUploading}
          >
            <View style={styles.finishButtonContent}>
              <AntDesign name="stock" size={24} color="#1A1A2E" />
              <Text style={styles.finishButtonText}>
                {isUploading ? 'Loading...' : 'Grade Card'}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1A1A2E',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 30,
    width: '90%',
    alignItems: 'center',
    elevation: 8,
  },
  permissionIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  permissionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A2E',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  permissionButton: {
    backgroundColor: '#1A1A2E',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  permissionHint: {
    fontSize: 14,
    color: '#999',
    marginTop: 20,
    textAlign: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 30,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    zIndex: 1,
  },
  instructionIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A2E',
    marginBottom: 24,
    textAlign: 'center',
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1A1A2E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepNumberText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  instructionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  startButton: {
    backgroundColor: '#1A1A2E',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    marginTop: 24,
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  statusBar: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#666',
    marginRight: 8,
  },
  statusDotActive: {
    backgroundColor: '#4CAF50',
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  helpButton: {
    position: 'absolute',
    right: 20,
    top: 10,
    padding: 5,
  },
  uploadIndicator: {
    position: 'absolute',
    right: 60,
    top: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  uploadText: {
    color: '#FFD700',
    fontSize: 12,
    marginLeft: 5,
    fontWeight: '500',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanRectContainer: {
    width: SCAN_RECT_WIDTH,
    height: SCAN_RECT_HEIGHT,
    position: 'relative',
  },
  scanRect: {
    flex: 1,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanGuideText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#FFD700',
  },
  cornerTopLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  cornerTopRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  cornerBottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  cornerBottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  captureButtonDisabled: {
    backgroundColor: '#666',
  },
  captureButtonInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 4,
    borderColor: '#1A1A2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButton: {
    alignItems: 'center',
    padding: 10,
  },
  secondaryButtonText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#666',
  },
  finishButton: {
    position: 'absolute',
    bottom: 150,
    alignSelf: 'center',
    backgroundColor: '#FFD700',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  finishButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  finishButtonText: {
    color: '#1A1A2E',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  // Custom Alert Styles
  customAlertOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  customAlertContainer: {
    width: width * 0.85,
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  customAlertIcon: {
    marginBottom: 16,
  },
  customAlertTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A2E',
    marginBottom: 8,
    textAlign: 'center',
  },
  customAlertMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Trading Card Styles
  tradingCard: {
    width: 80,
    height: 110,
    backgroundColor: '#1A1A2E',
    borderRadius: 8,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  cardCorner: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderColor: '#FFD700',
  },
  tl: {
    top: -2,
    left: -2,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  tr: {
    top: -2,
    right: -2,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  bl: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  br: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  cardContent: {
    flex: 1,
    padding: 10,
    justifyContent: 'space-between',
  },
  cardStripe: {
    height: 15,
    backgroundColor: 'rgba(255,215,0,0.3)',
    borderRadius: 3,
    marginBottom: 8,
  },
  cardCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,215,0,0.5)',
    alignSelf: 'center',
    marginVertical: 8,
  },
  cardLines: {
    gap: 4,
  },
  cardLine: {
    height: 6,
    backgroundColor: 'rgba(255,215,0,0.3)',
    borderRadius: 3,
    width: '100%',
  },
  cardLineShort: {
    width: '60%',
  },
});