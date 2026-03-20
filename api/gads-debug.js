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

    // Teste 1: sem auth (deve retornar 401, não 501)
    const r1 = await fetch("https://googleads.googleapis.com/v19/customers/1310129916/googleAds:searchStream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "SELECT campaign.id FROM campaign LIMIT 1" }),
    });
    const t1 = await r1.text();

    // Teste 2: com auth mas sem developer-token (deve retornar erro específico)
    const r2 = await fetch("https://googleads.googleapis.com/v19/customers/1310129916/googleAds:searchStream", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${access_token}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({ query: "SELECT campaign.id FROM campaign LIMIT 1" }),
    });
    const t2 = await r2.text();

    // Teste 3: completo com developer-token
    const r3 = await fetch("https://googleads.googleapis.com/v19/customers/1310129916/googleAds:searchStream", {
      method: "POST",
      headers: {
        "Authorization":     `Bearer ${access_token}`,
        "developer-token":   process.env.GADS_DEVELOPER_TOKEN,
        "login-customer-id": "6994391072",
        "Content-Type":      "application/json",
      },
      body: JSON.stringify({ query: "SELECT campaign.id FROM campaign LIMIT 1" }),
    });
    const t3 = await r3.text();

    return res.status(200).json({
      sem_auth:     { status: r1.status, body: t1.slice(0, 300) },
      sem_devtoken: { status: r2.status, body: t2.slice(0, 300) },
      completo:     { status: r3.status, body: t3.slice(0, 300) },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
