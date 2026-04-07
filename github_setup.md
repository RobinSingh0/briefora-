# GitHub Setup Instructions

## Setting up FIREBASE_SERVICE_ACCOUNT_KEY

To allow GitHub Actions to safely modify your Firebase Firestore database, you need to securely add your service account credentials to your repository secrets:

1. **Obtain your Service Account Key:**
   - Go to your [Firebase Console](https://console.firebase.google.com/).
   - Click the gear icon next to "Project Overview" and select **Project settings**.
   - Navigate to the **Service accounts** tab.
   - Click **Generate new private key** (this downloads a `.json` file).

2. **Add it to GitHub Secrets:**
   - Go to your repository on GitHub.
   - Click the **Settings** tab.
   - Expand **Secrets and variables** in the left sidebar and click **Actions**.
   - Click the **New repository secret** button.
   - **Name:** Enter `FIREBASE_SERVICE_ACCOUNT_KEY`.
   - **Secret:** Open the `.json` file you downloaded in a text editor. Copy the *entire contents* (including the outer braces `{...}`) and paste it into the Secret box.
   - Click **Add secret**.

3. **Add AI Provider Secrets:**
   - During the script's summarization phase, it utilizes AI models. Make sure to add the following secrets using the same procedure as above, based on the models you have enabled in `ai-service.js`:
     - `GEMINI_API_KEY`
     - `GROQ_API_KEY`
     - `MISTRAL_API_KEY`
