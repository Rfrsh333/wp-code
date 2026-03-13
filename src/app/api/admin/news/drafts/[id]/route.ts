import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { getDraftById, getGeneratedImageById } from "@/lib/content/repository";
import { createEditorialImageSignedUrl } from "@/lib/images/storage";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const draft = await getDraftById(id);

  if (!draft) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  const heroImage = draft.heroImageId ? await getGeneratedImageById(draft.heroImageId) : null;
  const heroImageUrl =
    heroImage?.storagePathBranded
      ? await createEditorialImageSignedUrl(heroImage.storagePathBranded)
      : null;

  return NextResponse.json({
    draft,
    heroImageUrl,
  });
}
