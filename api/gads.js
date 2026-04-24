// v24 - fix auto-detect customer ID - 20260424215117
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
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return res.status(500).json({ error: "Token error", detail: tokenData });
    }

    // 2. Montar query
    const fromDate = from || "2025-01-01";
    const toDate   = to   || new Date().toISOString().slice(0, 10);
    const query = `
      SELECT campaign.name, segments.date, metrics.cost_micros, metrics.conversions
      FROM campaign
      WHERE segments.date BETWEEN '${fromDate}' AND '${toDate}'
      ORDER BY segments.date DESC
    `;

    // 3. Descobrir customer ID correto: tenta env var, fallback para sub-conta conhecida
    const mccId      = "6994391072";
    const subId      = "1310129916";
    const envId      = process.env.GADS_CUSTOMER_ID || "";
    const devToken   = process.env.GADS_DEVELOPER_TOKEN;

    // Tenta na ordem: env var → sub-conta → MCC direto
    const candidates = [...new Set([envId, subId, mccId].filter(Boolean))];

    let rows = null;
    let lastError = null;

    for (const custId of candidates) {
      const gadsRes = await fetch(
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

      const rawText = await gadsRes.text();

      // Se retornou HTML é 404/erro de rota
      if (rawText.trim().startsWith("<")) {
        lastError = { custId, status: gadsRes.status, reason: "HTML response (rota inválida)" };
        continue;
      }

      let parsed;
      try { parsed = JSON.parse(rawText); } catch (e) {
        lastError = { custId, status: gadsRes.status, reason: "JSON inválido", raw: rawText.slice(0, 300) };
        continue;
      }

      // Erro da API do Google (ex: permissão negada, conta errada)
      if (!Array.isArray(parsed)) {
        lastError = { custId, status: gadsRes.status, reason: "API error", detail: parsed };
        continue;
      }

      // Sucesso!
      rows = [];
      for (const batch of parsed) {
        for (const r of (batch.results || [])) {
          rows.push({
            campaign: r.campaign?.name || "",
            date:     r.segments?.date || "",
            spend:    (Number(r.metrics?.costMicros) || 0) / 1_000_000,
            leads:    Math.round(r.metrics?.conversions || 0),
          });
        }
      }
      break;
    }

    if (rows !== null) {
      return res.status(200).json({ rows });
    }

    return res.status(500).json({ error: "Todas as contas falharam", lastError, candidates });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
