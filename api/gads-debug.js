export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
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
    const { access_token } = await tokenRes.json();
    if (!access_token) return res.status(500).json({ error: "no token" });

    const mccId    = "6994391072";
    const custId   = process.env.GADS_CUSTOMER_ID || "1310129916";
    const devToken = process.env.GADS_DEVELOPER_TOKEN;

    const query = `
      SELECT campaign.name, segments.date, metrics.cost_micros, metrics.conversions,
             metrics.clicks, metrics.impressions
      FROM campaign
      WHERE segments.date BETWEEN '2026-04-20' AND '2026-04-22'
      ORDER BY segments.date DESC
      LIMIT 5
    `;

    const r = await fetch(
      `https://googleads.googleapis.com/v24/customers/${custId}/googleAds:searchStream`,
      {
        method: "POST",
        headers: {
          "Authorization":     `Bearer ${access_token}`,
          "developer-token":   devToken,
          "login-customer-id": mccId,
          "Content-Type":      "application/json",
        },
        body: JSON.stringify({ query }),
      }
    );

    const raw = await r.text();
    let parsed;
    try { parsed = JSON.parse(raw); } catch(e) { return res.status(200).json({ raw: raw.slice(0,500) }); }

    // Retornar os primeiros resultados brutos para debug
    const firstBatch = Array.isArray(parsed) ? parsed[0] : parsed;
    const firstResult = firstBatch?.results?.[0] || null;

    return res.status(200).json({
      custId,
      status: r.status,
      firstResult,
      totalBatches: Array.isArray(parsed) ? parsed.length : 0,
      totalRows: Array.isArray(parsed) ? parsed.reduce((s,b)=>s+(b.results||[]).length,0) : 0,
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
