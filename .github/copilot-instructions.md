## Purpose

Short instructions to help an AI agent be immediately productive in this repository (DTDM).

## Big-picture architecture
- Express server started in `server.js`. Routes are mounted as:
  - `/api` -> `api/index.js` (file/folder operations)
  - `/auth` -> `auth/index.js` (login/refresh/register/logout/changepass/delete)
  - `/share` -> `share/index.js` (sharing endpoints)
- MongoDB is used (MONGO_URI env). Models live in `models/` (`User`, `File`, `Folder`).
- File uploads use `multer` (memory storage) and AWS S3 (`aws-sdk`). See `api/uploadToFolder.js`.

## Important runtime/env
- Start the app: `npm start` (runs `nodemon server.js`).
- Required environment variables (observed in code):
  - `MONGO_URI` (Mongo connection)
  - `JWT_SECRET` (signing access/refresh tokens)
  - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET_NAME` (S3 uploads)
  - Optional: `PORT`, `ACCESS_EXPIRES`, `REFRESH_EXPIRES`

## Auth patterns and tokens
- Login flow: `POST /auth/login` returns `{ accessToken, refreshToken }` and persists `refreshToken` on the `User` document (`user.refreshToken`). See `auth/login.js`.
- Refresh flow: `POST /auth/refresh` expects `{ refreshToken }`, verifies it against the stored value and rotates tokens. See `auth/refresh.js`.
- Protected endpoints use the `requireAuth` middleware in `middleware/auth.js`. It expects the header:

  Authorization: Bearer <accessToken>

- Roles: `role` on `User` is one of `admin`, `editor`, `user`. Use `permit(...)` or `ownerOrAdmin(...)` middleware helpers for authorization.

## Uploads and storage
- Upload endpoint: `POST /api/upload-to-folder` (multipart/form-data, field name `file`, optional `folderId`). Uses `multer.memoryStorage()` and uploads to S3; response contains saved `File` document. See `api/uploadToFolder.js` for exact behavior.
- Quota enforcement: `User` has `storageUsed` and `storageLimit` (default 100MB). Uploads enforce quota before S3 upload.
- `File` documents store `s3Url` (S3 location), `owner` (email string), `folder` (ObjectId), and `visibility` enum (`private|shared|public`). `Folder` has similar `visibility`, `ancestors`, and a unique index on `owner+parent+name`.

## Conventions and notable patterns
- Owner is stored as an email string in models (not ObjectId). Middleware `ownerOrAdmin(getOwnerEmail)` compares `req.user.email` to owner email.
- Routes within `api/` and `auth/` use short route files mounted with `router.use("/", require("./<file>"))`. Look in `api/index.js` and `auth/index.js` to see the bundled endpoints.
- Error responses are JSON with `message` and sometimes `error` for debugging.

## Quick examples for agents
- Call a protected upload (example):

  - Header: `Authorization: Bearer <accessToken>`
  - POST `/api/upload-to-folder` multipart form: `file` (file binary), optional `folderId`

- Refresh tokens: POST `/auth/refresh` with body `{ "refreshToken": "..." }` to rotate tokens.

## Files to inspect when making changes
- `server.js` — app entry, route mounts, Mongo connect
- `middleware/auth.js` — auth + role helpers used across routes
- `models/userModel.js`, `models/fileModel.js`, `models/folderModel.js` — DB schema and important fields/indexes
- `api/uploadToFolder.js` — S3 upload + quota logic; good example for file handling
- `auth/login.js`, `auth/refresh.js` — token semantics and rotation

## What an AI agent should not assume
- Do not assume local filesystem storage: code uploads to S3 and stores `s3Url` in DB. While an `uploads/` folder exists in the repo, the runtime upload path is S3 in current handlers.
- Do not change `owner` type from string to ObjectId without updating middleware that compares emails.

## Questions for the maintainer (prompt to ask if unclear)
- Preferred behavior for public file access (should S3 ACL be `public-read` vs signed URLs)?
- Any non-default env values you want baked into example requests (e.g., test bucket name)?

---
If you'd like, I can: (1) include example curl requests for login/upload, (2) add a small `DEVELOPER.md` with local dev tips (Mongo & dummy S3), or (3) open/modify a route to add clearer error messages. Which would you prefer?
