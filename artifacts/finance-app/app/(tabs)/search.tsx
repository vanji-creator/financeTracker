import React, { useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Platform,
  Pressable,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

import Colors from "@/constants/colors";
import { useGetTransactions } from "@workspace/api-client-react";
import { queryFinances, type AIResponse, type Insight } from "@/utils/localFinanceAI";

const SUGGESTIONS = [
  { icon: "shopping-bag", text: "How much did I spend on food this month?" },
  { icon: "pie-chart", text: "Show me my spending breakdown" },
  { icon: "trending-up", text: "Compare this month vs last month" },
  { icon: "percent", text: "What's my savings rate?" },
  { icon: "alert-circle", text: "What's my biggest expense?" },
  { icon: "zap", text: "Give me financial advice" },
];

interface QueryHistoryItem {
  id: string;
  question: string;
  response: AIResponse;
  timestamp: Date;
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const isDark = colorScheme === "dark";

  const [query, setQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const { data: transactions } = useGetTransactions({});

  const handleSend = async (overrideQuery?: string) => {
    const q = (overrideQuery ?? query).trim();
    if (!q || isProcessing) return;

    setIsProcessing(true);
    setQuery("");

    // Tiny delay so the UI feels snappy (local compute is instant)
    await new Promise((r) => setTimeout(r, 180));

    const txData = (transactions ?? []).map((tx) => ({
      id: tx.id,
      type: tx.type as "income" | "expense",
      amount: typeof tx.amount === "string" ? parseFloat(tx.amount) : tx.amount,
      description: tx.description,
      category: tx.category,
      note: tx.note,
      date: tx.date,
    }));

    const response = queryFinances(q, txData);

    const item: QueryHistoryItem = {
      id: Date.now().toString(),
      question: q,
      response,
      timestamp: new Date(),
    };

    setHistory((prev) => [item, ...prev]);
    setIsProcessing(false);
  };

  const handleSuggestion = (text: string) => {
    handleSend(text);
  };

  const trendColor = (trend?: "up" | "down" | "neutral") => {
    if (trend === "up") return colors.income;
    if (trend === "down") return colors.expense;
    return colors.textSecondary;
  };

  const trendIcon = (trend?: "up" | "down" | "neutral"): "arrow-up" | "arrow-down" | "minus" => {
    if (trend === "up") return "arrow-up";
    if (trend === "down") return "arrow-down";
    return "minus";
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.contentContainer,
        {
          paddingTop: Platform.OS === "web" ? 67 : insets.top + 20,
          paddingBottom: insets.bottom + 100,
        },
      ]}
      bottomOffset={insets.bottom + 84}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerBadge, { backgroundColor: colors.accent + "15" }]}>
          <Feather name="cpu" size={14} color={colors.accent} />
          <Text style={[styles.headerBadgeText, { color: colors.accent }]}>On-Device AI</Text>
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Finance Query</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Ask anything about your money — instant, private, offline
        </Text>
      </View>

      {/* Input */}
      <View style={styles.inputRow}>
        <View
          style={[
            styles.inputWrapper,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              shadowColor: isDark ? "#000" : "#F97316",
            },
          ]}
        >
          <Feather name="search" size={18} color={colors.accent} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.text, fontFamily: "Inter_400Regular" }]}
            placeholder="Ask about your finances..."
            placeholderTextColor={colors.textSecondary + "80"}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => handleSend()}
            returnKeyType="send"
            multiline={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} style={styles.clearBtn} hitSlop={8}>
              <Feather name="x" size={16} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.sendBtn,
            {
              backgroundColor: query.trim() ? colors.primary : colors.primary + "60",
              transform: [{ scale: pressed ? 0.93 : 1 }],
            },
          ]}
          onPress={() => handleSend()}
          disabled={isProcessing || !query.trim()}
        >
          {isProcessing ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Feather name="arrow-right" size={22} color="#FFF" />
          )}
        </Pressable>
      </View>

      {/* Suggestions (shown when no history) */}
      {history.length === 0 && !isProcessing && (
        <View style={styles.suggestionsSection}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Suggested questions</Text>
          <View style={styles.suggestionsGrid}>
            {SUGGESTIONS.map((s, i) => (
              <Pressable
                key={i}
                style={({ pressed }) => [
                  styles.suggestionCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                onPress={() => handleSuggestion(s.text)}
              >
                <View style={[styles.suggestionIconWrap, { backgroundColor: colors.accent + "15" }]}>
                  <Feather name={s.icon as any} size={16} color={colors.accent} />
                </View>
                <Text style={[styles.suggestionText, { color: colors.text }]}>{s.text}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Processing indicator */}
      {isProcessing && (
        <View style={[styles.processingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <LinearGradient
            colors={[colors.primary + "20", colors.accent + "20"]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={[styles.processingText, { color: colors.text }]}>Analyzing your data...</Text>
        </View>
      )}

      {/* Query History */}
      {history.map((item) => (
        <View key={item.id} style={styles.historyItem}>
          {/* Question bubble */}
          <View style={styles.questionRow}>
            <View style={[styles.questionBubble, { backgroundColor: colors.primary }]}>
              <Text style={styles.questionText}>{item.question}</Text>
            </View>
          </View>

          {/* Response card */}
          <View style={[styles.responseCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.responseHeader}>
              <LinearGradient
                colors={[colors.accent, colors.primary]}
                style={styles.aiIconBg}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Feather name="cpu" size={14} color="#FFF" />
              </LinearGradient>
              <Text style={[styles.responseFrom, { color: colors.textSecondary }]}>Finance AI · On-Device</Text>
            </View>

            <Text style={[styles.responseText, { color: colors.text }]}>{item.response.answer}</Text>

            {/* Insights grid */}
            {item.response.insights && item.response.insights.length > 0 && (
              <View style={styles.insightsGrid}>
                {item.response.insights.map((insight: Insight, i: number) => (
                  <View
                    key={i}
                    style={[
                      styles.insightChip,
                      { backgroundColor: colors.background, borderColor: colors.border },
                    ]}
                  >
                    <View style={styles.insightTop}>
                      <Feather
                        name={insight.icon as any}
                        size={13}
                        color={trendColor(insight.trend)}
                      />
                      <Feather
                        name={trendIcon(insight.trend)}
                        size={11}
                        color={trendColor(insight.trend)}
                        style={{ marginLeft: 2 }}
                      />
                    </View>
                    <Text style={[styles.insightValue, { color: colors.text }]}>{insight.value}</Text>
                    <Text style={[styles.insightLabel, { color: colors.textSecondary }]} numberOfLines={2}>
                      {insight.label}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      ))}

      {/* Clear history */}
      {history.length > 1 && (
        <Pressable
          style={({ pressed }) => [styles.clearHistory, { opacity: pressed ? 0.6 : 1 }]}
          onPress={() => setHistory([])}
        >
          <Feather name="trash-2" size={14} color={colors.textSecondary} />
          <Text style={[styles.clearHistoryText, { color: colors.textSecondary }]}>Clear history</Text>
        </Pressable>
      )}
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { paddingHorizontal: 20 },
  header: { marginBottom: 24 },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 10,
    gap: 5,
  },
  headerBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 6 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  inputRow: { flexDirection: "row", alignItems: "center", marginBottom: 28, gap: 10 },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 52,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, height: "100%" },
  clearBtn: { padding: 4 },
  sendBtn: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionsSection: { marginBottom: 8 },
  sectionLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginBottom: 14,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  suggestionsGrid: { gap: 10 },
  suggestionCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  suggestionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 20 },
  processingCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    overflow: "hidden",
    marginBottom: 16,
  },
  processingText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  historyItem: { marginBottom: 20 },
  questionRow: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 10 },
  questionBubble: {
    maxWidth: "80%",
    borderRadius: 20,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  questionText: { color: "#FFF", fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 20 },
  responseCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderTopLeftRadius: 4,
    padding: 18,
  },
  responseHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 8 },
  aiIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  responseFrom: { fontSize: 12, fontFamily: "Inter_500Medium" },
  responseText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22, marginBottom: 14 },
  insightsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  insightChip: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: "46%",
    flex: 1,
  },
  insightTop: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  insightValue: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 2 },
  insightLabel: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 15 },
  clearHistory: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    marginTop: 4,
  },
  clearHistoryText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
