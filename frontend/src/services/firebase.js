// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database"; // Add this import

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDH6-4sCqeUOFyuC0bzxn8sWJpMrswIELE",
  authDomain: "powerquality-d9f8e.firebaseapp.com",
  databaseURL: "https://powerquality-d9f8e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "powerquality-d9f8e",
  storageBucket: "powerquality-d9f8e.firebasestorage.app",
  messagingSenderId: "151796202419",
  appId: "1:151796202419:web:a3c217247660aaf5e569c6",
  measurementId: "G-0M9SJXCVBV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app); // Initialize database

// Export the database
export { database };