// js/firebase-config.js

// Імпортуємо функції з CDN-посилань для ES модулів
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

// Your web app's Firebase configuration
// ВАЖЛИВО: Вставте сюди ваш конфігураційний об'єкт, який ви надали
const firebaseConfig = {
  apiKey: "AIzaSyDVDdWgsAmeSetWnRspp0FvwVkqjrEh28o",
  authDomain: "weeclick-c5f62.firebaseapp.com",
  projectId: "weeclick-c5f62",
  storageBucket: "weeclick-c5f62.firebasestorage.app",
  messagingSenderId: "58414556348",
  appId: "1:58414556348:web:6f1d774d69740b2a719cb9",
  measurementId: "G-613EXXQMHB"
};

// Ініціалізуємо Firebase
const app = initializeApp(firebaseConfig);
// Отримуємо доступ до бази даних Firestore
const db = getFirestore(app);

// Експортуємо `db`, щоб використовувати його в інших файлах
export { db };
