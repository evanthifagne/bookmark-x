# HANDOFF — Construire le pipeline Bookmark X

> Brief de build destiné à un agent. Tout le design est déjà tranché (voir ADR-001-architecture.md pour le raisonnement). Ta mission : **construire**, pas rediscuter l'archi. Teste sur 10 bookmarks, pas de backfill massif.

## Contexte

Pipeline : bookmarks X → notes atomiques markdown → vault GitHub interrogeable depuis Claude mobile. Le propriétaire (Evan) est UX/UI designer, sait lire du code et suivre des commandes, ne veut pas maintenir d'infra. Critère de réussite unique : **un run sur ~10 bookmarks produit 10-15 notes qu'Evan relit avec plaisir et qui lui font retrouver une idée oubliée.** Des notes correctes mais inutiles = échec.

## Ce qui est déjà en place (validé, ne pas refaire)

- Repo GitHub **`evanthifagne/bookmark-x`**, **public** (les repos privés ne passent pas via le connecteur GitHub MCP — testé).
- App X développeur + OAuth 2.0 configurés. Compte : `@weshcevan`, id `1001169029132890112`.
- Secrets GitHub Actions déjà créés : `X_CLIENT_ID`, `X_CLIENT_SECRET`, `X_REFRESH_TOKEN`.
- Crédits API X approvisionnés (pay-per-use, Owned Reads 0,001 $/item). Lecture des bookmarks **testée et fonctionnelle** (scope `bookmark.read` OK).
- Scripts locaux validés à réutiliser comme base : `scripts/x-oauth.mjs` (obtenir un refresh token via PKCE), `scripts/x-test.mjs` (lecture de test). Node 24, ESM, zéro dépendance npm, `fetch`/`crypto`/`http` natifs.

## Architecture retenue : HYBRIDE

