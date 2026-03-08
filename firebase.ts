import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, query, where, onSnapshot, addDoc, updateDoc } from 'firebase/firestore'
import { connectAuthEmulator, getAuth, Auth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyD57XFZAt9SWHQ2WRAXztugYo1P6U2_XvE",
  authDomain: "zero-messenger-4d20d.firebaseapp.com",
  projectId: "zero-messenger-4d20d",
  storageBucket: "zero-messenger-4d20d.firebasestorage.app",
  messagingSenderId: "11851164681",
  appId: "1:11851164681:web:fe7a608c25654beaba9cd8"
}

const app = initializeApp(firebaseConfig, {
  // Настройки для решения проблемы network-request-failed
  automaticDataCollectionEnabled: false
})

export const db = getFirestore(app)
export const auth = getAuth(app)

// Настройки для решения проблем с сетью
auth.languageCode = 'ru'
auth.tenantId = null

// Helper функция для повторных попыток при ошибке сети
const retryOperation = async <T,>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> => {
  let lastError: any
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation()
    } catch (error: any) {
      lastError = error
      console.log(`Attempt ${i + 1} failed, retrying...`)
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)))
      }
    }
  }
  throw lastError
}

export const firestore = {
  createUser: async (uid: string, user: any) => {
    const userRef = doc(db, 'users', uid)
    await setDoc(userRef, { ...user, id: uid, createdAt: new Date().toISOString() })
  },
  
  getUser: async (userId: string) => {
    const docRef = doc(db, 'users', userId)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() }
    }
    return null
  },
  
  getUserBySearchId: async (searchId: string) => {
    const q = query(collection(db, 'users'), where('searchId', '==', searchId))
    const querySnapshot = await getDocs(q)
    if (!querySnapshot.empty) {
      return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() }
    }
    return null
  },
  
  getUserByEmail: async (email: string) => {
    const q = query(collection(db, 'users'), where('email', '==', email))
    const querySnapshot = await getDocs(q)
    if (!querySnapshot.empty) {
      return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() }
    }
    return null
  },
  
  updateUser: async (uid: string, data: any) => {
    const userRef = doc(db, 'users', uid)
    await updateDoc(userRef, data)
  },
  
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
          (m.senderId === userId2 && m.recipientId === userId1) ||
          // Для избранного - сообщения自己和自己的
          (userId1 === 'favorites' && m.senderId === userId2 && m.recipientId === userId2) ||
          (userId2 === 'favorites' && m.senderId === userId1 && m.recipientId === userId1)
        )
        .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      callback(messages)
    })
  },
  
  updateMessage: async (messageId: string, updates: any) => {
    const msgRef = doc(db, 'messages', messageId)
    await updateDoc(msgRef, updates)
  }
}

export const authRetry = {
  signIn: async (email: string, password: string) => {
    return retryOperation(async () => {
      return getAuth().signInWithEmailAndPassword(email, password)
    })
  },
  
  createUser: async (email: string, password: string) => {
    return retryOperation(async () => {
      return getAuth().createUserWithEmailAndPassword(email, password)
    })
  },
  
  signOut: async () => {
    return retryOperation(async () => {
      return getAuth().signOut()
    })
  }
                          }
