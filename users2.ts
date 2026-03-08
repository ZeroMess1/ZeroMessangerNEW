import { db } from '../config';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  getDocs,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  about: string;
  birthDate: string;
  showBirthDate: boolean;
  showOnlineStatus: boolean;
  fontSize: number;
  uniqueId: string;
  lastSeen: Timestamp;
  createdAt: Timestamp;
}

const generateUniqueId = (): string => {
  let id = '';
  for (let i = 0; i < 4; i++) {
    id += Math.floor(Math.random() * 10);
  }
  return id;
};

export const createUserProfile = async (userId: string, email: string, name: string): Promise<UserProfile> => {
  const uniqueId = generateUniqueId();
  
  const q = query(collection(db, 'users'), where('uniqueId', '==', uniqueId));
  const querySnapshot = await getDocs(q);
  
  if (!querySnapshot.empty) {
    return createUserProfile(userId, email, name);
  }

  const userProfile: UserProfile = {
    id: userId,
    email,
    name,
    avatarUrl: '',
    about: '',
    birthDate: '',
    showBirthDate: true,
    showOnlineStatus: true,
    fontSize: 16,
    uniqueId,
    lastSeen: serverTimestamp() as Timestamp,
    createdAt: serverTimestamp() as Timestamp
  };

  await setDoc(doc(db, 'users', userId), userProfile);
  return userProfile;
};

export const getUserProfile = async (userId: string) => {
  const docRef = doc(db, 'users', userId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() as UserProfile : null;
};

export const updateUserProfile = async (userId: string, updates: Partial<UserProfile>) => {
  const docRef = doc(db, 'users', userId);
  await updateDoc(docRef, updates);
};

export const updateUserLastSeen = async (userId: string) => {
  const docRef = doc(db, 'users', userId);
  await updateDoc(docRef, { lastSeen: serverTimestamp() });
};

export const findUserByIdCode = async (uniqueId: string) => {
  const q = query(collection(db, 'users'), where('uniqueId', '==', uniqueId));
  const querySnapshot = await getDocs(q);
  
  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as UserProfile;
  }
  return null;
};

export const subscribeToUserProfile = (userId: string, callback: (profile: UserProfile | null) => void) => {
  const docRef = doc(db, 'users', userId);
  return onSnapshot(docRef, (doc) => {
    callback(doc.exists() ? doc.data() as UserProfile : null);
  });
};