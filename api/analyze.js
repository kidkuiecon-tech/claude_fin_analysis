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

  // Collect raw body chunks
  let rawBody = "";
  req.on("data", chunk => { rawBody += chunk.toString(); });
  req.on("end", () => {

    // Validate body
    if (!rawBody || rawBody.trim() === "") {
      res.status(400).json({ error: { message: "Empty request body" } });
      return;
    }

    // Parse and re-stringify to ensure valid JSON with required fields
    let parsed;
    try {
      parsed = JSON.parse(rawBody);
    } catch (e) {
      res.status(400).json({ error: { message: "Invalid JSON: " + e.message } });
      return;
    }

    // Ensure required Anthropic fields are present
    if (!parsed.model) parsed.model = "claude-sonnet-4-6";
    if (!parsed.max_tokens) parsed.max_tokens = 1500;

    const bodyToSend = JSON.stringify(parsed);

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
          res.status(500).json({ error: { message: "Parse error: " + raw.slice(0, 200) } });
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
