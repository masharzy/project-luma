import { auth } from "@/lib/auth/server";
export async function GET() {
  const { data: session, error } = await auth.getSession();
  if (error || !session?.user)
    return Response.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  return Response.json(
    {
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
