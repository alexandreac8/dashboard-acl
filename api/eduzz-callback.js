export default async function handler(req, res) {
  const { code, error } = req.query;

  if (error) return res.status(400).send(`Erro OAuth: ${error}`);
  if (!code)  return res.status(400).send("Código de autorização não encontrado.");

  const CLIENT_ID     = "663bc37d-36d6-4caf-a4ab-a04cf277f61e";
  const CLIENT_SECRET = "32fa719f46950d66e10d76182d84c0dc9d0b8633adaab954dc7baa52ce1d7a1f";
  const REDIRECT_URI  = "https://dashboard-acl.vercel.app/api/eduzz-callback";

  const tokenRes = await fetch("https://accounts-api.eduzz.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type:    "authorization_code",
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri:  REDIRECT_URI,
      code,
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenData.access_token) {
    return res.status(500).send(`<pre>Erro ao obter token:\n${JSON.stringify(tokenData, null, 2)}</pre>`);
  }

  // Mostra os tokens para copiar e salvar no código
  return res.send(`
    <html><body style="font-family:monospace;padding:30px;background:#f0f2f6">
      <h2 style="color:#0f1923">✅ Autorização concluída!</h2>
      <p>Copie o <strong>refresh_token</strong> abaixo e mande para o Claude:</p>
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:16px 0;word-break:break-all">
        <b>access_token:</b><br>${tokenData.access_token}<br><br>
        <b>refresh_token:</b><br>${tokenData.refresh_token || "(não retornado — salve o access_token)"}
      </div>
    </body></html>
  `);
}
