import fs from 'fs';
import path from 'path';

export interface DeviceApiLogEntry {
  timestamp?: string;
  method: string;
  endpoint: string;
  ip?: string;
  userAgent?: string;
  requestBody?: any;
  queryParams?: any;
  statusCode?: number;
  response?: any;
}

const LOG_TXT_PATH = path.join(process.cwd(), 'api-device-logs.log');
const LOG_JSON_PATH = path.join(process.cwd(), 'api-device-logs.json');

export class DeviceApiLogger {
  public static log(entry: DeviceApiLogEntry): void {
    try {
      const nowStr = entry.timestamp || new Date().toISOString();
      const fullEntry = {
        timestamp: nowStr,
        method: (entry.method || 'POST').toUpperCase(),
        endpoint: entry.endpoint || '/api/devices',
        ip: entry.ip || 'UNKNOWN',
        userAgent: entry.userAgent || 'UNKNOWN',
        statusCode: entry.statusCode || 200,
        requestBody: entry.requestBody ?? null,
        queryParams: entry.queryParams ?? null,
        response: entry.response ?? null,
      };

      // 1. Append to api-device-logs.log (Formatted Text Log)
      const textHeader = `================================================================================\n[${fullEntry.timestamp}] ${fullEntry.method} ${fullEntry.endpoint} (Status: ${fullEntry.statusCode})\nIP: ${fullEntry.ip} | User-Agent: ${fullEntry.userAgent}\n`;
      const textBody = fullEntry.requestBody !== null ? `--- REQUEST BODY ---\n${JSON.stringify(fullEntry.requestBody, null, 2)}\n` : '';
      const textResp = fullEntry.response !== null ? `--- RESPONSE ---\n${JSON.stringify(fullEntry.response, null, 2)}\n\n` : '\n';

      fs.appendFileSync(LOG_TXT_PATH, textHeader + textBody + textResp, 'utf-8');

      // 2. Append to api-device-logs.json (JSON Array Format)
      let jsonLogs: any[] = [];
      if (fs.existsSync(LOG_JSON_PATH)) {
        try {
          const content = fs.readFileSync(LOG_JSON_PATH, 'utf-8');
          jsonLogs = JSON.parse(content);
          if (!Array.isArray(jsonLogs)) jsonLogs = [];
        } catch {
          jsonLogs = [];
        }
      }
      jsonLogs.unshift(fullEntry);
      if (jsonLogs.length > 500) {
        jsonLogs = jsonLogs.slice(0, 500);
      }
      fs.writeFileSync(LOG_JSON_PATH, JSON.stringify(jsonLogs, null, 2), 'utf-8');
    } catch (err) {
      // Ignore logging failure to prevent interrupting primary request flow
    }
  }
}
