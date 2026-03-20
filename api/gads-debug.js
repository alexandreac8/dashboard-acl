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

    // 2. Verificar scopes do token
    const infoRes = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${tokenData.access_token}`
    );
    const tokenInfo = await infoRes.json();

    // 3. Verificar env vars (parcial)
    const devToken = process.env.GADS_DEVELOPER_TOKEN || "";

    return res.status(200).json({
      token_ok: true,
      scopes: tokenInfo.scope,
      email: tokenInfo.email,
      dev_token_length: devToken.length,
      dev_token_preview: devToken.slice(0, 6) + "...",
      refresh_token_preview: (process.env.GADS_REFRESH_TOKEN || "").slice(0, 10) + "...",
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
