const fs = require('fs');

const fixFile = (path, rules) => {
  let content = fs.readFileSync(path, 'utf8');
  for (const rule of rules) {
    content = content.replace(rule.search, rule.replace);
  }
  fs.writeFileSync(path, content);
  console.log('Fixed', path);
};

// 1. AuditLog use cases fix
const ucDir = './src/application/use-cases/booking/';
const ucFiles = ['ApproveBookingUseCase.ts', 'CancelBookingUseCase.ts', 'CreateBookingUseCase.ts', 'RejectBookingUseCase.ts'];

ucFiles.forEach(f => {
  const p = ucDir + f;
  fixFile(p, [
    { search: /import \{ AuditLog \} from '..\/..\/..\/domain\/entities\/AuditLog';\n?/g, replace: '' },
    { search: /const auditLog = AuditLog\.create\(\{\n([\s\S]*?)\}\);\n\s*await this\.auditLogRepo\.save\(auditLog, transaction\);/g, replace: 'await this.auditLogRepo.save({\n$1} as any);' },
    { search: /const auditLog = AuditLog\.create\(\{\n([\s\S]*?)\}\);\n\s*await this\.auditLogRepo\.save\(auditLog\);/g, replace: 'await this.auditLogRepo.save({\n$1} as any);' },
    { search: /uow\.execute/g, replace: 'uow.complete' },
    { search: /async \(transaction\) =>/g, replace: 'async () =>' }
  ]);
});

// 2. Entities UniqueEntityId
fixFile('./src/domain/entities/BookingEquipmentItem.ts', [
  { search: /'..\/UniqueEntityId'/g, replace: "'../value-objects/UniqueEntityId'" },
  { search: /'\.\/UniqueEntityId'/g, replace: "'../value-objects/UniqueEntityId'" },
  { search: /new UniqueEntityId\(id\)/g, replace: "id ? new UniqueEntityId(id) : undefined" }
]);

fixFile('./src/domain/entities/BookingRequest.ts', [
  { search: /'\.\.\/shared\/UniqueEntityId'/g, replace: "'../value-objects/UniqueEntityId'" },
  { search: /new UniqueEntityId\(id\)/g, replace: "id ? new UniqueEntityId(id) : undefined" }
]);

// 3. AvailabilityController
fixFile('./src/presentation/http/controllers/AvailabilityController.ts', [
  { search: /\.\.\/\.\.\/\.\.\/\.\.\/application\/use-cases/g, replace: '../../../application/use-cases' },
  { search: /\.\.\/\.\.\/\.\.\/\.\.\/domain\/entities/g, replace: '../../../domain/entities' }
]);

// 4. auth middleware routes
fixFile('./src/presentation/http/routes/availability.routes.ts', [
  { search: /auth\.middleware/g, replace: 'authMiddleware' }
]);
fixFile('./src/presentation/http/routes/booking.routes.ts', [
  { search: /auth\.middleware/g, replace: 'authMiddleware' }
]);

console.log('Done');
