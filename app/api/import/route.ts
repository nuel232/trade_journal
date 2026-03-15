import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Papa from "papaparse";

// MT5 exports trades with these column names — we map them to our schema
const MT5_MAP: Record<string, string> = {
  "time":        "date",
  "close time":  "date",
  "symbol":      "symbol",
  "item":        "symbol",
  "type":        "type",
  "direction":   "type",
  "volume":      "lots",
  "lots":        "lots",
  "open price":  "entry",
  "price":       "entry",
  "close price": "exit",
  "profit":      "profit",
  "pnl":         "profit",
};

function normalise(raw: Record<string, string>) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    const mapped = MT5_MAP[k.toLowerCase().trim()];
    if (mapped && !out[mapped]) out[mapped] = v.trim();
  }
  return out;
}

// POST /api/import — accepts raw CSV text in body
export async function POST(req: Request) {
  try {
    const text = await req.text();
    const { data } = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
    });

    const trades = data
      .map(normalise)
      .filter(r => r.date && r.symbol && r.profit !== undefined)
      .map(r => ({
        date:   r.date.split(" ")[0],           // strip time if present
        symbol: r.symbol.toUpperCase(),
        type:   (r.type || "BUY").toUpperCase(),
        lots:   parseFloat(r.lots  || "0"),
        entry:  parseFloat(r.entry || "0"),
        exit:   parseFloat(r.exit  || "0"),
        profit: parseFloat(r.profit),
      }))
      .filter(r => !isNaN(r.profit));

    if (!trades.length)
      return NextResponse.json({ error: "No valid trades found in CSV" }, { status: 400 });

    // Bulk insert
    const result = await prisma.trade.createMany({ data: trades, skipDuplicates: false });
    return NextResponse.json({ imported: result.count });
  } catch (e) {
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}