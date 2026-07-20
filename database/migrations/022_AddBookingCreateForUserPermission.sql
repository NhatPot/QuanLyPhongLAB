-- UP
MERGE INTO Permissions AS target
USING (VALUES
    ('BOOKING_CREATE_FOR_USER', N'Đăng ký thay người dùng', N'Tạo yêu cầu sử dụng phòng Lab thay cho một tài khoản đang hoạt động')
) AS source(Code, Name, Description)
ON target.Code = source.Code
WHEN MATCHED THEN
    UPDATE SET Name = source.Name, Description = source.Description, UpdatedAt = SYSUTCDATETIME()
WHEN NOT MATCHED THEN
    INSERT (Code, Name, Description) VALUES (source.Code, source.Name, source.Description);

INSERT INTO RolePermissions (RoleId, PermissionId)
SELECT r.Id, p.Id
FROM Roles r
CROSS JOIN Permissions p
WHERE (
    (r.Code IN ('ADMIN', 'LAB_STAFF') AND p.Code = 'BOOKING_CREATE_FOR_USER')
    OR (r.Code = 'LAB_STAFF' AND p.Code IN ('BOOKING_CREATE', 'BOOKING_VIEW_OWN'))
)
AND NOT EXISTS (
    SELECT 1
    FROM RolePermissions rp
    WHERE rp.RoleId = r.Id AND rp.PermissionId = p.Id
);

-- DOWN
DELETE rp
FROM RolePermissions rp
INNER JOIN Roles r ON r.Id = rp.RoleId
INNER JOIN Permissions p ON p.Id = rp.PermissionId
WHERE p.Code = 'BOOKING_CREATE_FOR_USER'
   OR (r.Code = 'LAB_STAFF' AND p.Code IN ('BOOKING_CREATE', 'BOOKING_VIEW_OWN'));

DELETE FROM Permissions WHERE Code = 'BOOKING_CREATE_FOR_USER';
