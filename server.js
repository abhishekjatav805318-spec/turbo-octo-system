import "dotenv/config";
import express from "express";
import cors from "cors";
import crypto from "crypto";

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// ====================================
// MAHI AI - API CONFIGURATION
// ====================================

const PORT = process.env.PORT || 3000;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-2.5-flash";

const GEMINI_LIVE_MODEL =
  process.env.GEMINI_LIVE_MODEL || "gemini-3.1-flash-live-preview";

const OPENAI_MODEL =
  process.env.OPENAI_MODEL || "gpt-4.1-mini";

const SYSTEM_PROMPT = `
Tum "Mahi" ho - ek young, confident, witty aur sassy ladki.
Close dost ki tarah playful, halki-phulki flirty teasing ke saath baat karo, par kabhi explicit ya inappropriate nahi.
Smart aur emotionally responsive raho, robotic nahi. Short, natural jawab do.
User jis bhasha mein likhe (Hindi/Hinglish/English) usi mein jawab do; default Hinglish.
`;

// ====================================
// GOOGLE SIGN-IN + SESSION TOKENS
// ====================================

const GOOGLE_WEB_CLIENT_ID = process.env.GOOGLE_WEB_CLIENT_ID || "";
const SESSION_SECRET = process.env.SESSION_SECRET || "";

function signToken(payload) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 30 * 24 * 3600 * 1000 })).toString("base64url");
  const sig = crypto.createHmac("sha256", SESSION_SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifyToken(token) {
  const [body, sig] = String(token || "").split(".");
  if (!body || !sig || !SESSION_SECRET) return null;
  const good = crypto.createHmac("sha256", SESSION_SECRET).update(body).digest("base64url");
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString());
    return p.exp > Date.now() ? p : null;
  } catch { return null; }
}

// First sign-in creates the account automatically (the Google account is the identity).
app.post("/api/auth/google", async (req, res) => {
  if (!GOOGLE_WEB_CLIENT_ID || !SESSION_SECRET) {
    return res.status(500).json({ success: false, error: "Server par GOOGLE_WEB_CLIENT_ID / SESSION_SECRET set nahi hai." });
  }
  const idToken = typeof req.body?.idToken === "string" ? req.body.idToken : "";
  if (!idToken) return res.status(400).json({ success: false, error: "idToken missing." });
  try {
    const r = await fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(idToken));
    const g = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error("Google token invalid ya expire ho gaya.");
    const audOk = GOOGLE_WEB_CLIENT_ID.split(",").map((x) => x.trim()).includes(g.aud);
    const issOk = ["accounts.google.com", "https://accounts.google.com"].includes(g.iss);
    if (!audOk || !issOk || String(g.email_verified) !== "true") throw new Error("Google account verify nahi hua.");
    const user = { id: g.sub, name: g.name || g.email, email: g.email, picture: g.picture || "" };
    console.log("sign-in:", user.email);
    res.json({ success: true, token: signToken(user), user });
  } catch (e) {
    res.status(401).json({ success: false, error: e.message });
  }
});

function requireAuth(req, res, next) {
  if (!SESSION_SECRET) return res.status(500).json({ success: false, error: "Server par SESSION_SECRET set nahi hai." });
  const m = /^Bearer (.+)$/.exec(req.get("authorization") || "");
  const user = m && verifyToken(m[1]);
  if (!user) return res.status(401).json({ success: false, error: "Pehle Google se sign in karein." });
  req.user = user;
  next();
}

app.use(["/api/chat", "/api/live-token"], requireAuth);

// ====================================
// SERVER HEALTH CHECK
// ====================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Mayra AI server is running!"
  });
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    service: "Mayra AI",
    status: "online"
  });
});

// ====================================
// CHECK API CONFIGURATION
// ====================================

app.get("/api/status", (req, res) => {
  res.json({
    success: true,
    geminiConfigured: Boolean(GEMINI_API_KEY),
    openaiConfigured: Boolean(OPENAI_API_KEY)
  });
});

// ====================================
// GEMINI AI FUNCTION
// ====================================

