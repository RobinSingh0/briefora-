const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixDatatypes() {
  const newsRef = db.collection('news');
  const snap = await newsRef.get();
  
  const batch = db.batch();
  let count = 0;
  
  snap.forEach(doc => {
    const data = doc.data();
    let updated = false;
    const updates = {};
    
    if (typeof data.timestamp === 'string') {
      try {
        updates.timestamp = admin.firestore.Timestamp.fromDate(new Date(data.timestamp));
        updated = true;
      } catch (e) {
        // ignore
      }
    }
    
    if (typeof data.createdAt === 'string') {
      try {
        updates.createdAt = admin.firestore.Timestamp.fromDate(new Date(data.createdAt));
        updated = true;
      } catch (e) {
        // ignore
      }
    }
    
    if (updated) {
      batch.update(doc.ref, updates);
      count++;
    }
  });
  
  if (count > 0) {
    await batch.commit();
    console.log(`Updated ${count} documents with fix.`);
  } else {
    console.log('No documents needed fixing.');
  }
}

fixDatatypes().catch(console.error);
