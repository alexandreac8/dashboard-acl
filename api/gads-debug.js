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

    // 2. GET info da conta Rocket diretamente
    const customerRes = await fetch(
      "https://googleads.googleapis.com/v19/customers/1310129916",
      {
        method: "GET",
        headers: {
          "Authorization":     `Bearer ${tokenData.access_token}`,
          "developer-token":   process.env.GADS_DEVELOPER_TOKEN,
          "login-customer-id": "6994391072",
        },
      }
    );
    const customerData = await customerRes.json();

    // 3. search (não stream) na conta Rocket
    const searchRes = await fetch(
      "https://googleads.googleapis.com/v19/customers/1310129916/googleAds:search",
      {
        method: "POST",
        headers: {
          "Authorization":     `Bearer ${tokenData.access_token}`,
          "developer-token":   process.env.GADS_DEVELOPER_TOKEN,
          "login-customer-id": "6994391072",
          "Content-Type":      "application/json",
        },
        body: JSON.stringify({
          query: "SELECT campaign.id, campaign.name, campaign.status FROM campaign LIMIT 5",
        }),
      }
    );
    const searchData = await searchRes.json();

    // 4. listAccessibleCustomers sem login-customer-id
    const accessRes = await fetch(
      "https://googleads.googleapis.com/v19/customers:listAccessibleCustomers",
      {
        method: "GET",
        headers: {
          "Authorization":   `Bearer ${tokenData.access_token}`,
          "developer-token": process.env.GADS_DEVELOPER_TOKEN,
        },
      }
    );
    const accessData = await accessRes.json();

    return res.status(200).json({
      token_ok: true,
      customer_info: customerData,
      search_campaigns: searchData,
      accessible_customers: accessData,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
