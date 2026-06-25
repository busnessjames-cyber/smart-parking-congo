import { NextRequest, NextResponse } from "next/server";
import { requirePermission, handleApiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";

export async function POST(req: NextRequest) {
  try {
    await requirePermission(PERMISSIONS.VEHICLE_ENTRY);

    const formData = await req.formData();
    const photo = formData.get("photo") as File;

    if (!photo || photo.size === 0) {
      return NextResponse.json({ error: "Photo requise" }, { status: 400 });
    }

    const { createWorker } = await import("tesseract.js");
    const bytes = await photo.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const worker = await createWorker("eng");
    const {
      data: { text },
    } = await worker.recognize(buffer);
    await worker.terminate();

    const cleaned = text.replace(/\s+/g, "").toUpperCase();
    const platePatterns = [
      /[A-Z]{2,3}[-\s]?\d{2,4}[-\s]?[A-Z]{0,3}/,
      /[A-Z]{1,3}\d{3,4}[A-Z]{0,3}/,
      /\d{1,4}[-\s]?[A-Z]{2,4}[-\s]?\d{0,4}/,
    ];

    let plate = "";
    for (const pattern of platePatterns) {
      const match = cleaned.match(pattern);
      if (match) {
        plate = match[0].replace(/\s/g, "-");
        break;
      }
    }

    if (!plate && cleaned.length >= 4) {
      plate = cleaned.slice(0, 12);
    }

    return NextResponse.json({
      plate,
      rawText: text.trim(),
      confidence: plate ? "medium" : "low",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
