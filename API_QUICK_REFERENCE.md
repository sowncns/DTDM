# DTDM API Quick Reference

**Base URL:** `http://localhost:3000`

**Auth Legend:**
- ✗ = No authentication required
- ✓ = **Requires JWT in header:** `Authorization: Bearer <ACCESS_TOKEN>`

---

## Auth
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/auth/register` | ✗ | Register: `{name, email, password}` |
| POST | `/auth/login` | ✗ | Login: `{email, password}` → returns `{accessToken, refreshToken}` |
| POST | `/auth/refresh` | ✗ | Refresh: `{refreshToken}` |
| POST | `/auth/logout` | ✗ | Logout: `{refreshToken}` |
| POST | `/auth/change-password` | **✓ HEADER** | Change pwd: `{oldPassword, newPassword}` |
| POST | `/auth/delete` | **✓ HEADER** | Delete user: `{userId}` (email)

## Files & Folders
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/upload-to-folder` | **✓ HEADER** | Upload file: multipart `{file, [folderId]}` |
| POST | `/api/create` | **✓ HEADER** | Create folder: `{name, [parentId]}` |
| POST | `/api/delete` | **✓ HEADER** | Delete: `{folderId}` or `{fileId}` |
| GET | `/api//tree` | **✓ HEADER** | User's full tree |
| GET | `/api/tree/:folderId` | **✓ HEADER** | Folder contents |


## Sharing
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/share/files` | **✓ HEADER** | Set file visibility: `{fileId, mode, [emails],access}` |
| POST | `/share/folders` | **✓ HEADER** | Set folder visibility: `{folderId, mode, [emails],access}` |

Modes: `private`, `shared`, `public`

## Payment
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/payment/purchase` | **✓ HEADER** | Buy pack: `{amount}` → returns Momo payUrl |
| POST | `/payment/ipn` | ✗ | Momo IPN callback (auto-credits user) |
| POST | `/payment/check-payment` | ✗ | Frontend  |
## Watch (File Monitoring)
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/watch/:owner/tree` |  **✓ HEADER**  | all file owner in mode public or shared with currentAcc |
| POST | `/watch/:owner/tree?kq=abcd` |  **✓ HEADER**  | Find by keyword |

---
