const sql = require('mssql/msnodesqlv8');
const config = {
  server: '(local)',
  database: 'master',
  driver: 'msnodesqlv8',
  options: {
    trustedConnection: true,
    trustServerCertificate: true
  }
};
sql.connect(config).then(() => {
  console.log("Connected to SQL Server with Windows Auth!");
  process.exit(0);
}).catch(err => {
  console.log("Connection failed!");
  console.dir(err, { depth: null });
  process.exit(1);
});
