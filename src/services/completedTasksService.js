import AsyncStorage from '@react-native-async-storage/async-storage';

export const markTaskCompleted = async (userId, targetId, action) => {
  if (!userId || !targetId || !action) return;
  try {
    const key = `completedTasks_${userId}`;
    const data = await AsyncStorage.getItem(key);
    const tasks = data ? JSON.parse(data) : [];
    
    // Check if it already exists
    if (!tasks.some(t => t.videoId === targetId && t.action === action)) {
      tasks.push({ videoId: targetId, action, completedAt: Date.now() });
      await AsyncStorage.setItem(key, JSON.stringify(tasks));
    }
  } catch (error) {
    // Ignore error silently to prevent UI toasts
  }
};

export const hasCompletedTask = async (userId, targetId, action) => {
  if (!userId || !targetId || !action) return false;
  try {
    const key = `completedTasks_${userId}`;
    const data = await AsyncStorage.getItem(key);
    if (!data) return false;
    
    const tasks = JSON.parse(data);
    return tasks.some(t => t.videoId === targetId && t.action === action);
  } catch (error) {
    return false;
  }
};

export const getCompletedTasks = async (userId) => {
  if (!userId) return [];
  try {
    const key = `completedTasks_${userId}`;
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    return [];
  }
};
