import React from 'react';
import { View, StyleSheet, Text, useColorScheme } from 'react-native';
import Svg, { Rect, G, Text as SvgText, Line } from 'react-native-svg';

interface MonthlyStat {
  month: number;
  year: number;
  income: number;
  expenses: number;
  label: string;
}
import Colors from '@/constants/colors';

interface BarChartProps {
  data: MonthlyStat[];
  width?: number;
  height?: number;
}

export default function BarChart({ data, width = 320, height = 220 }: BarChartProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  if (!data || data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { width, height }]}>
        <Text style={{ color: colors.textSecondary }}>No data available</Text>
      </View>
    );
  }

  const padding = 30;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Find max value for scaling
  const maxVal = Math.max(
    ...data.map(d => Math.max(d.income, d.expenses)),
    100 // minimum scale
  );

  const barWidth = Math.min(16, (chartWidth / data.length) * 0.4);
  const barSpacing = (chartWidth - (barWidth * 2 * data.length)) / (data.length + 1);

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {/* Y-axis grid lines */}
        {[0, 0.5, 1].map((ratio, i) => {
          const y = padding + chartHeight - (chartHeight * ratio);
          const val = (maxVal * ratio).toFixed(0);
          return (
            <G key={`grid-${i}`}>
              <Line
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke={colors.border}
                strokeWidth={1}
                strokeDasharray="4 4"
              />
              <SvgText
                x={padding - 5}
                y={y + 4}
                fontSize={10}
                fill={colors.textSecondary}
                textAnchor="end"
                fontFamily="Inter_400Regular"
              >
                ${val}
              </SvgText>
            </G>
          );
        })}

        {/* Bars */}
        {data.map((item, i) => {
          const incomeHeight = (item.income / maxVal) * chartHeight;
          const expenseHeight = (item.expenses / maxVal) * chartHeight;

          const groupX = padding + barSpacing + i * (barWidth * 2 + barSpacing);
          const incomeX = groupX;
          const expenseX = groupX + barWidth;

          return (
            <G key={`bar-group-${i}`}>
              {/* Income bar */}
              <Rect
                x={incomeX}
                y={padding + chartHeight - incomeHeight}
                width={barWidth}
                height={incomeHeight}
                fill={colors.income}
                rx={4}
              />
              {/* Expense bar */}
              <Rect
                x={expenseX}
                y={padding + chartHeight - expenseHeight}
                width={barWidth}
                height={expenseHeight}
                fill={colors.expense}
                rx={4}
              />
              {/* X-axis label */}
              <SvgText
                x={groupX + barWidth}
                y={height - 5}
                fontSize={12}
                fill={colors.textSecondary}
                textAnchor="middle"
                fontFamily="Inter_500Medium"
              >
                {item.label}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  }
});
