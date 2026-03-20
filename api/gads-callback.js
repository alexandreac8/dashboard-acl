export default async function handler(req, res) {
  const { code, error } = req.query;

  if (error) {
    return res.status(400).send(`Erro na autorização: ${error}`);
  }
  if (!code) {
    return res.status(400).send("Código não encontrado.");
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     process.env.GADS_CLIENT_ID,
      client_secret: process.env.GADS_CLIENT_SECRET,
      redirect_uri:  "https://dashboard-acl.vercel.app/api/gads-callback",
      grant_type:    "authorization_code",
      code,
    }),
  });

  const data = await tokenRes.json();

  if (!data.refresh_token) {
    return res.status(500).send(
      `<pre>Erro ao obter token:\n${JSON.stringify(data, null, 2)}</pre>`
    );
  }

  return res.status(200).send(`
    <html><body style="font-family:monospace;padding:32px;background:#f0f2f6">
      <h2 style="color:#0f7a4a">✓ Autorização concluída!</h2>
      <p style="margin:16px 0">Copie o Refresh Token abaixo e atualize a variável <b>GADS_REFRESH_TOKEN</b> no Vercel:</p>
      <textarea rows="4" style="width:100%;padding:12px;font-size:13px;border-radius:6px;border:1px solid #ccc" onclick="this.select()">${data.refresh_token}</textarea>
      <p style="margin-top:16px;color:#64748b;font-size:12px">Access Token (temporário): ${data.access_token?.slice(0,40)}...</p>
    </body></html>
  `);
}
