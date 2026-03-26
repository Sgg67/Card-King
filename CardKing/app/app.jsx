
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  return (
    // render the app in a safe area provider
    <SafeAreaProvider>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}