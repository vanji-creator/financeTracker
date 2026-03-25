import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Platform,
  Pressable,
  TextInput,
  ActivityIndicator,
  ScrollView
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

import Colors from "@/constants/colors";
import { useAiFinanceQuery } from "@workspace/api-client-react";

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<string | null>(null);

  const { mutateAsync: askAi, isPending } = useAiFinanceQuery();

  const handleSend = async () => {
    if (!query.trim()) return;
    try {
      setResponse(null);
      const res = await askAi({
        data: { question: query }
      });
      setResponse(res.answer);
    } catch (e) {
      setResponse("Sorry, I couldn't process your request right now. Please try again.");
    }
  };

  const SUGGESTIONS = [
    "How much did I spend on food this month?",
    "What's my biggest expense category?",
    "Show me my income vs expenses"
  ];

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.contentContainer,
        {
          paddingTop: Platform.OS === "web" ? 67 : insets.top + 20,
          paddingBottom: insets.bottom + 100,
        }
      ]}
      bottomOffset={insets.bottom + 84}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Smart AI Query</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Ask natural language questions about your finances
        </Text>
      </View>

      <View style={styles.searchSection}>
        <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="sparkles" size={20} color={colors.accent} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Ask anything about your money..."
            placeholderTextColor={colors.textSecondary + "80"}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} style={styles.clearBtn}>
              <Feather name="x-circle" size={18} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.sendButton,
            { backgroundColor: colors.primary, opacity: pressed || isPending || !query.trim() ? 0.7 : 1 }
          ]}
          onPress={handleSend}
          disabled={isPending || !query.trim()}
        >
          {isPending ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Feather name="arrow-up" size={24} color="#FFF" />
          )}
        </Pressable>
      </View>

      {!response && !isPending && (
        <View style={styles.suggestionsContainer}>
          <Text style={[styles.suggestionsTitle, { color: colors.textSecondary }]}>Try asking:</Text>
          {SUGGESTIONS.map((suggestion, index) => (
            <Pressable
              key={index}
              style={[styles.suggestionChip, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                setQuery(suggestion);
              }}
            >
              <Text style={[styles.suggestionText, { color: colors.text }]}>{suggestion}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {isPending && (
        <View style={styles.loadingContainer}>
          <LinearGradient
            colors={[colors.primary + '20', colors.accent + '20']}
            style={styles.loadingGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.loadingText, { color: colors.primary }]}>Analyzing your finances...</Text>
          </LinearGradient>
        </View>
      )}

      {response && !isPending && (
        <View style={[styles.responseCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.responseHeader}>
            <View style={[styles.aiAvatar, { backgroundColor: colors.accent + '20' }]}>
              <Feather name="cpu" size={20} color={colors.accent} />
            </View>
            <Text style={[styles.responseTitle, { color: colors.text }]}>AI Assistant</Text>
          </View>
          <Text style={[styles.responseText, { color: colors.text }]}>{response}</Text>
        </View>
      )}

    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 56,
    marginRight: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  clearBtn: {
    padding: 8,
  },
  sendButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionsContainer: {
    marginTop: 16,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    marginBottom: 12,
  },
  suggestionChip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  suggestionText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  loadingContainer: {
    marginTop: 20,
  },
  loadingGradient: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  responseCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    marginTop: 10,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  aiAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  responseTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  responseText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    lineHeight: 24,
  }
});
