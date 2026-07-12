#!/usr/bin/env node
// Récupère un refresh token OAuth2 (PKCE) pour l'API X.
// Aucune clé n'est écrite dans ce fichier : il lit X_CLIENT_ID / X_CLIENT_SECRET
// depuis l'environnement. Le refresh token est affiché à la fin, à coller
// dans GitHub -> Secrets -> Actions sous le nom X_REFRESH_TOKEN.
//
// Usage :
//   X_CLIENT_ID=xxx X_CLIENT_SECRET=yyy node scripts/x-oauth.mjs
//
// Node >= 18, aucune dépendance npm.

import http from "node:http";
import crypto from "node:crypto";
import { exec } from "node:child_process";

const CLIENT_ID = process.env.X_CLIENT_ID;
const CLIENT_SECRET = process.env.X_CLIENT_SECRET;
const REDIRECT_URI = process.env.X_REDIRECT_URI || "http://localhost:3000/callback";
const AUTHORIZE_URL = process.env.X_AUTHORIZE_URL || "https://x.com/i/oauth2/authorize";
const TOKEN_URL = process.env.X_TOKEN_URL || "https://api.x.com/2/oauth2/token";
const SCOPES = "tweet.read users.read bookmark.read offline.access";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    "\n❌ Il manque X_CLIENT_ID et/ou X_CLIENT_SECRET dans l'environnement.\n" +
      "   Relance ainsi (remplace par tes vraies valeurs) :\n\n" +
      "   X_CLIENT_ID=... X_CLIENT_SECRET=... node scripts/x-oauth.mjs\n"
  );
  process.exit(1);
}

const b64url = (buf) =>
  buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const codeVerifier = b64url(crypto.randomBytes(32));
const codeChallenge = b64url(crypto.createHash("sha256").update(codeVerifier).digest());
const state = b64url(crypto.randomBytes(16));

const authorizeUrl =
  `${AUTHORIZE_URL}?response_type=code` +
  `&client_id=${encodeURIComponent(CLIENT_ID)}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&scope=${encodeURIComponent(SCOPES)}` +
  `&state=${state}` +
  `&code_challenge=${codeChallenge}` +
  `&code_challenge_method=S256`;

const port = new URL(REDIRECT_URI).port || 3000;

const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith("/callback")) {
    res.writeHead(404).end("not found");
    return;
  }
  const url = new URL(req.url, REDIRECT_URI);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const err = url.searchParams.get("error");

  if (err) {
    res.writeHead(400).end(`Erreur d'autorisation : ${err}`);
    console.error(`\n❌ X a renvoyé une erreur : ${err}\n`);
    server.close();
    process.exit(1);
  }
  if (returnedState !== state) {
    res.writeHead(400).end("state mismatch");
    console.error("\n❌ state invalide (possible attaque CSRF), on arrête.\n");
    server.close();
    process.exit(1);
  }

  try {
    const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
    });
    const resp = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const data = await resp.json();
    if (!resp.ok) {
      res.writeHead(500).end("échec de l'échange de token, voir le terminal");
      console.error("\n❌ Échec de l'échange de token :\n", data, "\n");
      server.close();
      process.exit(1);
    }

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(
      "<h2>✅ C'est bon, tu peux fermer cet onglet et revenir au terminal.</h2>"
    );

    console.log("\n✅ Autorisation réussie.\n");
    console.log("──────────────────────────────────────────────");
    console.log("REFRESH TOKEN (à coller dans le secret X_REFRESH_TOKEN) :\n");
    console.log(data.refresh_token);
    console.log("\n──────────────────────────────────────────────");
    console.log(`(access token valable ${data.expires_in}s, on ne s'en sert pas ici)`);
    console.log("\nProchaine étape : GitHub -> repo bookmark-x -> Settings -> Secrets and variables -> Actions");
    console.log("New repository secret -> Name: X_REFRESH_TOKEN -> Secret: la valeur ci-dessus.\n");

    server.close();
    process.exit(0);
  } catch (e) {
    res.writeHead(500).end("erreur, voir le terminal");
    console.error("\n❌ Exception :\n", e, "\n");
    server.close();
    process.exit(1);
  }
});

server.listen(port, () => {
  console.log(`\n🔐 Serveur d'écoute sur ${REDIRECT_URI}`);
  console.log("\nOuvre cette URL dans ton navigateur (déjà connecté à X), puis clique « Authorize » :\n");
  console.log(authorizeUrl + "\n");
  // Tentative d'ouverture auto (macOS: open, Linux: xdg-open)
  const opener = process.platform === "darwin" ? "open" : "xdg-open";
  exec(`${opener} "${authorizeUrl}"`, () => {});
});
