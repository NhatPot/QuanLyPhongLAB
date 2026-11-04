export interface SelfServiceConfig {
  ssoEnabled?: boolean;
  registrationEnabled: boolean;
  googleEnabled: boolean;
  mailReady: boolean;
  googleClientId: string;
  hostedDomains: string[];
  studentDomains: string[];
  teacherDomains: string[];
  secret: string;
  outboxKey: string;
  senderBudget: number;
  ipHourlyLimit?: number;
}
