export const canManageLabAssets = (roles: readonly string[] = []) =>
  roles.some((role) =>
    ["ADMIN", "MANAGER", "LAB_STAFF", "COLLABORATOR"].includes(role),
  );
