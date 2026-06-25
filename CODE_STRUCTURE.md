# gpt-main — Unified Code Structure and Functional Overview

This file replaces all existing markdown documentation files and captures the full repository layout, key files, services, routes, and component responsibilities.

## Repository Overview

The repository is a full-stack application with separate `Backend/` and `Frontend/` directories.

- `Backend/` contains an Express server, MongoDB models, AI and storage services, file upload handling, and WebSocket support.
- `Frontend/` contains a Vite-powered React application with authentication pages, chat UI, analytics components, and Redux state.

---

## Root Layout

```
gpt-main/
├── Backend/
├── Frontend/
└── CODE_STRUCTURE.md
```

> All previous `.md` files were removed and replaced by this single consolidated documentation file.

---

## Backend

### Root backend files

- `Backend/package.json`
  - Express, MongoDB, socket.io, file upload, authentication, Mega integration, GPT/AI SDKs.
- `Backend/server.js`
  - Loads environment variables, connects to MongoDB, initializes the socket server, and starts the HTTP server.
- `Backend/.env`
  - Environment variables for backend runtime.
- `Backend/public/`
  - Static frontend assets, PWA manifest, service worker, uploads, and temporary upload storage.
    - `index.html`
    - `manifest.json`
    - `sw.js`
    - `assets/`
    - `temp_uploads/`
    - `uploads/`

### Backend source structure

```
Backend/src/
├── app.js
├── controllers/
├── db/
├── middlewares/
├── models/
├── routes/
├── services/
├── sockets/
└── utils/
```

#### `src/app.js`

- Configures Express middleware and security.
- Uses `cors` with localhost and Render origins allowed.
- Enables JSON and URL-encoded parsing with large payload support.
- Uses `cookie-parser`.
- Serves static files from `Backend/public/`.
- Mounts API routes:
  - `/api/auth`
  - `/api/chat`
  - `/api/assets`
  - `/api/upload`
  - `/api/shares`
  - `/api/analytics`
  - `/api/mega`
- Includes wildcard route to return `public/index.html` for catch-all client routing.

#### `src/db/db.js`

- Exports a MongoDB connection function using `mongoose.connect(process.env.MONGO_URI)`.

#### `src/sockets/socket.server.js`

- Initializes socket.io server attached to the HTTP server.
- Enables real-time events such as `refresh-assets` and chat notifications.

#### `src/utils/crypto.js`

- Provides encryption/decryption helpers used for secure MEGA password storage.

### Controllers

```
Backend/src/controllers/
├── analytics.controller.js
├── asset.controller.js
├── auth.controller.js
├── chat.controller.js
├── mega.controller.js
├── share.controller.js
└── upload.controller.js
```

#### `auth.controller.js`

- `registerUser(req, res)`
  - Registers new users.
  - Hashes passwords.
  - Issues JWT access and refresh tokens via cookies.
- `loginUser(req, res)`
  - Manual email/password login.
  - Returns auth cookies and user profile.
- `googleLoginUser(req, res)`
  - Logs in or registers via Google credential token.
  - Issues tokens and returns profile.
- `linkMega(req, res)`
  - Links a Mega.nz account to the user.
- `unlinkMega(req, res)`
  - Unlinks Mega account from user profile.
- `getMe(req, res)`
  - Returns authenticated user data.
  - Validates storage usage and Mega account state.
- `logoutUser(req, res)`
  - Clears cookies and invalidates refresh tokens.

#### `chat.controller.js`

- `createChat(req, res)`
  - Creates a new chat session record.
- `getChats(req, res)`
  - Lists all user chats.
- `getMessages(req, res)`
  - Retrieves messages for a chat.
- `chatWithAi(req, res)`
  - Sends user message to the AI service.
  - Returns generated response.

#### `asset.controller.js`

