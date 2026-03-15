import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// DELETE /api/trades/:id — delete a single trade
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.trade.delete({ where: { id: parseInt(params.id) } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed to delete trade" }, { status: 500 });
  }
}