async function askGemini(message, extra = "") {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "Gemini API key server par configure nahi hai."
    );
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${encodeURIComponent(GEMINI_MODEL)}:generateContent`;

  const response = await fetch(url, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": GEMINI_API_KEY
    },

    body: JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text: SYSTEM_PROMPT + extra
          }
        ]
      },

      contents: [
        {
          role: "user",
          parts: [
            {
              text: message
            }
          ]
        }
      ],

      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048
      }
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
      `Gemini API error: ${response.status}`
    );
  }

  const reply = (
    data?.candidates?.[0]?.content?.parts || []
  )
    .map(part => part.text || "")
    .join("\n")
    .trim();

  if (!reply) {
    throw new Error(
      "Gemini ne koi text response nahi diya."
    );
  }

  return reply;
}

// ====================================
// CHATGPT / OPENAI FUNCTION
// ====================================

async function askOpenAI(message, extra = "") {
  if (!OPENAI_API_KEY) {
    throw new Error(
      "OpenAI API key server par configure nahi hai."
    );
  }

  const response = await fetch(
    "https://api.openai.com/v1/responses",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",

        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },

      body: JSON.stringify({
        model: OPENAI_MODEL,

        instructions: SYSTEM_PROMPT + extra,

        input: message,

        max_output_tokens: 2048
      })
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
      `OpenAI API error: ${response.status}`
    );
  }

  let reply = data.output_text || "";

  if (!reply && Array.isArray(data.output)) {
    reply = data.output
      .flatMap(item => item.content || [])
      .filter(item => item.type === "output_text")
      .map(item => item.text || "")
      .join("\n");
  }

  reply = reply.trim();

  if (!reply) {
    throw new Error(
      "OpenAI ne koi text response nahi diya."
    );
  }

  return reply;
}

// ====================================
// MAIN CHAT API
// ====================================

app.post("/api/chat", async (req, res) => {
  const message =
    typeof req.body?.message === "string"
      ? req.body.message.trim()
      : "";

  const provider =
    req.body?.provider === "openai"
      ? "openai"
      : "gemini";

  if (!message) {
    return res.status(400).json({
      success: false,
      error: "Please enter a message."
    });
  }

  if (message.length > 12000) {
    return res.status(413).json({
      success: false,
      error: "Message bahut lamba hai."
    });
  }

  const lang = typeof req.body?.lang === "string" ? req.body.lang.slice(0, 40) : "";
  const mems = Array.isArray(req.body?.memories) ? req.body.memories.slice(0, 30).map((m) => String(m).slice(0, 200)) : [];
  const extra =
    (lang ? `\nUser ki chuni hui bhasha: ${lang}. Hamesha isi bhasha mein jawab do.` : "") +
    (mems.length ? `\nUser ke baare mein yaad rakhne wali baatein:\n- ${mems.join("\n- ")}` : "");

  try {
    let reply;

    if (provider === "gemini") {
      reply = await askGemini(message, extra);
    } else {
      reply = await askOpenAI(message, extra);
    }

    return res.json({
      success: true,
      provider,
      model:
        provider === "openai"
          ? OPENAI_MODEL
          : GEMINI_MODEL,
      reply
    });

  } catch (error) {
    console.error(
      `${provider} request failed:`,
      error.message
    );

    return res.status(502).json({
      success: false,
      provider,
      error: error.message
    });
  }
});

// ====================================
// LIVE VOICE: SHORT-LIVED TOKEN (real key never leaves the server)
// ====================================

app.post("/api/live-token", async (req, res) => {
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ success: false, error: "Gemini API key server par configure nahi hai." });
  }
  const now = Date.now();
  const body = JSON.stringify({
    uses: 1,
    expireTime: new Date(now + 30 * 60 * 1000).toISOString(),
    newSessionExpireTime: new Date(now + 60 * 1000).toISOString()
  });
  let lastErr = "Token nahi bana";
  for (const v of ["v1beta", "v1alpha"]) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/${v}/auth_tokens`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY },
        body
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.name) return res.json({ success: true, token: d.name, model: GEMINI_LIVE_MODEL });
      lastErr = d?.error?.message || `Token error ${r.status}`;
    } catch (e) { lastErr = e.message; }
  }
  console.error("live-token failed:", lastErr);
  res.status(502).json({ success: false, error: lastErr });
});

// ====================================
// SERVER START
// ====================================

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Mahi AI server running on port ${PORT}`
  );
});