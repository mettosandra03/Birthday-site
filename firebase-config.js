// ============================================================
// Sandy's Birthday Card — Firebase project connection.
// These keys are safe to be public; real protection comes from
// the Firestore security rules set in the Firebase Console.
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyBQRT-IEpei7_-fROQuDaPwB5BGGiff_W8",
  authDomain: "sandy-s-birthday-card.firebaseapp.com",
  projectId: "sandy-s-birthday-card",
  storageBucket: "sandy-s-birthday-card.firebasestorage.app",
  messagingSenderId: "561704753021",
  appId: "1:561704753021:web:aa387ecb5bb113365d1e14"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();