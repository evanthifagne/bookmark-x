#!/usr/bin/env node
// Test rapide : lit tes bookmarks avec l'ACCESS TOKEN (pas le refresh),
// pour vérifier que le scope bookmark.read est bien accordé.
// Ne consomme rien, ne fait pas tourner le refresh token.
//
// Usage (dans ton terminal, colle l'access token affiché par X) :
//   X_ACCESS_TOKEN=... node scripts/x-test.mjs

const TOKEN = process.env.X_ACCESS_TOKEN;
if (!TOKEN) {
  console.error("\n❌ Manque X_ACCESS_TOKEN.\n   X_ACCESS_TOKEN=... node scripts/x-test.mjs\n");
  process.exit(1);
}

const h = { Authorization: `Bearer ${TOKEN}` };

const me = await fetch("https://api.x.com/2/users/me", { headers: h });
const meData = await me.json();
if (!me.ok) {
  console.error("\n❌ /users/me a échoué :\n", meData, "\n");
  process.exit(1);
}
const userId = meData.data.id;
console.log(`\n✅ Compte : @${meData.data.username} (id ${userId})`);

const url =
  `https://api.x.com/2/users/${userId}/bookmarks` +
  `?max_results=5&tweet.fields=created_at,author_id,note_tweet&expansions=author_id&user.fields=username`;
const bm = await fetch(url, { headers: h });
const bmData = await bm.json();

if (!bm.ok) {
  console.error("\n❌ Lecture des bookmarks refusée :\n", bmData);
  if (bm.status === 403) {
    console.error(
      "\n👉 403 = le token n'a pas le scope bookmark.read.\n" +
        "   Le bouton « Generate » du portail ne l'a pas inclus.\n" +
        "   On repassera par le script OAuth qui force le bon scope.\n"
    );
  }
  process.exit(1);
}

const count = bmData.data?.length || 0;
console.log(`\n✅ Bookmarks lus : ${count} (échantillon des plus récents)\n`);
for (const t of bmData.data || []) {
  const txt = (t.note_tweet?.text || t.text || "").replace(/\s+/g, " ").slice(0, 100);
  console.log(`  • [${t.id}] ${txt}…`);
}
console.log("\n🎉 Scope OK, l'ingestion est faisable. Reviens dire « test bookmarks OK ».\n");