- `uploadAsset(req, res)`
  - Handles direct file uploads.
  - Validates user storage quota.
  - Uploads to Mega if available, otherwise falls back to local storage.
  - Calls AI analysis for tags, summary, colors, resolution.
  - Creates asset metadata in MongoDB.
- `getAssets(req, res)`
  - Retrieves assets with filters for type, favorites, search, folders.
  - Triggers background Mega deletion sync if needed.
- `toggleFavorite(req, res)`
  - Toggles `isFavorite` on an asset.
- `deleteAsset(req, res)`
  - Deletes a file or folder recursively.
  - Removes Mega nodes or local files.
  - Updates user used storage.
- `getStorageSummary(req, res)`
  - Calculates accurate storage usage from asset records.
- `getAnalytics(req, res)`
  - Returns analytics via the analytics service.
- `streamAsset` and `chatAsset`
  - Endpoints exist in routes for streaming and AI chat on assets.

#### `upload.controller.js`

- `initiateUpload(req, res)`
  - Starts a chunked upload session.
  - Creates `public/temp_uploads/<uploadId>`.
- `uploadChunk(req, res)`
  - Saves file chunk buffers to the upload session folder.
- `finalizeUpload(req, res)`
  - Reassembles chunks into final file.
  - Validates quota and stores locally or uploads to Mega.
  - Creates asset record with AI metadata.

#### `share.controller.js`

- `shareAsset(req, res)`
  - Shares files with another user by email.
  - Adds `sharedUsers` permissions to asset metadata.
- `updateLinkAccess(req, res)`
  - Updates public link access mode.
- `getSharedWithMe(req, res)`
  - Returns assets shared to the authenticated user.

#### `mega.controller.js`

- `connectMega(req, res)`
  - Validates Mega credentials and stores them encrypted.
- `disconnectMega(req, res)`
  - Clears Mega credentials and disconnects the session.
- `getMegaStatus(req, res)`
  - Returns Mega connection state.

#### `analytics.controller.js`

- `getAnalytics(req, res)`
  - Exposes storage analytics data from `analytics.service.js`.

### Routes

```
Backend/src/routes/
├── analytics.routes.js
├── asset.routes.js
├── auth.routes.js
├── chat.routes.js
├── mega.routes.js
├── share.routes.js
└── upload.routes.js
```

