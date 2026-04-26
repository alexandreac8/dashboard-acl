// v26 - leads por dia via campaign_conversion_action (resolve bug segments.date + conversion_action_name)
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { from, to } = req.body || {};

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
    if (!tokenData.access_token) {
      return res.status(500).json({ error: "Token error", detail: tokenData });
    }

    const fromDate = from || "2025-01-01";
    const toDate   = to   || new Date().toISOString().slice(0, 10);

    // Query 1: custo por campanha/dia
    const costQuery = `
      SELECT campaign.name, segments.date, metrics.cost_micros
      FROM campaign
      WHERE segments.date BETWEEN '${fromDate}' AND '${toDate}'
        AND campaign.name REGEXP_MATCH '.*gads.*'
      ORDER BY segments.date DESC
    `;

    // Query 2: leads por campanha/dia via segments.conversion_action_name no resource campaign
    const leadsQuery = `
      SELECT campaign.name, segments.date, segments.conversion_action_name, metrics.all_conversions
      FROM campaign
      WHERE segments.date BETWEEN '${fromDate}' AND '${toDate}'
        AND campaign.name REGEXP_MATCH '.*gads.*'
        AND metrics.all_conversions > 0
      ORDER BY segments.date DESC
    `;

    const mccId    = "6994391072";
    const subId    = "1310129916";
    const envId    = process.env.GADS_CUSTOMER_ID || "";
    const devToken = process.env.GADS_DEVELOPER_TOKEN;
    const candidates = [...new Set([envId, subId, mccId].filter(Boolean))];

    async function runQuery(custId, query) {
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
          body: JSON.stringify({ query }),
        }
      );
      const rawText = await r.text();
      if (rawText.trim().startsWith("<")) return null;
      let parsed;
      try { parsed = JSON.parse(rawText); } catch(e) { return null; }
      if (!Array.isArray(parsed)) return null;
      return parsed;
    }

    let costParsed = null;
    let usedCustId = null;

    for (const custId of candidates) {
      const result = await runQuery(custId, costQuery);
      if (result !== null) { costParsed = result; usedCustId = custId; break; }
    }

    if (!costParsed) {
      return res.status(500).json({ error: "Todas as contas falharam no custo", candidates });
    }

    const leadsParsed = await runQuery(usedCustId, leadsQuery);

    // Processar custo: mapa campaign|date -> spend
    const spendMap = {};
    for (const batch of costParsed) {
      for (const r of (batch.results || [])) {
        const key = `${r.campaign?.name}|${r.segments?.date}`;
        spendMap[key] = (spendMap[key] || 0) + (Number(r.metrics?.costMicros) || 0) / 1_000_000;
      }
    }

    // Processar leads: mapa campaign|date -> leads (filtrando só "INF Lead")
    const leadsPerDay = {};
    if (leadsParsed) {
      for (const batch of leadsParsed) {
        for (const r of (batch.results || [])) {
          const actionName = r.segments?.conversionActionName || "";
          if (!actionName.includes("INF Lead")) continue;
          const key = `${r.campaign?.name}|${r.segments?.date}`;
          leadsPerDay[key] = (leadsPerDay[key] || 0) + Math.round(Number(r.metrics?.allConversions) || 0);
        }
      }
    }

    // Construir rows: gasto + leads por campanha/dia (dados reais, sem distribuição proporcional)
    const rows = Object.entries(spendMap)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, spend]) => {
        const [campaign, date] = key.split("|");
        const leads = leadsPerDay[key] || 0;
        return { campaign, date, spend, leads };
      });

    return res.status(200).json({ rows });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
