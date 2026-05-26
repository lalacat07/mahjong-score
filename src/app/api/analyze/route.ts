import { NextRequest, NextResponse } from "next/server";
import { PlayerScore, SingleGame, GameSession, Warning } from "@/lib/types";

const PROMPT = `你是川麻（四川麻将）战绩识别专家。
分析这张游戏结算截图，提取每位玩家的姓名和积分。

规则：
1. 玩家姓名原样使用截图中的显示文字，不推断或合并
2. 如果玩家名字完全不可见或为空，根据其头像外观特征描述命名（如"蓝色头像玩家"），并在note中加上 [noname]
3. 积分必须是整数（正数或负数），总和应为0（允许±1误差）
4. 如有时间戳（如 20:30），提取出来
5. 只返回JSON，格式如下：

{
  "players": [
    {"name": "玩家名", "score": 积分整数}
  ],
  "time": "HH:MM或null",
  "valid": true,
  "note": "如有异常备注"
}`;

async function analyzeOneImage(
  base64: string
): Promise<{ players: { name: string; score: number }[]; time?: string; valid: boolean; note?: string }> {
  const apiKey = process.env.GLM_API_KEY;
  const response = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "glm-4v-flash",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${base64}` },
            },
          ],
        },
      ],
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`GLM API错误: ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`AI 返回格式错误: ${content}`);

  // Fix non-standard JSON: remove + before positive numbers (e.g. +42 → 42)
  const cleaned = match[0].replace(/:\s*\+(\d)/g, ": $1");
  const parsed = JSON.parse(cleaned);

  return {
    players: (parsed.players || []).map((p: Record<string, unknown>) => ({
      name: String(p.name || "").trim(),
      // ── CRITICAL: always parseInt to avoid string concatenation bug ──
      score: parseInt(String(p.score), 10) || 0,
    })),
    time: parsed.time && parsed.time !== "null" ? parsed.time : undefined,
    valid: parsed.valid ?? true,
    note: parsed.note || "",
  };
}

/** Check if two games are identical (same players + same scores) */
function areGamesDuplicate(a: SingleGame, b: SingleGame): boolean {
  if (a.players.length !== b.players.length) return false;
  const aMap = new Map(a.players.map((p) => [p.name, p.score]));
  for (const bp of b.players) {
    if (aMap.get(bp.name) !== bp.score) return false;
  }
  return true;
}

/** Normalize name for comparison: strip trailing dots/ellipsis, lowercase */
function normalizeName(name: string): string {
  return name.replace(/[.…\s]+$/, "").toLowerCase().trim();
}

/**
 * Fuzzy name match:
 * - Exact after normalization (e.g. "Mr.CC " == "Mr.CC")
 * - One is a prefix of the other (e.g. "Mr.C" is prefix of "Mr.CC")
 */
function areSimilarNames(a: string, b: string): boolean {
  if (a.trim() === b.trim()) return true;
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na === nb) return true;
  const [shorter, longer] = na.length <= nb.length ? [na, nb] : [nb, na];
  return shorter.length >= 2 && longer.startsWith(shorter);
}

