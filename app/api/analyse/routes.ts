import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const trades = await prisma.trade.findMany({ orderBy: { date: "asc" } });

    if (!trades.length)
      return NextResponse.json({ error: "No trades to analyse" }, { status: 400 });

    // Build stats
    const profits = trades.map(t => t.profit);
    const wins    = profits.filter(p => p > 0);
    const losses  = profits.filter(p => p < 0);
    const total   = profits.reduce((a, b) => a + b, 0);

    // Daily P&L
    const daily: Record<string, number> = {};
    trades.forEach(t => { daily[t.date] = (daily[t.date] || 0) + t.profit; });
    const dayValues = Object.values(daily);
    const winDays   = dayValues.filter(v => v > 0).length;

    // Per-symbol stats
    const bySymbol: Record<string, { profit: number; count: number }> = {};
    trades.forEach(t => {
      if (!bySymbol[t.symbol]) bySymbol[t.symbol] = { profit: 0, count: 0 };
      bySymbol[t.symbol].profit += t.profit;
      bySymbol[t.symbol].count++;
    });

    const summary = `
TRADER PERFORMANCE REPORT
==========================
Total P&L:        $${total.toFixed(2)}
Total Trades:     ${trades.length}
Win Rate:         ${((wins.length / trades.length) * 100).toFixed(1)}%
Day Win Rate:     ${((winDays / dayValues.length) * 100).toFixed(1)}%
Avg Win:          $${wins.length ? (wins.reduce((a,b)=>a+b,0)/wins.length).toFixed(2) : 0}
Avg Loss:         $${losses.length ? (losses.reduce((a,b)=>a+b,0)/losses.length).toFixed(2) : 0}
Best Day:         $${Math.max(...dayValues).toFixed(2)}
Worst Day:        $${Math.min(...dayValues).toFixed(2)}

BY SYMBOL:
${Object.entries(bySymbol).map(([s,v]) => `  ${s}: $${v.profit.toFixed(2)} over ${v.count} trades`).join("\n")}

LAST 15 TRADES:
${trades.slice(-15).map(t => `  ${t.date} | ${t.symbol} | ${t.type} | ${t.lots} lots | P&L: $${t.profit}`).join("\n")}

DAILY P&L:
${Object.entries(daily).sort().map(([d,p]) => `  ${d}: $${p.toFixed(2)}`).join("\n")}
`.trim();

    // Call Gemini
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are an expert trading coach. Analyse this trader's data and provide:
1. Key strengths
2. Key weaknesses
3. Patterns you notice (time, symbol, trade type)
4. 3-5 specific, actionable steps to improve

Be direct and reference actual numbers from the data. No generic advice.

${summary}`
            }]
          }]
        }),
      }
    );

    const geminiData = await geminiRes.json();
    const analysis = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response from Gemini.";

    return NextResponse.json({ analysis });
  } catch (e) {
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}