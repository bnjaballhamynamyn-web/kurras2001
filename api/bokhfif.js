export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY غير مضبوط في متغيرات البيئة" });
  }

  try {
    const { messages = [], image = "" } = req.body || {};
    const contents = [];

    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      const parts = [{ text: String(m.content || "") }];

      if (i === messages.length - 1 && image && image.startsWith("data:image/")) {
        const match = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
        if (match) {
          parts.push({
            inlineData: {
              mimeType: match[1],
              data: match[2],
            },
          });
        }
      }

      contents.push({
        role: m.role === "assistant" ? "model" : "user",
        parts,
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "خطأ من Gemini API",
      });
    }

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || "")
        .join("")
        .trim() || "";

    if (!text) {
      return res.status(500).json({ error: "لم يرجع بوخفيف نصاً واضحاً" });
    }

    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: err.message || "خطأ داخلي في الخادم" });
          
