import { db, waitForAuth } from '../config/firebase';
import { 
  doc, setDoc, getDoc, collection, 
  query, where, getDocs 
} from 'firebase/firestore';

const COMPLETED_COLLECTION = 'completedTasks';

// Mark a campaign as completed by a user
export const markTaskCompleted = async (userEmail, campaignId, action) => {
  if (!userEmail || !campaignId || !action) return;
  try {
    await waitForAuth();
    const docId = `${userEmail}_${campaignId}_${action}`;
    const ref = doc(db, COMPLETED_COLLECTION, docId);
    await setDoc(ref, {
      userEmail,
      campaignId,
      action,
      completedAt: new Date(),
    }, { merge: true });
  } catch (error) {
    console.error('markTaskCompleted error:', error);
  }
};

// Check if user already completed a specific campaign+action
export const hasCompletedTask = async (userEmail, campaignId, action) => {
  if (!userEmail || !campaignId || !action) return false;
  try {
    await waitForAuth();
    const docId = `${userEmail}_${campaignId}_${action}`;
    const ref = doc(db, COMPLETED_COLLECTION, docId);
    const snap = await getDoc(ref);
    return snap.exists();
  } catch (error) {
    return false;
  }
};

// Get all campaign IDs completed by a user
export const getCompletedCampaignIds = async (userEmail) => {
  if (!userEmail) return [];
  try {
    await waitForAuth();
    const q = query(
      collection(db, COMPLETED_COLLECTION),
      where('userEmail', '==', userEmail)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data().campaignId);
  } catch (error) {
    return [];
  }
};

// Save that user completed the timer for a campaign
export const markTimerCompleted = async (userEmail, campaignId) => {
  if (!userEmail || !campaignId) return;
  try {
    await waitForAuth();
    const docId = `timer_${userEmail}_${campaignId}`;
    const ref = doc(db, 'timerMemory', docId);
    await setDoc(ref, {
      userEmail,
      campaignId,
      timerCompletedAt: new Date(),
    }, { merge: true });
  } catch (e) {
    console.error('markTimerCompleted error:', e);
  }
};

// Check if user already completed timer for this campaign
export const hasCompletedTimer = async (userEmail, campaignId) => {
  if (!userEmail || !campaignId) return false;
  try {
    await waitForAuth();
    const docId = `timer_${userEmail}_${campaignId}`;
    const ref = doc(db, 'timerMemory', docId);
    const snap = await getDoc(ref);
    return snap.exists();
  } catch (e) {
    return false;
  }
};
