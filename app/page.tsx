"use client";

import { useEffect, useMemo, useState } from "react";

type Trade = {
  id: number;
  date: string;
  symbol: string;
  type: string;
  lots: number;
  entry: number;
  exit: number;
  profit: number;
  session?: string | null;
  notes?: string | null;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function Home() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState("calendar");
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Load trades from DB on mount
  useEffect(() => {
    fetch("/api/trades")
      .then(r => r.json())
      .then(data => { setTrades(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const dailyPnL = useMemo(() => {
    const map: Record<string, { profit: number; trades: Trade[] }> = {};
    trades.forEach(t => {
      if (!map[t.date]) map[t.date] = { profit: 0, trades: [] };
      map[t.date].profit += t.profit;
      map[t.date].trades.push(t);
    });
    return map;
  }, [trades]);

  const stats = useMemo(() => {
    const profits = trades.map(t => t.profit);
    const wins = profits.filter(p => p > 0);
    const losses = profits.filter(p => p < 0);
    const total = profits.reduce((a, b) => a + b, 0);
    const days = Object.values(dailyPnL);
    const winDays = days.filter(d => d.profit > 0).length;
    return {
      total: total.toFixed(2),
      winRate: trades.length ? ((wins.length / trades.length) * 100).toFixed(1) : "0",
      dayWinRate: days.length ? ((winDays / days.length) * 100).toFixed(1) : "0",
      avgWin: wins.length ? (wins.reduce((a, b) => a + b, 0) / wins.length).toFixed(2) : "0",
      avgLoss: losses.length ? (losses.reduce((a, b) => a + b, 0) / losses.length).toFixed(2) : "0",
      totalTrades: trades.length,
      bestDay: days.length ? Math.max(...days.map(d => d.profit)).toFixed(2) : "0",
      worstDay: days.length ? Math.min(...days.map(d => d.profit)).toFixed(2) : "0",
    };
  }, [trades, dailyPnL]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [year, month]);

  const handleCSV = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    const res = await fetch("/api/import", { method: "POST", body: text });
    const data = await res.json();
    if (data.imported) {
      const updated = await fetch("/api/trades").then(r => r.json());
      setTrades(updated);
      alert(`✅ Imported ${data.imported} trades!`);
    } else {
      alert("❌ Import failed: " + (data.error || "Unknown error"));
    }
  };

  const analyseWithAI = async () => {
    setAiLoading(true);
    setAiResponse("");
    setActiveTab("ai");
    const res = await fetch("/api/analyse", { method: "POST" });
    const data = await res.json();
    setAiResponse(data.analysis || data.error || "No response.");
    setAiLoading(false);
  };

  const getDayKey = (d: number | null) => {
    if (!d) return null;
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f13", color: "#e0e0e0", fontFamily: "'Inter', sans-serif", padding: "16px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#fff" }}>📈 TradeJournal</h1>
            <p style={{ margin: 0, fontSize: 12, color: "#666" }}>Your personal trading analytics</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <label style={{ background: "#1e1e2e", border: "1px solid #333", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer", color: "#aaa" }}>
              📂 Import CSV
              <input type="file" accept=".csv" style={{ display: "none" }} onChange={e => handleCSV(e.target.files?.[0])} />
            </label>
            <button onClick={analyseWithAI} style={{ background: "linear-gradient(135deg, #6c63ff, #a78bfa)", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer", color: "#fff", fontWeight: 600 }}>
              ✨ AI Analysis
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
          {[
            { label: "Total P&L", value: `$${stats.total}`, color: Number(stats.total) >= 0 ? "#4ade80" : "#f87171" },
            { label: "Win Rate", value: `${stats.winRate}%`, color: "#60a5fa" },
            { label: "Day Win Rate", value: `${stats.dayWinRate}%`, color: "#f59e0b" },
            { label: "Total Trades", value: stats.totalTrades, color: "#a78bfa" },
          ].map(s => (
            <div key={s.label} style={{ background: "#1e1e2e", borderRadius: 10, padding: "14px 16px", border: "1px solid #2a2a3e" }}>
              <div style={{ fontSize: 11, color: "#666", marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "#1e1e2e", borderRadius: 10, padding: 4, width: "fit-content" }}>
          {["calendar", "trades", "ai"].map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              background: activeTab === t ? "#6c63ff" : "transparent",
              border: "none", borderRadius: 7, padding: "7px 20px",
              color: activeTab === t ? "#fff" : "#666", cursor: "pointer",
              fontSize: 13, fontWeight: 600, textTransform: "capitalize",
            }}>{t === "ai" ? "✨ AI" : t.charAt(0).toUpperCase() + t.slice(1)}</button>
          ))}
        </div>

        {/* Calendar Tab */}
        {activeTab === "calendar" && (
          <div style={{ background: "#1e1e2e", borderRadius: 12, padding: 20, border: "1px solid #2a2a3e" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} style={{ background: "#2a2a3e", border: "none", borderRadius: 6, padding: "6px 14px", color: "#aaa", cursor: "pointer", fontSize: 16 }}>‹</button>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#fff" }}>{MONTHS[month]} {year}</h2>
              <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} style={{ background: "#2a2a3e", border: "none", borderRadius: 6, padding: "6px 14px", color: "#aaa", cursor: "pointer", fontSize: 16 }}>›</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 }}>
              {DAYS.map(d => <div key={d} style={{ textAlign: "center", fontSize: 11, color: "#555", fontWeight: 600, padding: "4px 0" }}>{d}</div>)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
              {calendarDays.map((d, i) => {
                const key = getDayKey(d);
                const data = key ? dailyPnL[key] : null;
                const isSelected = selectedDay === key;
                let bg = "#13131a", border = "#2a2a3e", color = "#555";
                if (data) {
                  if (data.profit > 0) { bg = "rgba(74,222,128,0.12)"; border = "rgba(74,222,128,0.4)"; color = "#4ade80"; }
                  else if (data.profit < 0) { bg = "rgba(248,113,113,0.12)"; border = "rgba(248,113,113,0.4)"; color = "#f87171"; }
                  else { bg = "rgba(100,100,100,0.1)"; border = "#333"; color = "#888"; }
                }
                if (isSelected) border = "#6c63ff";
                return (
                  <div key={i} onClick={() => d && setSelectedDay(isSelected ? null : key)}
                    style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "8px 4px", minHeight: 60, textAlign: "center", cursor: d ? "pointer" : "default" }}>
                    {d && <>
                      <div style={{ fontSize: 12, color: data ? "#fff" : "#444", fontWeight: 600 }}>{d}</div>
                      {data && <div style={{ fontSize: 11, color, fontWeight: 700, marginTop: 4 }}>{data.profit > 0 ? "+" : ""}${data.profit.toFixed(0)}</div>}
                      {data && <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>{data.trades.length}t</div>}
                    </>}
                  </div>
                );
              })}
            </div>
            {selectedDay && dailyPnL[selectedDay] && (
              <div style={{ marginTop: 16, background: "#13131a", borderRadius: 10, padding: 14, border: "1px solid #2a2a3e" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#aaa", marginBottom: 10 }}>Trades on {selectedDay}</div>
                {dailyPnL[selectedDay].trades.map(t => (
                  <div key={t.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #1e1e2e", fontSize: 13 }}>
                    <span style={{ color: "#fff" }}>{t.symbol}</span>
                    <span style={{ color: t.type === "BUY" ? "#60a5fa" : "#f59e0b" }}>{t.type}</span>
                    <span style={{ color: "#666" }}>{t.lots} lots</span>
                    <span style={{ color: t.profit >= 0 ? "#4ade80" : "#f87171", fontWeight: 700 }}>{t.profit >= 0 ? "+" : ""}${t.profit}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 16, marginTop: 14, fontSize: 11, color: "#555" }}>
              <span>🟢 Profitable day</span><span>🔴 Loss day</span><span>⬜ No trades</span>
            </div>
          </div>
        )}

        {/* Trades Tab */}
        {activeTab === "trades" && (
          <div style={{ background: "#1e1e2e", borderRadius: 12, border: "1px solid #2a2a3e", overflow: "hidden" }}>
            <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleCSV(e.dataTransfer.files[0]); }}
              style={{ padding: "12px 16px", background: dragOver ? "rgba(108,99,255,0.1)" : "#13131a", border: dragOver ? "2px dashed #6c63ff" : "2px dashed transparent", borderRadius: 8, margin: 12, textAlign: "center", fontSize: 12, color: "#555" }}>
              Drop MT5 CSV here to import trades
            </div>
            {loading ? <div style={{ padding: 40, textAlign: "center", color: "#555" }}>Loading trades...</div> : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#13131a" }}>
                    {["Date","Symbol","Type","Lots","Entry","Exit","P&L"].map(h => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#555", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trades.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#555" }}>No trades yet. Import a CSV to get started.</td></tr>
                  ) : [...trades].map(t => (
                    <tr key={t.id} style={{ borderTop: "1px solid #2a2a3e" }}>
                      <td style={{ padding: "10px 14px", color: "#888" }}>{t.date}</td>
                      <td style={{ padding: "10px 14px", color: "#fff", fontWeight: 600 }}>{t.symbol}</td>
                      <td style={{ padding: "10px 14px", color: t.type === "BUY" ? "#60a5fa" : "#f59e0b" }}>{t.type}</td>
                      <td style={{ padding: "10px 14px", color: "#888" }}>{t.lots}</td>
                      <td style={{ padding: "10px 14px", color: "#888" }}>{t.entry}</td>
                      <td style={{ padding: "10px 14px", color: "#888" }}>{t.exit}</td>
                      <td style={{ padding: "10px 14px", color: t.profit >= 0 ? "#4ade80" : "#f87171", fontWeight: 700 }}>{t.profit >= 0 ? "+" : ""}${t.profit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* AI Tab */}
        {activeTab === "ai" && (
          <div style={{ background: "#1e1e2e", borderRadius: 12, padding: 20, border: "1px solid #2a2a3e", minHeight: 300 }}>
            {aiLoading && <div style={{ textAlign: "center", padding: 60 }}><div style={{ fontSize: 32, marginBottom: 12 }}>✨</div><div style={{ color: "#6c63ff", fontSize: 14 }}>Analysing your trades...</div></div>}
            {!aiLoading && !aiResponse && (
              <div style={{ textAlign: "center", padding: 60 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🤖</div>
                <div style={{ color: "#555", fontSize: 14, marginBottom: 16 }}>Click "AI Analysis" to get personalized trading insights</div>
                <button onClick={analyseWithAI} style={{ background: "linear-gradient(135deg, #6c63ff, #a78bfa)", border: "none", borderRadius: 8, padding: "10px 24px", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>✨ Analyse My Trades</button>
              </div>
            )}
            {aiResponse && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#6c63ff", marginBottom: 14 }}>✨ AI Trading Coach Analysis</div>
                <div style={{ fontSize: 14, lineHeight: 1.7, color: "#ccc", whiteSpace: "pre-wrap" }}>{aiResponse}</div>
                <button onClick={analyseWithAI} style={{ marginTop: 16, background: "#2a2a3e", border: "1px solid #333", borderRadius: 8, padding: "8px 16px", color: "#aaa", cursor: "pointer", fontSize: 13 }}>🔄 Re-analyse</button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}