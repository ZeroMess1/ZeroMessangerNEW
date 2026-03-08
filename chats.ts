import { db } from '../config';
import { 
  collection, 
  doc, 
  getDoc, 
  updateDoc, 
  query, 
  where, 
  getDocs,
  onSnapshot,
  orderBy,
  addDoc,
  serverTimestamp,
  Timestamp,
  arrayUnion
} from 'firebase/firestore';

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Timestamp;
  read: boolean;
  deletedFor: string[];
  deleteForEveryone: boolean;
}

export interface Chat {
  id: string;
  participants: string[];
  lastMessage?: {
    text: string;
    timestamp: Timestamp;
    senderId: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const getOrCreateChat = async (userId1: string, userId2: string) => {
  // Check if chat already exists
  const q = query(
    collection(db, 'chats'),
    where('participants', '==', [userId1, userId2].sort())
  );
  const querySnapshot = await getDocs(q);
  
  if (!querySnapshot.empty) {
    return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as Chat;
  }
  
  // Create new chat
  const chatData: Omit<Chat, 'id'> = {
    participants: [userId1, userId2].sort(),
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp
  };
  
  const docRef = await addDoc(collection(db, 'chats'), chatData);
  return { id: docRef.id, ...chatData } as Chat;
};

export const sendMessage = async (chatId: string, senderId: string, text: string) => {
  const messageData: Omit<Message, 'id'> = {
    senderId,
    text,
    timestamp: serverTimestamp() as Timestamp,
    read: false,
    deletedFor: [],
    deleteForEveryone: false
  };
  
  await addDoc(collection(db, `chats/${chatId}/messages`), messageData);
  
  // Update chat's last message
  const chatRef = doc(db, 'chats', chatId);
  await updateDoc(chatRef, {
    lastMessage: {
      text,
      timestamp: serverTimestamp() as Timestamp,
      senderId
    },
    updatedAt: serverTimestamp() as Timestamp
  });
};

export const markMessageAsRead = async (chatId: string, messageId: string) => {
  const messageRef = doc(db, `chats/${chatId}/messages`, messageId);
  await updateDoc(messageRef, { read: true });
};

export const markAllMessagesAsRead = async (chatId: string, currentUserId: string) => {
  // Get all unread messages
  const q = query(
    collection(db, `chats/${chatId}/messages`),
    where('senderId', '!=', currentUserId),
    where('read', '==', false)
  );
  const querySnapshot = await getDocs(q);
  
  // Mark each unread message as read
  const batch = querySnapshot.docs.map(docSnap => {
    return updateDoc(docSnap.ref, { read: true });
  });
  
  await Promise.all(batch);
};

export const deleteMessageForMe = async (chatId: string, messageId: string, userId: string) => {
  const messageRef = doc(db, `chats/${chatId}/messages`, messageId);
  await updateDoc(messageRef, {
    deletedFor: arrayUnion(userId)
  });
};

export const deleteMessageForEveryone = async (chatId: string, messageId: string, userId: string) => {
  const messageRef = doc(db, `chats/${chatId}/messages`, messageId);
  
  // First check if sender is trying to delete
  const docSnap = await getDoc(messageRef);
  if (docSnap.exists()) {
    const message = docSnap.data() as Message;
    if (message.senderId === userId) {
      await updateDoc(messageRef, { deleteForEveryone: true });
    }
  }
};

export const subscribeToChatMessages = (chatId: string, callback: (messages: Message[]) => void) => {
  const q = query(
    collection(db, `chats/${chatId}/messages`),
    orderBy('timestamp', 'asc')
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const messages = querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Message))
      .filter(msg => !msg.deleteForEveryone);
    callback(messages);
  });
};

export const subscribeToUserChats = (userId: string, callback: (chats: Chat[]) => void) => {
  const q = query(
    collection(db, 'chats'),
    where('participants', 'array-contains', userId)
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const chats = querySnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as Chat));
    callback(chats);
  });
};

export const getChatPartnerId = (chat: Chat, currentUserId: string) => {
  return chat.participants.find(id => id !== currentUserId);
};