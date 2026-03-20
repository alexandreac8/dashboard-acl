export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

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
      return res.status(500).json({ step: "token", error: tokenData });
    }

    // 2. Listar clientes acessíveis
    const listRes = await fetch(
      "https://googleads.googleapis.com/v19/customers:listAccessibleCustomers",
      {
        method: "GET",
        headers: {
          "Authorization":   `Bearer ${tokenData.access_token}`,
          "developer-token": process.env.GADS_DEVELOPER_TOKEN,
        },
      }
    );
    const listData = await listRes.json();

    // 3. Testar acesso direto à conta Rocket
    const rocketRes = await fetch(
      `https://googleads.googleapis.com/v19/customers/1310129916/googleAds:searchStream`,
      {
        method: "POST",
        headers: {
          "Authorization":     `Bearer ${tokenData.access_token}`,
          "developer-token":   process.env.GADS_DEVELOPER_TOKEN,
          "login-customer-id": "6994391072",
          "Content-Type":      "application/json",
        },
        body: JSON.stringify({
          query: `SELECT campaign.id, campaign.name, campaign.status FROM campaign LIMIT 10`,
        }),
      }
    );
    const rocketData = await rocketRes.json();

    return res.status(200).json({
      token_ok: true,
      mcc_query: listData,
      rocket_campaigns: rocketData,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
