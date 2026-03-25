import React from 'react';
import { View, StyleSheet, Text, useColorScheme } from 'react-native';
import Svg, { Path, G, Circle } from 'react-native-svg';
import { CategoryStat } from '@workspace/api-client-react';
import Colors from '@/constants/colors';

interface DonutChartProps {
  data: CategoryStat[];
  size?: number;
  strokeWidth?: number;
}

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

export default function DonutChart({ data, size = 200, strokeWidth = 30 }: DonutChartProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  // Filter out empty categories and calculate total
  const validData = data.filter(d => d.total > 0);
  const total = validData.reduce((sum, item) => sum + item.total, 0);

  if (validData.length === 0 || total === 0) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={colors.border}
            strokeWidth={strokeWidth}
            fill="none"
          />
        </Svg>
        <View style={styles.centerTextContainer}>
          <Text style={[styles.centerText, { color: colors.textSecondary }]}>No data</Text>
        </View>
      </View>
    );
  }

  let cumulativePercent = 0;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${center}, ${center}`}>
          {validData.map((item, index) => {
            const percent = item.total / total;
            const strokeDasharray = `${circumference} ${circumference}`;
            const strokeDashoffset = circumference - percent * circumference;
            const offset = cumulativePercent * circumference;
            
            cumulativePercent += percent;
            
            const color = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Other;

            return (
              <Circle
                key={index}
                cx={center}
                cy={center}
                r={radius}
                stroke={color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                rotation={(offset / circumference) * 360}
                origin={`${center}, ${center}`}
              />
            );
          })}
        </G>
      </Svg>
      <View style={styles.centerTextContainer}>
        <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total</Text>
        <Text style={[styles.totalAmount, { color: colors.text }]}>${total.toFixed(0)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  centerTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    marginBottom: 4,
  },
  totalAmount: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
  }
});
