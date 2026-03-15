import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/trades — fetch all trades
export async function GET() {
  try {
    const trades = await prisma.trade.findMany({ orderBy: { date: "desc" } });
    return NextResponse.json(trades);
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch trades" }, { status: 500 });
  }
}

// POST /api/trades — add a single trade
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const trade = await prisma.trade.create({
      data: {
        date:   body.date,
        symbol: body.symbol,
        type:   body.type,
        lots:   parseFloat(body.lots),
        entry:  parseFloat(body.entry),
        exit:   parseFloat(body.exit),
        profit: parseFloat(body.profit),
        session: body.session ?? null,
        notes:   body.notes ?? null,
      },
    });
    return NextResponse.json(trade, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: "Failed to create trade" }, { status: 500 });
  }
}