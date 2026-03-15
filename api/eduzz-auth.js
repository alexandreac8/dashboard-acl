export default function handler(req, res) {
  const CLIENT_ID    = "663bc37d-36d6-4caf-a4ab-a04cf277f61e";
  const REDIRECT_URI = "https://dashboard-acl.vercel.app/api/eduzz-callback";
  const SCOPES       = "myeduzz_sales_read myeduzz_products_read";

  const url = `https://accounts.eduzz.com/oauth/authorize?` +
    `client_id=${CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(SCOPES)}`;

  res.redirect(url);
}
