import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';

const sampleNews = [
  {
    title: 'Quantum Breakthrough: Computing at Room Temp',
    summary: 'Researchers have finally stabilized qubits at room temperature, ending the need for massive cooling systems. This paves the way for commercial quantum computers within the decade.',
    category: 'TECH',
    timestamp: new Date().toISOString(),
    imageUrl: 'https://picsum.photos/800/1200?random=1'
  },
  {
    title: 'New AI Model Passes the Turing Test in 5 Languages',
    summary: 'A new multimodal AI has convinced human evaluators of its sentience in five different languages, marking a significant milestone in natural language processing and AGI development.',
    category: 'AI',
    timestamp: new Date().toISOString(),
    imageUrl: 'https://picsum.photos/800/1200?random=2'
  },
  {
    title: 'Global Markets Rally as Inflation Hits 10-Year Low',
    summary: 'Stock markets across the globe saw record highs today as the latest economic data showed inflation falling below 2% for the first time in a decade.',
    category: 'BUSINESS',
    timestamp: new Date().toISOString(),
    imageUrl: 'https://picsum.photos/800/1200?random=3'
  }
];

export const populateDummyData = async () => {
  try {
    const newsRef = collection(db, 'news');
    for (const item of sampleNews) {
      await addDoc(newsRef, item);
    }
    console.log('Dummy data populated successfully!');
  } catch (error) {
    console.error('Error populating dummy data: ', error);
  }
};
