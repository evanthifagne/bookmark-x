// Helpers API X — OAuth2 refresh + lecture des bookmarks.
// Node >= 18, zéro dépendance. Même patterns que scripts/x-test.mjs.

const TOKEN_URL = process.env.X_TOKEN_URL || "https://api.x.com/2/oauth2/token";
const API_BASE = process.env.X_API_BASE || "https://api.x.com/2";

/**
 * Échange le refresh token contre un access token neuf.
 * X fait tourner les refresh tokens (single-use présumé) : la réponse
 * contient souvent un NOUVEAU refresh token qu'il faut persister.
 * @returns {Promise<{accessToken: string, refreshToken: string, expiresIn: number}>}
 */
export async function refreshAccessToken({ clientId, clientSecret, refreshToken }) {
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const resp = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(`refresh token échoué (${resp.status}): ${JSON.stringify(data)}`);
  }
  return {
    accessToken: data.access_token,
    // Si X ne renvoie pas de nouveau refresh token, on garde l'ancien.
    refreshToken: data.refresh_token || refreshToken,
    expiresIn: data.expires_in,
  };
}

/**
 * Lit une page de bookmarks (les plus récents d'abord).
 * Lots de 50 : max_results=100 renvoie des résultats incomplets (bug X connu).
 * @returns {Promise<{tweets: object[], users: Map<string,object>, nextToken: string|null}>}
 */
export async function fetchBookmarksPage({ accessToken, userId, paginationToken = null, pageSize = 50 }) {
  const params = new URLSearchParams({
    max_results: String(Math.min(pageSize, 50)),
    "tweet.fields": "created_at,author_id,note_tweet,entities,referenced_tweets,conversation_id,text",
    expansions: "author_id,referenced_tweets.id",
    "user.fields": "username,name",
  });
  if (paginationToken) params.set("pagination_token", paginationToken);

  const resp = await fetch(`${API_BASE}/users/${userId}/bookmarks?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(`lecture bookmarks échouée (${resp.status}): ${JSON.stringify(data)}`);
  }

  const users = new Map((data.includes?.users || []).map((u) => [u.id, u]));
  return {
    tweets: data.data || [],
    users,
    includedTweets: data.includes?.tweets || [],
    nextToken: data.meta?.next_token || null,
  };
}

/** Aplati un tweet + son auteur en objet stockable dans inbox/. */
export function toInboxItem(tweet, users, includedTweets) {
  const author = users.get(tweet.author_id) || {};
  const urls = (tweet.entities?.urls || [])
    .map((u) => u.expanded_url || u.url)
    .filter((u) => u && !u.startsWith("https://x.com/") && !u.startsWith("https://twitter.com/"));
  return {
    id: tweet.id,
    author: author.username ? `@${author.username}` : null,
    author_name: author.name || null,
    created_at: tweet.created_at || null,
    // note_tweet = texte long non tronqué quand il existe
    text: tweet.note_tweet?.text || tweet.text || "",
    urls,
    conversation_id: tweet.conversation_id || null,
    referenced_tweets: tweet.referenced_tweets || [],
    // tweets cités/référencés inclus dans la réponse, utiles au contexte
    included: (includedTweets || [])
      .filter((t) => (tweet.referenced_tweets || []).some((r) => r.id === t.id))
      .map((t) => ({ id: t.id, text: t.note_tweet?.text || t.text || "" })),
    source_url: author.username
      ? `https://x.com/${author.username}/status/${tweet.id}`
      : `https://x.com/i/status/${tweet.id}`,
  };
}
