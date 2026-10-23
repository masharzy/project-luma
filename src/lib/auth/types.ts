export type AuthUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: "user" | "admin";
};
export type AuthSession = { user: AuthUser };
export type AuthResult<T> = {
  data: T | null;
  error: { message: string; code?: string } | null;
};
