# Cleaning Company App (Vite + React + Firebase)

This is a minimal starter app for a cleaning company admin interface. It includes:

- Vite + React
- Firebase Auth (email/password) and Firestore
- Basic CRUD pages: Clients, Jobs, Users

Quick setup
1. Install Node 22 via nvm. Example:

   nvm install 22
   nvm use 22

2. Install deps

   npm install

3. Replace `src/firebase.js` config with your Firebase project's values.

4. Start dev server

   npm run dev

Firebase hosting / deploy
1. Install Firebase CLI: npm install -g firebase-tools
2. Login and init hosting in the project directory (choose single-page app)
3. Build and deploy:

   npm run build
   firebase deploy --only hosting

Notes
- Firestore rules and firebase.json are included in the repository; update project IDs before deploying.
