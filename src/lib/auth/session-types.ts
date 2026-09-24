export type UserRole = "user" | "admin";

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  uid: string;
  role: UserRole;
};
