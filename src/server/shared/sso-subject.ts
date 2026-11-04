import {createHash} from "node:crypto";
export const FIT_SSO_PROVIDER = "FIT_LHU_SSO";
export const ssoSubject = (issuer: string, subject: string) =>
  createHash("sha256").update(issuer+"\0"+subject).digest("hex");
