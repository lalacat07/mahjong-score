"use client";

import { useState, useRef, useCallback } from "react";
import { GameSession, Warning, PlayerScore } from "@/lib/types";
import { getFestivalTheme } from "@/lib/festival";
import ScoreCard from "@/components/ScoreCard";

const RATE = 10;

// ── helpers ──────────────────────────────────────────────────────────────

function applyDuplicateRemoval(session: GameSession, removedIdx: Set<number>): GameSession {
  if (!session.games) return session;
  const filtered = session.games
    .filter((_, i) => !removedIdx.has(i))
    .map((g, i) => ({ ...g, index: i + 1 }));
  return recalc(session, filtered);
}

function applyNameMerges(session: GameSession, merges: Map<string, string>): GameSession {
  if (merges.size === 0) return session;
  const renamed = session.games?.map((g) => ({
    ...g,
    players: g.players.map((p) => ({ ...p, name: merges.get(p.name) ?? p.name })),
  }));
  return recalc(session, renamed ?? []);
}

function recalc(session: GameSession, games: GameSession["games"]): GameSession {
  const totals = new Map<string, PlayerScore & { gameCount: number }>();
  (games ?? []).forEach((game) => {
    game.players.forEach((p) => {
      const e = totals.get(p.name);
      if (e) { e.score += p.score; e.delta += p.delta; e.gameCount++; }
      else totals.set(p.name, { name: p.name, score: p.score, delta: p.delta, gameCount: 1 });
    });
  });
  const players: PlayerScore[] = Array.from(totals.values());
  return { ...session, games: games && games.length > 0 ? games : undefined, players, playerCount: players.length };
}

/** Pick the best canonical name from a cluster: prefer non-truncated, then longest */
function bestNameInCluster(names: string[]): string {
  const truncated = (s: string) => /[.…]+$/.test(s);
  const nonTruncated = names.filter((n) => !truncated(n));
  const pool = nonTruncated.length > 0 ? nonTruncated : names;
  return pool.reduce((best, n) => (n.length >= best.length ? n : best), pool[0]);
}

// ── ConfirmStep ───────────────────────────────────────────────────────────

interface ConfirmStepProps {
  session: GameSession;
  onConfirm: (removedIdx: Set<number>, nameMerges: Map<string, string>) => void;
  onBack: () => void;
}

