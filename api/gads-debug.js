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
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return res.status(500).json({ step: "token", error: tokenData });
    }

    const headers = {
      "Authorization":     `Bearer ${tokenData.access_token}`,
      "developer-token":   process.env.GADS_DEVELOPER_TOKEN,
      "login-customer-id": "6994391072",
      "Content-Type":      "application/json",
    };

    // Raw searchStream — qualquer campanha, qualquer data
    const r = await fetch(
      "https://googleads.googleapis.com/v19/customers/1310129916/googleAds:searchStream",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          query: "SELECT campaign.id, campaign.name, campaign.status FROM campaign LIMIT 10",
        }),
      }
    );
    const raw = await r.text();

    // Também testa sem login-customer-id
    const r2 = await fetch(
      "https://googleads.googleapis.com/v19/customers/1310129916/googleAds:searchStream",
      {
        method: "POST",
        headers: {
          "Authorization":   `Bearer ${tokenData.access_token}`,
          "developer-token": process.env.GADS_DEVELOPER_TOKEN,
          "Content-Type":    "application/json",
        },
        body: JSON.stringify({
          query: "SELECT campaign.id, campaign.name, campaign.status FROM campaign LIMIT 10",
        }),
      }
    );
    const raw2 = await r2.text();

    return res.status(200).json({
      with_login_customer_id: { status: r.status, raw },
      without_login_customer_id: { status: r2.status, raw: raw2 },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
