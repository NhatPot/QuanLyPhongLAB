# Quy Chuẩn Repository Pattern & Data Mapper (repository-pattern)

Kỹ năng này hướng dẫn việc áp dụng Repository Pattern và Data Mapper để tách biệt hoàn toàn tầng logic nghiệp vụ khỏi các chi tiết truy vấn dữ liệu của SQL Server, nâng cao khả năng bảo trì và viết test.

---

## 1. Nguyên tắc cốt lõi của Repository Pattern

```txt
┌──────────────────┐      calls      ┌────────────────────────┐
│     UseCase      ├────────────────>│  IRepository Interface │ (Domain / Application Layer)
└──────────────────┘                 └───────────▲────────────┘
                                                 │
                                                 │ implements
                                                 │
                                     ┌───────────┴────────────┐
                                     │  SQLServerRepository   │ (Infrastructure Layer)
                                     └────────────────────────┘
```

1. **Độc lập công nghệ**: Use Case chỉ tương tác với cơ sở dữ liệu thông qua các Interface (hợp đồng định nghĩa phương thức). Use Case không cần biết database phía sau là SQL Server, MySQL, MongoDB hay chỉ là mảng lưu trên RAM.
2. **Nơi đặt các thành phần**:
   * **Repository Interfaces**: Phải được đặt ở tầng Domain (`src/domain/repositories/`) hoặc tầng Application Ports (`src/application/ports/`).
   * **Repository Implementations**: Phải được đặt ở tầng Infrastructure (`src/infrastructure/database/sqlserver/repositories/`).
3. **Không viết SQL trực tiếp trong Use Case**: Use Case tuyệt đối không chứa các câu lệnh `SELECT`, `INSERT`, `UPDATE` hay các kết nối driver db. Mọi truy xuất dữ liệu phải thông qua hàm của Repository (ví dụ: `await this.bookingRepo.save(booking)`).
4. **Không gọi Repository trực tiếp từ Controller**: Controller chỉ được phép gọi Use Case để thực thi luồng nghiệp vụ. Ngoại trừ các luồng đọc dữ liệu thuần túy (Query) không có logic nghiệp vụ phức tạp thì Controller mới có thể gọi trực tiếp Read-Only Repository hoặc Query Service để tối ưu hóa hiệu năng (CQRS Pattern).

---

## 2. Áp dụng Data Mapper

Khi lấy dữ liệu từ SQL Server, kết quả trả về thường là các dòng thô (database row). Để đảm bảo tính đóng gói của Domain Entity, chúng ta bắt buộc phải sử dụng **Data Mapper** để chuyển đổi qua lại:

* **Từ Database Row sang Domain Entity (Reconstitution)**:
  Ánh xạ các cột của bảng (ví dụ: `user_id`, `first_name`, `password_hash`) thành các thuộc tính đóng gói của Domain Entity (sử dụng phương thức static factory như `User.create(props, id)`). Bước này giúp phục dựng lại trạng thái của đối tượng nghiệp vụ cùng các ràng buộc của nó trên bộ nhớ.
* **Từ Domain Entity sang Database Row (Persistence)**:
  Trích xuất dữ liệu từ Domain Entity thành định dạng bảng phẳng để chuẩn bị thực hiện câu lệnh `INSERT` hoặc `UPDATE` vào SQL Server.

Ví dụ minh họa cấu trúc Data Mapper:
```typescript
export class UserMapper {
  public static toDomain(raw: any): User {
    return User.create({
      email: new Email(raw.email),
      password: PasswordHash.createFromHash(raw.password_hash),
      fullName: raw.full_name,
      roleId: raw.role_id,
      isActive: raw.is_active
    }, raw.id);
  }

  public static toPersistence(user: User): any {
    return {
      id: user.id,
      email: user.email.value,
      password_hash: user.password.value,
      full_name: user.fullName,
      role_id: user.roleId,
      is_active: user.isActive,
      updated_at: new Date()
    };
  }
}
```

---

## 3. Các Repository Interfaces Đề Xuất

Để đồng bộ trên toàn dự án, các Interfaces cần được đặt tên bắt đầu bằng ký tự `I` và định nghĩa các thao tác CRUD cơ bản cùng các truy vấn nghiệp vụ đặc thù:

### 3.1. IUserRepository
* `findById(id: string): Promise<User | null>`
* `findByEmail(email: string): Promise<User | null>`
* `save(user: User): Promise<void>`

### 3.2. ILabProfileRepository
* `getProfile(): Promise<LabProfile | null>`
* `save(profile: LabProfile): Promise<void>`

### 3.3. IComputerRepository
* `findById(id: string): Promise<Computer | null>`
* `findAllActive(): Promise<Computer[]>`
* `save(computer: Computer): Promise<void>`

### 3.4. IEquipmentRepository
* `findById(id: string): Promise<Equipment | null>`
* `findAll(): Promise<Equipment[]>`
* `save(equipment: Equipment): Promise<void>`

### 3.5. IBookingRepository
* `findById(id: string): Promise<BookingRequest | null>`
* `findOverlappingBookings(startTime: Date, endTime: Date): Promise<BookingRequest[]>`
* `save(booking: BookingRequest): Promise<void>`

### 3.6. IIncidentRepository
* `findById(id: string): Promise<IncidentReport | null>`
* `save(incident: IncidentReport): Promise<void>`

### 3.7. IMaintenanceRepository
* `findById(id: string): Promise<MaintenanceSchedule | null>`
* `save(maintenance: MaintenanceSchedule): Promise<void>`

### 3.8. IAuditLogRepository
* `save(log: AuditLog): Promise<void>`
