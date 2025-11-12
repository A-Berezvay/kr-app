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

## Seed sample data

To try the scheduler quickly you can seed a handful of clients and jobs directly in
Firestore:

1. In the Firebase console open **Firestore Database → Data**.
2. Ensure your signed-in test users have a document under `users/{uid}` with:
   - `role`: set to `admin` or `cleaner`
   - `displayName`, `email`, optional `phone`
   - `active`: `true`
3. Create two client documents in the `clients` collection. Each client should have:
   - `name`: e.g. `Kolding HQ`
   - `address`: street + city
   - `notes`: optional access information
4. Add a few job documents in the `jobs` collection:
   - `clientId`: the document ID of a client
   - `date`: Firestore timestamp for the scheduled start time
   - `durationMinutes`: e.g. `90`
   - `status`: `scheduled`
   - `assignedUserIds`: array of cleaner user IDs (can be empty)
   - `notes`: optional
   - `createdAt` / `updatedAt`: set to server timestamps

Once these documents exist, the admin scheduler and “My Jobs” cleaner view will
show the seeded data in real time.
