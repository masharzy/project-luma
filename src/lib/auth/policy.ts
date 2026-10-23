export function hasAdminRole(
  user: { role?: string | null } | null | undefined,
): boolean {
  return (
    typeof user?.role === "string" &&
    user.role
      .split(",")
      .map((role) => role.trim())
      .includes("admin")
  );
}
