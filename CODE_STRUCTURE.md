# Sahil Drive — Code Structure & Architecture Guide

## Project Root
```
gpt-main/
├── Backend/
├── Frontend/
├── SETUP_GUIDE.md
└── CODE_STRUCTURE.md
```

---

## Current Backend Structure
```
Backend/
├── public/
│   ├── assets/
│   ├── temp_uploads/
│   ├── uploads/
│   ├── index.html
│   ├── sw.js
│   └── manifest.json
├── src/
│   ├── controllers/
│   │   ├── asset.controller.js
│   │   ├── auth.controller.js
│   │   ├── chat.controller.js
│   │   ├── share.controller.js
│   │   └── upload.controller.js
│   ├── db/
│   │   └── db.js
│   ├── middlewares/
│   │   ├── auth.middleware.js
│   │   └── upload.middleware.js
│   ├── models/
│   │   ├── asset.model.js
│   │   ├── chat.model.js
│   │   ├── message.model.js
│   │   └── user.model.js
│   ├── routes/
│   │   ├── asset.routes.js
│   │   ├── auth.routes.js
│   │   ├── chat.routes.js
│   │   ├── share.routes.js
│   │   └── upload.routes.js
│   ├── services/
│   │   ├── ai.service.js
│   │   ├── mega.service.js
│   │   ├── tools.service.js
│   │   └── vector.service.js
│   ├── sockets/
│   │   └── socket.server.js
│   └── app.js
├── .env
├── .gitignore
├── package.json
└── server.js
```

