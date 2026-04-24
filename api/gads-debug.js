export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GADS_CLIENT_ID, client_secret: process.env.GADS_CLIENT_SECRET,
        refresh_token: process.env.GADS_REFRESH_TOKEN, grant_type: "refresh_token",
      }),
    });
    const { access_token } = await tokenRes.json();
    const mccId = "6994391072", custId = process.env.GADS_CUSTOMER_ID || "1310129916";
    const headers = { "Authorization": `Bearer ${access_token}`, "developer-token": process.env.GADS_DEVELOPER_TOKEN, "login-customer-id": mccId, "Content-Type": "application/json" };

    // Todas as conversion actions com all_conversions > 0 para campanhas gads em abril
    const query = `
      SELECT campaign.name, segments.conversion_action_name, metrics.all_conversions, metrics.conversions
      FROM campaign
      WHERE segments.date BETWEEN '2026-04-01' AND '2026-04-24'
        AND campaign.name REGEXP_MATCH '.*gads.*'
        AND metrics.all_conversions > 0
    `;
    const r = await fetch(`https://googleads.googleapis.com/v24/customers/${custId}/googleAds:searchStream`,
      { method: "POST", headers, body: JSON.stringify({ query }) });
    const raw = await r.text();
    let rows = [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const batch of parsed) {
          for (const row of (batch.results || [])) {
            rows.push({
              campaign: row.campaign?.name,
              action: row.segments?.conversionActionName,
              allConv: row.metrics?.allConversions,
              conv: row.metrics?.conversions,
            });
          }
        }
      } else { rows = [{ error: JSON.stringify(parsed).slice(0,300) }]; }
    } catch(e) { rows = [{ error: raw.slice(0,300) }]; }

    // Agrupar por action name
    const byAction = {};
    for (const r of rows) {
      const k = r.action || 'unknown';
      if (!byAction[k]) byAction[k] = { allConv: 0, conv: 0 };
      byAction[k].allConv += parseFloat(r.allConv || 0);
      byAction[k].conv    += parseFloat(r.conv || 0);
    }
    return res.status(200).json({ byAction, rawRows: rows.slice(0,10) });
  } catch(err) { return res.status(500).json({ error: err.message }); }
}
