#!/usr/bin/env node
// Ingestion : bookmarks X → inbox/*.json + .processed.json.
// Pas de LLM ici. Tourne dans GitHub Actions (ou en local pour tester).
//
// Env requis  : X_CLIENT_ID, X_CLIENT_SECRET, X_REFRESH_TOKEN
// Env optionnel: MAX_PER_RUN (défaut 10), X_USER_ID (défaut compte d'Evan),
//                ROTATED_TOKEN_FILE (chemin où écrire le refresh token tourné,
//                lu par le workflow pour `gh secret set` — JAMAIS commité)
//
// Sécurité : n'écrase jamais un fichier inbox existant, ne supprime rien.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { refreshAccessToken, fetchBookmarksPage, toInboxItem } from "./lib/x.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INBOX = path.join(ROOT, "inbox");
const STATE = path.join(ROOT, ".processed.json");
const STATE_BAK = path.join(ROOT, ".processed.json.bak");

const { X_CLIENT_ID, X_CLIENT_SECRET, X_REFRESH_TOKEN } = process.env;
const USER_ID = process.env.X_USER_ID || "1001169029132890112"; // @weshcevan
const MAX_PER_RUN = Number(process.env.MAX_PER_RUN || 10);

if (!X_CLIENT_ID || !X_CLIENT_SECRET || !X_REFRESH_TOKEN) {
  console.error("❌ Env manquant : X_CLIENT_ID, X_CLIENT_SECRET, X_REFRESH_TOKEN requis.");
  process.exit(1);
}

// --- état ---
function loadState() {
  if (!fs.existsSync(STATE)) return { processed_ids: [], last_run: null };
  try {
    const s = JSON.parse(fs.readFileSync(STATE, "utf8"));
    if (!Array.isArray(s.processed_ids)) throw new Error("processed_ids invalide");
    return s;
  } catch (e) {
    // état corrompu → tenter le backup avant d'abandonner
    if (fs.existsSync(STATE_BAK)) {
      console.error(`⚠️ .processed.json corrompu (${e.message}), restauration du backup.`);
      return JSON.parse(fs.readFileSync(STATE_BAK, "utf8"));
    }
    throw e;
  }
}

function saveState(state) {
  if (fs.existsSync(STATE)) fs.copyFileSync(STATE, STATE_BAK); // backup avant écriture
  fs.writeFileSync(STATE, JSON.stringify(state, null, 2) + "\n");
}

// --- run ---
const state = loadState();
const seen = new Set(state.processed_ids);

console.log(`→ Refresh du token…`);
const tok = await refreshAccessToken({
  clientId: X_CLIENT_ID,
  clientSecret: X_CLIENT_SECRET,
  refreshToken: X_REFRESH_TOKEN,
});

// Rotation : persister le nouveau refresh token AVANT tout le reste.
// Si le run meurt après ce point, le token en secret reste le bon.
if (process.env.ROTATED_TOKEN_FILE) {
  fs.writeFileSync(process.env.ROTATED_TOKEN_FILE, tok.refreshToken, { mode: 0o600 });
  console.log(`→ Refresh token ${tok.refreshToken === X_REFRESH_TOKEN ? "inchangé" : "TOURNÉ"}, écrit pour rotation.`);
}

console.log(`→ Lecture des bookmarks (max ${MAX_PER_RUN} nouveaux)…`);
fs.mkdirSync(INBOX, { recursive: true });

const fresh = [];
let cursor = null;
let pages = 0;
const MAX_PAGES = 5; // garde-fou : 250 items lus max par run

while (fresh.length < MAX_PER_RUN && pages < MAX_PAGES) {
  const page = await fetchBookmarksPage({
    accessToken: tok.accessToken,
    userId: USER_ID,
    paginationToken: cursor,
  });
  pages++;
  let newOnPage = 0;
  for (const t of page.tweets) {
    if (seen.has(t.id)) continue;
    fresh.push(toInboxItem(t, page.users, page.includedTweets));
    newOnPage++;
    if (fresh.length >= MAX_PER_RUN) break;
  }
  // Page entière déjà vue → on est retombé sur du connu, inutile de creuser
  // (les bookmarks arrivent par le haut).
  if (newOnPage === 0 && page.tweets.length > 0) break;
  if (!page.nextToken) break;
  cursor = page.nextToken;
}

if (fresh.length === 0) {
  console.log("✓ Rien de nouveau. Fin.");
  state.last_run = new Date().toISOString();
  saveState(state);
  process.exit(0);
}

let written = 0;
for (const item of fresh) {
  const file = path.join(INBOX, `${item.id}.json`);
  if (fs.existsSync(file)) {
    console.log(`  ~ inbox/${item.id}.json existe déjà, on n'écrase pas.`);
  } else {
    fs.writeFileSync(file, JSON.stringify(item, null, 2) + "\n");
    written++;
    const preview = item.text.replace(/\s+/g, " ").slice(0, 70);
    console.log(`  + inbox/${item.id}.json — ${item.author || "?"} : ${preview}…`);
  }
  seen.add(item.id);
}

state.processed_ids = [...seen];
state.last_run = new Date().toISOString();
saveState(state);

console.log(`\n✓ ${written} bookmark(s) déposé(s) dans inbox/, ${state.processed_ids.length} ID(s) suivis au total.`);