**Partie 1 — GitHub Action « ingest » (pas de LLM, pas de clé API Anthropic).**
Cron quotidien. Détient les secrets X (le repo étant public, les tokens ne peuvent vivre qu'ici). Elle :
1. Rafraîchit l'access token via `X_REFRESH_TOKEN` (Basic auth `client_id:client_secret`).
2. **Gère la rotation** : X renvoie un nouveau refresh token à chaque refresh (single-use présumé — traiter défensivement). Écrire le nouveau via `gh secret set X_REFRESH_TOKEN` en utilisant un PAT (`GH_PAT`, fine-grained, droit *Secrets: read/write* sur ce repo). Idempotent si X ne tourne pas le token.
3. Récupère les bookmarks non encore traités (curseur), pagination par lots de 50 (le `max_results=100` renvoie des résultats incomplets — bug X connu).
4. Écrit chaque bookmark brut en JSON dans `inbox/` et met à jour `.processed.json` (IDs vus + curseur + timestamp du dernier refresh). Garder un backup `.processed.json.bak` avant écriture.
5. Commit sur `main`. **Limite dure : 10 bookmarks par run** (variable d'env `MAX_PER_RUN`, défaut 10) pour la phase de test.

**Partie 2 — Routine Claude planifiée (tourne sur l'abonnement Max d'Evan, via /schedule).**
Cron quotidien, un peu après l'Action. Ne touche PAS à l'API X. Elle suit les instructions de `ENRICH-PROMPT.md` : lit `inbox/`, rédige les notes, met à jour l'index et les MOCs, ouvre **une PR par lot**, vide les items d'`inbox/` traités. Aucune clé API : c'est Claude lui-même qui rédige.

## Décisions de design FIGÉES

1. **Pas de filtrage.** Un bookmark a toujours de la valeur aux yeux d'Evan ; le job ne juge jamais s'il « mérite » une note. Son travail est de trouver *pourquoi* il a été gardé.
2. **Le « pourquoi gardé » via les thèmes récurrents.** Les bookmarks d'Evan tournent autour d'un petit nombre de thèmes récurrents. Maintenir un registre `themes.md`. Pour chaque note, le LLM ancre le « pourquoi » dans le(s) thème(s) qui collent : `[hypothèse : s'inscrit dans ton thème « design systems » — …]`. Toujours marqué comme hypothèse, jamais présenté comme un fait. S'il ne peut pas rattacher à un thème : proposer un nouveau thème `[nouveau thème ? : …]`, ou `[à compléter]`. Evan confirme au review.
3. **Une note = une idée.** Un thread avec 3 idées distinctes → 3 notes séparées.
4. **Contenu lié** récupéré best-effort (fetch simple, extraction texte). Si lien mort → le noter dans la note, ne pas bloquer.
5. **Validation par PR.** Statut initial `a-valider`. Evan relit/édite/merge depuis web ou mobile. Le merge = validé.
6. **Langue : français.** Résumés dans un français direct, pas un copier-coller du tweet.
7. **Runtime LLM = Claude sur Max** (via la routine). Ne pas câbler de clé API Anthropic. Ne pas utiliser Fable 5 (trop lourd) — la routine tourne avec le modèle par défaut de la session.

## Livrables à produire

1. **`templates/TEMPLATE-note.md`** — schéma d'une note. Front matter YAML : `source_url`, `source_tweet_id`, `auteur`, `date_bookmark`, `date_traitement`, `themes: []`, `tags: []`, `statut: a-valider`. Corps : `# Titre` (le claim en une phrase, pas le sujet) ; **Résumé** (2-3 phrases FR) ; **Pourquoi gardé** (hypothèse marquée, ancrée thème) ; **Liens** (`[[slug]]` vers des notes RÉELLEMENT existantes uniquement — jamais inventer) ; **Contexte** (thread déroulé / extrait de la page liée, replié en bas).

2. **`themes.md`** — registre des thèmes récurrents, seedé depuis les vrais bookmarks d'Evan. Seed de départ (à affiner) : branding & brand systems ; design systems & tokens ; outils & IA (produits, MCP) ; business / MRR / idées de startup ; dev / IDE / open-source ; UX & mobile. Format : un thème = un titre + une ligne de description + éventuels alias. Instruction claire : la routine peut *proposer* un nouveau thème (marqué) mais ne l'ajoute au registre qu'après validation humaine.

3. **`scripts/lib/x.mjs`** — helpers : `refreshAccessToken()` (renvoie access + nouveau refresh), `fetchBookmarks(userId, cursor, max)` avec pagination par 50. Réutiliser le pattern de `x-test.mjs`.

4. **`scripts/ingest.mjs`** — orchestration Partie 1 : refresh (+ retourne le nouveau refresh token pour rotation), fetch depuis le curseur, écrit `inbox/*.json`, met à jour `.processed.json` (+ backup), respecte `MAX_PER_RUN`.

5. **`scripts/build-index.mjs`** — régénère `INDEX.md` **déterministiquement** depuis le front matter de toutes les notes (colonnes : note, résumé 1 ligne, thèmes, tags). Régénère aussi les MOCs dans `moc/` (une par thème, listant ses notes). Lancé par la routine, pas par le LLM à la main.

6. **`.github/workflows/ingest.yml`** — cron quotidien, secrets X, rotation du refresh via `GH_PAT`, exécute `ingest.mjs`, commit `inbox/` + `.processed.json`.

7. **`ENRICH-PROMPT.md`** — LE cœur : les instructions que la routine Claude suit à chaque run. Doit être entièrement autonome (une routine ne peut pas poser de question en cours de run). Contenu : lire `inbox/` ; pour chaque bookmark, dérouler thread + récupérer lien, produire 1 note **par idée** au format du template, ancrer le « pourquoi » dans `themes.md`, poser des `[[liens]]` uniquement vers des notes existantes ; lancer `build-index.mjs` ; ouvrir **une PR** `enrich/AAAA-MM-JJ` avec toutes les notes ; retirer d'`inbox/` les items traités. **Règles de repli explicites** : sujet indéterminable → tag `a-trier` ; lien mort → le noter et continuer ; thème incertain → hypothèse marquée. **Règle de sécurité : ne jamais supprimer ni écraser une note existante, uniquement créer** (sauf les items d'inbox traités).

8. **`README.md`** — le rituel de validation hebdo d'Evan (relire la PR, corriger les « pourquoi », merger), comment tout s'emboîte, et les étapes de setup restantes (créer le PAT, créer la routine).

9. **`.gitignore`** — au minimum `.obsidian/workspace*`.

## Ce qu'Evan doit faire lui-même (à lister dans le README, ne pas tenter à sa place)

- Créer un **PAT GitHub fine-grained** (droit *Secrets: read/write* sur `bookmark-x`) et l'ajouter en secret `GH_PAT`. Nécessaire à la rotation du refresh token.
- Créer la **routine planifiée** (via /schedule) pointant sur `ENRICH-PROMPT.md`, une fois le code en place.
- Ne pas activer la recharge auto des crédits X. Surveiller la première facture (bug rapporté : bookmarks parfois facturés 0,005 $ au lieu de 0,001 $).

## Garde-fous

- Repo public : **aucun secret dans git**, jamais. Tokens uniquement dans les secrets GitHub Actions.
- Pas de backfill massif (l'endpoint plafonne à ~800 bookmarks de toute façon). On teste sur 10 récents, on juge la qualité, puis on décide de l'échelle.
- Création de fichiers uniquement dans le vault, jamais d'écrasement de note.
- Ne pas créer de compte, ne pas souscrire, ne pas toucher aux moyens de paiement.

## Risques ouverts à garder en tête

- Rotation du refresh token X (single-use ?) — à gérer défensivement, c'est le point de casse n°1.
- Accès aux secrets depuis une routine Claude — non résolu, d'où l'archi hybride (l'Action porte les secrets X).
- Déterminisme de la rédaction LLM — mitigé par la revue humaine en PR.
- Fragilité du volume / rythme — commencer petit, mesurer contre le test « relire avec plaisir ».

## Test d'acceptation

Un run manuel de la routine sur les 10 bookmarks déposés par un run d'ingestion produit une PR de 10-15 notes que : (a) suivent le template, (b) ancrent un « pourquoi gardé » plausible dans un thème réel d'Evan, (c) ne contiennent aucun lien `[[...]]` mort, (d) donnent envie d'être relues. Si oui : succès, on passe au régime de croisière.
