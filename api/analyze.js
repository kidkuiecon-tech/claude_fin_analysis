const https = require("https");

module.exports = function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  // Debug info — shows key details without exposing the full key
  const debugInfo = {
    keyExists: !!apiKey,
    keyLength: apiKey ? apiKey.length : 0,
    keyStart: apiKey ? apiKey.substring(0, 10) : "none",
    keyEnd: apiKey ? apiKey.substring(apiKey.length - 4) : "none",
    hasSpaces: apiKey ? apiKey.includes(" ") : false,
    hasNewline: apiKey ? apiKey.includes("\n") : false,
    hasCarriageReturn: apiKey ? apiKey.includes("\r") : false,
  };

  if (!apiKey) {
    return res.status(500).json({ error: { message: "ANTHROPIC_API_KEY not set" }, debug: debugInfo });
  }

  let rawBody = "";
  req.on("data", chunk => { rawBody += chunk.toString(); });
  req.on("end", () => {

    const cleanKey = apiKey.trim().replace(/[\r\n]/g, "");
    const bodyToSend = rawBody || "{}";

    const options = {
      hostname: "api.anthropic.com",
      port: 443,
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(bodyToSend),
        "x-api-key": cleanKey,
        "anthropic-version": "2023-06-01",
      },
    };

    const httpReq = https.request(options, (httpRes) => {
      let raw = "";
      httpRes.on("data", chunk => { raw += chunk; });
      httpRes.on("end", () => {
        try {
          const parsed = JSON.parse(raw);
          // Include debug info in response so we can see what's happening
          if (httpRes.statusCode !== 200) {
            parsed._debug = debugInfo;
          }
          res.status(httpRes.statusCode).json(parsed);
        } catch(e) {
          res.status(500).json({ error: { message: "Parse error: " + raw }, debug: debugInfo });
        }
      });
    });

    httpReq.on("error", e => {
      res.status(500).json({ error: { message: "Request error: " + e.message }, debug: debugInfo });
    });

    httpReq.write(bodyToSend);
    httpReq.end();
  });
};
