// Replace the values below with your Firebase project's config.
// For security, do not commit real production secrets into public repos.

import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyAPxM_stksIGue0mxI3axo_Eun2t1nIyYc",
  authDomain: "kolding-rengoering-app.firebaseapp.com",
  projectId: "kolding-rengoering-app",
  storageBucket: "kolding-rengoering-app.firebasestorage.app",
  messagingSenderId: "993617596191",
  appId: "1:993617596191:web:dc39c96e4a5143f56fea2a",
  measurementId: "G-XNX1XCNDLV"
};

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
