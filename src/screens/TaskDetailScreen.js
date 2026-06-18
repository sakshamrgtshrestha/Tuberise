import React, { useState } from 'react';
import { View, StyleSheet, StatusBar, Alert, ActivityIndicator, Text } from 'react-native';
import { Colors } from '../theme/colors';
import YouTubeWebView from '../components/YouTubeWebView';
import { useCoins } from '../context/CoinContext';
import { updateCampaignProgress } from '../services/campaignService';
import { useAuth } from '../context/AuthContext';
import { markTaskCompleted, hasCompletedTimer } from '../services/completedTasksService';
import { useEffect } from 'react';

// Map task type → correct tab name defined in AppNavigator.js
const TASK_TAB_MAP = {
  watch:     'View',
  like:      'Like',
  subscribe: 'Subscribe',
  comment:   'Comment',
};

export default function TaskDetailScreen({ route, navigation }) {
  const { task, taskType, autoPlay: initialAutoPlay } = route.params;
  const { addCoins } = useCoins();
  const { user } = useAuth();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [reducedTimer, setReducedTimer] = useState(false);

  useEffect(() => {
    if (!user?.email || !task?.id) return;
    hasCompletedTimer(user.email, task.id).then(done => {
      setReducedTimer(done);
    });
  }, [task?.id, user?.email]);

  const grantRewards = async () => {
    await addCoins(task.coinsReward, `${taskType} reward`);
    try {
      await updateCampaignProgress(task.id);
      
      await markTaskCompleted(user.email, task.id, taskType);
    } catch (error) {
      console.error("Failed to update campaign progress:", error);
    }
  };

  const handleReturnToApp = async ({ success, actionVerified }) => {
    const targetTab = TASK_TAB_MAP[taskType] ?? 'View';

    if (!success) {
      navigation.navigate('MainTabs', { screen: targetTab });
      return;
    }
    
    // Watch type: give coins immediately
    if (taskType === 'watch') {
      await addCoins(task.coinsReward, `${taskType} reward`);
      await updateCampaignProgress(task.id);
      await markTaskCompleted(user.email, task.id, taskType);
      navigation.navigate('MainTabs', { screen: targetTab });
      return;
    }
    
    // For like/subscribe/comment: check actionVerified
    if (!actionVerified) {
      Alert.alert(
        'Action Incomplete',
        `You must ${taskType} the video/channel to earn coins.`,
        [{ text: 'Go Back and Complete', style: 'cancel' }]
      );
      return;
    }
    
    // Action was verified by DOM detection
    setVerifying(true);
    try {
      await addCoins(task.coinsReward, `${taskType} reward`);
      await updateCampaignProgress(task.id);
      
      await markTaskCompleted(user.email, task.id, taskType);
      
      navigation.navigate('MainTabs', { screen: targetTab });
    } catch(e) {
      Alert.alert('Error', 'Failed to award coins. Try again.');
    } finally {
      setVerifying(false);
    }
  };

  /** Called by YouTubeWebView when auto-advance fires */
  const handleAutoAdvance = async (nextTask, nextIndex) => {
    setCurrentIndex(nextIndex);
  };

  if (!task) return null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <YouTubeWebView
        key={task.id}
        task={task}
        actionType={taskType}
        onReturnToApp={handleReturnToApp}
        onAutoAdvance={handleAutoAdvance}
        taskIndex={0}
        initialAutoPlay={initialAutoPlay}
        userEmail={user?.email}
        reducedTimer={reducedTimer}
      />
      {verifying && (
        <View style={styles.verifyingOverlay}>
          <View style={styles.verifyingCard}>
            <ActivityIndicator size="large" color="#3366FF" />
            <Text style={styles.verifyingTitle}>Please wait...</Text>
            <Text style={styles.verifyingSub}>Checking your action...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.lightGray },
  verifyingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 9999,
  },
  verifyingCard: {
    backgroundColor: '#FFF',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  verifyingTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  verifyingSub: {
    fontSize: 14,
    color: '#666',
  }
});
