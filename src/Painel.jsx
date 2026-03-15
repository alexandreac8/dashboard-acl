import { useState, useEffect } from "react";

const C = {
  bg:"#f0f2f6", surf:"#ffffff", card:"#ffffff",
  border:"#e2e8f0", border2:"#cbd5e1",
  text:"#0f1923", muted:"#94a3b8",
  green:"#0f7a4a", blue:"#2563eb", red:"#dc2626",
};

const brl = v => v == null ? "—" : `R$\u00a0${Number(v).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const today   = () => new Date().toISOString().slice(0,10);
const daysAgo = n => new Date(Date.now()-n*86400000).toISOString().slice(0,10);

export default function Painel() {
  const [from, setFrom]       = useState(daysAgo(30));
  const [to,   setTo]         = useState(today());
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const load = async (f, t) => {
    setLoading(true); setError(null); setData(null);
    try {
      const res = await fetch("/api/eduzz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: f, to: t }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error + (json.detail ? " — " + JSON.stringify(json.detail) : ""));
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(from, to); }, []);

  return (
    <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", background:C.bg, minHeight:"100vh" }}>
      {/* Header */}
      <div style={{ background:C.surf, borderBottom:`1px solid ${C.border}`, padding:"0 24px" }}>
        <div style={{ maxWidth:1100, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", height:52 }}>
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <a href="/" style={{ color:C.muted, fontSize:13, textDecoration:"none" }}>← Dashboard</a>
            <span style={{ color:C.border2 }}>|</span>
            <span style={{ fontSize:13, fontWeight:600, color:C.text }}>Painel de Vendas</span>
            <span style={{ fontSize:10, background:"#eff6ff", color:C.blue, border:`1px solid #bfdbfe`, borderRadius:4, padding:"2px 7px", fontFamily:"'JetBrains Mono',monospace", letterSpacing:1 }}>EDUZZ</span>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <input type="date" value={from} onChange={e=>setFrom(e.target.value)}
              style={{ background:"#f1f5f9", border:`1px solid ${C.border2}`, borderRadius:4, padding:"5px 8px", fontSize:12, color:C.text }} />
            <span style={{ color:C.muted, fontSize:12 }}>até</span>
            <input type="date" value={to} onChange={e=>setTo(e.target.value)}
              style={{ background:"#f1f5f9", border:`1px solid ${C.border2}`, borderRadius:4, padding:"5px 8px", fontSize:12, color:C.text }} />
            <button onClick={()=>load(from,to)} style={{ padding:"5px 14px", background:C.blue, border:"none", color:"#fff", borderRadius:4, cursor:"pointer", fontSize:12, fontWeight:600 }}>
              Buscar
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:"0 auto", padding:"28px 24px" }}>
        {loading && (
          <div style={{ textAlign:"center", color:C.muted, fontSize:13, padding:"60px 0" }}>Carregando vendas...</div>
        )}
        {error && (
          <div style={{ background:"#fef2f2", border:`1px solid #fecaca`, borderRadius:8, padding:"14px 18px", color:C.red, fontSize:12, fontFamily:"'JetBrains Mono',monospace" }}>
            {error}
          </div>
        )}
        {data?.debug_first_sale && (
          <pre style={{ background:"#1e293b", color:"#94f9b0", fontSize:10, padding:16, borderRadius:8, overflow:"auto", marginBottom:20 }}>
            {JSON.stringify(data.debug_first_sale, null, 2)}
          </pre>
        )}
        {data && !loading && (
          <>
            {/* Cards resumo */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16, marginBottom:28 }}>
              <Card label="Total de Vendas" value={String(data.totalSales)} color={C.blue} />
              <Card label="Faturamento" value={brl(data.totalRevenue)} color={C.green} />
              <Card label="Ticket Médio" value={data.totalSales > 0 ? brl(data.totalRevenue / data.totalSales) : "—"} color="#6d28d9" />
            </div>

            {/* Tabela por produto */}
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, overflow:"hidden" }}>
              <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}`, fontSize:12, fontWeight:600, color:C.text }}>
                Por Produto
              </div>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:"#f8fafc" }}>
                    <Th>Produto</Th>
                    <Th align="right">Vendas</Th>
                    <Th align="right">Faturamento</Th>
                    <Th align="right">Ticket Médio</Th>
                    <Th align="right">% do Total</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.products.length === 0 && (
                    <tr><td colSpan={5} style={{ textAlign:"center", padding:"32px", color:C.muted, fontSize:12 }}>Nenhuma venda paga no período</td></tr>
                  )}
                  {data.products.map((p,i) => (
                    <tr key={i} style={{ borderTop:`1px solid ${C.border}` }}>
                      <td style={{ padding:"12px 20px", fontSize:12, color:C.text, maxWidth:320, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.name}</td>
                      <td style={{ padding:"12px 20px", fontSize:12, color:C.text, textAlign:"right", fontFamily:"'JetBrains Mono',monospace" }}>{p.count}</td>
                      <td style={{ padding:"12px 20px", fontSize:12, color:C.green, textAlign:"right", fontFamily:"'JetBrains Mono',monospace", fontWeight:600 }}>{brl(p.revenue)}</td>
                      <td style={{ padding:"12px 20px", fontSize:12, color:C.text, textAlign:"right", fontFamily:"'JetBrains Mono',monospace" }}>{brl(p.revenue / p.count)}</td>
                      <td style={{ padding:"12px 20px", fontSize:12, color:C.muted, textAlign:"right", fontFamily:"'JetBrains Mono',monospace" }}>
                        {data.totalRevenue > 0 ? `${((p.revenue/data.totalRevenue)*100).toFixed(1)}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Card({ label, value, color }) {
  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:"20px 22px" }}>
      <div style={{ fontSize:10, color:C.muted, fontFamily:"'JetBrains Mono',monospace", letterSpacing:1.5, textTransform:"uppercase", marginBottom:8 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:700, color, fontFamily:"'JetBrains Mono',monospace" }}>{value}</div>
    </div>
  );
}

function Th({ children, align }) {
  return (
    <th style={{ padding:"10px 20px", fontSize:10, color:C.muted, fontFamily:"'JetBrains Mono',monospace", letterSpacing:1, textTransform:"uppercase", textAlign:align||"left", fontWeight:500 }}>
      {children}
    </th>
  );
}
