import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Pressable
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "react-native";
import { Feather } from "@expo/vector-icons";

import Colors from "@/constants/colors";
import DonutChart from "@/components/DonutChart";
import BarChart from "@/components/BarChart";
import {
  useGetCategoryStats,
  useGetMonthlyStats,
} from "@workspace/api-client-react";

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"expense" | "income">("expense");

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12

  const { 
    data: categoryStats, 
    refetch: refetchCategories,
    isLoading: categoriesLoading 
  } = useGetCategoryStats({ month: currentMonth, year: currentYear });
  
  const { 
    data: monthlyStats, 
    refetch: refetchMonthly,
    isLoading: monthlyLoading 
  } = useGetMonthlyStats({ year: currentYear });

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchCategories(), refetchMonthly()]);
    setRefreshing(false);
  }, [refetchCategories, refetchMonthly]);

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
          paddingBottom: insets.bottom + 100,
        }
      ]}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Statistics</Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Spending by Category</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>This Month</Text>
        </View>

        {categoriesLoading ? renderSkeleton() : (
          <View style={styles.chartContainer}>
            <DonutChart data={categoryStats || []} size={220} strokeWidth={35} />
          </View>
        )}

        {!categoriesLoading && categoryStats && categoryStats.length > 0 && (
          <View style={styles.legendContainer}>
            {categoryStats.filter(c => c.total > 0).map((stat, i) => (
              <View key={i} style={styles.legendItem}>
                <View style={styles.legendLeft}>
                  <View style={[styles.legendDot, { backgroundColor: Colors[colorScheme].expense }]} />
                  <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>{stat.category}</Text>
                </View>
                <Text style={[styles.legendValue, { color: colors.text }]}>${stat.total.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Cash Flow</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{currentYear}</Text>
        </View>

        <View style={styles.tabContainer}>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: colors.income }]} />
            <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>Income</Text>
            <View style={[styles.legendDot, { backgroundColor: colors.expense, marginLeft: 16 }]} />
            <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>Expenses</Text>
          </View>
        </View>

        {monthlyLoading ? renderSkeleton() : (
          <View style={styles.chartContainer}>
            <BarChart data={monthlyStats || []} width={300} height={220} />
          </View>
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
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  cardHeader: {
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  legendContainer: {
    marginTop: 20,
  },
  legendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150,150,150,0.2)',
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendLabel: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  legendValue: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  }
});
