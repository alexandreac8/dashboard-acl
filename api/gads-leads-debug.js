// Debug: check what leadsQuery returns raw
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { from, to } = req.body || {};
  const fromDate = from || "2026-04-01";
  const toDate   = to   || "2026-04-24";

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
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) return res.status(500).json({ error: "token", tokenData });

    const mccId    = "6994391072";
    const custId   = "1310129916";
    const devToken = process.env.GADS_DEVELOPER_TOKEN;

    const leadsQuery = `
      SELECT campaign.name, segments.date, segments.conversion_action_name, metrics.all_conversions
      FROM campaign
      WHERE segments.date BETWEEN '${fromDate}' AND '${toDate}'
        AND campaign.name REGEXP_MATCH '.*gads.*'
        AND metrics.all_conversions > 0
      ORDER BY segments.date DESC
    `;

    const r = await fetch(
      `https://googleads.googleapis.com/v24/customers/${custId}/googleAds:searchStream`,
      {
        method: "POST",
        headers: {
          "Authorization":     `Bearer ${tokenData.access_token}`,
          "developer-token":   devToken,
          "login-customer-id": mccId,
          "Content-Type":      "application/json",
        },
        body: JSON.stringify({ query: leadsQuery }),
      }
    );
    const rawText = await r.text();

    // Check for HTML error
    if (rawText.trim().startsWith("<")) {
      return res.status(200).json({ error: "html_response", preview: rawText.slice(0, 500) });
    }

    let parsed;
    try { parsed = JSON.parse(rawText); } catch(e) {
      return res.status(200).json({ error: "parse_error", preview: rawText.slice(0, 500) });
    }

    if (!Array.isArray(parsed)) {
      return res.status(200).json({ notArray: true, parsed });
    }

    // Extract key info
    const rows = [];
    let totalRows = 0;
    let infLeadRows = 0;
    for (const batch of parsed) {
      for (const row of (batch.results || [])) {
        totalRows++;
        const actionName = row.segments?.conversionActionName || "(none)";
        const hasInf = actionName.includes("INF Lead");
        if (hasInf) infLeadRows++;
        rows.push({
          campaign: row.campaign?.name,
          date: row.segments?.date,
          action: actionName,
          allConv: row.metrics?.allConversions,
          isInf: hasInf,
        });
      }
    }

    return res.status(200).json({
      totalBatches: parsed.length,
      totalRows,
      infLeadRows,
      sample: rows.slice(0, 20),
    });

  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
}
