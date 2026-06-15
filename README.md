<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/94daa669-6aa3-4574-a2f4-f2ed46fcfbbc

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Create `.env.local` from `.env.example` and set `MONGODB_URI`, `MONGODB_DB_NAME`, and `JWT_SECRET`.
   The MongoDB Atlas user must have read/write access, and Atlas Network Access must allow the server IP.
3. Run the app:
   `npm run dev`

All application data is read from and written to MongoDB.
