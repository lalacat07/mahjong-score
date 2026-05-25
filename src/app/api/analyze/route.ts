import { NextRequest, NextResponse } from "next/server";
import { PlayerScore } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, apiKey, rate = 10 } = await req.json();

    const key = apiKey || process.env.DEEPSEEK_API_KEY;
    if (!key) {
      return NextResponse.json(
        { success: false, error: "请提供 DeepSeek API Key" },
        { status: 400 }
      );
    }

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: "请提供图片" },
        { status: 400 }
      );
    }

    const prompt = `你是一个川麻（四川麻将）战绩识别专家。
请仔细分析这张麻将战绩截图，提取每位玩家的积分数据。

要求：
1. 识别所有玩家姓名和对应的积分（正负整数）
2. 积分总和应该为0（允许±1的误差）
3. 以JSON格式返回，格式如下：
{
  "players": [
    {"name": "玩家名", "score": 积分数字},
    ...
  ],
  "valid": true/false,
  "note": "备注（如有异常）"
}

只返回JSON，不要其他文字。`;

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { success: false, error: `DeepSeek API 错误: ${response.status} ${errText}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({
        success: false,
        error: "无法解析AI返回的数据",
        rawText: content,
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const players: PlayerScore[] = (parsed.players || []).map(
      (p: { name: string; score: number }) => ({
        name: p.name,
        score: p.score,
        delta: p.score * rate,
      })
    );

    return NextResponse.json({
      success: true,
      players,
      rawText: content,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
