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
    const headers = {
      "Authorization": `Bearer ${access_token}`,
      "developer-token": process.env.GADS_DEVELOPER_TOKEN,
      "login-customer-id": mccId,
      "Content-Type": "application/json"
    };

    const from = "2026-04-18", to = "2026-04-25";

    // Testa campaign_conversion_action: permite date + conversion_action.name juntos?
    const query = `
      SELECT campaign.name, segments.date, conversion_action.name, metrics.all_conversions
      FROM campaign_conversion_action
      WHERE segments.date BETWEEN '${from}' AND '${to}'
        AND campaign.name REGEXP_MATCH '.*gads.*'
        AND metrics.all_conversions > 0
      ORDER BY segments.date DESC
    `;

    const r = await fetch(
      `https://googleads.googleapis.com/v24/customers/${custId}/googleAds:searchStream`,
      { method: "POST", headers, body: JSON.stringify({ query }) }
    );
    const raw = await r.text();

    if (raw.trim().startsWith("<")) {
      return res.status(200).json({ type: "html_error", preview: raw.slice(0, 300) });
    }

    let parsed;
    try { parsed = JSON.parse(raw); } catch(e) {
      return res.status(200).json({ type: "parse_error", preview: raw.slice(0, 300) });
    }

    if (!Array.isArray(parsed)) {
      return res.status(200).json({ type: "not_array", parsed });
    }

    const rows = [];
    for (const batch of parsed) {
      for (const row of (batch.results || [])) {
        rows.push({
          campaign: row.campaign?.name,
          date: row.segments?.date,
          action: row.conversionAction?.name,
          allConv: row.metrics?.allConversions,
        });
      }
    }

    const infRows = rows.filter(r => (r.action||"").includes("INF Lead"));
    return res.status(200).json({
      type: "ok",
      resource: "campaign_conversion_action",
      totalRows: rows.length,
      infLeadRows: infRows.length,
      infSample: infRows.slice(0, 10),
    });
  } catch(err) { return res.status(500).json({ error: err.message }); }
}
