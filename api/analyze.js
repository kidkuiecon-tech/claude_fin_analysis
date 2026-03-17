const https = require("https");

module.exports = async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: { message: "ANTHROPIC_API_KEY not set in Vercel Environment Variables" }
    });
  }

  try {
    const bodyStr = JSON.stringify(req.body);

    const data = await new Promise((resolve, reject) => {
      const options = {
        hostname: "api.anthropic.com",
        path: "/v1/messages",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(bodyStr),
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
      };

      const httpReq = https.request(options, (httpRes) => {
        let raw = "";
        httpRes.on("data", (chunk) => raw += chunk);
        httpRes.on("end", () => {
          try {
            resolve({ status: httpRes.statusCode, body: JSON.parse(raw) });
          } catch (e) {
            reject(new Error("Failed to parse Anthropic response: " + raw));
          }
        });
      });

      httpReq.on("error", reject);
      httpReq.write(bodyStr);
      httpReq.end();
    });

    return res.status(data.status).json(data.body);

  } catch (err) {
    return res.status(500).json({
      error: { message: "Server error: " + err.message }
    });
  }
};
