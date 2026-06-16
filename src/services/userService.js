import { db } from '../config/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  getDocs,
  increment,
  serverTimestamp 
} from 'firebase/firestore';

const USERS_COLLECTION = 'users';

// Generate a unique 6-digit userId starting at 100001
const generateUserId = () => {
  const randomPart = Math.floor(1000 + Math.random() * 9000); // 4 random digits
  return 100000 + randomPart; // e.g. 101234, 107823
};

export const createOrUpdateUser = async (userInfo) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userInfo.email);
    const userSnap = await getDoc(userRef);

    const isAdmin = userInfo.email === 'sakchhyam10@gmail.com';

    if (!userSnap.exists()) {
      // New user — generate unique userId
      const userId = generateUserId();
      const newUserData = {
        email: userInfo.email,
        name: userInfo.name || '',
        photo: userInfo.photo || '',
        coins: 100, // 100 coins welcome bonus
        isBanned: false,
        isAdmin: isAdmin,
        userId: userId,
        createdAt: serverTimestamp()
      };
      await setDoc(userRef, newUserData);
      return newUserData;
    } else {
      // Existing user — keep existing userId if present, else generate one
      const data = userSnap.data();
      const userId = data.userId ?? generateUserId();
      const updatePayload = {
        name: userInfo.name || data.name,
        photo: userInfo.photo || data.photo,
        isAdmin: isAdmin,
        userId: userId, // preserve or backfill
      };
      await updateDoc(userRef, updatePayload);
      return {
        ...data,
        name: userInfo.name || data.name,
        photo: userInfo.photo || data.photo,
        isAdmin: isAdmin,
        userId: userId,
      };
    }
  } catch (error) {
    console.error('Error in createOrUpdateUser:', error);
    throw error;
  }
};

export const getUserData = async (email) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, email);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      return userSnap.data();
    }
    return null;
  } catch (error) {
    console.error('Error fetching user data:', error);
    throw error;
  }
};

export const updateCoins = async (email, amount) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, email);
    await updateDoc(userRef, {
      coins: increment(amount)
    });
  } catch (error) {
    console.error('Error updating coins:', error);
    throw error;
  }
};

export const banUser = async (email) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, email);
    await updateDoc(userRef, {
      isBanned: true
    });
  } catch (error) {
    console.error('Error banning user:', error);
    throw error;
  }
};

export const unbanUser = async (email) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, email);
    await updateDoc(userRef, {
      isBanned: false
    });
  } catch (error) {
    console.error('Error unbanning user:', error);
    throw error;
  }
};

export const getAllUsers = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, USERS_COLLECTION));
    const users = [];
    querySnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() });
    });
    return users;
  } catch (error) {
    console.error('Error fetching all users:', error);
    throw error;
  }
};
