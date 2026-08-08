const sql = require('mssql');
const config = {
  user: 'itlabmanager',
  password: 'itlabmanager@1234',
  server: '118.69.126.49',
  database: 'ItLabManagerDb',
  options: { encrypt: true, trustServerCertificate: true }
};

async function run() {
  try {
    await sql.connect(config);
    const result = await sql.query("SELECT DeviceId, LatestMetricsJson FROM DeviceAgents");
    console.log(result.recordset);
  } catch(e) {
    console.error(e);
  } finally {
    sql.close();
  }
}
run();
