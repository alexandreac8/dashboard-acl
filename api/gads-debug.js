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
    const headers  = {
      "Authorization":     `Bearer ${access_token}`,
      "developer-token":   devToken,
      "login-customer-id": mccId,
      "Content-Type":      "application/json",
    };

    // all_conversions segmentado por action — campanhas gads, abril
    const query = `
      SELECT campaign.name, segments.date, segments.conversion_action_name,
             metrics.all_conversions, metrics.conversions
      FROM campaign
      WHERE segments.date BETWEEN '2026-04-01' AND '2026-04-24'
        AND campaign.name LIKE '%gads%'
      ORDER BY segments.date DESC
    `;
    const r = await fetch(
      `https://googleads.googleapis.com/v24/customers/${custId}/googleAds:searchStream`,
      { method: "POST", headers, body: JSON.stringify({ query }) }
    );
    const raw = await r.text();
    let rows = [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const batch of parsed) {
          for (const row of (batch.results || [])) {
            const allConv = parseFloat(row.metrics?.allConversions || 0);
            const conv    = parseFloat(row.metrics?.conversions || 0);
            if (allConv > 0 || conv > 0) {
              rows.push({
                campaign:   row.campaign?.name,
                date:       row.segments?.date,
                actionName: row.segments?.conversionActionName,
                allConv,
                conv,
              });
            }
          }
        }
      }
    } catch(e) { return res.status(200).json({ error: e.message, raw: raw.slice(0,500) }); }

    // Agrupar por actionName
    const byAction = {};
    for (const r of rows) {
      const k = r.actionName || 'unknown';
      if (!byAction[k]) byAction[k] = { allConv: 0, conv: 0, count: 0 };
      byAction[k].allConv += r.allConv;
      byAction[k].conv    += r.conv;
      byAction[k].count++;
    }

    return res.status(200).json({ byAction, rows: rows.slice(0, 30) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
