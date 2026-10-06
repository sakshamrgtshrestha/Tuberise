import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function AutoplayCountdown({ coinsEarned, onCountdownEnd, onSkip, onStop, duration = 10 }) {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    if (timeLeft === 0) {
      onCountdownEnd();
      return;
    }
    const timerId = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timerId);
  }, [timeLeft, onCountdownEnd]);

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.checkmark}>✅</Text>
        <Text style={styles.title}>Task Complete!</Text>
        <Text style={styles.coinsText}>⚡ +{coinsEarned} coins added</Text>
        
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{timeLeft}</Text>
        </View>
        <Text style={styles.nextText}>Next video in {timeLeft} seconds...</Text>

        <TouchableOpacity style={styles.skipBtn} onPress={onSkip} activeOpacity={0.8}>
          <Text style={styles.skipBtnText}>Skip Wait</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.stopBtn} onPress={onStop} activeOpacity={0.8}>
          <Text style={styles.stopBtnText}>Stop Auto-play</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, width, height,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  card: {
    width: width * 0.85,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#121212',
    marginBottom: 8,
  },
  coinsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFB800',
    marginBottom: 24,
  },
  timerContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#3366FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  timerText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3366FF',
  },
  nextText: {
    fontSize: 15,
    color: '#666666',
    marginBottom: 24,
  },
  skipBtn: {
    width: '100%',
    backgroundColor: '#E53935',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  skipBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stopBtn: {
    width: '100%',
    backgroundColor: '#E0E0E0',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  stopBtnText: {
    color: '#444444',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
