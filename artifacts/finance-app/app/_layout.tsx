import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState, createContext, useContext } from "react";
import { Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { db } from "@/db";
import { initializeFTS } from "@/db";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import migrations from "../drizzle/migrations";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Database ready context
const DatabaseReadyContext = createContext(false);
export function useDatabaseReady() {
  return useContext(DatabaseReadyContext);
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const { success: migrationsSuccess, error: migrationsError } = useMigrations(db, migrations);
  const [ftsReady, setFtsReady] = useState(false);

  // Initialize FTS5 after migrations complete
  useEffect(() => {
    if (migrationsSuccess) {
      initializeFTS()
        .then(() => setFtsReady(true))
        .catch((err) => {
          console.error("FTS initialization failed:", err);
          setFtsReady(true); // Continue without FTS if it fails
        });
    }
  }, [migrationsSuccess]);

  useEffect(() => {
    if ((fontsLoaded || fontError) && (migrationsSuccess || migrationsError)) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, migrationsSuccess, migrationsError]);

  if (!fontsLoaded && !fontError) return null;

  if (migrationsError) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
        <Text style={{ fontSize: 16, color: "red", textAlign: "center" }}>
          Database migration error: {migrationsError.message}
        </Text>
      </View>
    );
  }

  if (!migrationsSuccess) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 16, color: "#666" }}>Setting up database...</Text>
      </View>
    );
  }

  const dbReady = migrationsSuccess && ftsReady;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <DatabaseReadyContext.Provider value={dbReady}>
          <GestureHandlerRootView>
            <KeyboardProvider>
              <RootLayoutNav />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </DatabaseReadyContext.Provider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
