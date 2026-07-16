/**
 * Frontend-only data source switch.
 *
 * SQL is the safe default. Set NEXT_PUBLIC_DATA_MODE=mock and restart Next.js
 * to run the UI against the in-memory adapter in mock-api-adapter.ts.
 */
export const isMockDataMode = process.env.NEXT_PUBLIC_DATA_MODE === 'mock';

export const dataModeLabel = isMockDataMode ? 'Mock data' : 'API trực tiếp';