function ConfirmStep({ session, onConfirm, onBack }: ConfirmStepProps) {
  const theme = getFestivalTheme();

  const warnings = session.warnings ?? [];
  const dupGameWarnings  = warnings.filter((w) => w.type === "duplicate");
  const autoMergedNames  = warnings.filter((w) => w.type === "duplicateName" && !w.nameCluster);
  const fuzzyNameWarnings = warnings.filter((w) => w.type === "duplicateName" && w.nameCluster);
  const noNameWarnings   = warnings.filter((w) => w.type === "noName");

  // Duplicate game choices: key = "i-j", value = true → remove j
  const [dupChoices, setDupChoices] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    dupGameWarnings.forEach((w) => {
      if (w.indices) init[`${w.indices[0]}-${w.indices[1]}`] = true;
    });
    return init;
  });

  // Fuzzy name choices: key = sorted cluster members joined by "|||", value = chosen name or "none"
  const [nameChoices, setNameChoices] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    fuzzyNameWarnings.forEach((w) => {
      if (w.nameCluster) {
        const key = [...w.nameCluster].sort().join("|||");
        init[key] = bestNameInCluster(w.nameCluster);
      }
    });
    return init;
  });

  const handleConfirm = () => {
    // Game duplicates: which to remove
    const toRemove = new Set<number>();
    dupGameWarnings.forEach((w) => {
      if (w.indices && dupChoices[`${w.indices[0]}-${w.indices[1]}`]) {
        toRemove.add(w.indices[1]);
      }
    });

    // Fuzzy name merges
    const merges = new Map<string, string>();
    fuzzyNameWarnings.forEach((w) => {
      if (!w.nameCluster) return;
      const key = [...w.nameCluster].sort().join("|||");
      const chosen = nameChoices[key];
      if (!chosen || chosen === "none") return;
      w.nameCluster.forEach((name) => {
        if (name !== chosen) merges.set(name, chosen);
      });
    });

    onConfirm(toRemove, merges);
  };

  const totalIssues = dupGameWarnings.length + fuzzyNameWarnings.length + noNameWarnings.length + autoMergedNames.length;

  return (
    <div className="space-y-4">
      <div className="bg-white/80 backdrop-blur rounded-2xl border border-white shadow-sm p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🔍</span>
          <h2 className="font-bold text-gray-800 text-sm">AI 识别完成，请确认后生成</h2>
        </div>
        <p className="text-xs text-gray-400 ml-7">
          共识别 {session.games?.length || 1} 场 · {session.playerCount} 人 · {totalIssues} 项需确认
        </p>
      </div>

      {/* Duplicate games */}
      {dupGameWarnings.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span>🔁</span>
            <span className="font-semibold text-orange-700 text-sm">疑似重复战绩</span>
          </div>
          {dupGameWarnings.map((w, i) => {
            if (!w.indices) return null;
            const key = `${w.indices[0]}-${w.indices[1]}`;
            const [a, b] = [w.indices[0] + 1, w.indices[1] + 1];
            return (
              <div key={i} className="bg-white rounded-xl border border-orange-100 p-3 space-y-2">
                <p className="text-xs text-orange-700">第 <b>{a}</b> 张 与 第 <b>{b}</b> 张截图战绩完全相同</p>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name={`dup-${key}`} checked={dupChoices[key] === true}
                      onChange={() => setDupChoices((p) => ({ ...p, [key]: true }))} className="accent-orange-500" />
                    <span className="text-xs text-gray-700">保留第 {a} 张，删除第 {b} 张
                      <span className="ml-1 text-[10px] text-orange-400 font-medium">推荐</span>
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name={`dup-${key}`} checked={dupChoices[key] === false}
                      onChange={() => setDupChoices((p) => ({ ...p, [key]: false }))} className="accent-orange-500" />
                    <span className="text-xs text-gray-700">两张都保留</span>
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fuzzy name duplicates — user decides */}
      {fuzzyNameWarnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span>👥</span>
            <span className="font-semibold text-yellow-700 text-sm">潜在重名玩家</span>
          </div>
          <p className="text-xs text-yellow-600 pl-1">以下玩家名字相似，可能因截图显示不完整导致识别差异</p>
          {(() => {
            const seen = new Set<string>();
            return fuzzyNameWarnings.filter((w) => {
              if (!w.nameCluster) return false;
              const k = [...w.nameCluster].sort().join("|||");
              if (seen.has(k)) return false;
              seen.add(k);
              return true;
            }).map((w, i) => {
              const key = [...w.nameCluster!].sort().join("|||");
              return (
                <div key={i} className="bg-white rounded-xl border border-yellow-100 p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {w.nameCluster!.map((name, ni) => (
                      <span key={ni} className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-lg text-sm font-semibold">{name}</span>
                    ))}
                  </div>
                  <div className="space-y-1.5 pt-1">
                    {w.nameCluster!.map((name) => (
                      <label key={name} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name={`name-${key}`} checked={nameChoices[key] === name}
                          onChange={() => setNameChoices((p) => ({ ...p, [key]: name }))} className="accent-yellow-500" />
                        <span className="text-xs text-gray-700">合并，统一用 <b>{name}</b></span>
                      </label>
                    ))}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name={`name-${key}`} checked={nameChoices[key] === "none"}
                        onChange={() => setNameChoices((p) => ({ ...p, [key]: "none" }))} className="accent-yellow-500" />
                      <span className="text-xs text-gray-700">不合并，当作不同的人</span>
                    </label>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* Auto-merged exact names */}
      {autoMergedNames.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span className="font-semibold text-gray-600 text-sm">已自动合并（完全相同的名字）</span>
          </div>
          {autoMergedNames.map((w, i) => (
            <p key={i} className="text-xs text-gray-500 pl-7">{w.message}</p>
          ))}
        </div>
      )}

      {/* No-name players */}
      {noNameWarnings.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span>👤</span>
            <span className="font-semibold text-blue-700 text-sm">无名玩家已根据头像特征命名</span>
          </div>
          {noNameWarnings.map((w, i) => (
            <p key={i} className="text-xs text-blue-600 pl-7">{w.message}</p>
          ))}
          <p className="text-[11px] text-blue-400 pl-7">请核对，如有误可在下方确认后手动修改</p>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3">
        <button onClick={onBack}
          className="flex-1 py-3 rounded-xl border border-gray-200 bg-white text-gray-600 font-semibold text-sm transition-all active:scale-95 hover:bg-gray-50">
          ← 返回修改
        </button>
        <button onClick={handleConfirm}
          className="flex-[2] py-3 rounded-xl text-white font-bold text-sm transition-all active:scale-95"
          style={{ background: theme.cssGradient }}>
          确认生成战绩卡 →
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

type Step = "input" | "confirming" | "done";

export default function Home() {
  const theme = getFestivalTheme();

  const [step, setStep] = useState<Step>("input");
  const [scoreFiles, setScoreFiles] = useState<File[]>([]);
  const [albumFile, setAlbumFile] = useState<File | null>(null);
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [pendingSession, setPendingSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragOverScore, setDragOverScore] = useState(false);
  const [dragOverAlbum, setDragOverAlbum] = useState(false);

  const scoreInputRef = useRef<HTMLInputElement>(null);
  const albumInputRef = useRef<HTMLInputElement>(null);

  const handleScoreFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    setScoreFiles((prev) => [...prev, ...Array.from(files).filter((f) => f.type.startsWith("image/"))]);
  }, []);

  const handleAlbumFile = useCallback((files: FileList | null) => {
    if (files?.length) setAlbumFile(files[0]);
  }, []);

  const removeScoreFile = (i: number) => setScoreFiles((prev) => prev.filter((_, j) => j !== i));

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const scale = Math.min(700 / img.width, 700 / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.65);
        resolve(dataUrl.split(",")[1]);
      };
      img.onerror = reject;
      img.src = url;
    });

  const handleGenerate = async () => {
    if (!scoreFiles.length) { setError("请先上传战绩截图"); return; }
    setLoading(true);
    setError("");
    try {
      const scoreBase64s = await Promise.all(scoreFiles.map(toBase64));
      const albumBase64 = albumFile ? await toBase64(albumFile) : null;

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scoreImages: scoreBase64s, albumImage: albumBase64, rate: RATE }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error || "识别失败，请重试"); return; }

      const session = data.sessions[0] as GameSession;
      const needsConfirm = session.warnings?.some(
        (w: Warning) => w.type === "duplicate" || w.type === "duplicateName" || w.type === "noName"
      );

      if (needsConfirm) {
        setPendingSession(session);
        setStep("confirming");
      } else {
        setSessions([session]);
        setStep("done");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = (removedIdx: Set<number>, nameMerges: Map<string, string>) => {
    if (!pendingSession) return;
    let s = pendingSession;
    if (removedIdx.size > 0) s = applyDuplicateRemoval(s, removedIdx);
    if (nameMerges.size > 0) s = applyNameMerges(s, nameMerges);
    setSessions([s]);
    setStep("done");
  };

  const handleBack = () => { setPendingSession(null); setStep("input"); };
  const handleReset = () => { setSessions([]); setPendingSession(null); setStep("input"); };

  return (
    <main className="min-h-screen" style={{ background: theme.pageBg }}>
      <header style={{ background: theme.cssGradient }}>
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center gap-3">
          <span className="text-2xl">🀄</span>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">川麻战绩统计</h1>
            <p className="text-xs text-white/70">上传截图，AI 自动生成战绩卡</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {theme.name !== "默认" && (
              <span className="text-xs bg-white/20 text-white px-2.5 py-0.5 rounded-full font-medium">
                {theme.emoji} {theme.name}
              </span>
            )}
            <span className="text-xs bg-white/15 text-white/80 px-2.5 py-0.5 rounded-full">¥10/分</span>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-5 py-6 space-y-4">

        {step === "input" && (
          <>
            {/* Score screenshots */}
            <div className="bg-white/80 backdrop-blur rounded-2xl border border-white shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-800">战绩截图</h2>
                  <p className="text-xs text-gray-400 mt-0.5">每局游戏结算界面截图，可多张</p>
                </div>
                <span className="text-xs font-medium text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">必须</span>
              </div>
              <div onDrop={(e) => { e.preventDefault(); setDragOverScore(false); handleScoreFiles(e.dataTransfer.files); }}
                onDragOver={(e) => { e.preventDefault(); setDragOverScore(true); }}
                onDragLeave={() => setDragOverScore(false)}
                onClick={() => scoreInputRef.current?.click()}
                className={`rounded-xl border-2 border-dashed transition-all cursor-pointer p-6 text-center ${
                  dragOverScore ? "border-orange-400 bg-orange-50" : "border-gray-200 hover:border-orange-300 hover:bg-orange-50/50"}`}>
                <p className="text-2xl mb-1">📸</p>
                <p className="text-sm text-gray-500">拖拽图片到这里，或点击选择</p>
                <p className="text-xs text-gray-400 mt-1">支持多选</p>
                <input ref={scoreInputRef} type="file" accept="image/*" multiple className="hidden"
                  onChange={(e) => handleScoreFiles(e.target.files)} />
              </div>
              {scoreFiles.length > 0 && (
                <div className="space-y-1.5">
                  {scoreFiles.map((file, i) => (
                    <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-xs text-gray-400 font-mono w-5 text-center">{i + 1}</span>
                      <span className="text-sm text-gray-700 flex-1 truncate">{file.name}</span>
                      <button onClick={() => removeScoreFile(i)} className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Album screenshot */}
            <div className="bg-white/80 backdrop-blur rounded-2xl border border-white shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-800">相册截图</h2>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">在手机相册找到这批战绩截图的缩略图页，截图上传，AI 可根据拍摄时间判断每场先后顺序</p>
                </div>
                <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0 ml-2">可选</span>
              </div>
              <div onDrop={(e) => { e.preventDefault(); setDragOverAlbum(false); handleAlbumFile(e.dataTransfer.files); }}
                onDragOver={(e) => { e.preventDefault(); setDragOverAlbum(true); }}
                onDragLeave={() => setDragOverAlbum(false)}
                onClick={() => albumInputRef.current?.click()}
                className={`rounded-xl border-2 border-dashed transition-all cursor-pointer p-5 text-center ${
                  albumFile ? "border-green-300 bg-green-50" : dragOverAlbum ? "border-gray-300 bg-gray-50" : "border-gray-200 hover:border-gray-300"}`}>
                {albumFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-green-500 text-sm">✓</span>
                    <span className="text-sm text-gray-700 truncate max-w-xs">{albumFile.name}</span>
                    <button onClick={(e) => { e.stopPropagation(); setAlbumFile(null); }} className="text-gray-300 hover:text-red-400 text-lg leading-none ml-1">×</button>
                  </div>
                ) : (<><p className="text-xl mb-1">🖼️</p><p className="text-sm text-gray-400">点击上传相册截图</p></>)}
                <input ref={albumInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleAlbumFile(e.target.files)} />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-500 flex items-start gap-2">
                <span>⚠️</span><span>{error}</span>
              </div>
            )}

            <button onClick={handleGenerate} disabled={loading || !scoreFiles.length}
              className="w-full py-4 rounded-2xl text-white font-bold text-base transition-all active:scale-[0.98] shadow-md disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
              style={loading || !scoreFiles.length ? {} : { background: theme.cssGradient }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  AI 识别中...
                </span>
              ) : "生成战绩卡 →"}
            </button>
          </>
        )}

        {step === "confirming" && pendingSession && (
          <ConfirmStep session={pendingSession} onConfirm={handleConfirm} onBack={handleBack} />
        )}

        {step === "done" && sessions.length > 0 && (
          <div className="space-y-6 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">战绩卡片</h2>
              <button onClick={handleReset} className="text-xs text-gray-400 hover:text-red-400 transition-colors">清空</button>
            </div>
            {sessions.map((s) => <ScoreCard key={s.id} session={s} />)}
          </div>
        )}

        <p className="text-center text-xs text-gray-400 pb-6">川麻战绩统计 · 战绩仅供娱乐 🀄</p>
      </div>
    </main>
  );
}
