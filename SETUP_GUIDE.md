# Sahil Drive — Complete Credential Setup Guide

## Table of Contents
1. [Project Overview](#project-overview)
2. [Google OAuth (Sign-In with Google)](#google-oauth-sign-in-with-google)
3. [GitHub OAuth (Sign-In with GitHub)](#github-oauth-sign-in-with-github)
4. [Mega Cloud Storage](#mega-cloud-storage)
5. [Environment Variables](#environment-variables)

---

## Project Overview
Sahil Drive is an AI-powered cloud storage platform built with React, Node.js, and MongoDB. This guide will help you set up all necessary credentials to run the application.

---

## Google OAuth (Sign-In with Google)
Follow these steps to set up Google Sign-In for your app:

1. **Open the Google Cloud Console**
   - Go to https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create a new project** (or use an existing one)
   - Click on the project dropdown at the top left of the screen
   - Click "New Project"
   - Name your project (e.g., "Sahil Drive") and click "Create"
   - Wait for the project to be created, then select it from the project dropdown

3. **Enable the Google+ API (optional, but recommended)**
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" (or "People API")
   - Click on it and then click "Enable"

4. **Create OAuth 2.0 credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - If you haven't configured the OAuth consent screen yet, you'll need to do that first:
     - Select "External" as the user type (for testing purposes)
     - Click "Create"
     - Fill in the required fields (App name, User support email, etc.)
     - Click "Save and Continue"
     - On the "Scopes" page, you can leave it as is and click "Save and Continue"
     - On the "Test users" page, add your own email address and any other test users you want, then click "Save and Continue"
     - Click "Back to Dashboard"
   - Back at the "Create OAuth client ID" screen:
     - For "Application type", select "Web application"
     - Give your app a name (e.g., "Sahil Drive Dev")
     - Under "Authorized JavaScript origins", add:
       - `http://localhost:5173` (for development)
       - Your production domain later, if needed
     - Under "Authorized redirect URIs", add:
       - `http://localhost:5173/login` (for development)
       - Your production login page later, if needed
     - Click "Create"

5. **Copy your credentials**
   - A popup will appear with your Client ID and Client Secret
   - Copy both values (you'll need them later!)

---

## GitHub OAuth (Sign-In with GitHub)
Follow these steps to set up GitHub Sign-In for your app:

1. **Open GitHub Developer Settings**
   - Go to https://github.com/settings/developers
   - Sign in to your GitHub account

2. **Create a new OAuth App**
   - Click "OAuth Apps" in the left sidebar
   - Click "New OAuth App"
   - Fill in the following details:
     - **Application name**: "Sahil Drive"
     - **Homepage URL**: `http://localhost:5173` (for development)
     - **Application description**: (optional) "AI-powered cloud storage"
     - **Authorization callback URL**: `http://localhost:5173/login` (for development)
   - Click "Register application"

3. **Copy your credentials**
   - After registration, you'll see your Client ID at the top of the page
   - To get your Client Secret, click "Generate a new client secret"
   - Copy both values immediately! (You won't be able to see the Client Secret again)

---

## Mega Cloud Storage
Follow these steps to set up Mega Cloud Storage for your file uploads:

1. **Create a Mega account**
   - Go to https://mega.nz/
   - Click "Create Account" and follow the prompts
   - Verify your email address to complete the account setup

2. **Get your credentials**
   - Use the email address and password you just created for your Mega account

---

## Environment Variables
Now, let's set up your environment variables!

### Backend Environment Variables
In the `Backend/` folder, open (or create) a file called `.env` and add the following:

```env
# ─── Sahil Drive — Server Configuration ───
PORT=4000
MONGO_URI=mongodb+srv://nickleister402:200502@cluster0.fimf5jp.mongodb.net/?appName=Cluster0
JWT_SECRET=de4e2b64b6cf498c9cb666e7202304f1

# ─── Groq AI Credentials ───
GROQ_API_KEY=gsk_IDN9HfGbGsR19crzMK9MWGdyb3FYGM0363QEK4Ve21pS1IIf9QX

# ─── Google OAuth Credentials (for Google Sign-In) ───
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# ─── GitHub OAuth Credentials (for GitHub Sign-In) ───
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# ─── Mega Cloud Storage Credentials (for file storage) ───
MEGA_EMAIL=your_mega_email@example.com
MEGA_PASSWORD=your_mega_password

# ─── Optional Pinecone & Hugging Face Memory ───
HF_API_KEY=your_hugging_face_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX=cohort-chat-gpt
```

Replace:
- `your_google_client_id` with your Google Client ID
- `your_google_client_secret` with your Google Client Secret
- `your_github_client_id` with your GitHub Client ID
- `your_github_client_secret` with your GitHub Client Secret
- `your_mega_email@example.com` with your Mega email
- `your_mega_password` with your Mega password

### Frontend Environment Variables
In the `Frontend/` folder, open (or create) a file called `.env` and add the following:

```env
# ─── Frontend Configuration ───
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_GITHUB_CLIENT_ID=your_github_client_id
```

Replace:
- `your_google_client_id` with your Google Client ID
- `your_github_client_id` with your GitHub Client ID

---

## Final Notes
- **Mock Login**: If you don't set up the OAuth credentials, the app will still work with mock login (for testing purposes)!
- **Fallback Storage**: If you don't set up Mega Cloud Storage, files will be stored locally in `Backend/public/uploads/`
- **Security**: Never commit your `.env` files to version control! (They're already in `.gitignore`)
