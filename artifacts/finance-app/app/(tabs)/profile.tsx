import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Platform,
  Pressable,
  Switch,
  Alert
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "react-native";
import { Feather } from "@expo/vector-icons";

import Colors from "@/constants/colors";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  // In a real app, you would use a settings context or AsyncStorage for these
  const [notifications, setNotifications] = React.useState(true);
  const [faceId, setFaceId] = React.useState(true);

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: () => console.log("Logged out") }
    ]);
  };

  const menuItems = [
    { icon: "user", label: "Personal Information", onPress: () => {} },
    { icon: "credit-card", label: "Payment Methods", onPress: () => {} },
    { icon: "shield", label: "Security & Privacy", onPress: () => {} },
    { icon: "help-circle", label: "Help & Support", onPress: () => {} },
    { icon: "info", label: "About Finance Tracker", onPress: () => {} },
  ] as const;

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
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
      </View>

      <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>JD</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: colors.text }]}>John Doe</Text>
          <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>john.doe@example.com</Text>
        </View>
        <Pressable style={[styles.editButton, { backgroundColor: colors.background }]}>
          <Feather name="edit-2" size={18} color={colors.text} />
        </Pressable>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Preferences</Text>
      
      <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIconContainer, { backgroundColor: colors.background }]}>
              <Feather name="bell" size={20} color={colors.text} />
            </View>
            <Text style={[styles.menuItemLabel, { color: colors.text }]}>Push Notifications</Text>
          </View>
          <Switch 
            value={notifications} 
            onValueChange={setNotifications} 
            trackColor={{ false: colors.border, true: colors.accent }}
          />
        </View>

        <View style={styles.separator} />

        <View style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIconContainer, { backgroundColor: colors.background }]}>
              <Feather name="lock" size={20} color={colors.text} />
            </View>
            <Text style={[styles.menuItemLabel, { color: colors.text }]}>Face ID / Biometrics</Text>
          </View>
          <Switch 
            value={faceId} 
            onValueChange={setFaceId} 
            trackColor={{ false: colors.border, true: colors.accent }}
          />
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Account</Text>

      <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {menuItems.map((item, index) => (
          <React.Fragment key={item.label}>
            <Pressable style={styles.menuItem} onPress={item.onPress}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconContainer, { backgroundColor: colors.background }]}>
                  <Feather name={item.icon} size={20} color={colors.text} />
                </View>
                <Text style={[styles.menuItemLabel, { color: colors.text }]}>{item.label}</Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.textSecondary} />
            </Pressable>
            {index < menuItems.length - 1 && <View style={styles.separator} />}
          </React.Fragment>
        ))}
      </View>

      <Pressable 
        style={[styles.logoutButton, { backgroundColor: colors.card, borderColor: colors.expense }]}
        onPress={handleLogout}
      >
        <Feather name="log-out" size={20} color={colors.expense} style={styles.logoutIcon} />
        <Text style={[styles.logoutText, { color: colors.expense }]}>Log Out</Text>
      </Pressable>

      <Text style={[styles.versionText, { color: colors.textSecondary }]}>Version 1.0.0</Text>
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
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 32,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 12,
    marginLeft: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  menuCard: {
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 24,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuItemLabel: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(150,150,150,0.2)',
    marginLeft: 72,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 24,
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  }
});
