import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '.env') });

import { SqlConnectionFactory } from './src/infrastructure/database/sqlserver/connection';
import { SqlUserRepository } from './src/infrastructure/database/sqlserver/repositories/SqlUserRepository';
import { User } from './src/domain/entities/User';
import { UniqueEntityId } from './src/domain/value-objects/UniqueEntityId';
import { LabProfile } from './src/domain/entities/LabProfile';
import { SqlLabProfileRepository } from './src/infrastructure/database/sqlserver/repositories/SqlLabProfileRepository';
import { Equipment } from './src/domain/entities/Equipment';
import { SqlEquipmentRepository } from './src/infrastructure/database/sqlserver/repositories/SqlEquipmentRepository';
import { Computer } from './src/domain/entities/Computer';
import { SqlComputerRepository } from './src/infrastructure/database/sqlserver/repositories/SqlComputerRepository';
import bcrypt from 'bcrypt';

async function seed() {
  console.log('Starting seed...');
  await SqlConnectionFactory.getPool();

  const userRepo = new SqlUserRepository();
  const labRepo = new SqlLabProfileRepository();
  const eqRepo = new SqlEquipmentRepository();
  const compRepo = new SqlComputerRepository();
  
  // 1. Create Admin
  const adminEmail = 'admin@example.com';
  let admin = await userRepo.findByUsernameOrEmail(adminEmail);
  if (!admin) {
    console.log('Creating admin user...');
    const passwordHash = await bcrypt.hash('Admin@123', 10);
    admin = User.create({
      username: 'admin',
      email: adminEmail,
      fullName: 'Administrator',
      passwordHash,
      status: 'ACTIVE',
      department: 'IT',
      mustChangePassword: false,
    }, new UniqueEntityId('admin-id'));
    
    await userRepo.save(admin);
    
    const pool = await SqlConnectionFactory.getPool();
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM Roles WHERE Code = 'ADMIN')
      BEGIN
        INSERT INTO Roles (Id, Code, Name) VALUES (NEWID(), 'ADMIN', 'Administrator')
      END
      
      DECLARE @roleId UNIQUEIDENTIFIER
      SELECT @roleId = Id FROM Roles WHERE Code = 'ADMIN'
      
      IF NOT EXISTS (SELECT * FROM User_Roles WHERE UserId = 'admin-id' AND RoleId = @roleId)
      BEGIN
        INSERT INTO User_Roles (UserId, RoleId) VALUES ('admin-id', @roleId)
      END
    `);
    
    console.log('Admin user created: admin / Admin@123');
  } else {
    console.log('Admin user already exists.');
  }

  // 2. Create Lab Profile
  let lab = await labRepo.get();
  if (!lab) {
    console.log('Creating Lab Profile...');
    lab = LabProfile.create({
      labCode: 'LAB-IT-01',
      labName: 'Phòng Lab Thực Hành CNTT',
      capacity: 50,
      location: 'Tầng 3 - Tòa A',
      managerId: admin.id.toString(),
      status: 'ACTIVE'
    });
    await labRepo.save(lab);
    console.log('Lab Profile created.');
  }

  // 3. Create Equipments
  console.log('Creating Equipments...');
  const pool = await SqlConnectionFactory.getPool();
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM EquipmentCategories WHERE Code = 'PROJECTOR')
    BEGIN
      INSERT INTO EquipmentCategories (Id, Code, Name) VALUES (NEWID(), 'PROJECTOR', N'Máy chiếu')
    END
  `);
  const catRes = await pool.request().query(`SELECT Id FROM EquipmentCategories WHERE Code = 'PROJECTOR'`);
  const catId = catRes.recordset[0].Id;

  const existingEq = await pool.request().query('SELECT COUNT(*) as cnt FROM Equipments');
  if (existingEq.recordset[0].cnt === 0) {
    const eq = Equipment.create({
      code: 'PRJ-01',
      name: 'Máy chiếu Panasonic',
      categoryId: catId,
      totalQuantity: 2,
      availableQuantity: 2,
      reservedQuantity: 0,
      borrowedQuantity: 0,
      brokenQuantity: 0,
      maintenanceQuantity: 0,
      lostQuantity: 0,
      status: 'ACTIVE'
    });
    await eqRepo.save(eq);
    console.log('Equipment created.');
  }

  // 4. Create Computers
  const existingComp = await pool.request().query('SELECT COUNT(*) as cnt FROM Computers');
  if (existingComp.recordset[0].cnt === 0) {
    console.log('Creating Computers...');
    for (let i = 1; i <= 10; i++) {
      const comp = Computer.create({
        code: `PC-${i.toString().padStart(2, '0')}`,
        name: `Máy tính ${i}`,
        position: `Row 1 - ${i}`,
        status: 'ACTIVE'
      });
      await compRepo.save(comp);
    }
    console.log('10 Computers created.');
  }

  console.log('Seed completed successfully!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
