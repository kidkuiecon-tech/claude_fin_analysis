const https = require("https");

module.exports = function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: { message: "ANTHROPIC_API_KEY not set" } });
    return;
  }

  let rawBody = "";
  req.on("data", chunk => { rawBody += chunk.toString(); });
  req.on("end", () => {
    const bodyToSend = rawBody || "{}";
    const options = {
      hostname: "api.anthropic.com",
      port: 443,
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(bodyToSend),
        "x-api-key": apiKey.trim(),
        "anthropic-version": "2023-06-01",
      },
    };

    const httpReq = https.request(options, (httpRes) => {
      let raw = "";
      httpRes.on("data", chunk => { raw += chunk; });
      httpRes.on("end", () => {
        try {
          res.status(httpRes.statusCode).json(JSON.parse(raw));
        } catch(e) {
          res.status(500).json({ error: { message: "Parse error: " + raw } });
        }
      });
    });

    httpReq.on("error", e => {
      res.status(500).json({ error: { message: "Request error: " + e.message } });
    });

    httpReq.write(bodyToSend);
    httpReq.end();
  });
};
