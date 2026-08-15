import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PrivacyPolicyScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#d32f2f" barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>Last updated: June 2026</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>WHAT INFORMATION WE COLLECT</Text>
          <View style={styles.divider} />
          <Text style={styles.bodyText}>
            We collect your Google account name, email address, and profile photo when you sign in. We also store your coin balance, campaign history, and in-app activity to provide the TubeRise service.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>HOW WE USE YOUR INFORMATION</Text>
          <View style={styles.divider} />
          <Text style={styles.bodyText}>
            We only use information granted by you so that you can use all features TubeRise provides and to improve our services. We respect your privacy and recognize the importance of protecting any information collected about you.
            {"\n\n"}
            Please be aware that no security measure is absolutely guaranteed to prevent unauthorized access. We use best security methods and tools to protect your data.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>YOUTUBE DATA AND PERMISSIONS</Text>
          <View style={styles.divider} />
          <Text style={styles.bodyText}>
            TubeRise connects to YouTube to verify your engagement activities such as likes, subscriptions, and comments. We may require permissions for network connections and YouTube account viewing to provide app functions.
            {"\n\n"}
            We may use Google Analytics to analyze anonymous aggregated usage data. Please refer to Google's own policy guidelines if you have any questions regarding the use they make of your data.
          </Text>
        </View>


        <View style={styles.card}>
          <Text style={styles.sectionTitle}>CONTACT US</Text>
          <View style={styles.divider} />
          <Text style={styles.bodyText}>
            If you wish to contact us regarding any privacy-related matters or app feedback, please email us at:{"\n"}
            sakchhyam10@gmail.com{"\n"}
            We will be happy to hear from you.
          </Text>
        </View>

        <Text style={styles.footerText}>© 2026 TubeRise. All Rights Reserved.</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#d32f2f', // Professional Red Header area
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#d32f2f',
    paddingVertical: 15,
    paddingHorizontal: 15,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  container: {
    backgroundColor: '#f5f5f5',
    padding: 20,
    flexGrow: 1,
  },
  subtitle: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginBottom: 12,
  },
  bodyText: {
    color: '#444',
    fontSize: 14,
    lineHeight: 22,
  },
  footerText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
});

export default PrivacyPolicyScreen;
