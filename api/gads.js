export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { from, to } = req.body || {};

  try {
    // 1. Obter access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id:     process.env.GADS_CLIENT_ID,
        client_secret: process.env.GADS_CLIENT_SECRET,
        refresh_token: process.env.GADS_REFRESH_TOKEN,
        grant_type:    "refresh_token",
      }),
    });
    const tokenText = await tokenRes.text();
    let tokenData;
    try { tokenData = JSON.parse(tokenText); } catch(e) {
      return res.status(500).json({ error: "Token parse error", raw: tokenText.slice(0, 300), status: tokenRes.status });
    }
    if (!tokenData.access_token) {
      return res.status(500).json({ error: "Token error", detail: tokenData });
    }

    // 2. Chamar Google Ads API
    const customerId = process.env.GADS_CUSTOMER_ID;
    const query = `
      SELECT
        campaign.name,
        segments.date,
        metrics.cost_micros,
        metrics.conversions
      FROM campaign
      WHERE segments.date BETWEEN '${from || "2025-01-01"}' AND '${to || new Date().toISOString().slice(0,10)}'
      ORDER BY segments.date DESC
    `;

    const gadsRes = await fetch(
      `https://googleads.googleapis.com/v18/customers/${customerId}/googleAds:searchStream`,
      {
        method: "POST",
        headers: {
          "Authorization":   `Bearer ${tokenData.access_token}`,
          "developer-token": process.env.GADS_DEVELOPER_TOKEN,
          "Content-Type":    "application/json",
        },
        body: JSON.stringify({ query }),
      }
    );

    const gadsText = await gadsRes.text();
    let gadsData;
    try { gadsData = JSON.parse(gadsText); } catch(e) {
      return res.status(500).json({ error: "Gads parse error", status: gadsRes.status, raw: gadsText.slice(0, 500) });
    }
    if (!Array.isArray(gadsData)) {
      return res.status(500).json({ error: "Gads API error", detail: gadsData });
    }

    // 3. Processar e retornar
    const rows = [];
    for (const batch of gadsData) {
      for (const r of (batch.results || [])) {
        const campaign = r.campaign?.name || "";
        if (!campaign.toLowerCase().includes("gads")) continue;
        rows.push({
          campaign,
          date:  r.segments?.date || "",
          spend: (r.metrics?.cost_micros || 0) / 1_000_000,
          leads: Math.round(r.metrics?.conversions || 0),
        });
      }
    }

    return res.status(200).json({ rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
