// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyB-lIp7mVC69O1bMplnbULnycCFwgZt00k",
    authDomain: "join-584c8.firebaseapp.com",
    databaseURL: "https://join-584c8-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "join-584c8",
    storageBucket: "join-584c8.firebasestorage.app",
    messagingSenderId: "25424665774",
    appId: "1:25424665774:web:fba2e7379dfb1837f0613f",
    measurementId: "G-6MN6NCKMXT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);