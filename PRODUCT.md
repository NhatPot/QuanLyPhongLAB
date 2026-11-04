# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Sinh viên Đại học Lạc Hồng, có email trường dạng `MSSV@lachong.edu.vn` theo thông tin người dùng cung cấp.
- Giảng viên, có email trường dạng `nhatlm@lhu.edu.vn` theo thông tin người dùng cung cấp.
- Quản trị viên quản lý tài khoản và duyệt đăng ký giảng viên.

## Product Purpose

Ứng dụng quản lý phòng Lab. Phạm vi đã xác nhận trong phiên làm việc ngày 03/11/2026: bổ sung đăng nhập Google và tự đăng ký qua email có mã xác minh, theo cách sử dụng quen thuộc của một website đăng nhập hiện nay.

## Capabilities and Constraints

- Người dùng muốn đăng nhập Google; người chưa có tài khoản được đi tiếp vào luồng tạo tài khoản.
- Có lựa chọn đăng ký thủ công bằng email và mã xác minh.
- Sinh viên đăng ký bằng email `@lachong.edu.vn`.
- Giảng viên đăng ký bằng email `@lhu.edu.vn`, xác minh xong phải chờ quản trị viên duyệt.
- Đính chính ngày 04/11/2026: giữ giao diện cũ hai cột (nền navy/brand/giới thiệu bên trái, nền sáng bên phải); chỉ thay khung biểu mẫu cho tinh gọn ở đăng nhập/đăng ký/quên mật khẩu. Dùng email giảng viên làm người gửi ban đầu.
- Đăng ký và quên mật khẩu có lần gửi OTP đầu + tối đa 5 lần gửi lại, kiểm tra phía server.
- Theo code hiện tại: Next.js, React, TypeScript, SQL Server, tài khoản có role/permission, phiên đăng nhập qua cookie HttpOnly.
- Định dạng MSSV chi tiết, cấu hình Google Workspace/hd và quyền/credential gửi SMTP chưa được xác nhận. Đã có code/migration chuẩn bị; chưa bật hay triển khai tới DB/provider thật.

## Evidence on Hand

- Trang hiện tại: `src/app/(auth)/login/page.tsx`.
- Logic xác thực: `src/server/application/use-cases/auth/`.
- Cơ chế phiên: `src/server/presentation/http/security/web-session.ts`.
- Kế hoạch mở rộng: `docs/plans/google-email-registration.md`.
- Ảnh giao diện tài khoản thực tế và giới hạn kiểm tra: `designs/auth-pages/README.md`.
