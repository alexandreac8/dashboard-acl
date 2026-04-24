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

    const headers = {
      "Authorization":     `Bearer ${access_token}`,
      "developer-token":   devToken,
      "login-customer-id": mccId,
      "Content-Type":      "application/json",
    };

    // Query 1: listar todas as conversion actions disponíveis
    const convQuery = `
      SELECT conversion_action.name, conversion_action.id, conversion_action.status
      FROM conversion_action
      WHERE conversion_action.status = 'ENABLED'
    `;
    const r1 = await fetch(
      `https://googleads.googleapis.com/v24/customers/${custId}/googleAds:searchStream`,
      { method: "POST", headers, body: JSON.stringify({ query: convQuery }) }
    );
    const raw1 = await r1.text();
    let convActions = [];
    try {
      const parsed = JSON.parse(raw1);
      if (Array.isArray(parsed)) {
        for (const batch of parsed) {
          for (const r of (batch.results || [])) {
            convActions.push({
              name: r.conversionAction?.name,
              id:   r.conversionAction?.id,
            });
          }
        }
      }
    } catch(e) { convActions = [{ error: raw1.slice(0, 300) }]; }

    // Query 2: conversões por action name nos últimos 7 dias
    const segQuery = `
      SELECT campaign.name, segments.date, segments.conversion_action_name, metrics.conversions
      FROM campaign
      WHERE segments.date BETWEEN '2026-04-17' AND '2026-04-24'
        AND metrics.conversions > 0
      ORDER BY segments.date DESC
      LIMIT 20
    `;
    const r2 = await fetch(
      `https://googleads.googleapis.com/v24/customers/${custId}/googleAds:searchStream`,
      { method: "POST", headers, body: JSON.stringify({ query: segQuery }) }
    );
    const raw2 = await r2.text();
    let convRows = [];
    try {
      const parsed = JSON.parse(raw2);
      if (Array.isArray(parsed)) {
        for (const batch of parsed) {
          for (const r of (batch.results || [])) {
            convRows.push({
              campaign:   r.campaign?.name,
              date:       r.segments?.date,
              actionName: r.segments?.conversionActionName,
              conversions: r.metrics?.conversions,
            });
          }
        }
      }
    } catch(e) { convRows = [{ error: raw2.slice(0, 300) }]; }

    return res.status(200).json({ convActions, convRows });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
