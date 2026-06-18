import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const RED = '#E02020';

const SECTIONS = [
  {
    title: 'WHAT INFORMATION WE COLLECT',
    body: 'We collect your Google account name, email address, and profile photo when you sign in with Google. We also store your coin balance, campaign history, and in-app activity.',
  },
  {
    title: 'HOW WE USE YOUR INFORMATION',
    body: 'We only use information granted by you so that you can use all features TubeRise provides. We respect your privacy and recognize the importance of protecting your information.\n\nPlease be aware that no security measure is absolutely guaranteed. We use best security methods and tools to protect your data.',
  },
  {
    title: 'YOUTUBE DATA & PERMISSIONS',
    body: 'TubeRise connects to YouTube to verify your engagement activities such as likes, subscriptions, and comments. We may require permissions for network connections and YouTube account viewing to provide app functions.\n\nWe use Google Analytics to analyze anonymous usage data. Please refer to Google\'s own policy guidelines for how they handle your data.',
  },
  {
    title: 'DATA STORAGE',
    body: 'Your data is stored securely in Firebase Firestore by Google. We take reasonable measures to protect your information from unauthorized access.',
  },
  {
    title: 'CONTACT US',
    body: 'If you wish to contact us regarding any privacy-related matters or feedback, please email us at:\n\nsakchhyam10@gmail.com\n\nWe will be happy to hear from you.',
  },
];

export default function PrivacyPolicyScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={RED} />

      {/* ── Red Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Subtitle */}
        <Text style={styles.subtitle}>Last updated: June 2026</Text>

        {/* Section Cards */}
        {SECTIONS.map((section, index) => (
          <View key={index} style={styles.card}>
            <Text style={styles.cardTitle}>{section.title}</Text>
            <View style={styles.divider} />
            <Text style={styles.cardBody}>{section.body}</Text>
          </View>
        ))}

        {/* Footer */}
        <Text style={styles.footer}>© 2026 TubeRise. All Rights Reserved.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F4F8',
  },

  /* Header */
  header: {
    backgroundColor: RED,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.3,
  },
  headerRight: {
    width: 32,
  },

  /* Scroll */
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
    marginBottom: 16,
    textAlign: 'center',
  },

  /* Cards */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#121212',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  divider: {
    height: 1.5,
    backgroundColor: '#F0F0F0',
    marginBottom: 12,
  },
  cardBody: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },

  /* Footer */
  footer: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
});
