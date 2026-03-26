import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { Platform, Text, View, ActivityIndicator } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { openDatabase, initializeFTS } from "@/db";

SplashScreen.preventAutoHideAsync();

// Schema CREATE TABLE statements — idempotent IF NOT EXISTS.
// Run directly via execAsync to avoid drizzle's sync dialect (needs SharedArrayBuffer).
const MIGRATION_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS \`ai_conversations\` (
    \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    \`title\` text NOT NULL,
    \`created_at\` text NOT NULL,
    \`updated_at\` text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS \`ai_insights\` (
    \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    \`type\` text NOT NULL,
    \`title\` text NOT NULL,
    \`summary\` text NOT NULL,
    \`data\` text,
    \`period_start\` text,
    \`period_end\` text,
    \`is_read\` integer DEFAULT 0,
    \`created_at\` text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS \`ai_messages\` (
    \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    \`conversation_id\` integer NOT NULL,
    \`role\` text NOT NULL,
    \`content\` text NOT NULL,
    \`metadata\` text,
    \`created_at\` text NOT NULL,
    FOREIGN KEY (\`conversation_id\`) REFERENCES \`ai_conversations\`(\`id\`) ON UPDATE no action ON DELETE cascade
  )`,
  `CREATE TABLE IF NOT EXISTS \`budgets\` (
    \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    \`category\` text NOT NULL,
    \`monthly_limit\` real NOT NULL,
    \`month\` integer NOT NULL,
    \`year\` integer NOT NULL,
    \`created_at\` text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS \`transactions\` (
    \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    \`type\` text NOT NULL,
    \`amount\` real NOT NULL,
    \`description\` text NOT NULL,
    \`category\` text NOT NULL,
    \`note\` text,
    \`date\` text NOT NULL,
    \`created_at\` text NOT NULL
  )`,
];

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

  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (Platform.OS === "web") {
          // On web, expo-sqlite requires OPFS/SharedArrayBuffer (COOP/COEP headers)
          // which aren't available in the Replit preview proxy.
          // All data access on web uses the localStorage-based hooks instead.
          setDbReady(true);
          return;
        }

        const { expo } = await openDatabase();

        // Run schema creation via raw async API (avoids drizzle's sync dialect)
        for (const stmt of MIGRATION_STATEMENTS) {
          await expo.execAsync(stmt);
        }

        try {
          await initializeFTS();
        } catch (e) {
          console.warn("FTS initialization skipped:", e);
        }

        setDbReady(true);
      } catch (err: any) {
        console.error("DB initialization error:", err);
        setDbReady(true); // still render — hooks show empty state gracefully
      }
    })();
  }, []);

  const isReady = (fontsLoaded || !!fontError) && dbReady;

  useEffect(() => {
    if (isReady) SplashScreen.hideAsync();
  }, [isReady]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFFFFF" }}>
        <ActivityIndicator size="large" color="#F97316" />
        <Text style={{ marginTop: 16, fontSize: 14, color: "#7C6A5A", fontWeight: "500" }}>
          Setting up database…
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <KeyboardProvider>
            <RootLayoutNav />
          </KeyboardProvider>
        </GestureHandlerRootView>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
