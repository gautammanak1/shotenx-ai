import { POST as MdkPost } from "@moneydevkit/nextjs/server/route";

export const runtime = "nodejs";

export const POST = MdkPost;

export async function GET() {
  return Response.json({
    ok: true,
    service: "mdk-endpoint-alias",
    path: "/api/mdk/api/mdk",
    note: "Compatibility alias for duplicated webhook path"
  });
}
