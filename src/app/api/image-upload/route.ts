import { NextRequest } from "next/server";
import { readSession } from "@/lib/auth/session";
import { hasAdminRole } from "@/lib/auth/policy";
import { requireSameOrigin, limit } from "@/lib/auth/http";
export async function POST(request: NextRequest) {
  const session = await readSession();
  if (!session || !hasAdminRole(session.user)) return Response.json({ error: "Forbidden" }, { status: 403 });
  try {
    requireSameOrigin(request); await limit("exam-image:"+session.user.id, 30, 900);
    const reader = request.body?.getReader(); if (!reader) throw Error("Missing file");
    let size = 0; const chunks: Uint8Array[] = [];
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 1100000) { await reader.cancel(); return Response.json({ error: "Image must be under 1 MB." }, { status: 413 }); } chunks.push(value); }
    const form = await new Response(Buffer.concat(chunks), { headers: { "Content-Type": request.headers.get("content-type") || "" } }).formData();
    const file = form.get("image") || form.get("file");
    if (!(file instanceof File) || file.size > 1048576) throw Error("Choose an image under 1 MB.");
    const b = Buffer.from(await file.arrayBuffer());
    const png = b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    const jpg = b[0]===255 && b[1]===216 && b[2]===255;
    const webp = b.toString('ascii',0,4)==='RIFF' && b.toString('ascii',8,12)==='WEBP';
    if (!png && !jpg && !webp) throw Error("Use PNG, JPEG or WebP.");
    return Response.json({ url: `data:${png?'image/png':jpg?'image/jpeg':'image/webp'};base64,${b.toString('base64')}` }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Unable to upload. Use a PNG, JPEG or WebP image under 1 MB." }, { status: 400 }); }
}
