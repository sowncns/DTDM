# Hướng dẫn sử dụng API - DTDM (Tiếng Việt)

Tài liệu tóm tắt các endpoint chính, cách gọi và ví dụ nhanh để dùng API trong dự án DTDM.

Base URL: `http://localhost:3000`

---

🔐 Ghi chú quan trọng: những endpoint yêu cầu JWT token phải gửi header sau:

Authorization: Bearer <ACCESS_TOKEN>

(Trong tài liệu ghi là **REQUIRES JWT - Header**)

---

1) Xác thực (Auth)

- POST /auth/register
  - Body: { name, email, password }
  - Không cần token

- POST /auth/login
  - Body: { email, password }
  - Trả về: accessToken, refreshToken

- POST /auth/refresh
  - Body: { refreshToken }
  - Không cần token

- POST /auth/logout
  - Body: { refreshToken }
  - Không cần token

- POST /auth/change-password — REQUIRES JWT - Header
  - Body: { oldPassword, newPassword }

- POST /auth/delete — REQUIRES JWT - Header
  - Body: { userId } (email)

- POST /auth/rename — REQUIRES JWT - Header
  - Body: { newName } (name)

---

2) Quản lý file & thư mục

- POST /api/upload — REQUIRES JWT - Header
  - multipart form-data: field `file` (bắt buộc), `folderId` (tùy chọn)
  - có foderId thì tạo trọng folder đó ko root
  - Trả về metadata file, used và limit

- POST /api/create — REQUIRES JWT - Header
  - Body: { name, parentId? }
  - có parentId thì tạo trong folder đó ko root
  - Tạo folder

- POST /api/delete — REQUIRES JWT - Header
  - Body: { id } (id của file hoặc folder)
  - Mặc định hệ thống sẽ **move to trash** (soft-delete) — item được đánh dấu `trashed: true` để có thể restore sau này.
  - Để xóa vĩnh viễn, gửi `{ id: "<id>", permanent: true }`.
  - Nếu id là folder, hành vi: move-to-trash (hoặc permanent delete nếu `permanent: true`) đệ quy toàn bộ file + folder con

---

### Thùng rác (Trash)
- GET /api/trash — REQUIRES JWT - Header
  - Liệt kê file và folder đang nằm trong thùng rác của user (trashed = true)
- POST /api/trash/restore — REQUIRES JWT - Header
  - Body: { id } — phục hồi file hoặc folder (folder phục hồi đệ quy con)
- POST /api/trash/empty — REQUIRES JWT - Header
  - Body: { id? } — nếu có id: xóa vĩnh viễn item đó; nếu không: xóa vĩnh viễn tất cả item trong trash của user
  - Xóa vĩnh viễn sẽ xóa file từ S3 (nếu có) và cập nhật `storageUsed` của user

- GET /api/tree — REQUIRES JWT - Header
  - Lấy toàn bộ cây thư mục file của user (root + children)

- GET /api/tree/:folderId — REQUIRES JWT - Header
  - Lấy nội dung 1 folder cụ thể

- POST /api/rename — REQUIRES JWT - Header
    -Đổi ten file or folder
  - Body {id,newName}  (id la id cua file or folder)

- GET /api/user — REQUIRES JWT - Header
  - Lay thong tin account

- GET /search/user/:username -REQUIRES JWT - Header
  - Lấy cây của một user khác (public/shared visibility)

- GET /search?kw=aaaa -REQUIRES JWT - Header
  - Tim file va folder có aaaa

- POST /api/set-visibility -REQUIRES JWT - Header
  - set quyền của file folder
  - Body {id,mode,email,access }  ->shared
  - Body {id,mode}  ->public/private


---

3) Chia sẻ (Sharing)

- GET /share/file/:fileId
  - Mọi người có thể truy cập file nếu `visibility === 'public'`.
  - Nếu `visibility === 'shared'` thì cần Authorization header với token và file phải chia sẻ với email đó (hoặc requester là owner/admin).
  - Response: `{ filename, s3Url, mimetype, size }` (trả s3Url để frontend có thể tải hoặc hiển thị).

- GET /share/folder/:folderId
  - Nếu thư mục `visibility === 'public'` thì trả về danh sách đệ quy tất cả thư mục con và files (không bao gồm trashed) và file objects trả `s3Url`.
  - Nếu thư mục `visibility === 'shared'` thì cần Authorization và thuộc `sharedWith`.
  - Response: `{ folder: { id, name, owner }, folders: [...], files: [...] }` (files có `s3Url`).


---

4) Thanh toán / nâng cấp dung lượng

- POST /payment/purchase — REQUIRES JWT - Header
  - Body: { amount,upStore }  (so tien vao dung lung GB)
  - Tạo order Momo, trả payUrl để user thanh toán

- POST /payment/ipn
  - Callback (IPN) từ Momo, server kiểm tra signature và cập nhật transaction + tăng storageLimit khi thanh toán thành công
