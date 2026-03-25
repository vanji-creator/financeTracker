import React from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { Feather } from "@expo/vector-icons";
import { Transaction } from "@workspace/api-client-react";
import Colors from "@/constants/colors";
import { useColorScheme } from "react-native";
import * as Haptics from "expo-haptics";

interface TransactionItemProps {
  transaction: Transaction;
  onDelete?: (id: number) => void;
}

const CATEGORY_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  Food: "coffee",
  Shopping: "shopping-bag",
  Transportation: "navigation",
  Housing: "home",
  Healthcare: "heart",
  Entertainment: "tv",
  Travel: "map",
  Salary: "briefcase",
  Freelance: "monitor",
  Investment: "trending-up",
  Other: "tag",
};

const CATEGORY_COLORS: Record<string, string> = {
  Food: "#F59E0B",
  Shopping: "#8B5CF6",
  Transportation: "#3B82F6",
  Housing: "#10B981",
  Healthcare: "#EF4444",
  Entertainment: "#EC4899",
  Travel: "#06B6D4",
  Salary: "#22C55E",
  Freelance: "#14B8A6",
  Investment: "#6366F1",
  Other: "#64748B",
};

export default function TransactionItem({ transaction, onDelete }: TransactionItemProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const iconName = CATEGORY_ICONS[transaction.category] || "circle";
  const iconColor = CATEGORY_COLORS[transaction.category] || colors.textSecondary;
  const isIncome = transaction.type === "income";

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: "clamp",
    });

    return (
      <Animated.View style={[styles.deleteAction, { transform: [{ scale }] }]}>
        <Feather name="trash-2" size={24} color="#FFF" />
      </Animated.View>
    );
  };

  const handleSwipeOpen = (direction: "left" | "right") => {
    if (direction === "right" && onDelete) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      onDelete(transaction.id);
    }
  };

  const formattedDate = new Date(transaction.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <Swipeable
      renderRightActions={onDelete ? renderRightActions : undefined}
      onSwipeableOpen={handleSwipeOpen}
      friction={2}
      rightThreshold={40}
    >
      <View style={[styles.container, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.leftContent}>
          <View style={[styles.iconContainer, { backgroundColor: iconColor + "20" }]}>
            <Feather name={iconName} size={20} color={iconColor} />
          </View>
          <View style={styles.textContent}>
            <Text style={[styles.description, { color: colors.text }]} numberOfLines={1}>
              {transaction.description}
            </Text>
            <View style={styles.metaContainer}>
              <Text style={[styles.category, { color: colors.textSecondary }]}>
                {transaction.category}
              </Text>
              <Text style={[styles.dot, { color: colors.textSecondary }]}>•</Text>
              <Text style={[styles.date, { color: colors.textSecondary }]}>
                {formattedDate}
              </Text>
            </View>
          </View>
        </View>
        <Text
          style={[
            styles.amount,
            { color: isIncome ? colors.income : colors.text },
          ]}
        >
          {isIncome ? "+" : "-"}${transaction.amount.toFixed(2)}
        </Text>
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  leftContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  textContent: {
    flex: 1,
  },
  description: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    marginBottom: 4,
  },
  metaContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  category: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  dot: {
    marginHorizontal: 6,
    fontSize: 14,
  },
  date: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  amount: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  deleteAction: {
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    height: "100%",
  },
});
