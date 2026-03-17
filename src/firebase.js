import { initializeApp } from 'firebase/app'
import { getDatabase, ref, set, onValue, remove, update, push, get } from 'firebase/database'

const firebaseConfig = {
  apiKey: "AIzaSyDWZF1Pr810V8ydgPk4iRdcct7gkMhJMQk",
  authDomain: "breakroom-ee98b.firebaseapp.com",
  projectId: "breakroom-ee98b",
  storageBucket: "breakroom-ee98b.firebasestorage.app",
  messagingSenderId: "98149534480",
  appId: "1:98149534480:web:a829d1023631e9ff24f395",
  databaseURL: "https://breakroom-ee98b-default-rtdb.firebaseio.com"
}

const app = initializeApp(firebaseConfig)
const db = getDatabase(app)

export { db, ref, set, onValue, remove, update, push, get }
