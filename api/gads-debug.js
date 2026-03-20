import https from "https";

function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname,
      path,
      method: "POST",
      headers: {
        ...headers,
        "Content-Type":   "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
    };
    const req = https.request(options, (resp) => {
      let raw = "";
      resp.on("data", chunk => { raw += chunk; });
      resp.on("end", () => resolve({ status: resp.statusCode, body: raw }));
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    // 1. Token
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

    const query = "SELECT campaign.id, campaign.name FROM campaign LIMIT 1";

    // Teste via https nativo (evita qualquer quirk do fetch/undici)
    const r1 = await httpsPost(
      "googleads.googleapis.com",
      "/v19/customers/1310129916/googleAds:searchStream",
      {
        "authorization":     `Bearer ${access_token}`,
        "developer-token":   process.env.GADS_DEVELOPER_TOKEN,
        "login-customer-id": "6994391072",
      },
      { query }
    );

    // Teste fetch com X-Goog-Api-Client
    const r2 = await fetch(
      "https://googleads.googleapis.com/v19/customers/1310129916/googleAds:searchStream",
      {
        method: "POST",
        headers: {
          "Authorization":       `Bearer ${access_token}`,
          "developer-token":     process.env.GADS_DEVELOPER_TOKEN,
          "login-customer-id":   "6994391072",
          "Content-Type":        "application/json",
          "X-Goog-Api-Client":   "gl-node/18.0.0",
        },
        body: JSON.stringify({ query }),
      }
    );
    const t2 = await r2.text();

    return res.status(200).json({
      https_nativo: { status: r1.status, body: r1.body.slice(0, 400) },
      fetch_com_xgoog: { status: r2.status, body: t2.slice(0, 400) },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message, stack: err.stack?.slice(0, 300) });
  }
}
