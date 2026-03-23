import { initializeApp } from 'firebase/app'
import { getDatabase, ref, set, onValue, remove, update, push, get } from 'firebase/database'

const firebaseConfig = {
  apiKey: "AIzaSyAmkF4UH2ZPhT4jiwYbEPj61ARcerC_cUQ",
  authDomain: "breakroom2.firebaseapp.com",
  projectId: "breakroom2",
  storageBucket: "breakroom2.firebasestorage.app",
  messagingSenderId: "1075257099619",
  appId: "1:1075257099619:web:d07e4a2f5c9298270d3f56",
  databaseURL: "https://breakroom2-default-rtdb.firebaseio.com"
}

const app = initializeApp(firebaseConfig)
const db = getDatabase(app)

export { db, ref, set, onValue, remove, update, push, get }
