import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '../theme/colors';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HowToUseScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.white || '#FFF'} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>How to Use TubeRise</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <StepCard 
          icon="play-circle-outline" 
          title="Step 1 🎬 Watch Videos" 
          desc="Watch other users' videos to earn coins" 
        />
        <StepCard 
          icon="thumb-up" 
          title="Step 2 👍 Like Videos" 
          desc="Like videos to earn coins" 
        />
        <StepCard 
          icon="subscriptions" 
          title="Step 3 🔔 Subscribe" 
          desc="Subscribe to channels to earn coins" 
        />
        <StepCard 
          icon="comment" 
          title="Step 4 💬 Comment" 
          desc="Leave comments to earn coins" 
        />
        <StepCard 
          icon="rocket-launch" 
          title="Step 5 🚀 Create Campaign" 
          desc="Spend coins to promote your own YouTube videos and get real views, likes, subscribers and comments" 
        />
      </ScrollView>
    </View>
  );
}

function StepCard({ icon, title, desc }) {
  return (
    <View style={styles.card}>
      <View style={styles.iconContainer}>
        <MaterialIcons name={icon} size={32} color={Colors.white || '#FFF'} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.desc}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background || '#F9FAFB' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    backgroundColor: Colors.primary || '#FF0000'
  },
  backBtn: { marginRight: 16 },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: Colors.white || '#FFF'
  },
  scroll: { padding: 16 },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.white || '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border || '#E5E7EB',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary || '#FF0000',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  textContainer: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: 'bold', color: Colors.primary || '#FF0000', marginBottom: 4 },
  desc: { fontSize: 14, color: Colors.textSecondary || '#6B7280' },
});
