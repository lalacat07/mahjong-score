"use client";

import { useRef, useState } from "react";
import { GameSession } from "@/lib/types";
import { getFestivalTheme } from "@/lib/festival";
import { rankPlayers } from "@/lib/buildReport";

interface ScoreCardProps {
  session: GameSession;
}

function Crown() {
  return (
    <svg width="18" height="13" viewBox="0 0 20 14" fill="none">
      <path d="M1 13L3.5 5L7.5 9L10 1L12.5 9L16.5 5L19 13H1Z" fill="#D69E16" stroke="#B8840A" strokeWidth="0.5" />
      <circle cx="10" cy="1" r="1.2" fill="#FFD700" />
      <circle cx="1.5" cy="5" r="1" fill="#FFD700" />
      <circle cx="18.5" cy="5" r="1" fill="#FFD700" />
    </svg>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const styles: Record<number, string> = {
    1: "bg-gradient-to-b from-yellow-400 to-yellow-600 text-white",
    2: "bg-gradient-to-b from-gray-300 to-gray-400 text-white",
    3: "bg-gradient-to-b from-amber-500 to-amber-700 text-white",
  };
  const cls = styles[rank] || "bg-gray-200 text-gray-500";
  return (
    <div className={`w-6 h-6 rounded-full ${cls} flex items-center justify-center text-xs font-bold flex-shrink-0`}>
      {rank}
    </div>
  );
}

function formatScore(score: number) {
  return score > 0 ? `+${score}` : `${score}`;
}
function formatMoney(delta: number) {
  if (delta > 0) return `¥+${Math.abs(delta).toFixed(0)}`;
  if (delta < 0) return `¥-${Math.abs(delta).toFixed(0)}`;
  return "¥0";
}

/** Compute table layout params based on number of games */
function getTableLayout(numGames: number) {
  if (numGames <= 5)  return { gameColW: 46, nameColW: 64, nameMaxChars: 6, cellPx: 6,  scoreFontPx: 11, headFontPx: 9  };
  if (numGames <= 7)  return { gameColW: 40, nameColW: 58, nameMaxChars: 5, cellPx: 5,  scoreFontPx: 10, headFontPx: 8  };
  if (numGames <= 9)  return { gameColW: 34, nameColW: 52, nameMaxChars: 4, cellPx: 4,  scoreFontPx: 10, headFontPx: 8  };
  if (numGames <= 12) return { gameColW: 29, nameColW: 46, nameMaxChars: 4, cellPx: 3,  scoreFontPx: 9,  headFontPx: 7  };
  return                     { gameColW: 25, nameColW: 40, nameMaxChars: 3, cellPx: 2,  scoreFontPx: 8,  headFontPx: 7  };
}

function truncate(str: string, max: number) {
  return str.length > max ? str.slice(0, max) + "…" : str;
}

export default function ScoreCard({ session }: ScoreCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const theme = getFestivalTheme(session.date);
  const ranked = rankPlayers(session.players);
  const numGames = session.games?.length || 0;
  const gameCount = numGames || 1;
  const playerCount = session.playerCount || ranked.length;

  // Card width: fit the table content, minimum 360px
  const tbl = getTableLayout(numGames);
  const tableContentW = numGames > 0 ? tbl.nameColW + numGames * tbl.gameColW : 0;
  const cardWidth = numGames > 0 ? Math.max(360, tableContentW + 32) : 360;

  const handleDownload = async () => {
    if (!cardRef.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const el = cardRef.current;

      // Force the card to its full calculated width during capture so the
      // table layout isn't constrained by maxWidth: "100%" on narrow screens.
      const originalWidth = el.style.width;
      const originalMaxWidth = el.style.maxWidth;
      el.style.width = cardWidth + "px";
      el.style.maxWidth = "none";

      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        allowTaint: false,
        logging: false,
        windowWidth: cardWidth,
        windowHeight: el.scrollHeight,
      });

      el.style.width = originalWidth;
      el.style.maxWidth = originalMaxWidth;

      const dataUrl = canvas.toDataURL("image/png");
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

      if (isIOS) {
        // Try Web Share API with file (iOS 15+)
        try {
          if (navigator.canShare && navigator.share) {
            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], `川麻战绩_${session.date}.png`, { type: "image/png" });
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({ files: [file], title: "川麻战绩" });
              return;
            }
          }
        } catch {
          // share was cancelled or not supported — fall through to modal
        }
        // Fallback: show modal for long-press save
        setPreviewUrl(dataUrl);
      } else {
        // Android / desktop: direct download
        const link = document.createElement("a");
        link.download = `川麻战绩_${session.date}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (err) {
      console.error("下载失败:", err);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {/* Card — width auto-sizes to fit table */}
      <div
        ref={cardRef}
        className="bg-white rounded-2xl overflow-hidden shadow-lg"
        style={{ width: cardWidth, maxWidth: "100%" }}
      >
        {/* ── Header ── */}
        <div className="relative px-5 pt-5 pb-4 text-center" style={{ background: theme.cssGradient }}>
          {theme.name !== "默认" && (
            <span className="absolute top-3 left-3 text-[11px] font-semibold bg-white/25 text-white px-2.5 py-0.5 rounded-full">
              {theme.emoji} {theme.name}
            </span>
          )}
          <h2 className="text-2xl font-black text-white tracking-[0.3em] mt-2">川 麻 战 绩</h2>
          <p className="text-white/80 text-xs mt-1.5 tracking-wide">
            {session.date} · 共 {gameCount} 场 · {playerCount} 人参与
          </p>
        </div>

        {/* ── Rankings ── */}
        <div className="px-4 pt-3 pb-1">
          <p className="text-xs font-semibold text-gray-400 mb-2 tracking-wider">总积分排行</p>
          <div className="space-y-1.5">
            {ranked.map((player, index) => {
              const rank = index + 1;
              const isMVP = rank === 1;
              const isWinner = player.score > 0;
              const showDivider = isWinner && ranked[index + 1] && ranked[index + 1].score <= 0;
              return (
                <div key={player.name}>
                  <div
                    className="relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl overflow-hidden"
                    style={
                      isMVP
                        ? { background: "linear-gradient(135deg,#FFF8E1 0%,#FFF3CC 100%)", border: "1px solid #D69E16" }
                        : isWinner
                        ? { background: "#f0fdf4", border: "1px solid #bbf7d0" }
                        : { background: "#fff5f5", border: "1px solid #fecaca" }
                    }
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                      style={{ background: isMVP ? "#D69E16" : isWinner ? "#22c55e" : "#ef4444" }} />
                    <div className="flex flex-col items-center w-7 flex-shrink-0 ml-0.5">
                      {isMVP && <Crown />}
                      <RankBadge rank={rank} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm truncate"
                          style={{ color: isMVP ? "#92400e" : isWinner ? "#15803d" : "#b91c1c" }}>
                          {player.name}
                        </span>
                        {isMVP && (
                          <span className="text-[9px] font-bold bg-yellow-500 text-white px-1.5 py-0.5 rounded-full flex-shrink-0">MVP</span>
                        )}
                      </div>
                      <p className="text-[11px] mt-0.5" style={{ color: isMVP ? "#b45309" : isWinner ? "#16a34a" : "#dc2626" }}>
                        {player.gameCount ? `${player.gameCount}场` : ""}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xl font-black leading-tight"
                        style={{ color: isMVP ? "#a16207" : isWinner ? "#16a34a" : "#ef4444" }}>
                        {formatScore(player.score)}
                      </p>
                      <p className="text-[11px] font-semibold"
                        style={{ color: isMVP ? "#b45309" : isWinner ? "#22c55e" : "#f87171" }}>
                        {formatMoney(player.delta)}
                      </p>
                    </div>
                  </div>
                  {showDivider && (
                    <div className="flex items-center gap-2 my-2">
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">以上赢 · 以下输</span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Per-game matrix ── */}
        {session.games && session.games.length > 1 && (
          <div className="mx-4 mt-3 mb-1 rounded-xl border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500">逐场明细</p>
            </div>

            {/* No overflow-x scroll — table is sized to fit card */}
            <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse" }}>
              <colgroup>
                <col style={{ width: tbl.nameColW }} />
                {session.games.map((_, i) => (
                  <col key={i} style={{ width: tbl.gameColW }} />
                ))}
              </colgroup>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  <th style={{
                    textAlign: "left",
                    padding: `${tbl.cellPx}px 6px`,
                    fontSize: tbl.headFontPx,
                    color: "#9ca3af",
                    fontWeight: 500,
                  }}>玩家</th>
                  {session.games.map((g, i) => (
                    <th key={i} style={{
                      textAlign: "center",
                      padding: `${tbl.cellPx}px 2px`,
                      fontSize: tbl.headFontPx,
                      color: "#9ca3af",
                      fontWeight: 500,
                      lineHeight: 1.3,
                    }}>
                      <div>场{i + 1}</div>
                      <div style={{ fontSize: tbl.headFontPx - 1, color: "#d1d5db" }}>{g.time || "—"}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ranked.map((player, ri) => (
                  <tr key={player.name} style={{ borderTop: "1px solid #f3f4f6", background: ri % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: `${tbl.cellPx}px 6px`, fontWeight: 500, color: "#374151", whiteSpace: "nowrap" }}>
                      <span style={{
                        display: "inline-block", width: 6, height: 6, borderRadius: "50%", marginRight: 4, flexShrink: 0,
                        background: player.score > 0 ? "#4ade80" : player.score < 0 ? "#f87171" : "#d1d5db",
                        verticalAlign: "middle",
                      }} />
                      <span style={{ fontSize: tbl.scoreFontPx, verticalAlign: "middle" }}>
                        {truncate(player.name, tbl.nameMaxChars)}
                      </span>
                    </td>
                    {session.games!.map((game, gi) => {
                      const gp = game.players.find((p) => p.name === player.name);
                      if (!gp) return (
                        <td key={gi} style={{ textAlign: "center", color: "#e5e7eb", fontSize: tbl.scoreFontPx, padding: `${tbl.cellPx}px 2px` }}>·</td>
                      );
                      const color = gp.score > 0 ? "#16a34a" : gp.score < 0 ? "#ef4444" : "#6b7280";
                      const bg = gp.score > 0 ? "#f0fdf4" : gp.score < 0 ? "#fff5f5" : "#f9fafb";
                      return (
                        <td key={gi} style={{
                          textAlign: "center",
                          fontSize: tbl.scoreFontPx,
                          fontWeight: 600,
                          color,
                          background: bg,
                          padding: `${tbl.cellPx}px 2px`,
                        }}>
                          {formatScore(gp.score)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="px-4 py-3 text-center">
          <p style={{ fontSize: 10, color: "#d1d5db" }}>战绩仅供娱乐 · ¥10/分</p>
        </div>
      </div>

      {/* Download button — same width as card */}
      <button
        onClick={handleDownload}
        className="py-3 rounded-xl text-white font-semibold text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
        style={{ width: cardWidth, maxWidth: "100%", background: theme.cssGradient }}
      >
        <span>📥</span> 下载战绩卡片
      </button>

      {/* iOS long-press save modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 px-4"
          onClick={() => setPreviewUrl(null)}
        >
          <div
            className="bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col items-center p-4 gap-3 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold text-gray-700">长按图片保存到相册 📸</p>
            <img src={previewUrl} alt="战绩卡片" style={{ maxWidth: "100%", borderRadius: 12 }} />
            <button
              onClick={() => setPreviewUrl(null)}
              className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
