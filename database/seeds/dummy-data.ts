import mssql from 'mssql';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const dbConfig: mssql.config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'YourStrongPassword123!',
  server: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  database: process.env.DB_NAME || 'ItLabManagerDb',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: true,
  },
};

async function seedDummyData() {
  console.log('[Dummy Seed] Starting to generate test data...');
  let pool: mssql.ConnectionPool | null = null;
  
  try {
    pool = await new mssql.ConnectionPool(dbConfig).connect();
    
    // 1. Get Roles
    const rolesResult = await pool.request().query("SELECT Id, Code FROM Roles");
    const roles: Record<string, string> = {};
    rolesResult.recordset.forEach(r => roles[r.Code] = r.Id);
    
    // 2. Create Users
    console.log('[Dummy Seed] Seeding Users...');
    const usersData = [
      { email: 'teacher@example.edu.vn', username: 'teacher', name: 'Giảng viên Test', role: 'TEACHER' },
      { email: 'student@example.edu.vn', username: 'student', name: 'Sinh viên Test', role: 'STUDENT' },
      { code: 'collab', email: 'collab@example.edu.vn', username: 'collab', name: 'Cộng tác viên Test', role: 'COLLABORATOR' },
      { code: 'staff', email: 'staff@example.edu.vn', username: 'staff', name: 'Ban trực phòng Test', role: 'LAB_STAFF' }
    ];
    
    const pwdHash = await bcrypt.hash('Password123!', 10);
    const userIds: Record<string, string> = {};
    
    for (const u of usersData) {
      const checkRes = await pool.request().input('email', u.email).query("SELECT Id FROM Users WHERE Email = @email");
      let userId = '';
      if (checkRes.recordset.length === 0) {
        const insertRes = await pool.request()
          .input('name', u.name)
          .input('email', u.email)
          .input('emailNorm', u.email.toLowerCase())
          .input('username', u.username)
          .input('usernameNorm', u.username.toLowerCase())
          .input('pwd', pwdHash)
          .query(`
            INSERT INTO Users (FullName, Email, EmailNormalized, Username, UsernameNormalized, PasswordHash, Status, MustChangePassword)
            OUTPUT INSERTED.Id
            VALUES (@name, @email, @emailNorm, @username, @usernameNorm, @pwd, 'ACTIVE', 0)
          `);
        userId = insertRes.recordset[0].Id;
        
        // Assign Role
        await pool.request()
          .input('userId', userId)
          .input('roleId', roles[u.role])
          .query("INSERT INTO UserRoles (UserId, RoleId) VALUES (@userId, @roleId)");
      } else {
        userId = checkRes.recordset[0].Id;
      }
      userIds[u.username] = userId;
    }
    
    // 3. Create Computers
    console.log('[Dummy Seed] Seeding Computers...');
    for (let i = 1; i <= 20; i++) {
      const pcCode = `PC-${i.toString().padStart(2, '0')}`;
      const pcName = `Máy tính ${i.toString().padStart(2, '0')}`;
      const status = i === 19 ? 'MAINTENANCE' : (i === 20 ? 'BROKEN' : 'ACTIVE');
      
      const checkPc = await pool.request().input('code', pcCode).query("SELECT Id FROM Computers WHERE Code = @code");
      if (checkPc.recordset.length === 0) {
        await pool.request()
          .input('code', pcCode)
          .input('name', pcName)
          .input('status', status)
          .input('cpu', 'Intel Core i5-12400F')
          .input('ram', '16GB DDR4')
          .input('storage', '512GB NVMe SSD')
          .input('os', 'Windows 11 Pro')
          .query(`
            INSERT INTO Computers (Code, Name, Status, Cpu, Ram, Storage, OperatingSystem)
            VALUES (@code, @name, @status, @cpu, @ram, @storage, @os)
          `);
      }
    }
    
    // 4. Create Equipment Categories
    console.log('[Dummy Seed] Seeding Equipment Categories...');
    const catData = [
      { code: 'CAT-CABLE', name: 'Cáp kết nối', desc: 'HDMI, VGA, Type-C' },
      { code: 'CAT-PERIPH', name: 'Thiết bị ngoại vi', desc: 'Chuột, Bàn phím, Tai nghe' },
      { code: 'CAT-PRESENT', name: 'Phụ kiện thuyết trình', desc: 'Bút trình chiếu, Adapter' }
    ];
    
    const catIds: Record<string, string> = {};
    for (const c of catData) {
      const checkCat = await pool.request().input('code', c.code).query("SELECT Id FROM EquipmentCategories WHERE Code = @code");
      if (checkCat.recordset.length === 0) {
        const insCat = await pool.request()
          .input('code', c.code)
          .input('name', c.name)
          .input('desc', c.desc)
          .query("INSERT INTO EquipmentCategories (Code, Name, Description) OUTPUT INSERTED.Id VALUES (@code, @name, @desc)");
        catIds[c.name] = insCat.recordset[0].Id;
      } else {
        catIds[c.name] = checkCat.recordset[0].Id;
      }
    }
    
    // 5. Create Equipments
    console.log('[Dummy Seed] Seeding Equipments...');
    const eqData = [
      { name: 'Cáp HDMI 2.0 1.5m', cat: 'Cáp kết nối', total: 20 },
      { name: 'Cáp chuyển Type-C sang HDMI', cat: 'Cáp kết nối', total: 10 },
      { name: 'Chuột không dây Logitech', cat: 'Thiết bị ngoại vi', total: 15 },
      { name: 'Bút trình chiếu Logitech R400', cat: 'Phụ kiện thuyết trình', total: 5 },
    ];
    
    for (let i = 0; i < eqData.length; i++) {
      const eq = eqData[i];
      const eqCode = `EQ-${(i + 1).toString().padStart(3, '0')}`;
      const checkEq = await pool.request().input('code', eqCode).query("SELECT Id FROM Equipments WHERE Code = @code");
      if (checkEq.recordset.length === 0) {
        await pool.request()
          .input('code', eqCode)
          .input('name', eq.name)
          .input('catId', catIds[eq.cat])
          .input('total', eq.total)
          .query(`
            INSERT INTO Equipments (Code, Name, CategoryId, TotalQuantity, AvailableQuantity)
            VALUES (@code, @name, @catId, @total, @total)
          `);
      }
    }
    
    // 6. Create Booking Requests
    console.log('[Dummy Seed] Seeding Bookings...');
    const dateToday = new Date();
    const dateTomorrow = new Date(dateToday);
    dateTomorrow.setDate(dateTomorrow.getDate() + 1);
    
    const bookings = [
      {
        reqCode: 'REQ-' + Math.floor(Math.random()*10000),
        user: 'teacher', type: 'FULL_LAB', purpose: 'Dạy học môn Lập trình Web',
        start: new Date(dateToday.getFullYear(), dateToday.getMonth(), dateToday.getDate(), 7, 30),
        end: new Date(dateToday.getFullYear(), dateToday.getMonth(), dateToday.getDate(), 11, 30),
        people: 40, comp: 40, status: 'APPROVED'
      },
      {
        reqCode: 'REQ-' + Math.floor(Math.random()*10000),
        user: 'student', type: 'COMPUTERS_ONLY', purpose: 'Thực hành tự do nhóm',
        start: new Date(dateTomorrow.getFullYear(), dateTomorrow.getMonth(), dateTomorrow.getDate(), 13, 0),
        end: new Date(dateTomorrow.getFullYear(), dateTomorrow.getMonth(), dateTomorrow.getDate(), 16, 0),
        people: 3, comp: 3, status: 'PENDING'
      }
    ];
    
    for (const b of bookings) {
      const checkBk = await pool.request().input('code', b.reqCode).query("SELECT Id FROM BookingRequests WHERE RequestCode = @code");
      if (checkBk.recordset.length === 0) {
        await pool.request()
          .input('code', b.reqCode)
          .input('reqId', userIds[b.user])
          .input('type', b.type)
          .input('purpose', b.purpose)
          .input('start', b.start)
          .input('end', b.end)
          .input('people', b.people)
          .input('comp', b.comp)
          .input('status', b.status)
          .query(`
            INSERT INTO BookingRequests (RequestCode, RequesterId, BookingType, Purpose, StartTime, EndTime, NumberOfPeople, NumberOfComputers, Status)
            VALUES (@code, @reqId, @type, @purpose, @start, @end, @people, @comp, @status)
          `);
      }
    }
    
    // 7. Create Incident
    console.log('[Dummy Seed] Seeding Incidents...');
    const brokenPcRes = await pool.request().query("SELECT TOP 1 Id FROM Computers WHERE Status = 'BROKEN'");
    if (brokenPcRes.recordset.length > 0) {
      const brokenPcId = brokenPcRes.recordset[0].Id;
      const incCode = 'INC-' + Math.floor(Math.random()*10000);
      const checkInc = await pool.request().input('code', incCode).query("SELECT Id FROM IncidentReports WHERE Code = @code");
      
      if (checkInc.recordset.length === 0) {
        await pool.request()
          .input('code', incCode)
          .input('reqId', userIds['student'])
          .input('comp', brokenPcId)
          .input('title', 'Máy tính không lên màn hình')
          .input('desc', 'Nhấn nút nguồn máy vẫn chạy (nghe tiếng quạt) nhưng màn hình đen thui, đèn tín hiệu màn hình chớp tắt.')
          .input('sev', 'HIGH')
          .input('status', 'OPEN')
          .query(`
            INSERT INTO IncidentReports (Code, ReporterId, ComputerId, Title, Description, Severity, Status)
            VALUES (@code, @reqId, @comp, @title, @desc, @sev, @status)
          `);
      }
    }
    
    console.log('[Dummy Seed] DUMMY DATA SEEDING COMPLETED SUCCESSFULLY!');
    
  } catch (error) {
    console.error('[Dummy Seed] Error during dummy seeding:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
    }
    process.exit(0);
  }
}

seedDummyData();
