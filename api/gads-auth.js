export default function handler(req, res) {
  const clientId = process.env.GADS_CLIENT_ID;
  const redirectUri = "https://dashboard-acl.vercel.app/api/gads-callback";
  const scope = "https://www.googleapis.com/auth/adwords";

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scope);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");

  res.redirect(url.toString());
}