export async function POST(req: NextRequest) {
  try {
    const { scoreImages, albumImage, rate = 10 } = await req.json();

    if (!process.env.GLM_API_KEY) {
      return NextResponse.json(
        { success: false, error: "服务器未配置 GLM API Key" },
        { status: 500 }
      );
    }
    if (!scoreImages || !Array.isArray(scoreImages) || scoreImages.length === 0) {
      return NextResponse.json(
        { success: false, error: "请上传至少一张战绩截图" },
        { status: 400 }
      );
    }

    // ── Analyze each screenshot ──────────────────────────────────────────
    const gameResults = await Promise.all(
      scoreImages.map((b64: string, i: number) =>
        analyzeOneImage(b64).then((r) => ({ ...r, index: i + 1 }))
      )
    );

    // ── Build per-game data ──────────────────────────────────────────────
    const games: SingleGame[] = gameResults.map((g) => ({
      index: g.index,
      time: g.time,
      valid: g.valid,
      players: g.players.map((p) => ({
        name: p.name,
        score: p.score,
        delta: p.score * rate,
      })),
    }));

    const warnings: Warning[] = [];

    // ── 1. Detect duplicate games ────────────────────────────────────────
    for (let i = 0; i < games.length; i++) {
      for (let j = i + 1; j < games.length; j++) {
        if (areGamesDuplicate(games[i], games[j])) {
          warnings.push({
            type: "duplicate",
            message: `第 ${i + 1} 张和第 ${j + 1} 张截图的战绩完全相同，疑似重复上传`,
            indices: [i, j],
          });
        }
      }
    }

    // ── 2. Detect nameless players (AI-flagged only) ─────────────────────
    const noNameNotes: string[] = [];
    games.forEach((game, gi) => {
      const note = gameResults[gi]?.note || "";
      if (note.includes("[noname]")) {
        game.players
          .filter((p) => !p.name || p.name.trim() === "")
          .forEach((p) => {
            noNameNotes.push(
              `第 ${gi + 1} 场有玩家名字不可见，AI 已根据头像特征命名为「${p.name || "未知玩家"}」，请确认`
            );
          });
      }
    });
    if (noNameNotes.length > 0) {
      warnings.push({ type: "noName", message: noNameNotes.join("；") });
    }

    // ── 3. Aggregate totals ──────────────────────────────────────────────
    const totals = new Map<string, PlayerScore & { gameCount: number }>();
    games.forEach((game) => {
      game.players.forEach((p) => {
        const e = totals.get(p.name);
        if (e) {
          e.score += p.score;
          e.delta += p.delta;
          e.gameCount++;
        } else {
          totals.set(p.name, { name: p.name, score: p.score, delta: p.delta, gameCount: 1 });
        }
      });
    });

    // ── 4. Detect duplicate names (exact → auto-merge; fuzzy → cluster card) ─

    // Step A: auto-merge exact matches
    const allNames = Array.from(totals.keys());
    const exactProcessed = new Set<string>();
    for (let i = 0; i < allNames.length; i++) {
      for (let j = i + 1; j < allNames.length; j++) {
        const a = allNames[i], b = allNames[j];
        if (exactProcessed.has(a) || exactProcessed.has(b)) continue;
        if (a.trim() === b.trim()) {
          exactProcessed.add(b);
          const ea = totals.get(a)!;
          const eb = totals.get(b)!;
          ea.score += eb.score;
          ea.delta += eb.delta;
          ea.gameCount += eb.gameCount;
          totals.delete(b);
          warnings.push({ type: "duplicateName", message: `发现完全相同的玩家名"${a}"，已自动合并` });
        }
      }
    }

    // Step B: union-find to cluster fuzzy-similar names among remaining names
    const remainingNames = Array.from(totals.keys());
    const ufParent = new Map<string, string>();
    const ufFind = (x: string): string => {
      if (!ufParent.has(x)) ufParent.set(x, x);
      if (ufParent.get(x) !== x) ufParent.set(x, ufFind(ufParent.get(x)!));
      return ufParent.get(x)!;
    };
    const ufUnion = (a: string, b: string) => {
      const ra = ufFind(a), rb = ufFind(b);
      if (ra !== rb) ufParent.set(rb, ra);
    };

    for (let i = 0; i < remainingNames.length; i++) {
      for (let j = i + 1; j < remainingNames.length; j++) {
        if (areSimilarNames(remainingNames[i], remainingNames[j])) {
          ufUnion(remainingNames[i], remainingNames[j]);
        }
      }
    }

    // Emit one warning per cluster with 2+ members
    const clusters = new Map<string, string[]>();
    for (const name of remainingNames) {
      const root = ufFind(name);
      if (!clusters.has(root)) clusters.set(root, []);
      clusters.get(root)!.push(name);
    }
    for (const members of Array.from(clusters.values())) {
      if (members.length >= 2) {
        warnings.push({
          type: "duplicateName",
          message: `以下名字可能是同一人：${members.join("、")}`,
          nameCluster: members,
        });
      }
    }

    const players: PlayerScore[] = Array.from(totals.values());
    const today = new Date().toISOString().split("T")[0];

    const session: GameSession = {
      id: crypto.randomUUID(),
      date: today,
      title: `${today} 战绩`,
      rate,
      players,
      playerCount: players.length,
      games: games.length > 0 ? games : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };

    return NextResponse.json({ success: true, sessions: [session] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
