# 03 — Tạo khung Clean Architecture

## Mục tiêu

Tạo cấu trúc Clean Architecture cho backend, kèm các abstraction nền tảng để các module sau phát triển thống nhất.

Đọc trước:

- `docs/00-chot-yeu-cau-va-quyet-dinh-ky-thuat.md`
- `docs/02-khoi-tao-du-an-tu-repository-trong.md`
- `.agent/skills/clean-architecture-nodejs/SKILL.md`
- `.agent/skills/repository-pattern/SKILL.md`

---

## 1. Cấu trúc cần tạo

```text
backend/src/
├── domain/
│   ├── entities/
│   ├── value-objects/
│   ├── services/
│   ├── repositories/
│   └── errors/
├── application/
│   ├── use-cases/
│   ├── dtos/
│   ├── ports/
│   ├── authorization/
│   └── errors/
├── infrastructure/
│   ├── config/
│   ├── database/
│   │   └── sqlserver/
│   │       ├── connection/
│   │       ├── migrations/
│   │       ├── seeds/
│   │       ├── mappers/
│   │       ├── repositories/
│   │       └── unit-of-work/
│   ├── auth/
│   ├── logger/
│   └── services/
├── presentation/
│   └── http/
│       ├── controllers/
│       ├── routes/
│       ├── middlewares/
│       ├── validators/
│       └── presenters/
├── shared/
│   ├── result/
│   ├── pagination/
│   ├── date-time/
│   ├── ids/
│   └── constants/
├── container/
│   └── dependency-container.ts
├── app.ts
└── main.ts
```

---

## 2. Thành phần nền tảng

Tạo abstraction tối thiểu:

```text
Entity
UniqueEntityId
Result
AppError
PaginatedResult
Clock/IClock
IdGenerator/IIdGenerator
IUnitOfWork
ILogger
```

Yêu cầu:

- `Entity` không phụ thuộc thư viện ngoài.
- `Result` dùng cho lỗi nghiệp vụ có kiểm soát.
- Exception chỉ dùng cho lỗi hệ thống hoặc lỗi không thể phục hồi.
- `IClock` giúp test thời gian.
- `IUnitOfWork` định nghĩa transaction.
- Không tạo “BaseRepository” quá tổng quát nếu làm mất ý nghĩa nghiệp vụ.

---

## 3. Dependency Injection

Tạo composition root trong:

```text
backend/src/container/dependency-container.ts
```

Quy tắc:

- Controller nhận use case qua constructor.
- Use case nhận repository interface qua constructor.
- Không dùng singleton toàn cục tùy tiện.
- Có thể dùng thư viện DI nhẹ hoặc wiring thủ công.
- Nếu dùng thư viện DI, Domain không được import thư viện đó.

---

## 4. Quy tắc import

Thiết lập alias:

```text
@domain/*
@application/*
@infrastructure/*
@presentation/*
@shared/*
```

Thêm kiểm tra kiến trúc bằng ESLint rule hoặc script đơn giản:

- Domain không import Application/Infrastructure/Presentation.
- Application không import Infrastructure/Presentation.
- Presentation không import repository implementation.
- Infrastructure không import controller.

---

## 5. Module mẫu

Tạo một module health đơn giản theo đúng luồng:

```text
HealthController
→ GetHealthUseCase
→ response
```

Mục đích là chứng minh wiring hoạt động. Không cần repository.

---

## 6. Test cấu trúc

Tạo test:

- `GetHealthUseCase` unit test.
- Health controller/API test.
- Nếu có architecture test, kiểm tra dependency rule.

---

## Không được làm

- Không tạo entity Booking đầy đủ ở bước này.
- Không viết SQL.
- Không thêm logic role.
- Không để `Request`/`Response` đi vào Application.

---

## Tiêu chí hoàn thành bước 03

- Cấu trúc 4 tầng rõ ràng.
- Health endpoint vẫn hoạt động.
- TypeScript build thành công.
- Domain không import framework.
- Có DI/composition root.
- Có test cho đường đi Presentation → Application.
