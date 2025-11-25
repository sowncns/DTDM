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
  - Body: { fileId } hoặc { folderId }
  - Nếu là folder, xóa đệ quy mọi file + folder con

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

- GET /search?kw="aaaa" -REQUIRES JWT - Header
  -Tim file va folder có aaaa

-POST /api/set-visibility -REQUIRES JWT - Header
    -set quyền của file folder
    -Body {id,mode,email,access }  ->shared
    -Body {id,mode}  ->public/private


---

3) Chia sẻ (Sharing)


---

4) Thanh toán / nâng cấp dung lượng

- POST /payment/purchase — REQUIRES JWT - Header
  - Body: { amount,upStore }  (so tien vao dung lung GB)
  - Tạo order Momo, trả payUrl để user thanh toán

- POST /payment/ipn
  - Callback (IPN) từ Momo, server kiểm tra signature và cập nhật transaction + tăng storageLimit khi thanh toán thành công

- POST /payment/check-payment
  ktra thah cong hay ko

---

5) Watch (giám sát thay đổi file hệ thống)

- GET /watch/status
  - Kiểm tra trạng thái watcher và 10 event gần nhất

- GET /watch/events?since=<ts>&limit=<n>
  - Lấy các event đã xảy ra kể từ timestamp (ms)

- POST /watch/clear
  - Xóa bộ nhớ event trên server

---

Ví dụ nhanh (PowerShell)

1) Login lấy access token

```powershell
$response = Invoke-RestMethod http://localhost:3000/auth/login -Method POST -Headers @{ 'Content-Type'='application/json' } -Body '{"email":"dev@example.com","password":"secret"}'
$token = $response.accessToken
```

2) Upload file

```powershell
Invoke-RestMethod http://localhost:3000/api/upload-to-folder -Method POST -Headers @{ 'Authorization' = "Bearer $token" } -Form @{ file = Get-Item "C:\\tmp\\doc.pdf" }
```

3) Tạo folder

```powershell
Invoke-RestMethod http://localhost:3000/api/create -Method POST -Headers @{ 'Content-Type'='application/json'; 'Authorization' = "Bearer $token" } -Body '{"name":"Docs"}'
```

---

File này là bản tóm tắt ngắn gọn để nhanh chóng bắt đầu dùng API. Nếu bạn muốn, tôi sẽ:
- Thêm ví dụ curl (POSIX) tương ứng
- Xuất Postman collection hoặc OpenAPI (Swagger)
- Thêm chi tiết về payload/response và lỗi cụ thể cho từng endpoint

Bạn muốn tôi làm tiếp theo hướng nào?