const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, orderBy, limit, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  projectId: 'briefly-32a26',
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const q = query(collection(db, 'news'), orderBy('timestamp', 'desc'), limit(3));
  const snap = await getDocs(q);
  snap.docs.forEach(d => {
    const data = d.data();
    console.log(d.id, '->', 'timestamp:', data.timestamp?.toDate ? data.timestamp.toDate() : data.timestamp, 'publishDate:', data.publishDate);
  });
}
run().catch(console.error);
