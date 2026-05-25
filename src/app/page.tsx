"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { GameSession, PlayerScore } from "@/lib/types";
import ScoreCard from "@/components/ScoreCard";

const DEFAULT_RATE = 10;

export default function Home() {
  const [apiKey, setApiKey] = useState("");
  const [title, setTitle] = useState("今日战绩");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [rate, setRate] = useState(DEFAULT_RATE);
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load API key from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("deepseek_api_key");
    if (saved) setApiKey(saved);
  }, []);

  const saveApiKey = (key: string) => {
    setApiKey(key);
    if (key) localStorage.setItem("deepseek_api_key", key);
    else localStorage.removeItem("deepseek_api_key");
  };

  const processImage = useCallback(
    async (file: File) => {
      if (!apiKey) {
        setError("请先填写 DeepSeek API Key");
        return;
      }

      setLoading(true);
      setError("");

      try {
        // Convert to base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]); // remove data:image/...;base64, prefix
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64, apiKey, rate }),
        });

        const data = await res.json();

        if (!data.success) {
          setError(data.error || "识别失败");
          return;
        }

        const newSession: GameSession = {
          id: crypto.randomUUID(),
          date,
          title,
          rate,
          players: data.players as PlayerScore[],
        };

        setSessions((prev) => [...prev, newSession]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "网络错误");
      } finally {
        setLoading(false);
      }
    },
    [apiKey, date, title, rate]
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      Array.from(files).forEach((file) => {
        if (file.type.startsWith("image/")) {
          processImage(file);
        }
      });
    },
    [processImage]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const removeSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <main className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">🀄 川麻战绩</h1>
            <p className="text-xs text-white/40">AI 识别 · 一键生成卡片</p>
          </div>
          <button
            onClick={() => setShowApiKey((v) => !v)}
            className="text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            ⚙️ API Key
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* API Key Panel */}
        {showApiKey && (
          <div className="bg-slate-900 rounded-2xl p-4 border border-white/10">
            <label className="block text-sm text-white/60 mb-2">
              DeepSeek API Key{" "}
              <a
                href="https://platform.deepseek.com/api_keys"
                target="_blank"
                rel="noreferrer"
                className="text-sky-400 hover:text-sky-300"
              >
                获取 →
              </a>
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => saveApiKey(e.target.value)}
              placeholder="sk-xxxxxxxxxxxxxxxx"
              className="w-full bg-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 border border-white/10 focus:border-sky-500 focus:outline-none"
            />
            <p className="text-xs text-white/30 mt-2">
              Key 仅保存在本地浏览器，不上传服务器
            </p>
          </div>
        )}

        {/* Settings */}
        <div className="bg-slate-900 rounded-2xl p-4 border border-white/10 space-y-3">
          <h2 className="text-sm font-semibold text-white/70">本局设置</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/40 mb-1">日期</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-800 rounded-xl px-3 py-2 text-sm text-white border border-white/10 focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">
                倍率（元/分）
              </label>
              <input
                type="number"
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                min={1}
                className="w-full bg-slate-800 rounded-xl px-3 py-2 text-sm text-white border border-white/10 focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1">标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="今日战绩"
              className="w-full bg-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 border border-white/10 focus:border-sky-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Upload Area */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileInputRef.current?.click()}
          className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
            dragOver
              ? "border-sky-400 bg-sky-400/10"
              : "border-white/20 hover:border-white/40 bg-slate-900/50"
          } p-10 text-center`}
        >
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-white/60">AI 识别中...</p>
            </div>
          ) : (
            <>
              <p className="text-3xl mb-3">📸</p>
              <p className="text-white/70 font-medium">
                拖拽战绩截图到这里
              </p>
              <p className="text-white/30 text-sm mt-1">
                或点击选择图片（支持多张）
              </p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400">
            ⚠️ {error}
          </div>
        )}

        {/* No API Key hint */}
        {!apiKey && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-sm text-amber-400">
            💡 需要 DeepSeek API Key 才能识别图片。点右上角 ⚙️ 填写。
          </div>
        )}

        {/* Score Cards */}
        {sessions.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white/70">
                战绩卡片（{sessions.length} 局）
              </h2>
              <button
                onClick={() => setSessions([])}
                className="text-xs text-white/30 hover:text-red-400 transition-colors"
              >
                清空全部
              </button>
            </div>
            {sessions.map((session) => (
              <div key={session.id} className="relative">
                <button
                  onClick={() => removeSession(session.id)}
                  className="absolute -top-2 -right-2 z-10 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-400 transition-colors"
                >
                  ×
                </button>
                <ScoreCard session={session} />
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-white/20 pb-6">
          川麻战绩统计 · 数据仅在本地处理
        </p>
      </div>
    </main>
  );
}
