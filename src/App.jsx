import { useState, useCallback, useEffect } from "react";


const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: #f0f2f5; }
  ::-webkit-scrollbar-thumb { background: #c8d0da; border-radius: 3px; }
  input[type="date"]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.5; }
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-6px); max-height: 0; }
    to   { opacity: 1; transform: translateY(0);  max-height: 2000px; }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .slide-down { animation: slideDown 0.28s cubic-bezier(0.16,1,0.3,1) forwards; overflow: hidden; }
  .fade-up    { animation: fadeUp 0.22s ease forwards; }
  .row-camp:hover .camp-name { color: #2563eb !important; }
  .row-camp { transition: background 0.1s; }
  .row-camp:hover { background: #eff4ff !important; }
  .adrow:hover { background: #f5f7fa !important; }
  .creative-row:hover { background: #f8f9fc !important; }
  .btn-mode { transition: all 0.12s; }
  .btn-mode:hover { opacity: 0.85; }
  .chevron { transition: transform 0.22s cubic-bezier(0.16,1,0.3,1); display: inline-block; }
  .chevron.open { transform: rotate(90deg); }
  .price-input:focus { outline: 1px solid #2563eb; border-color: #2563eb !important; }

  /* ── MOBILE ── */
  @media (max-width: 640px) {
    /* Topbar */
    .topbar { height: auto !important; flex-direction: column !important; align-items: flex-start !important; padding: 10px 14px !important; gap: 8px !important; }
    .topbar-center { position: static !important; transform: none !important; display: flex !important; overflow-x: auto !important; width: 100% !important; padding-bottom: 2px; gap: 6px !important; }
    .topbar-center::-webkit-scrollbar { height: 0; }
    .topbar-right { width: 100%; display: flex; justify-content: flex-end; }

    /* Padding geral */
    .main-pad { padding: 12px 12px !important; }

    /* Filtros de data */
    .date-row { flex-direction: column !important; align-items: flex-start !important; gap: 10px !important; }
    .date-inputs { flex-wrap: wrap !important; gap: 6px !important; }

    /* KPI boxes */
    .kpi-section { flex-wrap: wrap !important; }
    .kpi-section > div { min-width: calc(50% - 5px) !important; }

    /* Tabela — scroll horizontal, campanha sticky */
    .table-wrap { -webkit-overflow-scrolling: touch; }
    .col-camp { position: sticky !important; left: 0 !important; background: inherit !important; z-index: 2 !important; }
    .col-camp-th { position: sticky !important; left: 36px !important; background: #fff !important; z-index: 3 !important; }

    /* Oculta colunas menos importantes no mobile */
    .hide-mobile { display: none !important; }
  }
`;

const C = {
  bg:"#f0f2f6", surf:"#ffffff", card:"#ffffff",
  border:"#e2e8f0", border2:"#cbd5e1",
  text:"#0f1923", muted:"#94a3b8", dim:"#dde3ec",
  gold:"#b45309", green:"#0f7a4a", red:"#dc2626",
  blue:"#2563eb", teal:"#0891b2", orange:"#c2540a",
  purple:"#6d28d9",
};

const fmt = {
  brl: v => (v==null||isNaN(v)) ? "—" : `R$\u00a0${Number(v).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}`,
  num: v => v==null ? "—" : Number(v).toLocaleString("pt-BR"),
  x:   v => (v==null||isNaN(v)||!isFinite(v)||v===0) ? "—" : `${Number(v).toFixed(2)}x`,
  pct: v => (v==null||isNaN(v)) ? "—" : `${Number(v).toFixed(1)}%`,
};

function localISODate(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function today()    { return localISODate(new Date()); }
function daysAgo(n) { const d=new Date(); d.setDate(d.getDate()-n); return localISODate(d); }
const _c15 = new Date(); _c15.setDate(_c15.getDate()-15);
const CUTOFF15 = localISODate(_c15);
const _c7 = new Date(); _c7.setDate(_c7.getDate()-7);
const CUTOFF7 = localISODate(_c7);

function parseDate(s) {
  if (!s) return null;
  // Remove hora: "11/03/2026 13:03" -> "11/03/2026"
  const datePart = s.trim().split(" ")[0];
  if (datePart.includes("/")) {
    const parts = datePart.split("/");
    if (parts.length === 3) {
      // Sempre DD/MM/YYYY (formato brasileiro)
      const [d, m, y] = parts;
      return `${y.padStart(4,"20")}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
    }
  }
  // Formato ISO: YYYY-MM-DD
  return datePart.slice(0,10);
}
function inRange(s,from,to) { const d=parseDate(s); return d&&d>=from&&d<=to; }
function roasColor(v) {
  if (!v||isNaN(v)||!isFinite(v)) return C.muted;
  return v>=4?C.green:v>=2?C.gold:v>=1?C.orange:C.red;
}

// ── Demo data ─────────────────────────────────────────────────────────────────
const CAMP_NAMES = [
  "PERPETUO | Produto X | Broad",
  "PERPETUO | Produto X | Retargeting",
  "PERPETUO | Produto Y | Interesses",
];
const ADSETS = {
  "PERPETUO | Produto X | Broad":       ["Adset 18-35 Mulheres","Adset Lookalike 1%","Adset Broad Sem Segm"],
  "PERPETUO | Produto X | Retargeting": ["Adset RT 7d","Adset RT 30d"],
  "PERPETUO | Produto Y | Interesses":  ["Adset Interesse A","Adset Interesse B","Adset Interesse C"],
};
const CREATIVES = ["video_depoimento_v1","video_problema_v2","carrossel_beneficios","estatica_oferta_v1","video_usp_v3","estatica_prova_v2"];

function makeDemoSales(preco=497) {
  const rows=[];
  for(let i=0;i<280;i++){
    const camp=CAMP_NAMES[Math.floor(Math.random()*CAMP_NAMES.length)];
    const adset=ADSETS[camp][Math.floor(Math.random()*ADSETS[camp].length)];
    const creative=CREATIVES[Math.floor(Math.random()*CREATIVES.length)];
    const capOff=Math.floor(Math.random()*60);
    const capDate=new Date(); capDate.setDate(capDate.getDate()-capOff);
    const saleOff=capOff-Math.floor(Math.random()*8);
    const saleDate=new Date(); saleDate.setDate(saleDate.getDate()-Math.max(0,saleOff));
    rows.push({
      capture_date:capDate.toISOString().slice(0,10),
      sale_date:saleDate.toISOString().slice(0,10),
      campaign:camp, adset, creative, value:preco,
    });
  }
  return rows;
}

function makeDemoMeta(){
  const ads=[];
  for(const camp of CAMP_NAMES)
    for(const adset of ADSETS[camp])
      for(const creative of CREATIVES.slice(0,2+Math.floor(Math.random()*3)))
        ads.push({
          campaign_name:camp, adset_name:adset, ad_name:creative,
          spend:200+Math.random()*1800,
          impressions:5000+Math.floor(Math.random()*40000),
          clicks:100+Math.floor(Math.random()*2000),
          leads:10+Math.floor(Math.random()*180),
        });
  return ads;
}

const DEMO_META = makeDemoMeta();
const DEMO_SALES_FIXED = makeDemoSales(810); // gerado uma vez, não muda




async function fetchSheetsGads(cfg, preco) {
  let rows = [];
  if (!cfg.csvUrl) return [];
  const res = await fetch(cfg.csvUrl);
  if (!res.ok) throw new Error(`CSV: erro ${res.status}`);
  const text = await res.text();
  const parseCSV = (str) => {
    const lines = str.trim().split("\n");
    return lines.map(line => {
      const cols = []; let cur = "", inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { inQ = !inQ; }
        else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ""; }
        else cur += ch;
      }
      cols.push(cur.trim());
      return cols;
    });
  };
  rows = parseCSV(text).slice(1);
  return rows
    .filter(r => {
      if (!r[+cfg.colSale]) return false;
      const campaign = (r[+cfg.colCampaign] || "").toLowerCase();
      return campaign.includes("gads");
    })
    .map(r => ({
      sale_date:    parseDate((r[+cfg.colSale] || "").trim()),
      capture_date: parseDate((r[7]            || "").trim()),
      campaign:     r[+cfg.colCampaign] || "",
      value:        preco,
    }));
}

// ── Semanal date helpers ──────────────────────────────────────────────────────
function parseCicloDate(ciclo) {
  // "QUI-12/03/26" → Date | null  (local midnight — evita offset UTC)
  if (!ciclo) return null;
  const idx = ciclo.indexOf("-");
  if (idx === -1) return null;
  const [d, m, y] = ciclo.slice(idx + 1).split("/");
  if (!d || !m || !y) return null;
  return new Date(parseInt(`20${y}`), parseInt(m) - 1, parseInt(d));
}

function isSameDay(d1, d2) {
  if (!d1 || !d2) return false;
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

// ── Demo Semanal ──────────────────────────────────────────────────────────────
const CICLOS_DEMO = ["SEG-09/03/26","QUI-05/03/26","SEG-02/03/26","QUI-26/02/26","SEG-23/02/26","QUI-19/02/26","SEG-16/02/26","QUI-12/02/26","SEG-09/02/26","QUI-05/02/26"];
const DEMO_SEMANAL_SALES = (() => {
  const rows = [];
  for (const ciclo of CICLOS_DEMO) {
    const webinar = parseCicloDate(ciclo);
    if (!webinar) continue;
    const leads = 80 + Math.floor(Math.random() * 220);
    for (let i = 0; i < leads; i++) {
      // capture date: dentro da janela do ciclo
      const capDate = new Date(webinar);
      capDate.setDate(webinar.getDate() - Math.floor(Math.random() * (ciclo.startsWith("SEG") ? 3 : 2)));
      // sale: pitch (mesmo dia webinar) ou dias depois
      const isPitch = Math.random() < 0.45;
      const saleDate = new Date(webinar);
      if (!isPitch) saleDate.setDate(webinar.getDate() + 1 + Math.floor(Math.random() * 20));
      rows.push({ ciclo_sem: ciclo, sale_date: saleDate.toISOString().slice(0,10), value: 810, is_pitch: isPitch });
    }
  }
  return rows;
})();
const DEMO_SEMANAL_SPEND = (() => {
  const map = {};
  for (const ciclo of CICLOS_DEMO) map[ciclo] = 1200 + Math.random() * 3000;
  return map;
})();

// ── Cruncher ──────────────────────────────────────────────────────────────────
function crunchAll(metaAds, salesRows, from, to) {
  const metaMap={};
  for(const r of metaAds){
    const c=r.campaign_name,a=r.adset_name,cr=r.ad_name;
    if(!metaMap[c]) metaMap[c]={};
    if(!metaMap[c][a]) metaMap[c][a]={};
    if(!metaMap[c][a][cr]) metaMap[c][a][cr]={spend:0,impressions:0,clicks:0,leads:0};
    const m=metaMap[c][a][cr];
    m.spend+=r.spend; m.impressions+=r.impressions; m.clicks+=r.clicks; m.leads+=r.leads;
  }

  function calc(subset, spend, leads) {
    // POR CAPTURA: leads captados no período → quanto geraram (agora ou no futuro próximo)
    const byCap  = subset.filter(s=>inRange(s.capture_date,from,to));
    // ACUMULADO: tudo que entrou em caixa no período (sale_date), independente de quando capturou
    const bySale = subset.filter(s=>inRange(s.sale_date,from,to));
    // Lag = vendas em caixa no período de leads captados ANTES do período
    const lag    = bySale.filter(s=>!inRange(s.capture_date,from,to));
    // Vendas em caixa de leads captados NO período
    const saleNow= bySale.filter(s=>inRange(s.capture_date,from,to));

    const revCap =byCap.reduce((a,s)=>a+s.value,0);
    // Acumulado = lag (passado) + vendas presentes (captados agora e já compraram)
    const revSale=bySale.reduce((a,s)=>a+s.value,0); // já é a soma correta
    const revLag =lag.reduce((a,s)=>a+s.value,0);
    const cvr    =leads>0?(byCap.length/leads)*100:null;
    // avgDays: média de dias entre capture_date e sale_date (só vendas com capture_date)
    const daysArr=bySale.filter(s=>s.capture_date).map(s=>Math.max(0,Math.round((new Date(s.sale_date)-new Date(s.capture_date))/86400000)));
    const daysCount=daysArr.length;
    const avgDays=daysCount>0?daysArr.reduce((a,b)=>a+b,0)/daysCount:null;
    return {
      revCap,  salesCap:byCap.length,
      roasCap: spend>0&&revCap>0?revCap/spend:null,
      cpaCap:  byCap.length>0?spend/byCap.length:null,
      revSale, salesSale:bySale.length,
      roasSale:spend>0&&revSale>0?revSale/spend:null,
      cpaSale: bySale.length>0?spend/bySale.length:null,
      revLag,  lagCount:lag.length,
      salesNow:saleNow.length, cvr,
      cpl:leads>0?spend/leads:null,
      avgDays, daysCount,
    };
  }

  const allCamps=new Set([...Object.keys(metaMap),...salesRows.map(s=>s.campaign)]);
  const campaigns=[];

  for(const camp of allCamps){
    const cSales=salesRows.filter(s=>s.campaign===camp);
    const cAdsets=metaMap[camp]||{};
    let cSpend=0,cImp=0,cClicks=0,cLeads=0;
    for(const a of Object.values(cAdsets))
      for(const m of Object.values(a))
        { cSpend+=m.spend; cImp+=m.impressions; cClicks+=m.clicks; cLeads+=m.leads; }
    const cm=calc(cSales,cSpend,cLeads);
    cm.ctr=cClicks>0&&cImp>0?(cClicks/cImp)*100:null;

    const adsets=[];
    const FALLBACK_ADSET="(sem UTM)";
    const allAdsets=new Set([...Object.keys(cAdsets),...cSales.map(s=>s.adset||FALLBACK_ADSET)]);
    for(const adset of allAdsets){
      const aSales=adset===FALLBACK_ADSET?cSales.filter(s=>!s.adset):cSales.filter(s=>s.adset===adset);
      const aMeta=cAdsets[adset]||{};
      let asp=0,aim=0,acl=0,ald=0;
      for(const m of Object.values(aMeta))
        { asp+=m.spend; aim+=m.impressions; acl+=m.clicks; ald+=m.leads; }
      const am=calc(aSales,asp,ald);
      am.ctr=acl>0&&aim>0?(acl/aim)*100:null;

      const creatives=[];
      const FALLBACK_CR="(sem criativo)";
      const allCr=new Set([...Object.keys(aMeta),...aSales.map(s=>s.creative||FALLBACK_CR)]);
      for(const cr of allCr){
        const crS=cr===FALLBACK_CR?aSales.filter(s=>!s.creative):aSales.filter(s=>s.creative===cr);
        const crM=aMeta[cr]||{spend:0,impressions:0,clicks:0,leads:0};
        const crm=calc(crS,crM.spend,crM.leads);
        crm.ctr=crM.clicks>0&&crM.impressions>0?(crM.clicks/crM.impressions)*100:null;
        creatives.push({name:cr,spend:crM.spend,impressions:crM.impressions,clicks:crM.clicks,leads:crM.leads,...crm});
      }
      creatives.sort((a,b)=>b.spend-a.spend);
      adsets.push({name:adset,spend:asp,impressions:aim,clicks:acl,leads:ald,...am,creatives});
    }
    adsets.sort((a,b)=>b.spend-a.spend);
    campaigns.push({name:camp,spend:cSpend,impressions:cImp,clicks:cClicks,leads:cLeads,...cm,adsets});
  }
  return campaigns.filter(c=>c.spend>0||c.salesCap>0||c.salesSale>0).sort((a,b)=>b.spend-a.spend);
}

// ── APIs ──────────────────────────────────────────────────────────────────────
async function fetchMetaAds(cfg,from,to){
  const fields="campaign_name,adset_name,ad_name,spend,impressions,clicks,actions";
  const timeRange=encodeURIComponent(JSON.stringify({since:from,until:to}));
  const filtering=encodeURIComponent(JSON.stringify([{field:"campaign.name",operator:"CONTAIN",value:"M5"}]));
  const baseUrl=`https://graph.facebook.com/v19.0/${cfg.metaAccountId}/insights?fields=${fields}&time_range=${timeRange}&level=ad&filtering=${filtering}&limit=500&access_token=${cfg.metaToken}`;
  const all=[];
  let url=baseUrl;
  while(url){
    const res=await fetch(url); const data=await res.json();
    if(data.error) throw new Error(`Meta API: ${data.error.message}`);
    all.push(...(data.data||[]));
    url=data.paging?.next||null;
  }
  return all.map(r=>({
    campaign_name:r.campaign_name, adset_name:r.adset_name, ad_name:r.ad_name,
    spend:parseFloat(r.spend||0), impressions:parseInt(r.impressions||0), clicks:parseInt(r.clicks||0),
    leads:parseInt((r.actions||[]).find(a=>a.action_type==="lead")?.value||0),
  }));
}

async function fetchSheets(cfg,preco){
  let rows=[];
  if(cfg.csvUrl){
    const res=await fetch(cfg.csvUrl);
    if(!res.ok) throw new Error(`CSV: erro ao buscar planilha (${res.status})`);
    const text=await res.text();
    const parseCSV=(str)=>{
      const lines=str.trim().split("\n");
      return lines.map(line=>{
        const cols=[]; let cur="", inQ=false;
        for(let i=0;i<line.length;i++){
          const ch=line[i];
          if(ch==='"'){ inQ=!inQ; }
          else if(ch===','&&!inQ){ cols.push(cur.trim()); cur=""; }
          else cur+=ch;
        }
        cols.push(cur.trim());
        return cols;
      });
    };
    const all=parseCSV(text);
    rows=all.slice(1);
  } else {
    const url=`https://sheets.googleapis.com/v4/spreadsheets/${cfg.sheetsId}/values/${encodeURIComponent(cfg.sheetsRange)}?key=${cfg.sheetsApiKey}`;
    const res=await fetch(url); const data=await res.json();
    if(data.error) throw new Error(`Sheets API: ${data.error.message}`);
    rows=(data.values||[]).slice(1);
  }
  return rows
    .filter(r=>{
      if(r.length===0) return false;
      if(!r[+cfg.colSale]) return false;
      // Só vendas do Meta Ads — source contém "PRF" ou "M-SD"
      const source=(r[+cfg.colSource]||"").trim().toUpperCase().replace(/\s+/g,"");
      if(source===""||source==="GADS"||source==="GOOGLE"||source==="YOUTUBE"||source==="ORGANIC") return false;
      if(source.length>0 && !source.includes("PRF") && !source.includes("M-SD") && !source.includes("META") && !source.includes("FACE")) return false;
      // Exclui campanhas M6 (semanal) — pertencem à aba META SEMANAL
      const campaign=(r[+cfg.colCampaign]||"").toUpperCase();
      if(campaign.includes("M6")) return false;
      return true;
    })
    .map(r=>{
      const sale_date    = parseDate((r[+cfg.colSale]||"").trim());
      // DATA WEBINARIO = quando o lead se cadastrou no webinar (captura)
      // Se vazio, capture_date fica null → só entra no Acumulado, nunca no Por Captura
      const capture_date = parseDate((r[+cfg.colCapture]||"").trim()) || null;
      return {
        capture_date,
        sale_date,
        campaign:  r[+cfg.colCampaign]||"",
        adset:     r[+cfg.colAdset]||"",
        creative:  r[+cfg.colCreative]||"",
        value:     preco,
      };
    });
}

// ── UI atoms ──────────────────────────────────────────────────────────────────
function KPI({label,value,color,sub,subColor,darkBg,labelSize,valueSize,subSize}){
  const labelClr = darkBg ? "rgba(255,255,255,0.45)" : C.muted;
  const subClr   = darkBg ? "rgba(255,255,255,0.35)" : (subColor||C.muted);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      <span style={{fontSize:labelSize||8,letterSpacing:2,textTransform:"uppercase",color:labelClr,fontFamily:"'JetBrains Mono',monospace"}}>{label}</span>
      <span style={{fontSize:valueSize||16,fontWeight:600,color:color||C.text,fontFamily:"'JetBrains Mono',monospace",lineHeight:1}}>{value}</span>
      {sub&&<span style={{fontSize:subSize||10,color:subClr,fontFamily:"'JetBrains Mono',monospace"}}>{sub}</span>}
    </div>
  );
}

function Cell({v,color,size}){
  return <span style={{color:color||C.text,fontFamily:"'JetBrains Mono',monospace",fontSize:size||12}}>{v}</span>;
}

function RoasBadge({v}){
  if(!v||isNaN(v)||!isFinite(v)) return <Cell v="—" color={C.muted}/>;
  const c = v>=1 ? C.green : C.red;
  return <span style={{color:c,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",fontSize:12,background:c+"18",padding:"2px 8px",borderRadius:3,border:`1px solid ${c}33`}}>{fmt.x(v)}</span>;
}

function CvrBadge({v}){
  if(!v||isNaN(v)) return <Cell v="—" color={C.muted}/>;
  const c=v>=5?C.green:v>=2?C.gold:C.orange;
  return <span style={{color:c,fontFamily:"'JetBrains Mono',monospace",fontSize:12}}>{fmt.pct(v)}</span>;
}

function ModeToggle({mode,onChange}){
  return(
    <div style={{display:"flex",gap:4,background:C.surf,border:`1px solid ${C.border}`,borderRadius:6,padding:3}}>
      {[["capture","📅 Por Captura"],["caixa","💰 Acumulado"]].map(([k,l])=>(
        <button key={k} className="btn-mode" onClick={()=>onChange(k)} style={{
          padding:"5px 14px",borderRadius:4,border:"none",cursor:"pointer",
          background:mode===k?"#eff4ff":"transparent",
          color:mode===k?C.blue:C.muted,
          fontFamily:"'JetBrains Mono',monospace",fontSize:10,letterSpacing:1,fontWeight:mode===k?600:400,
          boxShadow:mode===k?"0 1px 4px #00000060":"none",
        }}>{l}</button>
      ))}
    </div>
  );
}

// ── Preço editável ────────────────────────────────────────────────────────────
function PriceWidget({preco,onChange}){
  const [editing,setEditing]=useState(false);
  const [draft,setDraft]=useState(String(preco));
  const confirm=()=>{
    const v=parseFloat(draft.replace(",","."));
    if(!isNaN(v)&&v>0) onChange(v);
    setEditing(false);
  };
  return(
    <div style={{display:"flex",alignItems:"center",gap:8,background:"#f8fafc",border:`1px solid ${C.border2}`,borderRadius:6,padding:"6px 12px"}}>
      <span style={{fontSize:8,letterSpacing:2,textTransform:"uppercase",color:C.muted,fontFamily:"'JetBrains Mono',monospace",whiteSpace:"nowrap"}}>Preço do Produto</span>
      {editing?(
        <>
          <span style={{color:C.muted,fontSize:11}}>R$</span>
          <input
            className="price-input"
            autoFocus value={draft}
            onChange={e=>setDraft(e.target.value)}
            onBlur={confirm}
            onKeyDown={e=>{if(e.key==="Enter")confirm();if(e.key==="Escape")setEditing(false);}}
            style={{
              width:90,background:"#f1f5f9",border:`1px solid ${C.border2}`,borderRadius:4,
              padding:"3px 7px",color:C.gold,fontFamily:"'JetBrains Mono',monospace",fontSize:14,fontWeight:600,
            }}
          />
          <button onClick={confirm} style={{padding:"2px 10px",background:C.blue,border:"none",color:"#fff",borderRadius:3,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",fontSize:10}}>OK</button>
        </>
      ):(
        <>
          <span style={{color:C.gold,fontFamily:"'JetBrains Mono',monospace",fontSize:15,fontWeight:600}}>{fmt.brl(preco)}</span>
          <button onClick={()=>{setDraft(String(preco));setEditing(true);}} style={{
            padding:"2px 8px",background:"transparent",border:`1px solid ${C.border2}`,color:C.muted,
            borderRadius:3,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",fontSize:9,letterSpacing:1,
          }}>editar</button>
        </>
      )}
    </div>
  );
}

// ── Action Badge ──────────────────────────────────────────────────────────────
function ActionBadge({roas}){
  if(roas==null||isNaN(roas)||!isFinite(roas)) return <span style={{color:C.muted,fontFamily:"'JetBrains Mono',monospace",fontSize:10}}>—</span>;
  if(roas<1)  return <span style={{background:"#fee2e2",color:"#dc2626",fontWeight:700,fontFamily:"'JetBrains Mono',monospace",fontSize:10,padding:"3px 10px",borderRadius:4,border:"1px solid #fca5a5",letterSpacing:1}}>⛔ PAUSAR</span>;
  if(roas<=2) return <span style={{background:"#fefce8",color:"#b45309",fontWeight:700,fontFamily:"'JetBrains Mono',monospace",fontSize:10,padding:"3px 10px",borderRadius:4,border:"1px solid #fcd34d",letterSpacing:1}}>⏸ MANTER</span>;
  return       <span style={{background:"#dcfce7",color:"#15803d",fontWeight:700,fontFamily:"'JetBrains Mono',monospace",fontSize:10,padding:"3px 10px",borderRadius:4,border:"1px solid #86efac",letterSpacing:1}}>🚀 ESCALAR</span>;
}

// ── Adset Action Badge (smaller, inline) ──────────────────────────────────────
function AdsetActionBadge({roas}){
  if(roas==null||isNaN(roas)||!isFinite(roas)) return null;
  if(roas<1)  return <span style={{background:"#fee2e2",color:"#dc2626",fontWeight:600,fontFamily:"'JetBrains Mono',monospace",fontSize:9,padding:"2px 7px",borderRadius:3,marginLeft:8}}>⛔ PAUSAR</span>;
  if(roas<=2) return <span style={{background:"#fefce8",color:"#b45309",fontWeight:600,fontFamily:"'JetBrains Mono',monospace",fontSize:9,padding:"2px 7px",borderRadius:3,marginLeft:8}}>⏸ MANTER</span>;
  return       <span style={{background:"#dcfce7",color:"#15803d",fontWeight:600,fontFamily:"'JetBrains Mono',monospace",fontSize:9,padding:"2px 7px",borderRadius:3,marginLeft:8}}>🚀 ESCALAR</span>;
}

// ── TH helper ─────────────────────────────────────────────────────────────────
function TH({label,k,sort,onSort,right,gold}){
  const active=sort.key===k;
  return(
    <th onClick={()=>onSort(k)} style={{
      padding:"8px 12px",cursor:"pointer",userSelect:"none",whiteSpace:"nowrap",
      fontSize:8,letterSpacing:1.5,textTransform:"uppercase",
      color:active?C.gold:gold?C.gold+"88":C.muted,
      textAlign:right?"right":"left",
      borderBottom:`1px solid ${C.border}`,
      fontFamily:"'JetBrains Mono',monospace",
    }}>
      {label}{active?(sort.dir===-1?" ↓":" ↑"):""}
    </th>
  );
}

// Cols: Gasto | Leads | CPL | CTR | Faturamento | Vendas | Lead→Venda | ROAS
// (pipeline e lag removidos da tabela; lag permanece só nos KPIs)

// ── Creatives table ───────────────────────────────────────────────────────────
function CreativesTable({creatives,mode}){
  const [sort,setSort]=useState({key:"spend",dir:-1});
  const isCap=mode==="capture";
  const sorted=[...creatives].sort((a,b)=>{
    const av=a[sort.key]??-Infinity,bv=b[sort.key]??-Infinity;
    return (av-bv)*sort.dir;
  });
  const onSort=k=>setSort(s=>({key:k,dir:s.key===k?-s.dir:-1}));
  const sh={sort,onSort,right:true};
  return(
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
        <thead style={{position:"relative",zIndex:10}}>
          <tr>
            <TH label="Criativo" k="name" sort={sort} onSort={onSort} />
            <TH label="Gasto" k="spend" {...sh} />
            <TH label="Leads" k="leads" {...sh} />
            <TH label="CPL" k="cpl" {...sh} />
            <TH label="CTR" k="ctr" {...sh} />
            <TH label="Faturamento" k={isCap?"revCap":"revSale"} {...sh} />
            <TH label="Vendas" k={isCap?"salesCap":"salesSale"} {...sh} />
            <TH label="Lead→Venda" k="cvr" {...sh} />
            <TH label="ROAS" k={isCap?"roasCap":"roasSale"} sort={sort} onSort={onSort} right gold />
          </tr>
        </thead>
        <tbody>
          {sorted.map((cr,i)=>{
            const rev  =isCap?cr.revCap:cr.revSale;
            const sales=isCap?cr.salesCap:cr.salesSale;
            const roas =isCap?cr.roasCap:cr.roasSale;
            return(
              <tr key={cr.name} className="creative-row" style={{borderBottom:`1px solid ${C.border}`,background:i%2?"#f8fafc":"transparent"}}>
                <td style={{padding:"8px 10px",maxWidth:240,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  <span style={{fontSize:9,color:C.muted,marginRight:6}}>▸</span>
                  <span style={{color:"#475569",fontFamily:"'JetBrains Mono',monospace",fontSize:11}} title={cr.name}>{cr.name}</span>
                </td>
                <td style={{padding:"8px 10px",textAlign:"right"}}><Cell v={fmt.brl(cr.spend)} color={C.red}/></td>
                <td style={{padding:"8px 10px",textAlign:"right"}}><Cell v={fmt.num(cr.leads)} color={C.muted}/></td>
                <td style={{padding:"8px 10px",textAlign:"right"}}><Cell v={fmt.brl(cr.cpl)} color={C.muted}/></td>
                <td style={{padding:"8px 10px",textAlign:"right"}}><Cell v={fmt.pct(cr.ctr)} color={C.muted}/></td>
                <td style={{padding:"8px 10px",textAlign:"right"}}><Cell v={fmt.brl(rev)} color={C.green}/></td>
                <td style={{padding:"8px 10px",textAlign:"right"}}><Cell v={fmt.num(sales)}/></td>
                <td style={{padding:"8px 10px",textAlign:"right"}}><CvrBadge v={cr.cvr}/></td>
                <td style={{padding:"8px 10px",textAlign:"right"}}><RoasBadge v={roas}/></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Adset row ─────────────────────────────────────────────────────────────────
function AdsetRow({adset,mode,acaoMode}){
  const [open,setOpen]=useState(false);
  const isCap=mode==="capture";
  const roas=isCap?adset.roasCap:adset.roasSale;
  const rev =isCap?adset.revCap:adset.revSale;
  const sales=isCap?adset.salesCap:adset.salesSale;
  return(
    <>
      <tr className="adrow" onClick={()=>setOpen(o=>!o)} style={{
        cursor:"pointer",borderBottom:open?"none":`1px solid ${C.border}`,
        background:open?"#eff4ff":"transparent",
      }}>
        <td style={{padding:"9px 12px 9px 32px",width:28}}>
          <span className={`chevron${open?" open":""}`} style={{color:C.muted,fontSize:10}}>▶</span>
        </td>
        <td style={{padding:"9px 12px",color:"#475569",fontFamily:"'JetBrains Mono',monospace",fontSize:11,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:220}} title={adset.name}>{adset.name}</td>
        <td style={{padding:"9px 12px",textAlign:"right"}}><Cell v={fmt.brl(adset.spend)} color={C.red}/></td>
        <td style={{padding:"9px 12px",textAlign:"right"}}><Cell v={fmt.num(adset.leads)} color={C.muted}/></td>
        <td style={{padding:"9px 12px",textAlign:"right"}}><Cell v={fmt.brl(adset.cpl)} color={C.muted}/></td>
        <td style={{padding:"9px 12px",textAlign:"right"}}><Cell v={fmt.pct(adset.ctr)} color={C.muted}/></td>
        <td style={{padding:"9px 12px",textAlign:"right"}}><Cell v={fmt.brl(rev)} color={C.green}/></td>
        <td style={{padding:"9px 12px",textAlign:"right"}}><Cell v={fmt.num(sales)}/></td>
        <td style={{padding:"9px 12px",textAlign:"right"}}><CvrBadge v={adset.cvr}/></td>
        <td style={{padding:"9px 12px",textAlign:"right"}}><RoasBadge v={roas}/></td>
        {acaoMode&&isCap&&<td style={{padding:"9px 12px",textAlign:"center",borderLeft:`2px solid #fcd34d`}}><AdsetActionBadge roas={roas}/></td>}
      </tr>
      {open&&(
        <tr>
          <td colSpan={10} style={{padding:0,background:"#f8fafc",borderBottom:`1px solid ${C.border}`}}>
            <div className="slide-down" style={{borderLeft:`3px solid ${C.blue}44`,marginLeft:48}}>
              <div style={{padding:"8px 0 4px 12px",fontSize:8,letterSpacing:2,color:C.muted,textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace"}}>
                Criativos · {adset.creatives.length} ads · web_utm_content
              </div>
              <CreativesTable creatives={adset.creatives} mode={mode}/>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Campaign row ──────────────────────────────────────────────────────────────
function CampaignRow({camp,mode,idx,acaoMode}){
  const [open,setOpen]=useState(false);
  const isCap=mode==="capture";
  const roas =isCap?camp.roasCap:camp.roasSale;
  const rev  =isCap?camp.revCap:camp.revSale;
  const sales=isCap?camp.salesCap:camp.salesSale;
  const roasBg=!roas||isNaN(roas)||!isFinite(roas)?"transparent"
    :roas>=4?C.green+"14":roas>=2?C.gold+"14":roas>=1?C.orange+"14":C.red+"14";
  return(
    <>
      <tr className="row-camp" onClick={()=>setOpen(o=>!o)} style={{
        cursor:"pointer",
        background:open?"#eff4ff":idx%2===0?"transparent":"#f8fafc",
        borderBottom:open?"none":`1px solid ${C.border}`,
      }}>
        <td style={{padding:"13px 14px",width:36}}>
          <span className={`chevron${open?" open":""}`} style={{color:open?C.blue:C.muted,fontSize:11}}>▶</span>
        </td>
        <td className="col-camp" style={{padding:"13px 14px"}}>
          <span className="camp-name" style={{color:open?C.blue:"#1e293b",fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:12,fontWeight:500,transition:"color 0.1s"}}>{camp.name}</span>
          <div style={{marginTop:3,fontSize:9,color:C.muted,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1}}>
            {camp.adsets.length} conjuntos · {camp.adsets.reduce((s,a)=>s+a.creatives.length,0)} criativos
          </div>
        </td>
        <td style={{padding:"13px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.red}}>{fmt.brl(camp.spend)}</td>
        <td style={{padding:"13px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.muted}}>{fmt.num(camp.leads)}</td>
        <td style={{padding:"13px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.muted}}>{fmt.brl(camp.cpl)}</td>
        <td className="hide-mobile" style={{padding:"13px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.muted}}>{fmt.pct(camp.ctr)}</td>
        <td style={{padding:"13px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.green}}>{fmt.brl(rev)}</td>
        <td style={{padding:"13px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.text}}>{fmt.num(sales)}</td>
        <td className="hide-mobile" style={{padding:"13px 14px",textAlign:"right"}}><CvrBadge v={camp.cvr}/></td>
        <td style={{padding:"13px 14px",textAlign:"right",background:roasBg,borderRadius:4}}><RoasBadge v={roas}/></td>
        {!isCap&&<td style={{padding:"13px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.muted}}>{camp.avgDays!=null?`${Math.round(camp.avgDays)}d`:"—"}</td>}
      </tr>
      {open&&(
        <tr>
          <td colSpan={!isCap?11:10} style={{padding:0,background:"#f1f5f9",borderBottom:`1px solid ${C.border2}`}}>
            <div className="slide-down" style={{borderLeft:`3px solid ${C.blue}66`,marginLeft:36}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead style={{position:"relative",zIndex:10}}>
                  <tr style={{borderBottom:`1px solid ${C.border}`}}>
                    <th style={{width:28}}/>
                    {["Conjunto · web_utm_term","Gasto","Leads","CPL","CTR","Faturamento","Vendas","Lead→Venda"].map((h,i)=>(
                      <th key={h} style={{padding:"6px 12px",fontSize:8,letterSpacing:1.5,textTransform:"uppercase",color:C.muted,fontFamily:"'JetBrains Mono',monospace",textAlign:i===0?"left":"right",whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                    <th style={{padding:"6px 12px",fontSize:8,letterSpacing:1.5,textTransform:"uppercase",color:C.gold+"88",fontFamily:"'JetBrains Mono',monospace",textAlign:"right"}}>ROAS</th>
                    {acaoMode&&isCap&&<th style={{padding:"6px 12px",fontSize:8,letterSpacing:1.5,textTransform:"uppercase",color:"#d97706",fontFamily:"'JetBrains Mono',monospace",textAlign:"center",borderLeft:`2px solid #fcd34d`}}>AÇÃO</th>}
                  </tr>
                </thead>
                <tbody>
                  {camp.adsets.map(a=><AdsetRow key={a.name} adset={a} mode={mode} acaoMode={acaoMode}/>)}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Config ────────────────────────────────────────────────────────────────────
const DEFAULT_CFG={
  metaToken:"EAAgp729x6MEBQ3YPgI2lpQiZCJ09dZC27LToLc2vaHiaCzSgZBztQlEhPXjLDW5JwU1gCcqM36UzZASWiiSsXc4U3iBzcXQS2ozIZBnfdNqs8SHT2EmKUvGrSIK5ue82nZAtFkjV56msvBEWw6V1fh1yYD8S4b5VRi3VOUguu2ZAcd968DZAfu5LYgKeSA2PQNX4PzMZD",metaAccountId:"act_975999499140043",
  gadsUrl:"",
  gadsClientId:"753189472569-g7s2mqj22euh8fhmfslvcpevs8lqm7vq.apps.googleusercontent.com",
  gadsClientSecret:"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",
  gadsRefreshToken:"1//04uBeWfxEjWekCgYIARAAGAQSNwF-L9IrAb06XS8B-L-Fn7M5oTne0gJICvRzz3KFE79cJDwiIbSdx-XrhKRA7ZIV0vb3YkUM_zw",
  gadsDeveloperToken:"4Ov9qn2jbS4yfoQoTI6YlA",
  gadsCustomerId:"1310129916",
  csvUrl:"https://docs.google.com/spreadsheets/d/e/2PACX-1vRQndaZj_w3JivW0cGLbMEuNloBPrhhKZazg64t-_qRLuwwrSdyuMVwRv0HwXEhdaVUuFML-0bVyGrZ/pub?gid=0&single=true&output=csv",
  sheetsId:"",sheetsApiKey:"",sheetsRange:"Vendas!A:H",
  colSale:"0",colCapture:"7",colCampaign:"2",colAdset:"5",colCreative:"4",colSource:"3",
};

function ConfigPanel({cfg,onSave}){
  const [f,setF]=useState(cfg);
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const Inp=({k,pw,ph})=>(
    <input type={pw?"password":"text"} value={f[k]||""} placeholder={ph}
      onChange={e=>set(k,e.target.value)}
      style={{width:"100%",background:"#f1f5f9",border:`1px solid ${C.border2}`,borderRadius:4,padding:"8px 10px",color:C.text,fontFamily:"'JetBrains Mono',monospace",fontSize:12,marginBottom:12}}
    />
  );
  const Lbl=({c})=><label style={{fontSize:8,letterSpacing:2,textTransform:"uppercase",color:C.muted,display:"block",marginBottom:4}}>{c}</label>;
  const Sec=({t,children})=>(
    <div style={{marginBottom:24}}>
      <p style={{fontSize:8,letterSpacing:3,textTransform:"uppercase",color:C.gold,marginBottom:14}}>{t}</p>
      <div style={{paddingLeft:14,borderLeft:`2px solid ${C.border2}`}}>{children}</div>
    </div>
  );
  return(
    <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",maxWidth:580}}>
      <h2 style={{color:C.text,fontSize:15,fontWeight:600,marginBottom:24}}>Configurações</h2>
      <Sec t="Meta Ads API">
        <Lbl c="Access Token (longa duração)"/><Inp k="metaToken" pw/>
        <Lbl c="Ad Account ID (act_XXXXXXX)"/><Inp k="metaAccountId" ph="act_123456789"/>
      </Sec>
      <Sec t="Planilha de Vendas (Google Sheets CSV)">
        <Lbl c="URL do CSV público (Arquivo → Publicar na web → CSV)"/>
        <Inp k="csvUrl" ph="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"/>
        <Lbl c="URL Planilha Google Ads (RELATORIO_DASH_CLAUDE)"/>
        <Inp k="gadsUrl" ph="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"/>
        <p style={{fontSize:10,color:C.muted,marginBottom:12}}>Colunas detectadas automaticamente conforme sua planilha:</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
          {[
            ["colSale","0 — DATA DE COMPRA"],
            ["colCapture","7 — DATA WEBINARIO"],
            ["colCampaign","2 — CAMPAIGN"],
            ["colAdset","5 — WEB_UTM (GRUPO)"],
            ["colCreative","4 — AD NAME"],
          ].map(([k,l])=>(
            <div key={k}>
              <Lbl c={l}/>
              <input value={f[k]||""} onChange={e=>set(k,e.target.value)}
                style={{width:"100%",background:"#f1f5f9",border:`1px solid ${C.border2}`,borderRadius:4,padding:"7px 8px",color:C.gold,fontFamily:"'JetBrains Mono',monospace",fontSize:13,marginBottom:10}}
              />
            </div>
          ))}
        </div>
        <p style={{fontSize:10,color:C.muted,marginTop:4}}>⚠ Valor da venda = campo "Preço do Produto" no topo do dashboard.</p>
      </Sec>
      <button onClick={()=>onSave(f)} style={{padding:"10px 26px",background:C.blue,color:"#fff",border:"none",borderRadius:5,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:600,fontSize:13}}>
        Salvar e Conectar
      </button>
    </div>
  );
}



async function fetchMetaM6Daily(cfg) {
  // Pega gasto diário dos últimos 90 dias das campanhas M6 (com paginação)
  const today = new Date();
  const from  = new Date(today); from.setDate(today.getDate() - 90);
  const fmt90 = (d) => d.toISOString().slice(0,10);
  const timeRange = encodeURIComponent(JSON.stringify({ since: fmt90(from), until: fmt90(today) }));
  const fields = "campaign_name,spend,date_start";
  const filtering = encodeURIComponent(JSON.stringify([{field:"campaign.name",operator:"CONTAIN",value:"M6"}]));
  const baseUrl = `https://graph.facebook.com/v19.0/${cfg.metaAccountId}/insights?fields=${fields}&time_range=${timeRange}&time_increment=1&level=campaign&filtering=${filtering}&limit=500&access_token=${cfg.metaToken}`;
  const all = [];
  let url = baseUrl;
  while (url) {
    const res  = await fetch(url);
    const data = await res.json();
    if (data.error) throw new Error(`Meta API: ${data.error.message}`);
    all.push(...(data.data || []));
    url = data.paging?.next || null;
  }
  return all;
}

function getCaptureDatesForCiclo(cicloTag) {
  // Dado "SEG-16/03/26" → retorna { start: Date(sex 13/03), end: Date(seg 16/03) }
  // Dado "QUI-12/03/26" → retorna { start: Date(ter 10/03), end: Date(qui 12/03) }
  const webinarDate = parseCicloDate(cicloTag);
  if (!webinarDate) return null;
  const dow = webinarDate.getDay(); // 1=seg, 4=qui
  const start = new Date(webinarDate);
  if (dow === 1) {
    // SEG: captura começa sexta (3 dias antes)
    start.setDate(webinarDate.getDate() - 3);
  } else {
    // QUI: captura começa terça (2 dias antes)
    start.setDate(webinarDate.getDate() - 2);
  }
  return { start, end: webinarDate };
}

function fmtLocalDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function assignSpendToCycles(metaDailyRows, cycleKeys) {
  // Para cada ciclo, soma o gasto dos dias dentro do período de captura
  // Usa comparação de strings para evitar bug de timezone UTC vs local
  const spendMap = {};
  for (const ciclo of cycleKeys) {
    const range = getCaptureDatesForCiclo(ciclo);
    if (!range) { spendMap[ciclo] = 0; continue; }
    const startStr = fmtLocalDate(range.start);
    const endStr   = fmtLocalDate(range.end);
    let total = 0;
    for (const r of metaDailyRows) {
      if (r.date_start >= startStr && r.date_start <= endStr) {
        total += parseFloat(r.spend || 0);
      }
    }
    spendMap[ciclo] = total;
  }
  return spendMap;
}

// ── Semanal Panel v2 ──────────────────────────────────────────────────────────
function SemanalPanel({ cfg, preco }) {
  const [sales,    setSales]    = useState([]);
  const [spendMap, setSpendMap] = useState({});
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [loaded,   setLoaded]   = useState(false);
  const [visible,  setVisible]  = useState(8);

  const load = useCallback(async () => {
    if (!cfg.csvUrl && !cfg.metaAccountId) { setLoaded(true); return; }
    setLoading(true); setError(null);
    try {
      const s = cfg.csvUrl ? await fetchSheetsSemanal(cfg, preco) : [];
      setSales(s);
      if (cfg.metaAccountId && cfg.metaToken) {
        const metaDaily = await fetchMetaM6Daily(cfg);
        const cicloKeys = [...new Set(s.map(r => r.ciclo_sem).filter(Boolean))];
        const sm = assignSpendToCycles(metaDaily, cicloKeys);
        setSpendMap(sm);
      }
      setLoaded(true);
    } catch(e) { setError(e.message); }
    finally   { setLoading(false); }
  }, [cfg, preco]);

  // Load on mount
  useEffect(() => { load(); }, [cfg.metaToken, cfg.csvUrl]);

  // Group sales by ciclo_sem
  const cycleMap = {};
  for (const s of sales) {
    const c = s.ciclo_sem;
    if (!c) continue;
    if (!cycleMap[c]) cycleMap[c] = { ciclo: c, leads: 0, salesPitch: 0, salesAcum: 0, revPitch: 0, revAcum: 0 };
    cycleMap[c].leads++;
    cycleMap[c].salesAcum++;
    cycleMap[c].revAcum += s.value;
    if (s.is_pitch) { cycleMap[c].salesPitch++; cycleMap[c].revPitch += s.value; }
  }

  // Sort descending by webinar date
  const allCycles = Object.values(cycleMap).sort((a, b) => {
    const da = parseCicloDate(a.ciclo), db = parseCicloDate(b.ciclo);
    if (!da || !db) return 0;
    return db - da;
  });

  const cycles      = allCycles.slice(0, visible);
  const hasMore     = allCycles.length > visible;
  const hasMeta     = !!(cfg.metaAccountId && cfg.metaToken);

  return (
    <div className="fade-up">
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div>
          <span style={{fontSize:13,fontWeight:700,color:C.text,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>Lançamentos Semanais</span>
          <span style={{fontSize:9,color:C.muted,marginLeft:10,fontFamily:"'JetBrains Mono',monospace",letterSpacing:2}}>CAMPANHAS M6 · CICLOS SEG / QUI</span>
        </div>
        <button onClick={load} style={{padding:"5px 14px",background:C.blue,border:"none",color:"#fff",borderRadius:3,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",fontSize:10,fontWeight:600}}>
          {loading ? "carregando…" : "↺ Atualizar"}
        </button>
      </div>

      {error && (
        <div style={{background:"#fef2f2",border:`1px solid #fca5a5`,borderRadius:5,padding:"9px 14px",marginBottom:16,color:C.red,fontSize:11,fontFamily:"'JetBrains Mono',monospace"}}>⚠ {error}</div>
      )}

      {/* Tabela */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,overflow:"visible"}}>
        <div style={{padding:"12px 16px 10px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{fontSize:8,letterSpacing:2,textTransform:"uppercase",color:C.muted,fontFamily:"'JetBrains Mono',monospace"}}>
            Ciclos · {allCycles.length} encontrados
          </span>
          <span style={{fontSize:9,color:C.muted,fontFamily:"'JetBrains Mono',monospace"}}>
            <span style={{color:C.blue}}>■</span> SEG &nbsp;
            <span style={{color:C.purple}}>■</span> QUI
          </span>
        </div>

        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:hasMeta?720:600}}>
            <thead style={{position:"relative",zIndex:10}}>
              <tr style={{borderBottom:`1px solid ${C.border}`}}>
                <th style={{padding:"9px 14px",textAlign:"left",fontSize:8,letterSpacing:1.5,textTransform:"uppercase",color:C.muted,fontFamily:"'JetBrains Mono',monospace"}}>Ciclo</th>
                <th style={{padding:"9px 14px",textAlign:"right",fontSize:8,letterSpacing:1.5,textTransform:"uppercase",color:C.muted,fontFamily:"'JetBrains Mono',monospace"}}>Leads</th>
                {hasMeta && <th style={{padding:"9px 14px",textAlign:"right",fontSize:8,letterSpacing:1.5,textTransform:"uppercase",color:C.red+"aa",fontFamily:"'JetBrains Mono',monospace"}}>Gasto</th>}
                {hasMeta && <th style={{padding:"9px 14px",textAlign:"right",fontSize:8,letterSpacing:1.5,textTransform:"uppercase",color:C.muted,fontFamily:"'JetBrains Mono',monospace"}}>CPL</th>}
                <th style={{padding:"9px 14px",textAlign:"right",fontSize:8,letterSpacing:1.5,textTransform:"uppercase",color:C.muted,fontFamily:"'JetBrains Mono',monospace"}}>Vendas Pitch</th>
                <th style={{padding:"9px 14px",textAlign:"right",fontSize:8,letterSpacing:1.5,textTransform:"uppercase",color:C.muted,fontFamily:"'JetBrains Mono',monospace"}}>Fat. Pitch</th>
                <th style={{padding:"9px 14px",textAlign:"right",fontSize:8,letterSpacing:1.5,textTransform:"uppercase",color:C.muted,fontFamily:"'JetBrains Mono',monospace",fontWeight:700}}>Vendas Acum.</th>
                <th style={{padding:"9px 14px",textAlign:"right",fontSize:8,letterSpacing:1.5,textTransform:"uppercase",color:C.green+"aa",fontFamily:"'JetBrains Mono',monospace",fontWeight:700}}>Fat. Acum.</th>
                {hasMeta && <th style={{padding:"9px 14px",textAlign:"right",fontSize:8,letterSpacing:1.5,textTransform:"uppercase",color:C.gold+"88",fontFamily:"'JetBrains Mono',monospace"}}>ROAS</th>}
              </tr>
            </thead>
            <tbody>
              {cycles.length === 0 && (
                <tr>
                  <td colSpan={hasMeta?9:6} style={{padding:"32px",textAlign:"center",color:C.muted,fontFamily:"'JetBrains Mono',monospace",fontSize:11}}>
                    {loading ? "buscando dados…" : loaded ? "Nenhum ciclo encontrado · verifique se ciclo_sem está sendo preenchido" : "Clique em Atualizar"}
                  </td>
                </tr>
              )}
              {cycles.map((c, i) => {
                const isSeg      = c.ciclo.startsWith("SEG");
                const clr        = isSeg ? C.blue : C.purple;
                const spend      = spendMap[c.ciclo] || 0;
                const cpl        = spend > 0 && c.leads > 0 ? spend / c.leads : null;
                const roas       = spend > 0 ? c.revAcum / spend : null;
                return (
                  <tr key={c.ciclo} style={{borderBottom:`1px solid ${C.border}`,background:i%2?"#f8fafc":"transparent"}}>
                    <td style={{padding:"12px 14px"}}>
                      <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:700,color:clr,background:clr+"14",padding:"3px 10px",borderRadius:4,border:`1px solid ${clr}33`}}>
                        {c.ciclo}
                      </span>
                    </td>
                    <td style={{padding:"12px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.teal}}>{fmt.num(c.leads)}</td>
                    {hasMeta && <td style={{padding:"12px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.red}}>{spend>0?fmt.brl(spend):<span style={{color:C.muted}}>—</span>}</td>}
                    {hasMeta && <td style={{padding:"12px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.muted}}>{cpl?fmt.brl(cpl):"—"}</td>}
                    <td style={{padding:"12px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontSize:12}}>{fmt.num(c.salesPitch)}</td>
                    <td style={{padding:"12px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.green}}>{fmt.brl(c.revPitch)}</td>
                    <td style={{padding:"12px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:700}}>{fmt.num(c.salesAcum)}</td>
                    <td style={{padding:"12px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.green,fontWeight:700}}>{fmt.brl(c.revAcum)}</td>
                    {hasMeta && <td style={{padding:"12px 14px",textAlign:"right"}}>{roas!=null?<RoasBadge v={roas}/>:<span style={{color:C.muted,fontSize:10,fontFamily:"'JetBrains Mono',monospace"}}>—</span>}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Ver mais */}
        {hasMore && (
          <div style={{padding:"12px 16px",borderTop:`1px solid ${C.border}`,textAlign:"center"}}>
            <button onClick={()=>setVisible(v=>v+8)} style={{
              padding:"6px 24px",background:"transparent",border:`1px solid ${C.border}`,
              color:C.muted,borderRadius:4,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",
              fontSize:10,letterSpacing:1,
            }}>
              ↓ ver mais ciclos ({allCycles.length - visible} restantes)
            </button>
          </div>
        )}
      </div>

      {!hasMeta && loaded && (
        <div style={{marginTop:10,padding:"8px 14px",background:"#fffbeb",border:`1px solid #fde68a`,borderRadius:5,fontSize:9,color:"#92400e",fontFamily:"'JetBrains Mono',monospace"}}>
          ⚡ Configure o Meta Ads em ⚙ config para ver Gasto, CPL e ROAS por ciclo
        </div>
      )}
    </div>
  );
}

async function fetchSheetsSemanal(cfg, preco) {
  let rows = [];
  if (cfg.csvUrl) {
    const res = await fetch(cfg.csvUrl);
    if (!res.ok) throw new Error(`CSV: erro (${res.status})`);
    const text = await res.text();
    const parseCSV = (str) => {
      const lines = str.trim().split("\n");
      return lines.map(line => {
        const cols = []; let cur = "", inQ = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') { inQ = !inQ; }
          else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ""; }
          else cur += ch;
        }
        cols.push(cur.trim());
        return cols;
      });
    };
    rows = parseCSV(text).slice(1);
  }
  return rows
    .filter(r => r[8] && (r[2]||"").toUpperCase().includes("M6"))
    .map(r => {
      const ciclo = (r[8]||"").trim();
      const saleDate = parseDate((r[0]||"").trim());
      const webinarDate = parseCicloDate(ciclo);
      return {
        ciclo_sem: ciclo,
        sale_date: saleDate,
        campaign: r[2]||"",
        value: preco,
        is_pitch: webinarDate ? (saleDate === fmtLocalDate(webinarDate)) : false,
      };
    });
}

// ── Semanal Panel ─────────────────────────────────────────────────────────────


// ── Google Ads Diário ─────────────────────────────────────────────────────────
// ── Google Ads API ────────────────────────────────────────────────────────────
async function getGadsAccessToken(cfg) {
  const res = await fetch("https://api.allorigins.win/raw?url=" + encodeURIComponent("https://oauth2.googleapis.com/token"), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     cfg.gadsClientId,
      client_secret: cfg.gadsClientSecret,
      refresh_token: cfg.gadsRefreshToken,
      grant_type:    "refresh_token",
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Erro ao obter access token: " + JSON.stringify(data));
  return data.access_token;
}

async function fetchGadsAPI(cfg, from, to) {
  // Chama rota serverless da Vercel — sem CORS, sem proxy
  const res = await fetch("/api/gads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from, to }),
  });
  const data = await res.json();
  if (data.error) throw new Error("Erro Google Ads API: " + data.error);
  return data.rows || [];
}

async function fetchGadsReport(gadsUrl) {
  const res = await fetch(gadsUrl);
  if (!res.ok) throw new Error(`Google Ads report: erro ${res.status}`);
  const text = await res.text();
  // Parse CSV — skip first 3 rows (title, date range, header)
  const lines = text.trim().split("\n");
  const dataLines = lines.slice(3); // skip rows 0,1,2
  return dataLines
    .map(line => {
      const cols = [];
      let cur = "", inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { inQ = !inQ; }
        else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ""; }
        else cur += ch;
      }
      cols.push(cur.trim());
      return cols;
    })
    .filter(r => r[0] && r[0].toLowerCase().includes("gads"))
    .map(r => ({
      campaign: r[0] || "",
      date:     (r[1] || "").trim(),
      spend:    parseFloat((r[3] || "0").replace(",", ".")) || 0,
      leads:    parseInt(r[4] || "0") || 0,
    }));
}

function crunchGads(gadsRows, salesRows, allSalesRows, allGadsRows, preco, from, to) {
  // Group gads spend by campaign
  const campMap = {};
  for (const r of gadsRows) {
    const c = r.campaign;
    if (!campMap[c]) campMap[c] = { campaign: c, spend: 0, leads: 0, dates: {} };
    campMap[c].spend += r.spend;
    campMap[c].leads += r.leads;
    // Track spend by date for "vendas no dia" comparison
    if (!campMap[c].dates[r.date]) campMap[c].dates[r.date] = { spend: 0, leads: 0 };
    campMap[c].dates[r.date].spend += r.spend;
    campMap[c].dates[r.date].leads += r.leads;
  }

  // 30 days ago threshold

  // salesMap: vendas cuja capture_date está no período (Captura)
  const salesMap = {};
  for (const s of (allSalesRows||salesRows)) {
    const c = s.campaign || "";
    if (!c.toLowerCase().includes("gads")) continue;
    if (!s.capture_date || s.capture_date < from || s.capture_date > to) continue;
    if (!salesMap[c]) salesMap[c] = { salesTotal:0, revTotal:0, sales15D:0, rev15D:0, sales1D:0 };
    salesMap[c].salesTotal++;
    salesMap[c].revTotal += s.value || preco;
    // 1D: capturado e comprou no mesmo dia, dentro do período
    if (s.sale_date && s.capture_date === s.sale_date) {
      salesMap[c].sales1D++;
    }
  }
  // rev15D FIXO: usar allSalesRows completo, nunca filtrado
  for (const s of (allSalesRows || salesRows)) {
    const c = s.campaign || "";
    if (!c.toLowerCase().includes("gads")) continue;
    if (!salesMap[c]) salesMap[c] = { salesTotal:0, revTotal:0, sales15D:0, rev15D:0, sales1D:0 };
    if (s.capture_date && s.capture_date >= CUTOFF15) {
      salesMap[c].sales15D++;
      salesMap[c].rev15D += s.value || preco;
    }
  }

  // Totals (usando gadsRows filtrado pelo período)
  const totalSpend  = gadsRows.reduce((s,r)=>s+r.spend,0);
  const totalLeads  = gadsRows.reduce((s,r)=>s+r.leads,0);
  const totalSales  = Object.values(salesMap).reduce((s,r)=>s+r.salesTotal,0);
  const totalRev    = totalSales * preco;
  const totalCpl    = totalLeads > 0 ? totalSpend / totalLeads : null;
  const todaySales  = Object.values(salesMap).reduce((s,r)=>s+(r.sales1D||0),0);

  // allDatesMap — gasto por campanha/dia usando dados completos (allGadsRows)
  const allDatesMap = {};
  for (const r of (allGadsRows||gadsRows)) {
    const c = r.campaign || "";
    if (!allDatesMap[c]) allDatesMap[c] = {};
    if (!allDatesMap[c][r.date]) allDatesMap[c][r.date] = 0;
    allDatesMap[c][r.date] += r.spend;
  }

  return { campMap, salesMap, allDatesMap, totalSpend, totalLeads, totalSales, totalRev, totalCpl, todaySales };
}


function DecisaoBadge({ roas15D, roasPeriod: roasCaptura }) {
  let emoji, label, bg, color;
  const b15hi  = roas15D    != null && roas15D    >= 2;
  const b15ok  = roas15D    != null && roas15D    >= 1;
  const bPerok = roasCaptura != null && roasCaptura >= 1;
  if      (roas15D == null && roasPeriod == null) { emoji="—";  label="SEM DADOS";  bg="#f1f5f9"; color="#94a3b8"; }
  else if (b15hi && bPerok)                       { emoji="🚀"; label="ESCALAR";    bg="#dcfce7"; color="#15803d"; }
  else if (b15ok && bPerok)                       { emoji="✅"; label="BOM";         bg="#d1fae5"; color="#065f46"; }
  else if (bPerok && !b15ok)                      { emoji="⏸"; label="MANTER";      bg="#fef9c3"; color="#854d0e"; }
  else if (!bPerok && b15ok)                      { emoji="⚠️"; label="ATENÇÃO";    bg="#fff7ed"; color="#c2410c"; }
  else                                            { emoji="⛔"; label="PAUSAR";      bg="#fee2e2"; color="#b91c1c"; }

  return (
    <span style={{
      display:"inline-flex",alignItems:"center",gap:4,
      padding:"3px 8px",borderRadius:4,fontSize:9,fontWeight:700,
      background:bg,color,fontFamily:"'JetBrains Mono',monospace",letterSpacing:0.5,
      whiteSpace:"nowrap",
    }}>
      {emoji} {label}
    </span>
  );
}


function Tip({ text }) {
  const [pos, setPos] = useState(null);
  const handleEnter = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setPos({ x: r.left + r.width/2, y: r.bottom + window.scrollY + 6 });
  };
  return (
    <span style={{position:"relative",display:"inline-flex",alignItems:"center",marginLeft:3}}>
      <span
        onMouseEnter={handleEnter}
        onMouseLeave={()=>setPos(null)}
        style={{cursor:"help",fontSize:7,color:"#b0bec5",border:"1px solid #b0bec5",borderRadius:"50%",width:10,height:10,display:"inline-flex",alignItems:"center",justifyContent:"center",fontWeight:700,lineHeight:1,fontFamily:"sans-serif"}}
      >?</span>
      {pos && (
        <span style={{
          position:"fixed",left:pos.x,top:pos.y - window.scrollY,
          transform:"translateX(-50%)",
          background:"#1e2330",color:"#f1f5f9",fontSize:10,padding:"8px 12px",borderRadius:5,
          zIndex:99999,pointerEvents:"none",boxShadow:"0 4px 16px #0006",
          lineHeight:1.6,fontFamily:"'Plus Jakarta Sans',sans-serif",
          maxWidth:260,width:"max-content",textAlign:"left",whiteSpace:"normal",
          border:"1px solid #ffffff22",
        }}>{text}</span>
      )}
    </span>
  );
}

// ── Diario Panel ──────────────────────────────────────────────────────────────
function DiarioPanel({ cfg, preco }) {
  const [gadsRows,  setGadsRows]  = useState([]);
  const [salesRows, setSalesRows] = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [loaded,    setLoaded]    = useState(false);
  const [from,      setFrom]      = useState(daysAgo(7));
  const [to,        setTo]        = useState(today());
  const [fromTmp,   setFromTmp]   = useState(daysAgo(7));
  const [toTmp,     setToTmp]     = useState(today());

  const GADS_URL = cfg.gadsUrl;

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      // Usa API direta se tiver credenciais, senão cai no CSV
      const useAPI = cfg.gadsClientId && cfg.gadsRefreshToken && cfg.gadsDeveloperToken;
      const gadsPromise = useAPI
        ? fetchGadsAPI(cfg, daysAgo(90), today())
        : fetchGadsReport(GADS_URL);
      const [gads, sales] = await Promise.all([
        gadsPromise,
        cfg.csvUrl ? fetchSheetsGads(cfg, preco) : [],
      ]);
      setGadsRows(gads);
      setSalesRows(sales);
      setLoaded(true);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  }, [cfg, preco]);

    useEffect(() => { load(); }, [cfg.metaToken, cfg.csvUrl]);

  // Filter gadsRows by period
  const filteredGads = gadsRows.filter(r => r.date >= from && r.date <= to);
  // Filter salesRows by period
  const filteredSales = salesRows.filter(r => r.sale_date && r.sale_date >= from && r.sale_date <= to);

  const { totalSpend, totalLeads, totalSales, totalRev, totalCpl, todaySales, campMap, salesMap, allDatesMap } = crunchGads(filteredGads, filteredSales, salesRows, gadsRows, preco, from, to);

  const setPreset = (f, t) => { setFrom(f); setTo(t); setFromTmp(f); setToTmp(t); };

  // ROAS 15D FIXO
  const allSales15D  = salesRows.filter(s => s.capture_date && s.capture_date >= CUTOFF15);
  const rev15DFixed  = allSales15D.reduce((s,r)=>s+(r.value||preco),0);
  const spend15DFixed= gadsRows.filter(r => r.date >= CUTOFF15).reduce((s,r)=>s+r.spend,0);
  const roas15D      = spend15DFixed > 0 ? rev15DFixed / spend15DFixed : null;
  // ROAS 7D FIXO
  const allSales7D   = salesRows.filter(s => s.capture_date && s.capture_date >= CUTOFF7);
  const rev7DFixed   = allSales7D.reduce((s,r)=>s+(r.value||preco),0);
  const spend7DFixed = gadsRows.filter(r => r.date >= CUTOFF7).reduce((s,r)=>s+r.spend,0);
  const roas7D       = spend7DFixed > 0 ? rev7DFixed / spend7DFixed : null;

  // campaigns sempre do gadsRows completo (não filtrado)
  const allCampMap = {};
  for (const r of gadsRows) {
    const c = r.campaign;
    if (!allCampMap[c]) allCampMap[c] = { campaign: c, spend: 0, leads: 0 };
    allCampMap[c].spend += r.spend;
    allCampMap[c].leads += r.leads;
  }
  // Sobrescreve spend/leads com valores do período filtrado
  for (const c of Object.keys(allCampMap)) {
    const filtered = campMap[c];
    allCampMap[c].spendPeriod = filtered ? filtered.spend : 0;
    allCampMap[c].leadsPeriod = filtered ? filtered.leads : 0;
  }
  const campaigns = Object.values(allCampMap).sort((a,b) => b.spend - a.spend);
  const showDecisao  = from === daysAgo(15) && to === today();
  const showDecisao7 = from === daysAgo(7)  && to === today();

  return (
    <div className="fade-up">
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div>
          <span style={{fontSize:13,fontWeight:700,color:C.text,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>Google Ads · Diário</span>
          <span style={{fontSize:9,color:C.muted,marginLeft:10,fontFamily:"'JetBrains Mono',monospace",letterSpacing:2}}>CAMPANHAS GADS · PERPÉTUO</span>
        </div>
        <button onClick={load} style={{padding:"5px 14px",background:"#ea4335",border:"none",color:"#fff",borderRadius:3,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",fontSize:10,fontWeight:600}}>
          {loading ? "carregando…" : "↺ Atualizar"}
        </button>
      </div>

      {/* PERÍODO */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:20,flexWrap:"wrap"}}>
        <span style={{fontSize:8,letterSpacing:2,textTransform:"uppercase",color:C.muted,fontFamily:"'JetBrains Mono',monospace"}}>Período</span>
        {[
          {l:"HOJE",  f:today(),    t:today()},
          {l:"ONTEM", f:daysAgo(1), t:daysAgo(1)},
          {l:"7D ⚡ AÇÃO",  f:daysAgo(7), t:today()},
          {l:"15D ⚡ AÇÃO", f:daysAgo(15),t:today()},
        ].map(({l,f,t})=>(
          <button key={l} onClick={()=>setPreset(f,t)} style={{
            padding:"4px 10px",borderRadius:3,
            border:`1px solid ${from===f&&to===t?"#ea4335":"#94a3b8"}`,
            background:from===f&&to===t?"#ea433510":"transparent",
            color:from===f&&to===t?"#ea4335":C.text,
            fontFamily:"'JetBrains Mono',monospace",fontSize:9,letterSpacing:1,cursor:"pointer",fontWeight:700,
          }}>{l}</button>
        ))}
        <input type="date" value={fromTmp} onChange={e=>setFromTmp(e.target.value)}
          style={{padding:"4px 8px",border:`1px solid ${C.border}`,borderRadius:3,fontSize:11,color:C.text,background:C.card}}/>
        <span style={{color:C.muted,fontSize:11}}>→</span>
        <input type="date" value={toTmp} onChange={e=>setToTmp(e.target.value)}
          style={{padding:"4px 8px",border:`1px solid ${C.border}`,borderRadius:3,fontSize:11,color:C.text,background:C.card}}/>
        <button onClick={()=>{setFrom(fromTmp);setTo(toTmp);}} style={{
          padding:"4px 14px",background:"#ea4335",border:"none",color:"#fff",borderRadius:3,
          cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",fontSize:10,fontWeight:600,
        }}>Aplicar</button>
      </div>

      {error && <div style={{background:"#fef2f2",border:`1px solid #fca5a5`,borderRadius:5,padding:"9px 14px",marginBottom:16,color:C.red,fontSize:11,fontFamily:"'JetBrains Mono',monospace"}}>⚠ {error}</div>}

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:10,marginBottom:20}}>
        <div style={{background:"#c8d3dc",border:`1px solid #a0adb8`,borderRadius:6,padding:"14px 16px",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${C.green}00,${C.green},${C.green}00)`}}/>
          <KPI label="Lucro Captura" value={fmt.brl(totalRev - totalSpend)} color={totalRev-totalSpend>=0?C.green:C.red} dark/>
        </div>
        <div style={{background:C.card,border:`1px solid ${C.red}44`,borderRadius:6,padding:"14px 16px"}}>
          <KPI label="Gasto Total" value={fmt.brl(totalSpend)} color={C.red}/>
        </div>
        <div style={{background:C.card,border:`1px solid ${C.teal}44`,borderRadius:6,padding:"14px 16px"}}>
          <KPI label="Leads" value={fmt.num(totalLeads)} color={C.teal} sub={`CPL ${fmt.brl(totalCpl)}`}/>
        </div>
        <div style={{background:C.card,border:`1px solid ${C.blue}44`,borderRadius:6,padding:"14px 16px"}}>
          <KPI label="Vendas 1D" value={fmt.num(todaySales)} color={C.blue} sub={fmt.brl(todaySales * preco)}/>
        </div>
        <div style={{background:C.card,border:`2px solid ${C.green}55`,borderRadius:6,padding:"14px 16px",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${C.green}00,${C.green},${C.green}00)`}}/>
          <KPI label="Vendas Captura" value={fmt.num(totalSales)} color={C.green} sub={fmt.brl(totalRev)}/>
        </div>
        <div style={{background:C.card,border:`1px solid ${C.gold}44`,borderRadius:6,padding:"14px 16px"}}>
          <KPI label="ROAS 15D FIXO" value={fmt.x(roas15D)} color={roas15D!=null&&roas15D>=1?C.green:C.red} sub="últimos 15 dias"/>
        </div>
      </div>

      {/* Tabela campanhas */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,overflow:"visible"}}>
        <div style={{padding:"12px 16px 10px",borderBottom:`1px solid ${C.border}`}}>
          <span style={{fontSize:8,letterSpacing:2,textTransform:"uppercase",color:C.muted,fontFamily:"'JetBrains Mono',monospace"}}>Por Campanha</span>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:600}}>
            <thead style={{position:"relative",zIndex:10}}>
              <tr style={{borderBottom:`1px solid ${C.border}`}}>
                {[
                  {h:"Campanha",      tip:"Nome da campanha no Google Ads"},
                  {h:"Gasto",         tip:"Gasto no período selecionado"},
                  {h:"Leads",         tip:"Leads captados no período selecionado"},
                  {h:"CPL",           tip:"Custo por Lead = Gasto ÷ Leads"},
                  {h:"Vendas 1D",     tip:"Leads que compraram no mesmo dia em que se cadastraram, dentro do período"},
                  {h:"Vendas Captura",tip:"Vendas de leads cuja data de captura está no período"},
                  {h:"Fat. Captura",  tip:"Faturamento das vendas com captura no período"},
                  {h:"Lucro Captura", tip:"Fat. Captura menos o Gasto do período"},
                ].map(({h,tip},i)=>(
                  <th key={h} style={{padding:"9px 14px",textAlign:i===0?"left":"right",fontSize:8,letterSpacing:1.5,textTransform:"uppercase",color:C.muted,fontFamily:"'JetBrains Mono',monospace",whiteSpace:"nowrap"}}>
                    <span style={{display:"inline-flex",alignItems:"center",gap:2}}>{h}<Tip text={tip}/></span>
                  </th>
                ))}
                <th style={{padding:"9px 14px",textAlign:"right",fontSize:8,letterSpacing:1.5,textTransform:"uppercase",color:C.gold+"aa",fontFamily:"'JetBrains Mono',monospace",whiteSpace:"nowrap"}}>ROAS CAPTURA<Tip text="Fat. Captura ÷ Gasto do período"/></th>
                <th style={{padding:"9px 14px",textAlign:"right",fontSize:8,letterSpacing:1.5,textTransform:"uppercase",color:C.teal+"aa",fontFamily:"'JetBrains Mono',monospace",whiteSpace:"nowrap"}}>ROAS 7D FIXO<Tip text="Faturamento de leads captados nos últimos 7 dias ÷ Gasto dos últimos 7 dias. Fixo, não muda com o filtro."/></th>
                <th style={{padding:"9px 14px",textAlign:"right",fontSize:8,letterSpacing:1.5,textTransform:"uppercase",color:C.blue+"aa",fontFamily:"'JetBrains Mono',monospace",whiteSpace:"nowrap"}}>ROAS 15D FIXO<Tip text="Faturamento de leads captados nos últimos 15 dias ÷ Gasto dos últimos 15 dias. Fixo, não muda com o filtro."/></th>
                <th style={{padding:"9px 14px",textAlign:"center",fontSize:8,letterSpacing:1.5,textTransform:"uppercase",color:"#c2410c",fontFamily:"'JetBrains Mono',monospace",borderLeft:`2px solid #fed7aa`,whiteSpace:"nowrap"}}>DECISÃO<Tip text="🚀 Escalar: ROAS captura e fixo ≥1 e ≥2. ✅ Bom: ambos ≥1. ⏸ Manter: captura ok, fixo ruim. ⚠️ Atenção: vivendo do passado. ⛔ Pausar: ambos ruins."/></th>
              </tr>
            </thead>
            <tbody>
              {campaigns.length === 0 && (
                <tr><td colSpan={8} style={{padding:"32px",textAlign:"center",color:C.muted,fontFamily:"'JetBrains Mono',monospace",fontSize:11}}>
                  {loaded ? "Nenhuma campanha gads encontrada" : "Clique em Atualizar"}
                </td></tr>
              )}
              {campaigns.map((camp, i) => {
                const sm      = salesMap[camp.campaign] || { salesTotal:0, revTotal:0, sales15D:0, rev15D:0, salesByDate:{} };
                const pitch   = sm.sales1D || 0;
                const cpl     = camp.leadsPeriod > 0 ? camp.spendPeriod / camp.leadsPeriod : null;
                // ROAS 15D FIXO — mesma lógica do KPI, filtrado só por CUTOFF15
                const campRev15D   = salesRows
                  .filter(s => (s.campaign||"").toLowerCase() === camp.campaign.toLowerCase() && s.capture_date && s.capture_date >= CUTOFF15)
                  .reduce((a,s)=>a+(s.value||preco),0);
                const campSpend15D = gadsRows
                  .filter(r => r.campaign === camp.campaign && r.date >= CUTOFF15)
                  .reduce((a,r)=>a+r.spend,0);
                const roas15D = campSpend15D > 0 ? campRev15D / campSpend15D : null;
                // ROAS 7D FIXO por campanha
                const campRev7D    = salesRows.filter(s => (s.campaign||"").toLowerCase() === camp.campaign.toLowerCase() && s.capture_date && s.capture_date >= CUTOFF7).reduce((a,s)=>a+(s.value||preco),0);
                const campSpend7D  = gadsRows.filter(r => r.campaign === camp.campaign && r.date >= CUTOFF7).reduce((a,r)=>a+r.spend,0);
                const roas7D       = campSpend7D > 0 ? campRev7D / campSpend7D : null;
                // ROAS PERÍODO — faturamento de leads captados no período / gasto do período
                const campRevPeriod = filteredSales
                  .filter(s => (s.campaign||"").toLowerCase() === camp.campaign.toLowerCase() && s.capture_date && s.capture_date >= from && s.capture_date <= to)
                  .reduce((a,s)=>a+(s.value||preco),0);
                const roasCaptura = camp.spendPeriod > 0 ? campRevPeriod / camp.spendPeriod : null;
                const roasAcum = camp.spendPeriod > 0 ? (sm.salesTotal||0)*preco / camp.spendPeriod : null;
                return (
                  <tr key={camp.campaign} style={{borderBottom:`1px solid ${C.border}`,background:i%2?"#f8fafc":"transparent"}}>
                    <td style={{padding:"11px 14px",fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.text,maxWidth:220,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={camp.campaign}>{camp.campaign}</td>
                    <td style={{padding:"11px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.red}}>{fmt.brl(camp.spendPeriod)}</td>
                    <td style={{padding:"11px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.teal}}>{fmt.num(camp.leadsPeriod)}</td>
                    <td style={{padding:"11px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.muted}}>{fmt.brl(cpl)}</td>
                    <td style={{padding:"11px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontSize:12}}>{fmt.num(pitch)}</td>
                    <td style={{padding:"11px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:600}}>{fmt.num(sm.salesTotal||0)}</td>
                    <td style={{padding:"11px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.green,fontWeight:600}}>{fmt.brl((sm.salesTotal||0)*preco)}</td>
                    <td style={{padding:"11px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:600,color:(sm.salesTotal||0)*preco - camp.spendPeriod >= 0 ? C.green : C.red}}>{fmt.brl((sm.salesTotal||0)*preco - camp.spendPeriod)}</td>
                    <td style={{padding:"11px 14px",textAlign:"right"}}><RoasBadge v={roasCaptura}/></td>
                    <td style={{padding:"11px 14px",textAlign:"right"}}><RoasBadge v={roas7D}/></td>
                    <td style={{padding:"11px 14px",textAlign:"right"}}><RoasBadge v={roas15D}/></td>
                    <td style={{padding:"11px 14px",textAlign:"center",borderLeft:`2px solid #fed7aa`}}>{showDecisao7 ? <DecisaoBadge roas15D={roas7D} roasPeriod={roasCaptura}/> : showDecisao ? <DecisaoBadge roas15D={roas15D} roasPeriod={roasCaptura}/> : <span style={{fontSize:9,color:"#94a3b8",fontFamily:"'JetBrains Mono',monospace",letterSpacing:0.5}}>7D ou 15D</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Dashboard(){
  const [page,setPage]   = useState("dash");
  const [tab,setTab]     = useState("perpetuo");
  const [cfg,setCfg]     = useState(DEFAULT_CFG);
  const [showPassModal,setShowPassModal] = useState(false);
  const [passInput,setPassInput]         = useState("");
  const [passErr,setPassErr]             = useState(false);
  const CONFIG_PASS = "libras";
  const [from,setFrom]   = useState(daysAgo(14));
  const [to,setTo]       = useState(today());
  const [mode,setMode]   = useState("capture");
  const [acaoMode,setAcaoMode] = useState(false);
  const [preco,setPreco] = useState(810);
  const [rows,setRows]   = useState([]);
  const [loading,setLd]  = useState(false);
  const [error,setErr]   = useState(null);
  const [isDemo,setDemo] = useState(true);

  // Quando preço muda no demo, recalcula
  const handlePreco = (v) => {
    setPreco(v);
    if(isDemo) setRows(crunchAll(DEMO_META,DEMO_SALES_FIXED.map(s=>({...s,value:v})),from,to));
  };

  const load=useCallback(async(c,f,t,p)=>{
    if(!c.metaToken||(!c.csvUrl&&!c.sheetsApiKey)){
      // sem config: mostra demo estático (gerado uma vez)
      setRows(crunchAll(DEMO_META,DEMO_SALES_FIXED,f,t));
      return;
    }
    setLd(true);setErr(null);setRows([]);
    try{
      const [meta,sales]=await Promise.all([fetchMetaAds(c,f,t),fetchSheets(c,p)]);
      setRows(crunchAll(meta,sales,f,t));
      setDemo(false);
    }catch(e){setErr(e.message);}
    finally{setLd(false);}
  },[]);

  const apply=()=>{
    load(cfg,from,to,preco);
  };

  const isCap=mode==="capture";
  const totSpend    =rows.reduce((s,r)=>s+r.spend,0);
  const totLeads    =rows.reduce((s,r)=>s+r.leads,0);
  const totRevCap   =rows.reduce((s,r)=>s+r.revCap,0);
  const totRevSale  =rows.reduce((s,r)=>s+r.revSale,0);
  const totSalesCap =rows.reduce((s,r)=>s+r.salesCap,0);
  const totSalesSale=rows.reduce((s,r)=>s+r.salesSale,0);
  const totLag      =rows.reduce((s,r)=>s+r.revLag,0);
  const cpl         =totLeads>0?totSpend/totLeads:null;
  const roas_cap    =totSpend>0&&totRevCap>0?totRevCap/totSpend:null;
  const roas_sale   =totSpend>0&&totRevSale>0?totRevSale/totSpend:null;

  return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
      <style>{GLOBAL_CSS}</style>

      {/* TOPBAR */}
      <div className="topbar" style={{borderBottom:`1px solid ${C.border}`,background:C.surf,height:50,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 24px",position:"relative"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
            <img src="https://academiadelibras.com/wp-content/uploads/2020/12/Logotipo-Horizontal-Roxo-pq.png" alt="Academia de Libras" style={{height:26,objectFit:"contain"}}/>
            {isDemo&&<span style={{fontSize:8,background:"#fef3c7",color:"#92400e",padding:"2px 8px",borderRadius:3,letterSpacing:2,fontFamily:"'JetBrains Mono',monospace"}}>DEMO</span>}
            {loading&&<span style={{fontSize:9,color:C.blue,letterSpacing:2,fontFamily:"'JetBrains Mono',monospace",opacity:0.7}}>carregando…</span>}
          </div>
          <button onClick={()=>{
            if(page==="cfg"){setPage("dash");}
            else{setPassInput("");setPassErr(false);setShowPassModal(true);}
          }} style={{
            padding:"6px 10px",background:"transparent",border:`1px solid ${C.border}`,
            color:"#64748b",borderRadius:4,cursor:"pointer",fontSize:14,flexShrink:0,
          }}>{page==="cfg"?"←":"⚙"}</button>
        </div>
        <div className="topbar-center" style={{display:"flex",gap:6,position:"absolute",left:"50%",transform:"translateX(-50%)"}}>
          {[
            {k:"perpetuo", l:"META PERPÉTUO", color:"#3b82f6"},
            {k:"semanal",  l:"META SEMANAL",  color:"#3b82f6"},
            {k:"diario",   l:"GOOGLE ADW",    color:"#c2410c"},
          ].map(({k,l,color})=>(
            <button key={k} onClick={()=>{setTab(k);if(page==="cfg")setPage("dash");}} style={{
              padding:"6px 16px",borderRadius:5,cursor:"pointer",whiteSpace:"nowrap",
              border:`1.5px solid ${tab===k ? color : color+"55"}`,
              background:tab===k ? color+"15" : "transparent",
              color:tab===k ? color : color+"88",
              fontFamily:"'JetBrains Mono',monospace",fontSize:10,letterSpacing:1.5,fontWeight:tab===k?700:500,
              transition:"all 0.15s",
            }}>{l}</button>
          ))}
        </div>
      </div>

      <div className="main-pad" style={{padding:"22px 24px",maxWidth:1440,margin:"0 auto"}}>
        {page==="cfg"?(
          <div className="fade-up">
            <ConfigPanel cfg={cfg} onSave={c=>{setCfg(c);setPage("dash");load(c,from,to,preco);}}/>
          </div>
        ):(tab==="diario"?(
            <div style={{padding:"22px 0"}} className="fade-up">
              <DiarioPanel cfg={cfg} preco={preco}/>
            </div>
          ):tab==="semanal"?(
            <div style={{padding:"22px 0"}} className="fade-up">
              <SemanalPanel cfg={cfg} preco={preco}/>
            </div>
          ):(
          <div className="fade-up">

            {/* DATE + MODE + PREÇO */}
            <div className="date-row" style={{display:"flex",alignItems:"center",gap:10,marginBottom:20,flexWrap:"wrap",justifyContent:"space-between"}}>
              <div className="date-inputs" style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <span style={{fontSize:8,letterSpacing:2,textTransform:"uppercase",color:C.muted,fontFamily:"'JetBrains Mono',monospace"}}>Período</span>
                {[
                  {l:"HOJE",   f:today(),      t:today(),      ac:false},
                  {l:"ONTEM",  f:daysAgo(1),   t:daysAgo(1),   ac:false},
                  {l:"7D [AÇÃO]", f:daysAgo(7),t:today(),      ac:true },
                ].map(({l,f,t,ac})=>{
                  const active = from===f && to===t;
                  const isAcao = ac;
                  return (
                    <button key={l} onClick={()=>{
                      setFrom(f);setTo(t);
                      if(ac) setAcaoMode(true); else setAcaoMode(false);
                      load(cfg,f,t,preco);
                    }} style={{
                      padding:"4px 12px",
                      border:`1px solid ${active?(isAcao?"#f59e0b":C.blue):(isAcao?"#f59e0b44":C.border)}`,
                      background:active?(isAcao?"#fffbeb":"transparent"):"transparent",
                      color:active?(isAcao?"#b45309":C.blue):(isAcao?"#d97706":C.muted),
                      borderRadius:3,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",fontSize:10,
                      fontWeight:isAcao?700:400,
                    }}>{l}</button>
                  );
                })}
                <input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={{background:C.surf,border:`1px solid ${C.border2}`,borderRadius:3,color:C.text,padding:"4px 8px",fontFamily:"'JetBrains Mono',monospace",fontSize:11}}/>
                <span style={{color:C.dim}}>→</span>
                <input type="date" value={to} onChange={e=>setTo(e.target.value)} style={{background:C.surf,border:`1px solid ${C.border2}`,borderRadius:3,color:C.text,padding:"4px 8px",fontFamily:"'JetBrains Mono',monospace",fontSize:11}}/>
                <button onClick={apply} style={{padding:"5px 14px",background:C.blue,border:"none",color:"#fff",borderRadius:3,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",fontSize:10,fontWeight:600}}>Aplicar</button>
              </div>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <PriceWidget preco={preco} onChange={handlePreco}/>
                <ModeToggle mode={mode} onChange={setMode}/>
              </div>
            </div>

            {error&&<div style={{background:"#fef2f2",border:`1px solid #fca5a5`,borderRadius:5,padding:"9px 14px",marginBottom:16,color:C.red,fontSize:11,fontFamily:"'JetBrains Mono',monospace"}}>⚠ {error}</div>}

            {/* KPIs */}
            {(()=>{
              const rev   = isCap ? totRevCap   : totRevSale;
              const sales = isCap ? totSalesCap : totSalesSale;
              const roas  = isCap ? roas_cap    : roas_sale;
              const lucro = rev - totSpend;
              const lucroColor = lucro>0?C.green:lucro<0?C.red:C.muted;
              return(
                <div className="kpi-section" style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap"}}>

                  {/* BOX FINANCEIRO UNIFICADO */}
                  <div style={{flex:"1.2 1 0",minWidth:200,background:C.card,border:`1.5px solid ${C.border2}`,borderRadius:8,padding:"14px 16px",display:"flex",flexDirection:"column",gap:6}}>
                    <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:8}}>
                      <span style={{fontSize:12,fontWeight:700,color:C.text,fontFamily:"'Plus Jakarta Sans',sans-serif",whiteSpace:"nowrap"}}>Gasto:</span>
                      <span style={{fontSize:14,fontWeight:700,color:C.red,fontFamily:"'JetBrains Mono',monospace"}}>−{fmt.brl(totSpend)}</span>
                    </div>
                    <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:8}}>
                      <span style={{fontSize:12,fontWeight:700,color:C.text,fontFamily:"'Plus Jakarta Sans',sans-serif",whiteSpace:"nowrap"}}>Vendas:</span>
                      <span style={{fontSize:14,fontWeight:700,color:C.green,fontFamily:"'JetBrains Mono',monospace"}}>+{fmt.brl(rev)}</span>
                    </div>
                    <div style={{height:1,background:C.border,margin:"2px 0"}}/>
                    <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:8}}>
                      <span style={{fontSize:13,fontWeight:800,color:C.text,fontFamily:"'Plus Jakarta Sans',sans-serif",whiteSpace:"nowrap"}}>LUCRO:</span>
                      <span style={{fontSize:18,fontWeight:800,color:lucroColor,fontFamily:"'JetBrains Mono',monospace"}}>{lucro>=0?"+":""}{fmt.brl(lucro)}</span>
                    </div>
                  </div>

                  {/* ROAS — segundo box */}
                  <div style={{flex:"1 1 0",minWidth:140,background:C.card,border:`1px solid ${roasColor(roas)}44`,borderRadius:6,padding:"14px 16px"}}>
                    <KPI label={`ROAS · ${isCap?"Captura":"Acumulado"}`} value={fmt.x(roas)} color={roasColor(roas)}
                      sub={`CPA ${fmt.brl(isCap?totSalesCap>0?totSpend/totSalesCap:null:totSalesSale>0?totSpend/totSalesSale:null)}`}
                      labelSize={11} valueSize={28} subSize={13}/>
                  </div>

                  {/* LEADS + CPL */}
                  <div style={{flex:"1 1 0",minWidth:140,background:C.card,border:`1px solid ${C.teal}44`,borderRadius:6,padding:"14px 16px"}}>
                    <KPI label="Leads" value={fmt.num(totLeads)} color={C.teal}
                      sub={`CPL ${fmt.brl(cpl)}`} subColor={C.gold}
                      labelSize={11} valueSize={28} subSize={13}/>
                  </div>

                  {/* 6+7. PROJEÇÃO — só Captura, ao lado dos demais */}
                  {isCap && (()=>{
                    const taxaConv   = 0.008;
                    const vendasProj = Math.round(totLeads * taxaConv);
                    const revProj    = vendasProj * preco;
                    const roasFinal  = totSpend > 0 ? (totRevCap + revProj) / totSpend : null;
                    const rcol       = roasFinal>=1 ? C.green : C.red;
                    return (
                      <div style={{
                        flex:"2 1 0",minWidth:200,
                        background:"#f8fafc", border:`1px solid ${C.border}`,
                        borderRadius:6, padding:"14px 16px",
                        position:"relative",
                      }}>
                        {/* título acima */}
                        <div style={{fontSize:8,letterSpacing:2,textTransform:"uppercase",color:C.muted,fontFamily:"'JetBrains Mono',monospace",marginBottom:10}}>
                          📈 Projeção 6m · 0,8%
                        </div>
                        <div style={{display:"flex",gap:20}}>
                          {/* Vendas projetadas */}
                          <div>
                            <div style={{fontSize:8,letterSpacing:2,textTransform:"uppercase",color:C.muted,fontFamily:"'JetBrains Mono',monospace",marginBottom:3}}>Vendas proj.</div>
                            <div style={{fontSize:20,fontWeight:700,color:C.muted,fontFamily:"'JetBrains Mono',monospace",lineHeight:1}}>{fmt.num(vendasProj)}</div>
                            <div style={{fontSize:9,color:C.muted,fontFamily:"'JetBrains Mono',monospace",marginTop:3}}>{fmt.brl(revProj)}</div>
                          </div>
                          <div style={{width:1,background:C.border}}/>
                          {/* ROAS final */}
                          <div>
                            <div style={{fontSize:8,letterSpacing:2,textTransform:"uppercase",color:C.muted,fontFamily:"'JetBrains Mono',monospace",marginBottom:3}}>ROAS final proj.</div>
                            <div style={{fontSize:20,fontWeight:700,color:rcol,fontFamily:"'JetBrains Mono',monospace",lineHeight:1}}>{fmt.x(roasFinal)}</div>
                            <div style={{fontSize:9,color:C.muted,fontFamily:"'JetBrains Mono',monospace",marginTop:3}}>atual + futuro / gasto</div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                </div>
              );
            })()}

            {/* TABLE */}
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,overflow:"visible"}}>
              <div style={{padding:"12px 16px 10px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:8,letterSpacing:2,textTransform:"uppercase",color:C.muted,fontFamily:"'JetBrains Mono',monospace"}}>Campanhas</span>
                  <span style={{fontSize:9,color:C.dim,fontFamily:"'JetBrains Mono',monospace"}}>▶ clique para expandir conjuntos e criativos</span>
                </div>
                <span style={{fontSize:9,color:C.muted,fontFamily:"'JetBrains Mono',monospace"}}>visão: {isCap?"por captura":"acumulado/caixa"}</span>
              </div>
              <div className="table-wrap" style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",minWidth:600}}>
                  <thead style={{position:"relative",zIndex:10}}>
                    <tr style={{borderBottom:`1px solid ${C.border}`}}>
                      <th style={{width:36}}/>
                      <th className="col-camp-th" style={{padding:"9px 14px",textAlign:"left",fontSize:8,letterSpacing:1.5,textTransform:"uppercase",color:C.muted,fontFamily:"'JetBrains Mono',monospace"}}>Campanha</th>
                      {["Gasto","Leads","CPL"].map(h=>(
                        <th key={h} style={{padding:"9px 14px",textAlign:"right",fontSize:8,letterSpacing:1.5,textTransform:"uppercase",color:C.muted,fontFamily:"'JetBrains Mono',monospace",whiteSpace:"nowrap"}}>{h}</th>
                      ))}
                      <th className="hide-mobile" style={{padding:"9px 14px",textAlign:"right",fontSize:8,letterSpacing:1.5,textTransform:"uppercase",color:C.muted,fontFamily:"'JetBrains Mono',monospace",whiteSpace:"nowrap"}}>CTR</th>
                      <th style={{padding:"9px 14px",textAlign:"right",fontSize:8,letterSpacing:1.5,textTransform:"uppercase",color:C.muted,fontFamily:"'JetBrains Mono',monospace",whiteSpace:"nowrap"}}>Faturamento</th>
                      <th style={{padding:"9px 14px",textAlign:"right",fontSize:8,letterSpacing:1.5,textTransform:"uppercase",color:C.muted,fontFamily:"'JetBrains Mono',monospace",whiteSpace:"nowrap"}}>Vendas</th>
                      <th className="hide-mobile" style={{padding:"9px 14px",textAlign:"right",fontSize:8,letterSpacing:1.5,textTransform:"uppercase",color:C.muted,fontFamily:"'JetBrains Mono',monospace",whiteSpace:"nowrap"}}>Lead→Venda</th>
                      <th style={{padding:"9px 14px",textAlign:"right",fontSize:8,letterSpacing:1.5,textTransform:"uppercase",color:C.gold+"88",fontFamily:"'JetBrains Mono',monospace"}}>ROAS</th>
                      {!isCap&&<th style={{padding:"9px 14px",textAlign:"right",fontSize:8,letterSpacing:1.5,textTransform:"uppercase",color:C.muted,fontFamily:"'JetBrains Mono',monospace"}}>⏱ CV</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((camp,i)=><CampaignRow key={camp.name} camp={camp} mode={mode} idx={i} acaoMode={acaoMode}/>)}
                  </tbody>
                  {!isCap&&(()=>{
                    const totalDaysCount=rows.reduce((s,r)=>s+(r.daysCount||0),0);
                    const totalDaysSum  =rows.reduce((s,r)=>s+(r.avgDays!=null?r.avgDays*(r.daysCount||0):0),0);
                    const totAvgDays    =totalDaysCount>0?totalDaysSum/totalDaysCount:null;
                    return(
                      <tfoot>
                        <tr style={{borderTop:`2px solid ${C.border2}`,background:"#f8fafc"}}>
                          <td/>
                          <td style={{padding:"9px 14px",fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,letterSpacing:1,textTransform:"uppercase"}}>Total</td>
                          <td style={{padding:"9px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.red,fontWeight:600}}>{fmt.brl(totSpend)}</td>
                          <td style={{padding:"9px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.teal,fontWeight:600}}>{fmt.num(totLeads)}</td>
                          <td style={{padding:"9px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.muted}}>{fmt.brl(cpl)}</td>
                          <td/>
                          <td style={{padding:"9px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.green,fontWeight:600}}>{fmt.brl(totRevSale)}</td>
                          <td style={{padding:"9px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:600}}>{fmt.num(totSalesSale)}</td>
                          <td/>
                          <td style={{padding:"9px 14px",textAlign:"right"}}><RoasBadge v={roas_sale}/></td>
                          <td style={{padding:"9px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.muted,fontWeight:600}}>{totAvgDays!=null?`${Math.round(totAvgDays)}d`:"—"}</td>
                        </tr>
                      </tfoot>
                    );
                  })()}
                </table>
              </div>
            </div>

            {/* Legend */}
            <div style={{marginTop:12,padding:"10px 14px",background:"#f1f5f9",border:`1px solid ${C.border}`,borderRadius:5,display:"flex",gap:20,flexWrap:"wrap",alignItems:"center"}}>
              <span style={{fontSize:8,letterSpacing:2,textTransform:"uppercase",color:C.muted,fontFamily:"'JetBrains Mono',monospace"}}>legenda</span>
              {[
                {color:C.green, label:"Lead→Venda — taxa de conversão real (planilha, não Meta)"},
                {color:C.gold,  label:"ROAS e Lucro — calculados com o preço configurado no topo"},
              ].map(({color,label})=>(
                <div key={label} style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{width:6,height:6,borderRadius:2,background:color,flexShrink:0}}/>
                  <span style={{fontSize:9,color:C.muted}}>{label}</span>
                </div>
              ))}
            </div>

          </div>
          ))}
      </div>

      {/* Modal de senha para Config */}
      {showPassModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999}}
          onClick={()=>setShowPassModal(false)}>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"28px 32px",minWidth:300,boxShadow:"0 8px 32px rgba(0,0,0,0.4)"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:18,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>🔒 Acesso às Configurações</div>
            <input
              autoFocus
              type="password"
              placeholder="Digite a senha"
              value={passInput}
              onChange={e=>{setPassInput(e.target.value);setPassErr(false);}}
              onKeyDown={e=>{
                if(e.key==="Enter"){
                  if(passInput===CONFIG_PASS){setShowPassModal(false);setPage("cfg");}
                  else{setPassErr(true);setPassInput("");}
                }
                if(e.key==="Escape")setShowPassModal(false);
              }}
              style={{width:"100%",background:"#f1f5f9",border:`1.5px solid ${passErr?"#ef4444":C.border2}`,borderRadius:6,padding:"9px 12px",color:C.text,fontFamily:"'JetBrains Mono',monospace",fontSize:13,boxSizing:"border-box",outline:"none"}}
            />
            {passErr&&<div style={{color:"#ef4444",fontSize:11,marginTop:6,fontFamily:"'JetBrains Mono',monospace"}}>Senha incorreta</div>}
            <div style={{display:"flex",gap:8,marginTop:16,justifyContent:"flex-end"}}>
              <button onClick={()=>setShowPassModal(false)} style={{padding:"7px 14px",background:"transparent",border:`1px solid ${C.border}`,color:C.muted,borderRadius:5,cursor:"pointer",fontSize:12}}>Cancelar</button>
              <button onClick={()=>{
                if(passInput===CONFIG_PASS){setShowPassModal(false);setPage("cfg");}
                else{setPassErr(true);setPassInput("");}
              }} style={{padding:"7px 14px",background:"#3b82f6",border:"none",color:"#fff",borderRadius:5,cursor:"pointer",fontSize:12,fontWeight:600}}>Entrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
