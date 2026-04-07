import { ref, uploadString, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "./firebase";

export const storageService = {
  /**
   * Uploads an image (base64) to Firebase Storage for a given article ID.
   * @param id The article ID (used as the filename).
   * @param base64 The base64-encoded image data.
   * @returns Public download URL of the uploaded image or null if failed.
   */
  async uploadNewsImage(id: string, base64: string): Promise<string | null> {
    try {
      const storageRef = ref(storage, `news_images/${id}.jpg`);
      
      // Upload using base64 format
      await uploadString(storageRef, base64, "base64", {
        contentType: "image/jpeg",
      });

      // Get the persistent download URL
      const downloadURL = await getDownloadURL(storageRef);
      console.log(`[StorageService] Image uploaded for article ${id}. URL: ${downloadURL}`);
      return downloadURL;
    } catch (error) {
      console.error("[StorageService] Upload failed:", error);
      return null;
    }
  },

  /**
   * Checks if an image already exists in Firebase Storage for the given article ID.
   * If it exists, returns the download URL.
   * @param id The article ID.
   * @returns Download URL or null if not found.
   */
  async getCachedImageUrl(id: string): Promise<string | null> {
    try {
      const storageRef = ref(storage, `news_images/${id}.jpg`);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      // 404 error is expected if it hasn't been generated yet.
      return null;
    }
  },

  /**
   * Cleans up an image from Storage if it's no longer needed (optional).
   */
  async deleteNewsImage(id: string): Promise<void> {
    try {
      const storageRef = ref(storage, `news_images/${id}.jpg`);
      await deleteObject(storageRef);
    } catch (error) {
       console.error("[StorageService] Delete failed:", error);
    }
  }
};
