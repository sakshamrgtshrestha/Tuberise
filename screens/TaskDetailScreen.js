import React, { useState, useEffect } from 'react';
import { View, StyleSheet, StatusBar, Alert, ActivityIndicator, Text } from 'react-native';
import { Colors } from '../theme/colors';
import YouTubeWebView from '../components/YouTubeWebView';
import { useCoins } from '../context/CoinContext';
import { updateCampaignProgress, getActiveCampaignsForFeed } from '../services/campaignService';
import { useAuth } from '../context/AuthContext';
import { markTaskCompleted, hasCompletedTimer, getCompletedCampaignIds } from '../services/completedTasksService';
import AutoplayCountdown from '../components/AutoplayCountdown';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

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

  // Always fetch a fresh OAuth token before any YouTube API call.
  // The token stored in AuthContext expires after ~1 hour, causing 401 errors.
  const getFreshAccessToken = async () => {
    try {
      const tokens = await GoogleSignin.getTokens();
      console.log('Fresh token obtained:', tokens.accessToken ? 'SUCCESS' : 'FAILED');
      return tokens.accessToken;
    } catch (error) {
      console.warn('Failed to get fresh token, using stored token:', error);
      return user?.accessToken;
    }
  };
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [reducedTimer, setReducedTimer] = useState(false);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(initialAutoPlay || false);
  const [showAutoplayOverlay, setShowAutoplayOverlay] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('autoplay_enabled');
        if (stored !== null) {
          setAutoPlayEnabled(stored === 'true');
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

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
      
      if (autoPlayEnabled) {
        setShowAutoplayOverlay(true);
      } else {
        navigation.navigate('MainTabs', { screen: targetTab });
      }
      return;
    }

    // ── Like: YouTube API is the PRIMARY verifier ────────────────────────────
    if (taskType === 'like') {
      // DOM detection is only a helper hint — we always re-verify via API
      if (!actionVerified) {
        Alert.alert(
          'Action Incomplete',
          'You must like the video to earn coins.',
          [{ text: 'Go Back and Like', style: 'cancel' }],
        );
        return;
      }

      setVerifying(true);
      try {
        // 1. Get a fresh, non-expired access token
        const accessToken = await getFreshAccessToken();
        if (!accessToken) {
          Alert.alert(
            'Authentication Error',
            'Please sign out and sign in again to verify your action.',
          );
          return;
        }

        // 2. Extract the video ID from the task URL
        const videoUrlMatch = task.videoUrl?.match(
          /(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/,
        );
        const videoId = videoUrlMatch?.[1];
        if (!videoId) {
          // Can't determine video ID — fall back to DOM detection
          console.warn('Could not extract video ID from URL, using DOM detection');
          await grantRewards();
          if (autoPlayEnabled) {
            setShowAutoplayOverlay(true);
          } else {
            navigation.navigate('MainTabs', { screen: targetTab });
          }
          return;
        }

        // 3. Call YouTube API to confirm myRating=like
        const apiUrl =
          `https://www.googleapis.com/youtube/v3/videos` +
          `?part=snippet&myRating=like&id=${videoId}`;

        const response = await fetch(apiUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (response.status === 401) {
          Alert.alert(
            'Session Expired',
            'Please sign out and sign in again to verify your action.',
          );
          return;
        }

        const json = await response.json();
        const likeConfirmed =
          Array.isArray(json?.items) && json.items.length > 0;

        if (!likeConfirmed) {
          Alert.alert(
            'Like Not Detected',
            'Please like the video first before returning to app.',
            [{ text: 'Go Back and Like', style: 'cancel' }],
          );
          return;
        }

        // 4. API confirmed — award coins
        await grantRewards();
        if (autoPlayEnabled) {
          setShowAutoplayOverlay(true);
        } else {
          navigation.navigate('MainTabs', { screen: targetTab });
        }
      } catch (e) {
        console.error('Like API verification failed:', e);
        Alert.alert('Error', 'Failed to verify like. Please try again.');
      } finally {
        setVerifying(false);
      }
      return;
    }
    
    // For subscribe/comment: check actionVerified (DOM detection)
    if (!actionVerified) {
      Alert.alert(
        'Action Incomplete',
        `You must ${taskType} the video/channel to earn coins.`,
        [{ text: 'Go Back and Complete', style: 'cancel' }],
      );
      return;
    }
    
    // Action was verified by DOM detection
    setVerifying(true);
    try {
      await grantRewards();
      if (autoPlayEnabled) {
        setShowAutoplayOverlay(true);
      } else {
        navigation.navigate('MainTabs', { screen: targetTab });
      }
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

  const handleLoadNextTask = async () => {
    setShowAutoplayOverlay(false);
    try {
      const completedIds = await getCompletedCampaignIds(user.email);
      const campaigns = await getActiveCampaignsForFeed(user.email, completedIds);
      const filteredTasks = campaigns.filter(c => c.type === taskType);
      
      if (filteredTasks.length > 0) {
        // Load the next task by replacing the current screen
        navigation.replace('TaskDetail', { task: filteredTasks[0], taskType, autoPlay: autoPlayEnabled });
      } else {
        Alert.alert("No Tasks", "No more tasks available right now. Check back later!");
        setTimeout(() => {
          navigation.navigate('MainTabs', { screen: TASK_TAB_MAP[taskType] ?? 'View' });
        }, 2000);
      }
    } catch (e) {
      console.error(e);
      navigation.navigate('MainTabs', { screen: TASK_TAB_MAP[taskType] ?? 'View' });
    }
  };

  const handleStopAutoplay = async () => {
    setShowAutoplayOverlay(false);
    setAutoPlayEnabled(false);
    try {
      await AsyncStorage.setItem('autoplay_enabled', 'false');
    } catch (e) {
      console.error(e);
    }
    navigation.navigate('MainTabs', { screen: TASK_TAB_MAP[taskType] ?? 'View' });
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
        expectedEmail={user?.email}
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

      {showAutoplayOverlay && (
        <AutoplayCountdown
          coinsEarned={task.coinsReward}
          onCountdownEnd={handleLoadNextTask}
          onSkip={handleLoadNextTask}
          onStop={handleStopAutoplay}
        />
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
