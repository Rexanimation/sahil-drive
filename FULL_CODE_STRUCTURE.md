# Full Code Structure

This document describes the current folder structure and a short summary of each folder/file's purpose for this repository.

## Top-level

- `CODE_STRUCTURE.md` : existing high-level overview (see repository root).
- `SETUP_GUIDE.md` : repository setup and run instructions.

## Backend/

- `package.json` : backend dependencies and npm scripts.
- `server.js` : entry point for the backend server (starts Express).
- `public/` : static files served by the backend.
  - `index.html` : static frontend fallback or demo page.
  - `manifest.json` : PWA manifest for the backend-served site.
  - `sw.js` : service worker for caching.
  - `assets/` : built/minified JS and CSS assets.
  - `temp_uploads/` : temporary upload storage.
  - `uploads/` : permanent upload storage.

- `src/` : backend application source code.
  - `app.js` : Express app configuration and middleware wiring.
  - `controllers/` : route handlers grouped by feature.
    - `analytics.controller.js` : analytics endpoints.
    - `asset.controller.js` : asset CRUD and retrieval.
    - `auth.controller.js` : authentication endpoints.
    - `chat.controller.js` : chat-related endpoints.
    - `mega.controller.js` : large/combined operations (project-specific).
    - `share.controller.js` : share links / permissions endpoints.
    - `upload.controller.js` : file upload handlers.

  - `db/`
    - `db.js` : database connection and helpers.

  - `middlewares/`
    - `auth.middleware.js` : authentication middleware.
    - `upload.middleware.js` : upload handling middleware (multer or similar).

  - `models/`
    - `asset.model.js` : asset schema and DB helpers.
    - `chat.model.js` : chat thread/conversation model.
    - `message.model.js` : individual message model.
    - `user.model.js` : user schema and auth helpers.

  - `routes/` : Express route definitions, wired to controllers.
    - `analytics.routes.js`
    - `asset.routes.js`
    - `auth.routes.js`
    - `chat.routes.js`
    - `mega.routes.js`
    - `share.routes.js`
    - `upload.routes.js`

  - `services/` : business logic and service wrappers.
    - `ai.service.js` : AI helper wrappers and orchestration.
    - `analytics.service.js` : analytics computation and storage.
    - `email.service.js` : transactional email helpers.
    - `mega.service.js` : service for large/combined operations.
    - `tools.service.js` : miscellaneous utilities.
    - `vector.service.js` : vector DB / embedding utilities.

  - `sockets/`
    - `socket.server.js` : WebSocket/socket.io server integration.

  - `utils/`
    - `crypto.js` : encryption / hashing helpers.

## Frontend/

- `eslint.config.js` : linting rules for the frontend.
- `index.html` : main HTML shell for the frontend app.
- `package.json` : frontend dependencies and scripts (Vite based).
- `vite.config.js` : Vite build/dev config.
- `public/` : static public assets for the frontend.
  - `manifest.json`, `sw.js` : PWA support for the frontend.

- `src/` : React + Vite source code.
  - `App.css` : global app styles.
  - `App.jsx` : root React component.
  - `AppRoutes.jsx` : route definitions.
  - `config.js` : client configuration (API endpoints, keys).
  - `main.jsx` : React bootstrap and DOM mount.

  - `assets/` : images, icons, static frontend assets.

  - `components/` : reusable UI components.
    - `AnalyticsEngine.jsx` : analytics UI element.
    - `ShaderBackground.jsx` : visual background component.
    - `SocialAuthButtons.jsx` : OAuth/social login buttons.
    - `ThemeToggle.jsx` : light/dark toggle.
    - `AI/`
      - `FloatingAIWidget.jsx` : floating AI assistant widget.
    - `Analytics/`
      - `StorageDashboard.jsx` : storage analytics dashboard.
    - `chat/` : chat UI and helpers.
      - `aiClient.js` : chat AI client integration.
      - `ChatComposer.*` `ChatLayout.*` `ChatMessages.*` `ChatMobileBar.*` `ChatSidebar.*` : chat UI components and styles.

  - `pages/`
    - `Home.jsx` : main landing/dashboard page.
    - `Login.jsx` : login page.
    - `Register.jsx` : sign-up page.

  - `store/` : Redux/toolkit slices and store.
    - `assetSlice.js`
    - `chatSlice.js`
    - `store.js`

  - `styles/`
    - `Dashboard.css` : dashboard-specific styles.
    - `theme.css` : theme variables and layout.

## Notes & Next Steps

- The backend appears to be an Express app with file upload, auth, chat, AI, and analytics features.
- The frontend is a Vite + React app with chat UI, analytics components, and an AI widget.
- If you want, I can:
  - update `CODE_STRUCTURE.md` in-place instead of adding this file,
  - add more granular descriptions per file,
  - generate a diagram or README integration steps.

---
Generated on: 2026-06-25
