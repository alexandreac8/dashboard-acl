export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { from, to } = req.body || {};

  const PUBLICKEY = "28448095";
  const APIKEY    = "bb768716a34a575";
  const EMAIL     = process.env.EDUZZ_EMAIL || "academiadelibras.adm@gmail.com";

  try {
    // 1. Gerar token
    const tokenRes = await fetch("https://api2.eduzz.com/credential/generate_token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publickey: PUBLICKEY, apikey: APIKEY, email: EMAIL }),
    });
    const tokenData = await tokenRes.json();
    const token = tokenData?.data?.token;
    if (!token) return res.status(500).json({ error: "Token Eduzz falhou", detail: tokenData });

    // 2. Buscar vendas
    const startDate = from || new Date(Date.now() - 30*24*60*60*1000).toISOString().slice(0,10);
    const endDate   = to   || new Date().toISOString().slice(0,10);

    const salesRes  = await fetch(`https://api2.eduzz.com/sale/get_list`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ start_date: startDate, end_date: endDate, page: 1 }),
    });
    const salesData = await salesRes.json();

    if (!salesData?.data) return res.status(500).json({ error: "Eduzz API error", detail: salesData });

    // 3. Agrupar por produto
    const byProduct = {};
    let totalRevenue = 0;
    let totalSales   = 0;

    for (const sale of salesData.data) {
      if (sale.sale_status !== "paid" && sale.sale_status !== "3") continue;
      const name  = sale.content_title || sale.product_title || "Produto";
      const value = parseFloat(sale.sale_net || sale.sale_value || 0);
      if (!byProduct[name]) byProduct[name] = { name, count: 0, revenue: 0 };
      byProduct[name].count   += 1;
      byProduct[name].revenue += value;
      totalRevenue += value;
      totalSales   += 1;
    }

    return res.status(200).json({
      totalSales,
      totalRevenue,
      products: Object.values(byProduct).sort((a,b) => b.revenue - a.revenue),
      raw: salesData.data.length,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
