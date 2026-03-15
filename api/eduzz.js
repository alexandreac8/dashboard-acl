export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { from, to } = req.body || {};

  const ACCESS_TOKEN = "edzpap_PA6-Vni0f_qX2tyEAMkeaFBZp0QB4H6ZncnDf8AWwn2-TtNQGG1bXG-BLIaahHjVHUF7iwNklQsuR36rwnJ";

  const startDate = from || new Date(Date.now() - 30*24*60*60*1000).toISOString().slice(0,10);
  const endDate   = to   || new Date().toISOString().slice(0,10);

  try {
    // Buscar todas as páginas de vendas
    let allSales = [];
    let page = 1;
    let totalPages = 1;

    do {
      const params = new URLSearchParams({
        startDate,
        endDate,
        referenceDate: "paidAt",
        page,
        itemsPerPage: 100,
      });

      const salesRes = await fetch(`https://api.eduzz.com/myeduzz/v1/sales?${params}`, {
        headers: { "Authorization": `bearer ${ACCESS_TOKEN}` },
      });
      const salesData = await salesRes.json();

      if (!salesData?.items) {
        return res.status(500).json({ error: "Eduzz API error", detail: salesData });
      }

      allSales = allSales.concat(salesData.items);
      totalPages = salesData.pages || 1;
      page++;
    } while (page <= totalPages && page <= 10);

    // Agrupar por produto
    const byProduct = {};
    let totalRevenue = 0;
    let totalSales   = 0;

    for (const sale of allSales) {
      if (sale.status !== "paid") continue;
      const name  = sale.product?.name || "Produto";
      const value = parseFloat(sale.total?.value || sale.netGain?.value || sale.grossGain?.value || 0);
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
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
