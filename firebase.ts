import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { doc, setDoc, getDoc, getDocs, collection, query, where, onSnapshot, addDoc, updateDoc, arrayUnion, deleteDoc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyD57XFZAt9SWHQ2WRAXztugYo1P6U2_XvE",
  authDomain: "zero-messenger-4d20d.firebaseapp.com",
  projectId: "zero-messenger-4d20d",
  storageBucket: "zero-messenger-4d20d.firebasestorage.app",
  messagingSenderId: "11851164681",
  appId: "1:11851164681:web:fe7a608c25654beaba9cd8"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)

export const firestore = {
  // User operations
  createUser: async (user: any) => {
    const userRef = doc(db, 'users', user.id)
    await setDoc(userRef, { ...user, lastSeen: new Date().toISOString() })
  },
  
  getUser: async (userId: string) => {
    const docRef = doc(db, 'users', userId)
    const docSnap = await getDoc(docRef)
    return docSnap.exists() ? docSnap.data() : null
  },
  
  getUserByEmail: async (email: string) => {
    const q = query(collection(db, 'users'), where('email', '==', email))
    const querySnapshot = await getDocs(q)
    return !querySnapshot.empty ? querySnapshot.docs[0].data() : null
  },
  
  updateUser: async (user: any) => {
    const userRef = doc(db, 'users', user.id)
    await updateDoc(userRef, user)
  },
  
  // Message operations
  sendMessage: async (message: any) => {
    await addDoc(collection(db, 'messages'), message)
  },
  
  getMessages: (userId1: string, userId2: string, callback: (messages: any[]) => void) => {
    const q = query(collection(db, 'messages'))
    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((m: any) => 
          (m.senderId === userId1 && m.recipientId === userId2) ||
          (m.senderId === userId2 && m.recipientId === userId1)
        )
        .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      callback(messages)
    })
  },
  
  updateMessage: async (messageId: string, updates: any) => {
    const msgRef = doc(db, 'messages', messageId)
    await updateDoc(msgRef, updates)
  },
  
  deleteMessage: async (messageId: string) => {
    await deleteDoc(doc(db, 'messages', messageId))
  }
  }
