import { apiClient } from "./api-client";
export const fitSsoApi = {
  start: async (returnTo = "/") =>
    (await apiClient.post("/auth/sso/start", { returnTo })).data.data as {
      authorizationUrl: string;
    },
  pending: async () =>
    (await apiClient.get("/auth/sso/pending")).data.data as {
      email: string;
      hasPassword: boolean;
      googleLinked: boolean;
    },
  link: async (input: {
    password?: string;
    googleCredential?: string;
    googleChallengeId?: string;
  }) =>
    (await apiClient.post("/auth/sso/link", input)).data.data as {
      redirectTo: string;
    },
  profile: async (input: {
    fullName: string;
    department: string;
    phone: string;
  }) =>
    (await apiClient.post("/auth/sso/profile", input)).data.data as {
      redirectTo: string;
    },
  logout: async () =>
    (await apiClient.post("/auth/sso/logout")).data.data as {
      redirectTo?: string;
    },
};
