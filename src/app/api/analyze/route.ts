import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

const PROMPT = `你是川麻（四川麻将）战绩识别专家。
分析这张游戏结算截图，提取每位玩家的姓名和积分。

规则：
1. 玩家姓名原样使用截图中的显示文字，不推断或合并
2. 如果玩家名字完全不可见或为空，根据其头像外观特征描述命名（如"蓝色头像玩家"），并在NOTE行末尾加 [noname]
3. 积分必须是整数（正数或负数），总和应为0（允许±1误差）
4. 如有时间戳（如 20:30），输出TIME行

只输出以下格式，每行一条，不要输出任何其他内容：
PLAYER:玩家名,SCORE:+42
PLAYER:玩家名,SCORE:-23
TIME:20:30
NOTE:如有异常说明`;

function sanitizePlayers(
  raw: { name: string; score: number }[]
): { name: string; score: number }[] {
  return raw
    .map((p) => ({ ...p, name: p.name.replace(/[（(][^）)]*[）)]/g, "").trim() }))
    .filter((p) => {
      if (!p.name || p.name.length < 1) return false;
      if (/PLAYER|SCORE/i.test(p.name)) return false;
      if (/^\d+$/.test(p.name)) return false;
      if (Math.abs(p.score) > 500) return false;
      return true;
    });
}

function parseGlmResponse(
  content: string
): { players: { name: string; score: number }[]; time?: string; note?: string } {
  let time: string | undefined;
  let note = "";

  // Strategy 1: expected PLAYER:/SCORE: format
  const players: { name: string; score: number }[] = [];
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (line.startsWith("PLAYER:")) {
      const rest = line.slice(7);
      const scoreIdx = rest.lastIndexOf(",SCORE:");
      if (scoreIdx !== -1) {
        const name = rest.slice(0, scoreIdx).trim();
        const score = parseInt(rest.slice(scoreIdx + 7).trim(), 10);
        if (name && !isNaN(score)) players.push({ name, score });
      }
    } else if (line.startsWith("TIME:")) {
      const t = line.slice(5).trim();
      if (t && t !== "null") time = t;
    } else if (line.startsWith("NOTE:")) {
      note = line.slice(5).trim();
    }
  }
  const sanitized1 = sanitizePlayers(players);
  if (sanitized1.length > 0) return { players: sanitized1, time, note };

  // Strategy 2: GLM returned JSON despite instructions
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const cleaned = jsonMatch[0]
        .replace(/:\s*\+(\d)/g, ": $1")
        .replace(/}\s*{/g, "},{")
        .replace(/,(\s*[}\]])/g, "$1");
      const parsed = JSON.parse(cleaned);
      const jsonPlayers = ((parsed.players || []) as Record<string, unknown>[])
        .map((p) => ({ name: String(p.name || "").trim(), score: parseInt(String(p.score), 10) || 0 }));
      const sanitized2 = sanitizePlayers(jsonPlayers);
      if (sanitized2.length > 0) {
        return {
          players: sanitized2,
          time: parsed.time && parsed.time !== "null" ? String(parsed.time) : undefined,
          note: String(parsed.note || ""),
        };
      }
    } catch { /* fall through */ }
  }

  return { players: [], note };
}

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json();

    if (!process.env.GLM_API_KEY) {
      return NextResponse.json({ success: false, error: "服务器未配置 GLM API Key" }, { status: 500 });
    }
    if (!image) {
      return NextResponse.json({ success: false, error: "缺少图片数据" }, { status: 400 });
    }

    const apiKey = process.env.GLM_API_KEY;

    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 3000));

      const response = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "glm-4.6v-flash",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: PROMPT },
                { type: "image_url", image_url: { url: image } },
              ],
            },
          ],
          max_tokens: 512,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.log(`[GLM attempt ${attempt + 1}] non-200 (${response.status}):`, errText.slice(0, 300));
        const isRateLimit = errText.includes("1302") || errText.includes("1305");
        if (isRateLimit && attempt < 2) continue;
        throw new Error(`GLM API错误 ${response.status}: ${errText.slice(0, 200)}`);
      }

      const data = await response.json();
      console.log(`[GLM attempt ${attempt + 1}] full response:`, JSON.stringify(data).slice(0, 500));

      const errCode = String(data.error?.code ?? data.code ?? "");
      if (errCode === "1302" || errCode === "1305") {
        if (attempt < 2) continue;
        throw new Error("GLM 服务繁忙，请稍后重试");
      }

      const content: string =
        data.choices?.[0]?.message?.content ||
        data.choices?.[0]?.delta?.content ||
        "";

      if (!content.trim()) {
        throw new Error(`GLM返回了空内容。完整响应: ${JSON.stringify(data).slice(0, 400)}`);
      }

      const result = parseGlmResponse(content);
      if (result.players.length === 0) {
        throw new Error(`AI无法识别战绩格式。GLM原始回复: ${content.slice(0, 400)}`);
      }

      return NextResponse.json({ success: true, players: result.players, time: result.time, note: result.note });
    }

    throw new Error("GLM 多次重试失败，请稍后再试");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
