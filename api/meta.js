// Proxy seguro para o Meta Graph API.
// O token fica SOMENTE no servidor (process.env.META_TOKEN), nunca vai pro navegador.
// O frontend chama /api/meta?q=<caminho+query do graph, sem token> e o servidor
// adiciona o token, segue a paginação e devolve { data: [...] } já agregado.
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const TOKEN = process.env.META_TOKEN;
  if (!TOKEN) {
    return res.status(500).json({ error: "META_TOKEN não configurado no cofre da Vercel (Settings → Environment Variables)." });
  }

  const q = req.query.q;
  if (!q) return res.status(400).json({ error: "parâmetro 'q' obrigatório" });

  let url = `https://graph.facebook.com/v19.0/${q}${q.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(TOKEN)}`;
  const all = [];
  try {
    let pages = 0;
    while (url && pages < 50) {
      const r = await fetch(url);
      const data = await r.json();
      if (data.error) return res.status(400).json({ error: data.error.message });
      if (Array.isArray(data.data)) all.push(...data.data);
      url = (data.paging && data.paging.next) || null;
      pages++;
    }
    return res.status(200).json({ data: all });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
