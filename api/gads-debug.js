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

    const devToken = process.env.GADS_DEVELOPER_TOKEN;
    const query = "SELECT campaign.id, campaign.name FROM campaign LIMIT 1";

    async function call(url, extraHeaders = {}) {
      const r = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${access_token}`,
          "developer-token": devToken,
          "Content-Type": "application/json",
          ...extraHeaders,
        },
        body: JSON.stringify({ query }),
      });
      return { status: r.status, body: (await r.text()).slice(0, 300) };
    }

    const results = {};

    // 1. Rocket via MCC (atual)
    results.rocket_via_mcc = await call(
      "https://googleads.googleapis.com/v19/customers/1310129916/googleAds:searchStream",
      { "login-customer-id": "6994391072" }
    );

    // 2. MCC diretamente
    results.mcc_direto = await call(
      "https://googleads.googleapis.com/v19/customers/6994391072/googleAds:searchStream",
      { "login-customer-id": "6994391072" }
    );

    // 3. Rocket sem login-customer-id
    results.rocket_sem_mcc = await call(
      "https://googleads.googleapis.com/v19/customers/1310129916/googleAds:searchStream"
    );

    // 4. Rocket - search (não stream) via MCC
    results.rocket_search = await call(
      "https://googleads.googleapis.com/v19/customers/1310129916/googleAds:search",
      { "login-customer-id": "6994391072" }
    );

    // 5. MCC - search (não stream)
    results.mcc_search = await call(
      "https://googleads.googleapis.com/v19/customers/6994391072/googleAds:search",
      { "login-customer-id": "6994391072" }
    );

    return res.status(200).json(results);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
