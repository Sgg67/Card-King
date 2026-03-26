// import necessary packages
import { Stack } from "expo-router";

// basic layout of the app architecture
export default function RootLayout() {
  return (
    // stack of different screens
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: "Home" }} />
      <Stack.Screen name="signup" options={{ title: "Sign Up" }} />
      <Stack.Screen name="scanner" options={{ title: "Scanner" }} />
    </Stack>
  );
}