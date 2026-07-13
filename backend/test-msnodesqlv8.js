const sql = require('mssql/msnodesqlv8');
const config = {
  server: 'localhost',
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
  console.error("Connection failed:", err.message, err.code, err);
  process.exit(1);
});
