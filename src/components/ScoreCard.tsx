"use client";

import { useRef } from "react";
import { GameSession } from "@/lib/types";
import { getFestivalTheme } from "@/lib/festival";
import { rankPlayers, formatDelta } from "@/lib/buildReport";

interface ScoreCardProps {
  session: GameSession;
  onDownload?: () => void;
}

export default function ScoreCard({ session, onDownload }: ScoreCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const theme = getFestivalTheme(session.date);
  const ranked = rankPlayers(session.players);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `川麻战绩_${session.date}_${session.title || "战绩"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      onDownload?.();
    } catch (err) {
      console.error("下载失败:", err);
    }
  };

  const getMedalEmoji = (index: number) => {
    const medals = ["🥇", "🥈", "🥉", ""];
    return medals[index] || "";
  };

  const winner = ranked[0];
  const loser = ranked[ranked.length - 1];

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Card */}
      <div
        ref={cardRef}
        className={`relative w-full max-w-sm rounded-2xl overflow-hidden bg-gradient-to-b ${theme.gradient} p-[2px]`}
      >
        <div className="rounded-2xl bg-slate-950/90 backdrop-blur-sm overflow-hidden">
          {/* Header */}
          <div className={`bg-gradient-to-r ${theme.gradient} px-5 pt-5 pb-4`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-xs font-medium tracking-widest uppercase">
                  川麻战绩
                </p>
                <h2 className="text-white text-xl font-bold mt-0.5">
                  {theme.emoji} {session.title || "今日战绩"}
                </h2>
              </div>
              <div className="text-right">
                <p className="text-white/60 text-xs">{session.date}</p>
                <p className="text-white/80 text-sm font-medium mt-0.5">
                  {session.rate}元/分
                </p>
              </div>
            </div>
          </div>

          {/* Players */}
          <div className="px-4 py-3 space-y-2">
            {ranked.map((player, index) => {
              const isWinner = index === 0;
              const isLoser = index === ranked.length - 1;
              return (
                <div
                  key={player.name}
                  className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${
                    isWinner
                      ? "bg-yellow-500/15 border border-yellow-500/30"
                      : isLoser
                      ? "bg-red-500/10 border border-red-500/20"
                      : "bg-white/5 border border-white/10"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg w-6 text-center">
                      {getMedalEmoji(index)}
                    </span>
                    <div>
                      <p className={`font-semibold text-sm ${
                        isWinner ? "text-yellow-300" : "text-white"
                      }`}>
                        {player.name}
                      </p>
                      <p className="text-white/40 text-xs">
                        {player.score > 0 ? `+${player.score}` : player.score} 分
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-lg ${
                      player.delta > 0
                        ? "text-green-400"
                        : player.delta < 0
                        ? "text-red-400"
                        : "text-white/60"
                    }`}>
                      {formatDelta(player.delta)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="px-4 pb-4">
            <div className={`rounded-xl px-4 py-3 ${theme.cardBg} border border-white/10`}>
              <div className="flex justify-between text-xs">
                <span className="text-white/50">🏆 大赢家</span>
                <span className={`font-semibold ${theme.textColor}`}>
                  {winner.name} {formatDelta(winner.delta)}
                </span>
              </div>
              <div className="flex justify-between text-xs mt-1.5">
                <span className="text-white/50">💸 大输家</span>
                <span className="font-semibold text-red-400">
                  {loser.name} {formatDelta(loser.delta)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 pb-4 text-center">
            <p className="text-white/20 text-xs">
              川麻战绩统计 · Powered by AI 🀄
            </p>
          </div>
        </div>
      </div>

      {/* Download Button */}
      <button
        onClick={handleDownload}
        className="w-full max-w-sm px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-sm transition-all active:scale-95 shadow-lg shadow-blue-900/30"
      >
        📥 下载战绩卡片
      </button>
    </div>
  );
}
