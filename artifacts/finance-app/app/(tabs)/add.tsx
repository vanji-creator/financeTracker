import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Platform,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Alert
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

import Colors from "@/constants/colors";
import { useCreateTransaction, CreateTransactionBodyType, CreateTransactionBodyCategory } from "@workspace/api-client-react";

const EXPENSE_CATEGORIES = [
  "Food", "Shopping", "Transportation", "Housing", 
  "Healthcare", "Entertainment", "Travel", "Other"
];

const INCOME_CATEGORIES = [
  "Salary", "Freelance", "Investment", "Other"
];

export default function AddScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const [type, setType] = useState<CreateTransactionBodyType>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("Food");
  const [note, setNote] = useState("");

  const { mutateAsync: createTx, isPending } = useCreateTransaction();

  const handleSave = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount greater than 0");
      return;
    }
    if (!description.trim()) {
      Alert.alert("Description Required", "Please enter a description");
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await createTx({
        data: {
          type,
          amount: Number(amount),
          description: description.trim(),
          category: category as CreateTransactionBodyCategory,
          note: note.trim() || undefined,
          date: new Date().toISOString()
        }
      });
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Reset form
      setAmount("");
      setDescription("");
      setNote("");
      // Navigate back to home
      router.navigate("/");
    } catch (e) {
      Alert.alert("Error", "Failed to save transaction");
    }
  };

  const categories = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

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
      bottomOffset={insets.bottom + 20}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Add Transaction</Text>
      </View>

      <View style={[styles.typeSelector, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Pressable
          style={[styles.typeBtn, type === "expense" && { backgroundColor: colors.expense }]}
          onPress={() => {
            setType("expense");
            setCategory("Food");
            Haptics.selectionAsync();
          }}
        >
          <Text style={[styles.typeBtnText, { color: type === "expense" ? "#FFF" : colors.textSecondary }]}>
            Expense
          </Text>
        </Pressable>
        <Pressable
          style={[styles.typeBtn, type === "income" && { backgroundColor: colors.income }]}
          onPress={() => {
            setType("income");
            setCategory("Salary");
            Haptics.selectionAsync();
          }}
        >
          <Text style={[styles.typeBtnText, { color: type === "income" ? "#FFF" : colors.textSecondary }]}>
            Income
          </Text>
        </Pressable>
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Amount</Text>
        <View style={[styles.amountInputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.currencySymbol, { color: colors.text }]}>$</Text>
          <TextInput
            style={[styles.amountInput, { color: type === "expense" ? colors.expense : colors.income }]}
            placeholder="0.00"
            placeholderTextColor={colors.textSecondary + "80"}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          placeholder="What was this for?"
          placeholderTextColor={colors.textSecondary + "80"}
          value={description}
          onChangeText={setDescription}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {categories.map((cat) => (
            <Pressable
              key={cat}
              style={[
                styles.categoryChip,
                { 
                  backgroundColor: category === cat ? colors.accent : colors.card,
                  borderColor: category === cat ? colors.accent : colors.border
                }
              ]}
              onPress={() => {
                setCategory(cat);
                Haptics.selectionAsync();
              }}
            >
              <Text style={[
                styles.categoryChipText,
                { color: category === cat ? "#FFF" : colors.text }
              ]}>
                {cat}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Note (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          placeholder="Add more details..."
          placeholderTextColor={colors.textSecondary + "80"}
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.saveButton,
          { backgroundColor: colors.primary, opacity: pressed || isPending ? 0.8 : 1 }
        ]}
        onPress={handleSave}
        disabled={isPending}
      >
        {isPending ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.saveButtonText}>Save Transaction</Text>
        )}
      </Pressable>
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
  },
  typeSelector: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 4,
    marginBottom: 24,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  typeBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    marginBottom: 8,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 32,
    fontFamily: 'Inter_600SemiBold',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 40,
    fontFamily: 'Inter_700Bold',
    paddingVertical: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  textArea: {
    minHeight: 100,
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 10,
  },
  categoryChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  saveButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  }
});