#### Route summary

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/google-login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/auth/link-mega`
- `POST /api/auth/unlink-mega`

- `POST /api/chat/`
- `GET /api/chat/`
- `GET /api/chat/messages/:id`
- `POST /api/chat/ai`

- `POST /api/assets/upload`
- `POST /api/assets/folder`
- `GET /api/assets/`
- `GET /api/assets/storage-summary`
- `GET /api/assets/analytics`
- `PUT /api/assets/:id/favorite`
- `DELETE /api/assets/:id`
- `GET /api/assets/stream/:id`
- `POST /api/assets/:id/chat`

- `POST /api/upload/initiate`
- `POST /api/upload/chunk`
- `POST /api/upload/finalize`

- `GET /api/shares/shared-with-me`
- `POST /api/shares/:id/share`
- `PUT /api/shares/:id/link-access`

- `POST /api/mega/connect`
- `POST /api/mega/disconnect`
- `GET /api/mega/status`

- `GET /api/analytics/`

### Models

```
Backend/src/models/
├── asset.model.js
├── chat.model.js
├── message.model.js
└── user.model.js
```

#### `asset.model.js`

- Asset schema fields:
  - `user`, `userId`
  - `name`, `type`, `size`, `mimeType`, `url`
  - `tags`, `summary`, `colors`, `resolution`
  - `isFavorite`, `isFolder`, `parentFolderId`
  - `megaHandle`, `publicLinkAccess`, `sharedUsers`
  - `isDeleted`, `deletedAt`
- Supports folders, favorites, public sharing, trash, Mega-backed files, and AI metadata.

#### `user.model.js`

- User schema fields:
  - `googleId`, `email`, `fullName`, `password`, `avatar`
  - `megaConnected`, `isMegaLinked`, `megaEmail`, `megaPassword`
  - `usedStorage`, `storageQuota`, `refreshToken`
- Supports Google login, local login, Mega integration, quotas, and refresh token session management.

### Services

```
Backend/src/services/
├── ai.service.js
├── analytics.service.js
├── auth.service.js
├── cookie.service.js
├── google.service.js
├── mega.service.js
├── token.service.js
├── email.service.js
├── tools.service.js
└── vector.service.js
```

#### `auth.service.js`

- Handles registration, login, Google login, Mega linking, and Mega unlinking.
- Uses `bcryptjs` for password hashing.
- Issues JWT access and refresh tokens.
- Saves refresh token in MongoDB.
- Validates Google tokens with `google.service.js`.
- Encrypts Mega passwords and sends success emails.

#### `mega.service.js`

- `getStorageForUser(user)`
  - Creates or caches a Mega.nz session with encrypted credentials.
- `uploadFile(user, name, size, buffer)`
  - Uploads buffers to the user’s Mega account.
- `deleteFile(user, handle)`
  - Deletes Mega nodes permanently.
- `getFileStream(user, handle)`
  - Streams files from Mega.
- `validateCredentials(email, password)`
  - Validates Mega login credentials.
- `syncDeletions(user)`
  - Reconciles direct Mega deletions with MongoDB.
- `disconnectUser(userId)`
  - Clears cached Mega sessions.

#### `ai.service.js`

- Initializes `groq-sdk` and Hugging Face inference.
- Uses a system prompt to coordinate AI behavior.
- Contains tool definitions for file operations such as create folder, delete item, empty trash, search files, get storage usage, trigger upload, rename item, add favorite.
- `generateResponse(...)` uses Groq chat completions and may invoke local tool actions to manage files.
- `analyzeAsset(...)` processes file metadata for tags, summary, colors, and resolution.

#### `analytics.service.js`

- Computes storage analytics for a user.
- Tracks:
  - used storage, available storage, trash size
  - file type counts and sizes
  - largest files
  - recent uploads
  - weekly upload trends
  - favorites and trash counts

#### `cookie.service.js`

- Sets secure `token` and `refreshToken` cookies.
- Clears auth cookies.
- Uses `NODE_ENV` to determine secure cookie settings.

#### `token.service.js`

- Generates JWT access and refresh tokens.
- Verifies access and refresh tokens.
- Access token lifetime: 15 minutes.
- Refresh token lifetime: 7 days.

#### `google.service.js`

- Verifies Google ID tokens used for Google login flows.

#### `vector.service.js`

- Supports vector DB / embedding utilities (likely for memory or similarity search).

#### `email.service.js`

- Sends transactional emails such as Mega link success notifications.

#### `tools.service.js`

- Provides miscellaneous AI or application tools used by backend services.

---

## Frontend

### Root frontend files

- `Frontend/package.json`
  - React 19, Vite, Redux Toolkit, React Router, Recharts, Socket.IO client.
- `Frontend/vite.config.js`
  - Vite configuration for the React app.
- `Frontend/index.html`
  - HTML shell used by Vite.
- `Frontend/.env`
  - Frontend environment variables such as `VITE_GOOGLE_CLIENT_ID`.

### Frontend source structure

```
Frontend/src/
├── App.jsx
├── App.css
├── AppRoutes.jsx
├── config.js
├── main.jsx
├── assets/
├── components/
├── pages/
├── store/
└── styles/
```

#### `src/App.jsx`

- Root React component.
- Renders `ShaderBackground` and `AppRoutes`.

#### `src/AppRoutes.jsx`

- Sets up React Router with routes:
  - `/` → `Home`
  - `/register` → `Register`
  - `/login` → `Login`
  - catch-all redirects to `/login`

#### `src/config.js`

- Exposes `API_URL` based on localhost environment.
- Exposes a fallback `GOOGLE_CLIENT_ID` for development.

#### `src/main.jsx`

- Mounts the React app to the DOM.

### Pages

```
Frontend/src/pages/
├── Home.jsx
├── Login.jsx
└── Register.jsx
```

- `Home.jsx`
  - Main authenticated landing page.
  - Likely includes file explorer, analytics, chat, and AI widgets.
- `Login.jsx`
  - Login form or OAuth buttons.
- `Register.jsx`
  - User registration form.

### Components

```
Frontend/src/components/
├── AI/
│   └── FloatingAIWidget.jsx
├── Analytics/
│   └── StorageDashboard.jsx
├── chat/
│   ├── aiClient.js
│   ├── ChatComposer.jsx
│   ├── ChatComposer.css
│   ├── ChatLayout.css
│   ├── ChatMessages.jsx
│   ├── ChatMessages.css
│   ├── ChatMobileBar.jsx
│   ├── ChatMobileBar.css
│   ├── ChatSidebar.jsx
│   └── ChatSidebar.css
├── AnalyticsEngine.jsx
├── ShaderBackground.jsx
├── SocialAuthButtons.jsx
└── ThemeToggle.jsx
```

- `AI/FloatingAIWidget.jsx`
  - Renders a floating intelligent assistant UI.
- `Analytics/StorageDashboard.jsx`
  - Shows storage analytics and usage charts.
- `chat/*`
  - Collection of chat UI elements and helper client code.
- `AnalyticsEngine.jsx`
  - Likely a higher-level analytics component.
- `ShaderBackground.jsx`
  - Visual background effect.
- `SocialAuthButtons.jsx`
  - OAuth login buttons for Google/GitHub.
- `ThemeToggle.jsx`
  - Light/dark theme switch.

### Store

```
Frontend/src/store/
├── assetSlice.js
├── chatSlice.js
└── store.js
```

- `assetSlice.js`
  - Asset/file state handling.
- `chatSlice.js`
  - Chat state handling.
- `store.js`
  - Configures Redux Toolkit store.

### Styles

```
Frontend/src/styles/
├── Dashboard.css
└── theme.css
```

- `App.css` and `styles/*` provide app-wide styling and theming.

---

## Functional Summary

### Authentication flow

- Backend uses JWTs stored in secure cookies.
- `auth.middleware.js` validates access tokens and silently refreshes them using refresh tokens.
- Supports manual login, registration, Google login, Mega linking, and logout.

### Chat and AI

- Chat routes allow creating conversations, listing chats, fetching messages, and sending AI queries.
- `ai.service.js` integrates Groq chat completions and Hugging Face inference.
- The AI service can execute backend tool actions for file operations and storage inspection.

### File storage and upload

- Assets are stored in MongoDB with metadata and optionally on Mega.nz or local disk.
- The upload system supports both direct file uploads and chunked uploads.
- Storage usage is tracked per-user and enforced against a quota.
- Asset metadata includes AI-generated tags, summaries, colors, resolution, favorites, and sharing permissions.

### Sharing and collaboration

- Assets can be shared with users by email and assigned roles.
- Public link access modes are managed per asset.
- Shared assets can be retrieved via the `shared-with-me` endpoint.

### Analytics

- Analytics service computes storage breakdowns, file-type summaries, largest files, recent uploads, weekly trends, favorites, and trash counts.
- Frontend likely displays this data in the dashboard.

### External integrations

- Mega.nz integration for file storage and streaming.
- Google OAuth for authentication.
- Hugging Face and Groq for AI capabilities.
- Socket.IO for real-time updates.

---

## Notes

- The backend code uses `commonjs` and the frontend uses ES modules via Vite.
- The app is designed to run with `Backend` on port `4000` and `Frontend` as a separate Vite dev server in development.
- This document is the authoritative single source for repository structure and architecture.

---

Generated on: 2026-06-25