### Current Backend Folder Explanations
- **public/**: Built frontend, local uploads, static assets
  - **assets/**: Frontend build output
  - **temp_uploads/**: Temporary chunked file uploads
  - **uploads/**: Local storage (fallback if Mega isn't configured)
  - **index.html**: Frontend entry point
  - **sw.js**: Service worker
  - **manifest.json**: PWA manifest
- **src/controllers/**: API endpoint handlers
  - `asset.controller.js`: File/folder CRUD
  - `auth.controller.js`: Auth (login, register, Google/GitHub OAuth)
  - `chat.controller.js`: Chat endpoints
  - `share.controller.js`: File sharing
  - `upload.controller.js`: Chunked uploads
- **src/db/**: MongoDB connection (db.js)
- **src/middlewares/**: Express middlewares
  - `auth.middleware.js`: JWT authentication
  - `upload.middleware.js`: Multer file upload config
- **src/models/**: Mongoose schemas
  - `asset.model.js`: Files/folders with folder system, Mega integration, sharing
  - `chat.model.js`: Chat sessions
  - `message.model.js`: Chat messages
  - `user.model.js`: User accounts, storage limits
- **src/routes/**: Express route definitions
- **src/services/**: Business logic
  - `ai.service.js`: Groq AI asset analysis
  - `mega.service.js`: Mega.nz integration
  - `tools.service.js`: AI tooling
  - `vector.service.js`: Pinecone/Hugging Face memory
- **src/sockets/**: Socket.IO real-time chat
- **app.js**: Express app config
- **server.js**: Starts server + Socket.IO
- **.env**: Env vars (gitignored)

---

## Current Frontend Structure
```
Frontend/
├── public/
│   ├── vite.svg
│   ├── sw.js
│   └── manifest.json
├── src/
│   ├── assets/
│   │   └── react.svg
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatComposer.jsx
│   │   │   ├── ChatComposer.css
│   │   │   ├── ChatLayout.css
│   │   │   ├── ChatMessages.jsx
│   │   │   ├── ChatMessages.css
│   │   │   ├── ChatMobileBar.jsx
│   │   │   ├── ChatMobileBar.css
│   │   │   ├── ChatSidebar.jsx
│   │   │   ├── ChatSidebar.css
│   │   │   └── aiClient.js
│   │   ├── ShaderBackground.jsx
│   │   ├── SocialAuthButtons.jsx
│   │   └── ThemeToggle.jsx
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Login.jsx
│   │   └── Register.jsx
│   ├── store/
│   │   ├── slices/
│   │   │   ├── assetSlice.js
│   │   │   └── chatSlice.js
│   │   └── store.js
│   ├── styles/
│   │   ├── App.css
│   │   ├── Dashboard.css
│   │   └── theme.css
│   ├── App.jsx
│   ├── App.css
│   ├── AppRoutes.jsx
│   ├── config.js
│   └── main.jsx
├── .env
├── .gitignore
├── index.html
├── package.json
└── vite.config.js
```

### Current Frontend Folder Explanations
- **public/**: Public static assets
- **src/assets/**: Project images/icons
- **src/components/**: Reusable React components
  - **chat/**: Chat interface components
  - `ShaderBackground.jsx`: Liquid glass animated background
  - `SocialAuthButtons.jsx`: Google/GitHub login buttons
  - `ThemeToggle.jsx`: Theme switch
- **src/pages/**: Page components
  - `Home.jsx`: Main Dashboard (file explorer + AI)
  - `Login.jsx`: Login page
  - `Register.jsx`: Register page
- **src/store/**: Redux (Toolkit) state
  - `assetSlice.js`: File/folder state
  - `chatSlice.js`: Chat state
  - `store.js`: Redux store config
- **src/styles/**: Stylesheets
- **App.jsx**: Root App component
- **AppRoutes.jsx**: React Router
- **config.js**: Frontend config
- **main.jsx**: React DOM entry

---

## Recommended Architecture (Expanded)
### Backend (Recommended Additions)
```
Backend/src/
├── controllers/
│   ├── user.controller.js       (for user profile, settings)
│   ├── folder.controller.js     (folder-specific CRUD)
│   ├── mega.controller.js       (Mega-specific endpoints)
│   └── analytics.controller.js  (storage analytics)
├── models/
│   └── (share.model.js can be separate if needed, but asset.model.js already has sharing)
├── services/
│   ├── analytics.service.js     (storage analytics logic)
│   └── storage.service.js       (storage management)
└── middlewares/
    └── error.middleware.js      (error handling)
```

### Frontend (Recommended Additions)
```
Frontend/src/
├── pages/
│   ├── Files.jsx               (file manager)
│   ├── Shared.jsx              (shared files)
│   ├── Analytics.jsx           (storage analytics)
│   └── Settings.jsx            (user settings)
├── components/
│   ├── FileExplorer/
│   │   ├── FileGrid.jsx        (grid view of files)
│   │   ├── FolderGrid.jsx      (grid view of folders)
│   │   └── UploadButton.jsx    (upload button)
│   ├── Preview/
│   │   ├── ImagePreview.jsx
│   │   ├── VideoPreview.jsx
│   │   └── PdfPreview.jsx
│   ├── Storage/
│   │   ├── StorageBar.jsx      (storage usage bar)
│   │   └── StorageStats.jsx    (storage stats)
│   └── Charts/
│       ├── StoragePieChart.jsx (pie chart for file types)
│       └── StorageTrendChart.jsx (line chart for storage growth)
└── (recharts as dependency for charts)
```

---

## Key Models Explained
### User Model (Current)
```javascript
{
  email: String (unique, required),
  fullName: {
    firstName: String (required),
    lastName: String (required)
  },
  password: String,
  usedStorage: Number (default 0),
  storageQuota: Number (default 20GB),
  createdAt: Date,
  updatedAt: Date
}
```
*(Recommendation: Add googleId, avatar, megaConnected, megaEmail)*

### Asset Model (Current)
Already supports:
- Files and Folders (isFolder, parentFolderId)
- Mega integration (megaHandle)
- Sharing (sharedUsers, publicLinkAccess)
- AI analysis (tags, summary, colors, resolution)
- Favorites (isFavorite)
- Timestamps

---

## Current Tech Stack
- **Frontend**: React, Redux (Toolkit), React Router, Vite, CSS, Socket.IO-Client
- **Backend**: Node.js, Express, Mongoose (MongoDB), Socket.IO, Multer, MegaJS, Groq SDK
- **Database**: MongoDB (Atlas)
- **Storage**: Mega.nz (cloud) or local disk (fallback)

---

## Phase-wise Development (Current Progress)
- ✅ Phase 1 (Current): Google OAuth, MongoDB, Basic Dashboard
- ✅ Phase 2: Connect Mega, Upload/Download Files
- ✅ Phase 3: Preview Images/Videos/PDFs (in current Home.jsx)
- ✅ Phase 4: Folder System, Sharing System (already in asset.model.js)
- ✅ Phase 5: Storage Analytics (current user model has usedStorage/storageQuota)
- ✅ Phase 6: AI Assistant (current chat components)
- Next Steps: Add recharts for analytics, expand user model with Mega connection fields, etc.
