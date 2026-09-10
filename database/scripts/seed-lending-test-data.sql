-- Dữ liệu demo để kiểm thử danh mục máy và thiết bị cho mượn.
-- Chỉ dùng mã DEMO-; không tạo tài khoản, lịch mượn hoặc thay đổi dữ liệu quản trị.
-- Có thể chạy lại: các mã đã tồn tại sẽ được bỏ qua.
USE [ItLabManagerDb];
GO
SET XACT_ABORT ON;
BEGIN TRY
  BEGIN TRANSACTION;

  IF NOT EXISTS (SELECT 1 FROM dbo.EquipmentCategories WHERE Code = N'DEMO-IOT')
    INSERT INTO dbo.EquipmentCategories (Code, Name, Description)
    VALUES (N'DEMO-IOT', N'Demo thiết bị IoT', N'Danh mục tạm dùng để kiểm thử đăng ký mượn.');

  IF NOT EXISTS (SELECT 1 FROM dbo.EquipmentCategories WHERE Code = N'DEMO-CONNECT')
    INSERT INTO dbo.EquipmentCategories (Code, Name, Description)
    VALUES (N'DEMO-CONNECT', N'Demo cáp và kết nối', N'Danh mục tạm dùng để kiểm thử số lượng tồn kho.');

  IF NOT EXISTS (SELECT 1 FROM dbo.EquipmentCategories WHERE Code = N'DEMO-INTERNAL')
    INSERT INTO dbo.EquipmentCategories (Code, Name, Description)
    VALUES (N'DEMO-INTERNAL', N'Demo thiết bị nội bộ', N'Không hiển thị cho sinh viên và giảng viên.');

  IF NOT EXISTS (SELECT 1 FROM dbo.Computers WHERE Code = N'DEMO-PC-01')
    INSERT INTO dbo.Computers (Code, Name, Cpu, Ram, Storage, Gpu, OperatingSystem, Position, Status, Note)
    VALUES (N'DEMO-PC-01', N'Máy demo 01', N'Intel Core i5-12400', N'16 GB', N'512 GB SSD', N'Intel UHD', N'Windows 11', N'Dãy demo - Bàn 01', N'ACTIVE', N'Dữ liệu demo để kiểm thử.');
  IF NOT EXISTS (SELECT 1 FROM dbo.Computers WHERE Code = N'DEMO-PC-02')
    INSERT INTO dbo.Computers (Code, Name, Cpu, Ram, Storage, Gpu, OperatingSystem, Position, Status, Note)
    VALUES (N'DEMO-PC-02', N'Máy demo 02', N'Intel Core i5-12400', N'16 GB', N'512 GB SSD', N'Intel UHD', N'Windows 11', N'Dãy demo - Bàn 02', N'ACTIVE', N'Dữ liệu demo để kiểm thử.');
  IF NOT EXISTS (SELECT 1 FROM dbo.Computers WHERE Code = N'DEMO-PC-03')
    INSERT INTO dbo.Computers (Code, Name, Cpu, Ram, Storage, Gpu, OperatingSystem, Position, Status, Note)
    VALUES (N'DEMO-PC-03', N'Máy demo 03', N'Intel Core i5-12400', N'16 GB', N'512 GB SSD', N'Intel UHD', N'Windows 11', N'Dãy demo - Bàn 03', N'ACTIVE', N'Dữ liệu demo để kiểm thử.');
  IF NOT EXISTS (SELECT 1 FROM dbo.Computers WHERE Code = N'DEMO-PC-04')
    INSERT INTO dbo.Computers (Code, Name, Cpu, Ram, Storage, Gpu, OperatingSystem, Position, Status, Note)
    VALUES (N'DEMO-PC-04', N'Máy demo 04', N'Intel Core i5-12400', N'16 GB', N'512 GB SSD', N'Intel UHD', N'Windows 11', N'Dãy demo - Bàn 04', N'ACTIVE', N'Dữ liệu demo để kiểm thử.');
  IF NOT EXISTS (SELECT 1 FROM dbo.Computers WHERE Code = N'DEMO-PC-05')
    INSERT INTO dbo.Computers (Code, Name, Cpu, Ram, Storage, Gpu, OperatingSystem, Position, Status, Note)
    VALUES (N'DEMO-PC-05', N'Máy demo 05', N'Intel Core i5-12400', N'16 GB', N'512 GB SSD', N'Intel UHD', N'Windows 11', N'Dãy demo - Bàn 05', N'ACTIVE', N'Dữ liệu demo để kiểm thử.');
  IF NOT EXISTS (SELECT 1 FROM dbo.Computers WHERE Code = N'DEMO-PC-06')
    INSERT INTO dbo.Computers (Code, Name, Cpu, Ram, Storage, Gpu, OperatingSystem, Position, Status, Note)
    VALUES (N'DEMO-PC-06', N'Máy demo 06 - bảo trì', N'Intel Core i5-12400', N'16 GB', N'512 GB SSD', N'Intel UHD', N'Windows 11', N'Dãy demo - Bàn 06', N'MAINTENANCE', N'Dùng để kiểm tra máy không được tính vào số máy trống.');

  IF NOT EXISTS (SELECT 1 FROM dbo.Equipments WHERE Code = N'DEMO-EQ-ESP32')
    INSERT INTO dbo.Equipments (Code, Name, CategoryId, TotalQuantity, AvailableQuantity, ReservedQuantity, BorrowedQuantity, BrokenQuantity, MaintenanceQuantity, LostQuantity, Location, Status, Note, IsLendable)
    SELECT N'DEMO-EQ-ESP32', N'Bộ kit ESP32 demo', Id, 12, 12, 0, 0, 0, 0, 0, N'Tủ demo - Ngăn 01', N'ACTIVE', N'Thiết bị demo cho sinh viên và giảng viên mượn.', 1
    FROM dbo.EquipmentCategories WHERE Code = N'DEMO-IOT';
  IF NOT EXISTS (SELECT 1 FROM dbo.Equipments WHERE Code = N'DEMO-EQ-ARDUINO')
    INSERT INTO dbo.Equipments (Code, Name, CategoryId, TotalQuantity, AvailableQuantity, ReservedQuantity, BorrowedQuantity, BrokenQuantity, MaintenanceQuantity, LostQuantity, Location, Status, Note, IsLendable)
    SELECT N'DEMO-EQ-ARDUINO', N'Bộ kit Arduino demo', Id, 8, 8, 0, 0, 0, 0, 0, N'Tủ demo - Ngăn 02', N'ACTIVE', N'Thiết bị demo cho sinh viên và giảng viên mượn.', 1
    FROM dbo.EquipmentCategories WHERE Code = N'DEMO-IOT';
  IF NOT EXISTS (SELECT 1 FROM dbo.Equipments WHERE Code = N'DEMO-EQ-HDMI')
    INSERT INTO dbo.Equipments (Code, Name, CategoryId, TotalQuantity, AvailableQuantity, ReservedQuantity, BorrowedQuantity, BrokenQuantity, MaintenanceQuantity, LostQuantity, Location, Status, Note, IsLendable)
    SELECT N'DEMO-EQ-HDMI', N'Cáp HDMI demo', Id, 20, 20, 0, 0, 0, 0, 0, N'Tủ demo - Ngăn 03', N'ACTIVE', N'Thiết bị demo cho sinh viên và giảng viên mượn.', 1
    FROM dbo.EquipmentCategories WHERE Code = N'DEMO-CONNECT';
  IF NOT EXISTS (SELECT 1 FROM dbo.Equipments WHERE Code = N'DEMO-EQ-INTERNAL')
    INSERT INTO dbo.Equipments (Code, Name, CategoryId, TotalQuantity, AvailableQuantity, ReservedQuantity, BorrowedQuantity, BrokenQuantity, MaintenanceQuantity, LostQuantity, Location, Status, Note, IsLendable)
    SELECT N'DEMO-EQ-INTERNAL', N'Bộ đo kiểm nội bộ Lab', Id, 2, 2, 0, 0, 0, 0, 0, N'Tủ khóa - Không cho mượn', N'ACTIVE', N'Chỉ phục vụ vận hành Lab; không cho mượn hoặc mang ra ngoài.', 0
    FROM dbo.EquipmentCategories WHERE Code = N'DEMO-INTERNAL';

  COMMIT;
  PRINT N'Da them du lieu demo DEMO-.';
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK;
  THROW;
END CATCH;
