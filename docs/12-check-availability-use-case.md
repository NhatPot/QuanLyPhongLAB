# 12 — CheckAvailabilityUseCase

## Mục tiêu

Tạo dịch vụ kiểm tra khả dụng dùng chung cho form booking, duyệt booking và lịch.

Đọc trước:

- `docs/09-lab-profile-singleton.md`
- `docs/10-crud-computer.md`
- `docs/11-crud-equipment.md`
- `.agent/skills/booking-business-rules/SKILL.md`

---

## 1. Input

```typescript
type CheckAvailabilityInput = {
  bookingType: "FULL_LAB" | "COMPUTERS_ONLY" | "EQUIPMENT_ONLY";
  startTime: string;
  endTime: string;
  numberOfPeople: number;
  numberOfComputers: number;
  equipments: Array<{
    equipmentId: string;
    quantity: number;
  }>;
  excludeBookingId?: string;
};
```

---

## 2. Kết quả

```typescript
type AvailabilityResult = {
  available: boolean;
  lab: {
    available: boolean;
    status: string;
    capacity: number;
  };
  computers: {
    requested: number;
    available: number;
    valid: boolean;
  };
  equipments: Array<{
    equipmentId: string;
    requested: number;
    available: number;
    valid: boolean;
  }>;
  conflicts: Array<{
    type: string;
    startTime: string;
    endTime: string;
  }>;
  reasons: Array<{
    code: string;
    message: string;
  }>;
};
```

Không trả tên/email người tạo booking cho user thường.

---

## 3. Rule thời gian

- `startTime < endTime`.
- Không tạo booking ở quá khứ.
- Giới hạn thời lượng hợp lý được cấu hình.
- Chuyển về UTC trước khi query.
- Hiển thị theo Asia/Ho_Chi_Minh.

Overlap:

```text
newStart < existingEnd
AND
newEnd > existingStart
```

---

## 4. Rule theo loại booking

### FULL_LAB

- Lab phải `ACTIVE`.
- Số người <= Capacity.
- Không chồng với `FULL_LAB`, `COMPUTERS_ONLY` hoặc booking đang sử dụng phòng.
- Máy và thiết bị phải đủ nếu được yêu cầu.

### COMPUTERS_ONLY

- Lab phải `ACTIVE`.
- Không chồng với `FULL_LAB`.
- Tổng máy đã được booking trong các khoảng chồng + số yêu cầu mới <= số máy ACTIVE.
- Số người <= Capacity.

### EQUIPMENT_ONLY

- Có thể sử dụng ngoài phòng.
- Không yêu cầu kiểm tra xung đột phòng nếu không dùng phòng.
- Kiểm tra tồn thiết bị theo khoảng thời gian.
- ExpectedReturnTime phải hợp lệ nếu khác EndTime.

---

## 5. Tính thiết bị khả dụng theo thời gian

Không chỉ dùng `AvailableQuantity` hiện tại. Phải xem:

- Reserved cho booking chồng thời gian.
- Borrowed chưa trả.
- Bảo trì.
- Hỏng/mất.
- Booking cần loại trừ khi đang sửa/duyệt lại.

Trong MVP, `AvailableQuantity` đã trừ reserved tại lúc duyệt; nhưng CheckAvailability cho booking PENDING vẫn cần dự đoán dựa trên các booking approved chồng thời gian.

---

## 6. Thiết kế Application/Domain

Tạo:

```text
AvailabilityChecker
CheckAvailabilityUseCase
IAvailabilityQueryService
```

Có thể dùng query service tối ưu ở Infrastructure, nhưng quy tắc diễn giải kết quả nằm trong Application/Domain.

---

## 7. API

```text
POST /api/availability/check
```

Permission:

- User đăng nhập có `LAB_CALENDAR_VIEW`.
- Không cho client yêu cầu dữ liệu nhạy cảm.

---

## 8. Frontend

Dùng trong form booking:

- Debounce khi thay đổi thời gian/tài nguyên.
- Hiện loading.
- Hiện số máy/thiết bị còn lại.
- Hiện lý do không khả dụng.
- Không dùng kết quả check cũ để bảo đảm duyệt; backend vẫn kiểm tra lại khi create/approve.

---

## 9. Test bắt buộc

- Thời gian sai.
- Quá khứ.
- Lab maintenance/locked/inactive.
- Vượt sức chứa.
- FULL_LAB conflict.
- COMPUTERS_ONLY cộng dồn.
- Thiết bị thiếu.
- Adjacent time không overlap.
- Exclude booking.
- Không lộ dữ liệu người khác.

---

## Tiêu chí hoàn thành bước 12

- Use case tái sử dụng được.
- API/UI hoạt động.
- Rule theo loại booking đúng.
- Test đầy đủ.
- Không thay thế việc recheck tại Create/Approve.
