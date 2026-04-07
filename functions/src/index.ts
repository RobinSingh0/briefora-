import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import * as dotenv from "dotenv";

dotenv.config();

admin.initializeApp();
const db = admin.firestore();

// ─── Cloud Functions ─────────────────────────────────────────────────────────

/**
 * Health check or manual trigger placeholder.
 * Legacy schedulers (fetchAndSummarizeNews, rotateNewsArticles) have been 
 * replaced by local/CI scripts (scripts/rotate-news.js & scripts/newspaper_sync.py).
 */
export const syncStatus = functions.https.onRequest(async (req, res) => {
  try {
    const meta = await db.collection("system").doc("sync_meta").get();
    res.json({
      active: true,
      lastSync: meta.data()?.lastSuccessfulSync?.toDate() || "Never",
      message: "Sync is now handled by local rotation scripts."
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
