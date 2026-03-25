import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  Platform,
  ActivityIndicator,
  Pressable
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

import Colors from "@/constants/colors";
import TransactionItem from "@/components/TransactionItem";
import {
  useGetSummary,
  useGetTransactions,
  useCreateTransaction,
  useDeleteTransaction,
  Transaction
} from "@workspace/api-client-react";

const SEED_FLAG = "@finance_app_seeded_v1";

const SAMPLE_TRANSACTIONS = [
  { type: "income" as const, amount: 4500, description: "Salary", category: "Salary" as const, date: new Date().toISOString() },
  { type: "expense" as const, amount: 45.2, description: "Groceries", category: "Food" as const, date: new Date(Date.now() - 86400000).toISOString() },
  { type: "expense" as const, amount: 120.5, description: "Electric Bill", category: "Housing" as const, date: new Date(Date.now() - 86400000 * 2).toISOString() },
  { type: "expense" as const, amount: 25.0, description: "Uber", category: "Transportation" as const, date: new Date(Date.now() - 86400000 * 3).toISOString() },
  { type: "expense" as const, amount: 65.0, description: "Dinner with friends", category: "Food" as const, date: new Date(Date.now() - 86400000 * 4).toISOString() },
  { type: "expense" as const, amount: 300.0, description: "New Monitor", category: "Shopping" as const, date: new Date(Date.now() - 86400000 * 5).toISOString() },
  { type: "income" as const, amount: 350, description: "Freelance Client", category: "Freelance" as const, date: new Date(Date.now() - 86400000 * 6).toISOString() },
  { type: "expense" as const, amount: 15.99, description: "Netflix", category: "Entertainment" as const, date: new Date(Date.now() - 86400000 * 7).toISOString() },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const [refreshing, setRefreshing] = useState(false);

  const { data: summary, refetch: refetchSummary, isLoading: summaryLoading } = useGetSummary({});
  const { data: transactions, refetch: refetchTransactions, isLoading: transactionsLoading } = useGetTransactions({});
  const { mutateAsync: createTx } = useCreateTransaction();
  const { mutateAsync: deleteTx } = useDeleteTransaction();

  useEffect(() => {
    async function seedData() {
      const seeded = await AsyncStorage.getItem(SEED_FLAG);
      if (!seeded && !transactions?.length) {
        try {
          for (const tx of SAMPLE_TRANSACTIONS) {
            await createTx({ data: tx });
          }
          await AsyncStorage.setItem(SEED_FLAG, "true");
          refetchSummary();
          refetchTransactions();
        } catch (e) {
          console.error("Failed to seed data", e);
        }
      }
    }
    seedData();
  }, [transactions?.length]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchSummary(), refetchTransactions()]);
    setRefreshing(false);
  }, [refetchSummary, refetchTransactions]);

  const handleDelete = async (id: number) => {
    await deleteTx({ id });
    refetchSummary();
    refetchTransactions();
  };

  const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });

  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.contentContainer,
        {
          paddingTop: Platform.OS === "web" ? 67 : insets.top + 20,
          paddingBottom: insets.bottom + 100, // For bottom tabs
        }
      ]}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>Good morning</Text>
          <Text style={[styles.title, { color: colors.text }]}>Dashboard</Text>
        </View>
        <Pressable 
          onPress={() => router.push("/profile")}
          style={[styles.avatarButton, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Feather name="user" size={24} color={colors.text} />
        </Pressable>
      </View>

      {summaryLoading ? renderSkeleton() : (
        <>
          <LinearGradient
            colors={[colors.primary, colorScheme === 'dark' ? '#1A2965' : '#2D45A0']}
            style={styles.balanceCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.balanceLabel}>Total Balance</Text>
            <Text style={styles.balanceAmount}>
              ${summary?.balance?.toFixed(2) || "0.00"}
            </Text>
            <Text style={styles.balanceMonth}>{currentMonth} Overview</Text>
          </LinearGradient>

          <View style={styles.summaryRow}>
            <View style={[styles.summaryBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.summaryIcon, { backgroundColor: colors.income + '20' }]}>
                <Feather name="arrow-down-left" size={20} color={colors.income} />
              </View>
              <View>
                <Text style={[styles.summaryBoxLabel, { color: colors.textSecondary }]}>Income</Text>
                <Text style={[styles.summaryBoxAmount, { color: colors.text }]}>
                  ${summary?.totalIncome?.toFixed(2) || "0.00"}
                </Text>
              </View>
            </View>

            <View style={[styles.summaryBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.summaryIcon, { backgroundColor: colors.expense + '20' }]}>
                <Feather name="arrow-up-right" size={20} color={colors.expense} />
              </View>
              <View>
                <Text style={[styles.summaryBoxLabel, { color: colors.textSecondary }]}>Expenses</Text>
                <Text style={[styles.summaryBoxAmount, { color: colors.text }]}>
                  ${summary?.totalExpenses?.toFixed(2) || "0.00"}
                </Text>
              </View>
            </View>
          </View>
        </>
      )}

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Transactions</Text>
        <Pressable onPress={() => router.push("/search")}>
          <Text style={[styles.seeAll, { color: colors.accent }]}>Search</Text>
        </Pressable>
      </View>

      <View style={[styles.transactionsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {transactionsLoading ? renderSkeleton() : transactions?.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="inbox" size={48} color={colors.textSecondary} style={{ marginBottom: 16 }} />
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
              No transactions yet. Add one to get started!
            </Text>
          </View>
        ) : (
          transactions?.slice(0, 10).map((tx) => (
            <TransactionItem
              key={tx.id}
              transaction={tx}
              onDelete={handleDelete}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
  },
  skeletonContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
  },
  avatarButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  balanceCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    marginBottom: 8,
  },
  balanceAmount: {
    color: '#FFF',
    fontSize: 40,
    fontFamily: 'Inter_700Bold',
    marginBottom: 16,
  },
  balanceMonth: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 16,
  },
  summaryBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  summaryBoxLabel: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    marginBottom: 4,
  },
  summaryBoxAmount: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
  },
  seeAll: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  transactionsCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
  }
});
