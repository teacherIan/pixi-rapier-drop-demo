import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyC2X0pHx-BINAI9ecp1jEcr15imVCGEd7c',
  authDomain: 'house-points-882ac.firebaseapp.com',
  projectId: 'house-points-882ac',
  storageBucket: 'house-points-882ac.appspot.com',
  messagingSenderId: '970622774265',
  appId: '1:970622774265:web:bab2c4483f7ad6cd336b28',
  measurementId: 'G-J315L959B4',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
