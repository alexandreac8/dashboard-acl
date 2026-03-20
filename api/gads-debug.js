export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const results = {};

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
    results.token_ok = true;

    const headers = {
      "Authorization":     `Bearer ${tokenData.access_token}`,
      "developer-token":   process.env.GADS_DEVELOPER_TOKEN,
      "login-customer-id": "6994391072",
    };

    // 2. listAccessibleCustomers
    const r1 = await fetch("https://googleads.googleapis.com/v19/customers:listAccessibleCustomers", {
      headers: { "Authorization": `Bearer ${tokenData.access_token}`, "developer-token": process.env.GADS_DEVELOPER_TOKEN },
    });
    results.listAccessible = { status: r1.status, body: await r1.text() };

    // 3. GET customer info
    const r2 = await fetch("https://googleads.googleapis.com/v19/customers/1310129916", { headers });
    results.customerInfo = { status: r2.status, body: await r2.text() };

    // 4. search campaigns
    const r3 = await fetch("https://googleads.googleapis.com/v19/customers/1310129916/googleAds:search", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ query: "SELECT campaign.id, campaign.name, campaign.status FROM campaign LIMIT 5" }),
    });
    results.searchCampaigns = { status: r3.status, body: await r3.text() };

    return res.status(200).json(results);
  } catch (err) {
    return res.status(500).json({ error: err.message, results });
  }
}
