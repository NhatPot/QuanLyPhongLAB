const email = { type: "string", format: "email", maxLength: 255 };
const challengeId = { type: "string", format: "uuid" };
const grant = {
  type: "string",
  pattern: "^[a-f0-9]{64}$",
  description:
    "Bằng chứng một lần, gắn cookie HttpOnly authFlow; không phải access token.",
};
const password = {
  type: "string",
  minLength: 12,
  maxLength: 72,
  description: "Không quá 72 byte UTF-8; chỉ áp dụng thiết lập/reset mới.",
};
const codeBody = {
  challengeId,
  code: { type: "string", pattern: "^[0-9]{6}$" },
};
const proof = { challengeId, grant };
const google = {
  credential: {
    type: "string",
    description:
      "Google ID token, chữ ký/audience/issuer/expiry được xác minh tại server.",
  },
  challengeId,
};
function operation(
  summary: string,
  properties?: object,
  authenticated = false,
  required?: string[],
) {
  return {
    tags: ["Xác Thực (Auth)"],
    summary,
    description:
      "Web dùng CSRF và cookie authFlow HttpOnly. OTP: lần gửi đầu + tối đa 5 lần gửi lại mỗi email/mục đích trong cửa sổ 60 phút trượt, cách nhau 60 giây; còn chịu ngân sách tổng. Không tự cấp quyền giảng viên trước khi duyệt.",
    security: authenticated ? [{ CookieAuth: [] }] : [],
    ...(properties
      ? {
          parameters: [
            {
              in: "header",
              name: "X-CSRF-Token",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties,
                  required: required || Object.keys(properties),
                },
              },
            },
          },
        }
      : {}),
    responses: {
      200: {
        description:
          "Thành công. data chứa challengeId/email/expiresAt/resendAt/resendsRemaining khi gửi mã; verify trả grant; complete trả state active/pending_review. Google có thể trả verify_email/complete_profile. Active đặt cookie phiên, không trả token phiên trong JSON.",
      },
      400: { description: "Dữ liệu/mật khẩu/miền không hợp lệ." },
      401: {
        description:
          "Mã, grant, nonce hoặc phiên không hợp lệ; không thử refresh để replay OTP.",
      },
      403: { description: "CSRF/Origin hoặc quyền không hợp lệ." },
      409: {
        description: "Email/liên kết đã tồn tại hoặc yêu cầu đã được xử lý.",
      },
      429: {
        description:
          "Hết lượt hoặc còn cooldown; Retry-After cho biết thời gian chờ.",
      },
      503: {
        description:
          "Chức năng chưa cấu hình/bật, chưa migration hoặc dịch vụ tạm không khả dụng.",
      },
    },
  };
}
export const selfServiceAuthPaths = {
  '/auth/sso/start': {post:{...operation('Bắt đầu FIT LHU SSO Authorization Code + PKCE S256',{returnTo:{type:'string',description:'Chỉ đường dẫn nội bộ; mặc định /'}},false,[]),description:'CSRF/Origin bắt buộc. State/nonce/PKCE verifier lưu mã hóa ở server, browser chỉ giữ flow ID và binding HttpOnly. Trả authorizationUrl; không trả verifier/client secret.'}},
  '/auth/sso/callback': {get:{tags:['Xác Thực (Auth)'],summary:'Callback FIT LHU SSO một lần',description:'Kiểm state/issuer/nonce/PKCE và chữ ký RS256 JWKS. Giữ quyền/trạng thái Lab; email trùng phải xác nhận tài khoản cũ, không tự gộp. Token không trả qua JSON.',responses:{303:{description:'Chuyển tới hồ sơ, dashboard, chờ duyệt, liên kết hoặc lỗi đã kiểm soát.'}}}},
  '/auth/sso/pending': {get:operation('Đọc phương thức xác nhận tài khoản Lab cũ sau khi SSO đã xác minh')},
  '/auth/sso/link': {post:operation('Liên kết SSO bằng mật khẩu Lab hoặc Google đã liên kết',{password:{type:'string',maxLength:256},googleCredential:{type:'string'},googleChallengeId:challengeId},false,[])},
  '/auth/sso/profile': {post:operation('Hoàn thiện hồ sơ SSO, không đặt mật khẩu Lab',{fullName:{type:'string',minLength:2,maxLength:255},department:{type:'string',minLength:2,maxLength:255},phone:{type:'string',minLength:1,maxLength:50}},true)},
  '/auth/sso/logout': {post:operation('Thu hồi phiên Lab và chuẩn bị đăng xuất SSO qua redirect nội bộ',{},true)},
  '/auth/sso/logout-redirect': {get:{tags:['Xác Thực (Auth)'],summary:'Redirect đăng xuất SSO một lần qua cookie HttpOnly',responses:{303:{description:'Chuyển sang provider logout; id_token_hint không trả trong JSON của ứng dụng.'}}}},
  '/auth/account-setup': {
    post: {
      ...operation('Hoàn thiện tài khoản Google: đặt mật khẩu và cập nhật hồ sơ bắt buộc', {
        fullName: {type:'string',minLength:2,maxLength:255},
        department: {type:'string',minLength:2,maxLength:255},
        phone: {type:'string',minLength:1,maxLength:50},
        password,
        confirmPassword: password,
      }, true, ['fullName','department','phone','password','confirmPassword']),
      description: 'Chỉ phiên Google của tài khoản ACTIVE chưa có mật khẩu; giảng viên phải được duyệt trước. Email/tài khoản đăng nhập lấy từ server. Lưu hồ sơ và mật khẩu, thu hồi phiên trong cùng transaction; xóa cookie và yêu cầu đăng nhập lại. Không dùng OTP/SMTP. API nghiệp vụ trả 403 ACCOUNT_SETUP_REQUIRED trước khi hoàn tất.',
    },
  },
  "/auth/config": {
    get: operation(
      "Khả năng đăng ký, Google, recovery và miền email được phép; không trả secret",
    ),
  },
  "/auth/google/nonce": {
    post: operation(
      "Khởi tạo nonce Google một lần và cookie ràng buộc trình duyệt",
      {},
    ),
  },
  "/auth/google": {
    post: operation("Đăng nhập hoặc tự đăng ký Google", google),
  },
  "/auth/register/request-code": {
    post: operation("Yêu cầu OTP đăng ký email trường", { email }),
  },
  "/auth/register/verify-code": {
    post: operation("Xác minh OTP đăng ký, cấp grant", codeBody),
  },
  "/auth/register/complete": {
    post: operation(
      "Hoàn tất tài khoản; mật khẩu bắt buộc với đăng ký thủ công",
      {
        ...proof,
        fullName: { type: "string", minLength: 2, maxLength: 255 },
        department: { type: "string", minLength: 2, maxLength: 255, description: "Bắt buộc khi đăng ký bằng email/OTP; Google hoàn thiện sau bằng phiên giới hạn." },
        phone: { type: "string", minLength: 1, maxLength: 50, description: "Bắt buộc khi đăng ký bằng email/OTP; Google hoàn thiện sau bằng phiên giới hạn." },
        password,
      },
      false,
      ["challengeId", "grant", "fullName"],
    ),
  },
  "/auth/otp/resend": {
    post: operation("Gửi lại OTP; mã cũ vô hiệu, bộ đếm không reset", {
      challengeId,
    }),
  },
  "/auth/password/request-reset": {
    post: operation(
      "Yêu cầu OTP quên mật khẩu; phản hồi thống nhất cho mọi email",
      { email },
    ),
  },
  "/auth/password/verify-reset": {
    post: operation("Xác minh OTP quên mật khẩu", codeBody),
  },
  "/auth/password/reset": {
    post: operation("Tiêu thụ grant, đổi mật khẩu và thu hồi tất cả phiên cũ", {
      ...proof,
      password,
    }),
  },
  "/auth/me/security": {
    get: operation(
      "Xem trạng thái mật khẩu, Google và email đã xác minh",
      undefined,
      true,
    ),
  },
  "/auth/me/google/link": {
    post: operation(
      "Liên kết Google cùng email Workspace sau xác nhận mật khẩu hiện tại",
      {
        ...google,
        password: {
          type: "string",
          description:
            "Mật khẩu hiện tại, không áp dụng luật độ dài mật khẩu mới.",
        },
      },
      true,
    ),
  },
  "/auth/me/password/request-code": {
    post: operation(
      "Gửi OTP tới email tài khoản Google-only đang đăng nhập",
      {},
      true,
    ),
  },
  "/auth/me/password/verify-code": {
    post: operation("Xác minh OTP thiết lập mật khẩu", codeBody, true),
  },
  "/auth/me/password/set": {
    post: operation(
      "Thiết lập mật khẩu cho Google-only và đăng xuất phiên cũ",
      { ...proof, password },
      true,
    ),
  },
  "/auth/me/email/request-code": {
    post: operation("Bước 1 đổi email: gửi mã tới email hiện tại", {}, true),
  },
  "/auth/me/email/verify-current": {
    post: operation("Bước 2: xác minh email hiện tại", codeBody, true),
  },
  "/auth/me/email/request-new": {
    post: operation(
      "Bước 3: tiêu thụ grant email cũ và gửi mã tới email mới cùng loại tài khoản",
      { ...proof, email },
      true,
    ),
  },
  "/auth/me/email/verify-code": {
    post: operation("Bước 4: xác minh email mới", codeBody, true),
  },
  "/auth/me/email/change": {
    post: operation(
      "Bước 5: cập nhật email đã xác minh, thu hồi phiên cũ và thông báo",
      proof,
      true,
    ),
  },
  "/account-registrations": {
    get: operation(
      "Danh sách giảng viên chờ duyệt; cần ACCOUNT_REGISTRATION_REVIEW hoặc ADMIN",
      undefined,
      true,
    ),
  },
  "/account-registrations/{id}": {
    post: {
      ...operation(
        "Duyệt/từ chối giảng viên; cần ACCOUNT_REGISTRATION_REVIEW hoặc ADMIN",
        {
          approved: { type: "boolean" },
          note: { type: "string", maxLength: 1000 },
        },
        true,
        ["approved"],
      ),
      parameters: [
        { in: "path", name: "id", required: true, schema: challengeId },
        {
          in: "header",
          name: "X-CSRF-Token",
          required: true,
          schema: { type: "string" },
        },
      ],
    },
  },
};
