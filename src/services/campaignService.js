import { db } from '../config/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  doc,
  query, 
  where,
  serverTimestamp,
  orderBy,
  deleteDoc,
  updateDoc,
  increment
} from 'firebase/firestore';

const CAMPAIGNS_COLLECTION = 'campaigns';

export const createCampaign = async (campaignData) => {
  try {
    const docRef = await addDoc(collection(db, CAMPAIGNS_COLLECTION), {
      userEmail: campaignData.userEmail,
      videoUrl: campaignData.videoUrl,
      videoId: campaignData.videoId,
      type: campaignData.type,
      totalRequired: campaignData.totalRequired,
      currentProgress: 0,
      coinsReward: campaignData.coinsReward,
      watchTimeRequired: campaignData.watchTimeRequired,
      channelName: campaignData.channelName || 'My Channel',
      status: 'active',
      totalCost: campaignData.totalCost,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating campaign:', error);
    throw error;
  }
};

export const getUserCampaigns = async (email) => {
  try {
    const campaignsQuery = query(
      collection(db, CAMPAIGNS_COLLECTION),
      where('userEmail', '==', email)
    );
    
    const querySnapshot = await getDocs(campaignsQuery);
    const campaigns = [];
    querySnapshot.forEach((doc) => {
      campaigns.push({ id: doc.id, ...doc.data() });
    });
    
    // Sort client-side to avoid index requirement temporarily
    return campaigns.sort((a, b) => {
      const timeA = a.createdAt?.toMillis() || 0;
      const timeB = b.createdAt?.toMillis() || 0;
      return timeB - timeA;
    });
  } catch (error) {
    console.error('Error fetching user campaigns:', error);
    throw error;
  }
};

export const getAllCampaigns = async () => {
  try {
    const campaignsQuery = query(
      collection(db, CAMPAIGNS_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(campaignsQuery);
    const campaigns = [];
    querySnapshot.forEach((doc) => {
      campaigns.push({ id: doc.id, ...doc.data() });
    });
    return campaigns;
  } catch (error) {
    console.error('Error fetching all campaigns:', error);
    throw error;
  }
};

export const deleteCampaign = async (campaignId) => {
  try {
    const campaignRef = doc(db, CAMPAIGNS_COLLECTION, campaignId);
    await deleteDoc(campaignRef);
  } catch (error) {
    console.error('Error deleting campaign:', error);
    throw error;
  }
};

export const getActiveCampaignsForFeed = async (currentUserEmail, completedCampaignIds = []) => {
  try {
    const campaignsQuery = query(
      collection(db, CAMPAIGNS_COLLECTION),
      where('status', '==', 'active')
    );
    
    const querySnapshot = await getDocs(campaignsQuery);
    const campaigns = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Filter out user's own campaigns and completed campaigns
      if (data.userEmail !== currentUserEmail && !completedCampaignIds.includes(doc.id)) {
        campaigns.push({ id: doc.id, ...data });
      }
    });
    
    // Sort client-side for now
    return campaigns.sort((a, b) => {
      const timeA = a.createdAt?.toMillis() || 0;
      const timeB = b.createdAt?.toMillis() || 0;
      return timeB - timeA;
    });
  } catch (error) {
    console.error('Error fetching active campaigns:', error);
    throw error;
  }
};

export const updateCampaignProgress = async (campaignId) => {
  try {
    const campaignRef = doc(db, CAMPAIGNS_COLLECTION, campaignId);
    const campaignSnap = await getDoc(campaignRef);
    
    if (campaignSnap.exists()) {
      const data = campaignSnap.data();
      const newProgress = (data.currentProgress || 0) + 1;
      const isCompleted = newProgress >= data.totalRequired;
      
      await updateDoc(campaignRef, {
        currentProgress: increment(1),
        status: isCompleted ? 'completed' : 'active'
      });
    }
  } catch (error) {
    console.error('Error updating campaign progress:', error);
    throw error;
  }
};
