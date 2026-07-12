# ADR-001 — Pipeline bookmarks X → second cerveau interrogeable

Date : 2026-07-12 · Statut : **proposé, en attente de validation** · Auteur : Claude (phase 1, aucun code écrit)

## Le besoin en 5 lignes

Je bookmarke sur X sans changer d'habitude. Un job planifié récupère les nouveaux bookmarks, un enrichissement LLM les transforme en notes atomiques (résumé, pourquoi gardé, tags, liens), les notes atterrissent dans un stockage que je possède, et je les interroge en langage naturel depuis Claude mobile **sans que mon PC soit allumé**. Rien n'est définitif sans validation humaine. Coût quasi nul, pas d'abonnement, pas de secrets dans git.

---

## Faits vérifiés le 12 juillet 2026 (les prémisses corrigées)

Avant les options, ce que la recherche a confirmé ou invalidé par rapport au brief :

1. **API X** : l'endpoint `GET /2/users/:id/bookmarks` existe toujours (OAuth2 PKCE, scopes `bookmark.read tweet.read users.read offline.access`). Le pricing pay-per-use est réel : **Owned Reads à 0,001 $/item, effectif au 20 avril 2026** (pas février), avec déduplication sur 24 h. Backfill de 800 ≈ 0,80 $ ; flux de 10–50/jour ≈ 0,30–1,50 $/mois. ⚠️ Un bug de facturation rapporté en juin 2026 facturerait les bookmarks à 0,005 $ (5×) — non résolu à ma connaissance. **Il n'y a plus de tier gratuit** : crédits prépayés obligatoires.
2. **Cap dur : l'endpoint ne pagine que les ~800 bookmarks les plus récents.** L'archive officielle X **n'inclut pas** les bookmarks. Pour un backfill au-delà de 800 ou les dossiers de bookmarks, seules les extensions navigateur (scraping du GraphQL interne : `twitter-web-exporter`, `xarchive` — open source, gratuits) fonctionnent, avec un risque ToS théorique.
3. **Notion Workers** : existent, en beta, mais **réservés aux plans Business/Enterprise**. Gratuits pendant la beta puis facturés en crédits (la page officielle dit maintenant 15 octobre 2026, pas 11 août). Il n'existe **aucun moyen légitime** de les faire tourner sur un plan Free. → Ton « trou dans la raquette » est confirmé et il est fatal.
4. **Connecteurs Claude mobile** : les connecteurs remote MCP (dont GitHub et Notion) fonctionnent sur iOS/Android sur **tous les plans, y compris Free (limité à 1 connecteur custom)**. L'ajout se fait depuis claude.ai web, puis se synchronise sur mobile. Le connecteur GitHub MCP expose recherche de code, lecture de fichiers, issues/PR.
5. **Recherche de code GitHub sur repo privé** : fonctionne en compte gratuit, mais **branche par défaut uniquement**, indexation avec des retards de quelques minutes à 30 min, et repos peu actifs parfois dé-priorisés.
6. **GitHub Actions** : 2 000 min/mois gratuites sur repo privé, secrets chiffrés, commit depuis une action = standard. Deux pièges réels : les crons `schedule` **dérivent de 5–30 min** (sans importance ici) et surtout **sont désactivés automatiquement après 60 jours sans activité sur le repo** — piège classique du projet qui « meurt en silence ».
7. **Cloudflare Workers Free** : cron triggers gratuits, hébergement d'un serveur MCP distant officiellement documenté, 0 €. Faisable, mais c'est de l'infra à maintenir.

---

## Options évaluées

### A. Notion Workers
Ingestion et enrichissement hébergés par Notion, consultation via le connecteur MCP Notion (recherche sémantique native, un vrai plus). **Disqualifiée** : exige un plan Business (~sortie de budget immédiate), facturation en crédits dès octobre 2026, et les données vivent dans Notion — export possible mais les relations/databases s'exportent mal en markdown. Trois dépendances propriétaires empilées (plan, crédits, format) pour un gain de recherche que l'option B peut compenser autrement.

### B. GitHub fait tout (recommandée, avec amendements)
- **Stockage** : repo GitHub **privé** = vault Obsidian (fichiers `.md`, front matter YAML). Propriété totale, format ouvert, versionné.
- **Compute** : GitHub Actions, cron 1×/jour. Secrets dans GitHub Actions Secrets.
- **Ingestion** : API X officielle (coût réel connu, ~1 $/mois max), dépôt brut dans `inbox/`.
- **Enrichissement** : script Node/Python dans le repo, appel API Anthropic (Haiku 4.5 suffit : ~0,10 $/mois pour 30 notes/jour), notes créées avec `statut: à-valider`.
- **Validation** : la revue humaine passe par **une Pull Request par lot** (voir plus bas — ça résout aussi le « pourquoi gardé »).
- **Consultation** : connecteur GitHub MCP dans Claude (web + mobile). Pour contourner les faiblesses de la recherche GitHub, le job maintient un **`INDEX.md` généré** (titre + résumé d'une ligne + tags de chaque note) : Claude lit ce fichier unique, puis ouvre les notes pertinentes. C'est du RAG du pauvre, et à 500–2 000 notes ça marche très bien.

### C. Cloudflare Worker + MCP custom (l'option « troisième voie », écartée pour l'instant)
Un Worker Cloudflare gratuit fait le cron d'ingestion/enrichissement et expose un serveur MCP custom (avec éventuellement Vectorize pour du sémantique), stockage restant le repo GitHub. Techniquement élégante et 0 €, mais : tu es UX designer, pas dev — un serveur MCP custom avec OAuth, c'est **ton** infra à déboguer quand elle casse. L'option B fait la même chose avec des briques gérées. C garde son sens plus tard comme **extension** de B (couche de recherche vectorielle par-dessus le même repo), pas comme fondation.

### D. Variante d'ingestion sans API X (à garder en poche)
Extension navigateur open source (`twitter-web-exporter`) exportant les bookmarks en JSON, déposés manuellement dans `inbox/` (~1×/semaine, 2 min). Gratuite, contourne le cap des 800, mais réintroduit une friction manuelle et dépend de ta machine pour la capture (pas pour la consultation). C'est le **plan B d'ingestion** si le bug de facturation X persiste ou si les prix montent — le reste du pipeline ne change pas d'une ligne.

## Tableau comparatif

| Critère | A. Notion Workers | B. GitHub | C. Cloudflare MCP | D. B + extension |
|---|---|---|---|---|
| Coût réel/mois | Plan Business (~20 $+/mois) + crédits dès oct. 2026 | ~0,50–2 $ (API X + Anthropic) | ~0,10 $ (Anthropic seul) + API X | ~0,10 $ (Anthropic seul) |
| Dépendance à ta machine | Aucune | Aucune | Aucune | Capture hebdo sur PC (consultation : aucune) |
| Qualité de recherche | Sémantique native (le meilleur) | Plein texte + INDEX.md généré (suffisant ≤ ~2 000 notes) | Vectorielle possible (Vectorize) | = B |
| Propriété des données | Export possible mais format Notion | Totale, markdown dans ton repo | Totale | Totale |
| Effort de setup | Moyen, mais bloqué par le plan | Moyen (1–2 sessions guidées) | Élevé (MCP custom, OAuth) | = B − OAuth X |
| Fragilité dans le temps | Beta + pricing mouvant + plan | Faible ; pièges connus et parables (cron 60 j, indexation) | Moyenne (infra perso à maintenir) | Faible + dépendance à une extension tierce |

## Recommandation

**Option B**, pour une raison principale : c'est la seule où **chaque brique est gratuite, gérée par quelqu'un d'autre, et remplaçable indépendamment** — l'ingestion peut basculer sur D, la recherche peut être augmentée par C, le stockage reste tes fichiers markdown quoi qu'il arrive. Le repo est le contrat ; tout le reste est interchangeable.

Raison principale de ne pas choisir les autres :
- **A** : le mur du plan Business viole la contrainte « pas d'abonnement », point final. Même gratuit jusqu'en octobre, tu construirais sur une beta dont le prix est annoncé à la hausse.
- **C** : même résultat que B mais avec de l'infra que tu devras maintenir seul ; mauvais échange pour un non-dev.
- **D seul** : garde ta machine dans la boucle de capture ; acceptable en secours, pas comme choix premier tant que l'API X coûte ~1 $/mois.

## Réponses aux points à challenger

**1. Claude mobile.** Satisfait par B via le connecteur GitHub MCP (tous plans, Free = 1 connecteur, ajout via claude.ai web puis dispo sur mobile). Nuance honnête : la recherche de code GitHub est le maillon faible (branche par défaut seulement, latence d'indexation). D'où l'`INDEX.md` généré : la consultation type devient « lis INDEX.md, trouve les 3 notes pertinentes, ouvre-les » — de la lecture directe de fichiers, qui ne dépend pas de l'indexeur.

**2. L'API X est-elle le bon vecteur ?** Oui pour le **flux** (coût maîtrisé, zéro friction, zéro machine), non pour l'**historique profond** (cap ~800, dossiers inaccessibles). L'archive officielle ne contient pas les bookmarks — cette porte est fermée. Décision : API X pour le flux, et si un jour tu veux plus que les 800 derniers, un export unique via extension open source. Les services payants (Dewey 10 $/mois, Tweetsmash) sont hors budget et n'apportent rien de plus.

**3. L'enrichissement LLM : valeur ou bruit ?** Le résumé, le déroulé de thread et la récupération de la page liée sont de la vraie valeur mécanique. Le « pourquoi gardé » est le point honnête : **le modèle ne doit pas l'écrire, il doit le demander.** Format de note proposé :

```markdown
---
source: https://x.com/.../status/...
auteur: "@handle"
date_bookmark: 2026-07-10
tags: [design-systems, tokens]
statut: à-valider
---
# Titre en une phrase (le claim, pas le sujet)

**Résumé** — 3 phrases max, dans un français direct.
**Pourquoi gardé** — ⟨à compléter : hypothèse du modèle entre crochets, ex. « [lié à tes notes sur les tokens Figma ?] »⟩
**Liens** — [[note-existante-1]], [[note-existante-2]] (proposés par similarité de tags/titres)
**Contexte** — thread déroulé / extrait de la page liée, replié en bas.
```

Le modèle propose une *hypothèse* de « pourquoi », visiblement marquée comme telle. Ta validation (la PR) consiste à confirmer, corriger ou remplacer en une ligne. Une note dont le « pourquoi » reste une hypothèse non éditée après revue = candidate à la suppression : si tu ne sais pas dire pourquoi tu l'as gardée, tu ne l'as pas gardée. C'est le mécanisme anti-cimetière.

**4. La recherche.** À ton volume (centaines, peut-être 2 000 notes à horizon 2 ans), un index vectoriel est de la sur-ingénierie : le coût de maintenance dépasse le gain. Grep + INDEX.md + tags tiennent largement. Le point de bascule est ~quelques milliers de notes ou des requêtes conceptuelles qui échouent régulièrement en plein texte — à ce moment-là, l'option C (Vectorize sur le même repo) s'ajoute sans rien casser. On décide sur symptôme, pas par anticipation.

**5. Volume et rythme.** Ton intuition est bonne et je la durcis : **pas de backfill massif au lancement.** Le pipeline traite le flux + un lot rétroactif de ~20 notes/semaine max, présenté en une PR que tu revois réellement (5–10 min). Un backfill de 800 notes « à-valider » d'un coup, c'est 800 notes jamais validées — le cimetière avec une meilleure typographie. Le cap des 800 de l'API rend d'ailleurs le « tout l'historique » impossible proprement ; c'est une contrainte qui va dans le bon sens.

**6. Troisième architecture.** Examinée (C, D ci-dessus). Airtable écartée : automatisations limitées à 100 runs/mois en Free, format propriétaire, pas mieux que Notion. VPS écarté : c'est un serveur à administrer, l'anti-besoin.

## Hypothèses non vérifiées (= risques)

1. **Bug de facturation X** : bookmarks possiblement facturés 0,005 $ au lieu de 0,001 $ (5×). Impact plafonné : même ×5, ~5 $/mois au pire. À vérifier sur la première facture réelle.
2. **Liste exacte des outils du connecteur GitHub MCP dans claude.ai** (Anthropic peut filtrer les toolsets) — la lecture de fichiers est confirmée par des sources tierces, pas par une doc officielle Anthropic. Test en étape 0 ci-dessous.
3. **Durée de vie/rotation des refresh tokens OAuth2 X** : non documentée. Risque : re-autorisation manuelle périodique (une visite sur une URL, pas plus).
4. **Fiabilité du connecteur GitHub sur repos privés** : ❌ **CONFIRMÉ COMME LIMITANT.** L'étape 0 a établi que le connecteur MCP officiel ne peut pas accéder aux repos privés, même avec OAuth autorisé. Le vault doit être public. Ça règle la question mais élimine une option de privacy.
5. **Stabilité du pricing X** : X a changé son modèle deux fois en 2026. D est le plan de sortie.

## Plan d'implémentation (après ton feu vert)

**Étape 0 — Test éliminatoire (toi, 15 min, avant tout code).** ✅ **VALIDÉE (avec changement).**
Le connecteur GitHub MCP fonctionne sur Claude mobile et peut lire/interroger les notes du repo. **Découverte clé : l'accès aux repos privés est bloqué** (limitation confirmée du connecteur MCP officiel). **Solution : le repo est maintenant public** sur GitHub. Les notes sont listables publiquement, mais sans secrets de toute façon.

Premier test réussi : Claude a retrouvé la note sur le contraste APCA vs WCAG 2 et restitué la bonne réponse. Les deux autres questions n'ont pas été testées (flemme utilisateur), mais la preuve de concept tient.

**Étape 1 — Repo et schéma.** Structure `inbox/`, `notes/`, `INDEX.md`, `templates/`, `.github/workflows/`. Vault ouvrable dans Obsidian tel quel. *Moi : tout. Toi : rien.*

**Étape 2 — OAuth X + crédits.** Créer l'app dans le portail développeur X, obtenir client ID/secret, acheter le minimum de crédits, autoriser en OAuth2 PKCE. *Toi : toutes les manipulations sur x.com (comptes, paiement, autorisation) — je te donne les commandes et je ne touche à rien. Les tokens vont dans GitHub Actions Secrets, jamais dans git.*

**Étape 3 — Ingestion.** Action planifiée quotidienne : bookmarks → JSON brut dans `inbox/`, avec curseur `since_id` pour la dédup. Un commit « chore: heartbeat » mensuel automatique pour parer la désactivation des crons à 60 jours d'inactivité. *Moi : le code. Toi : ajouter les secrets.*

**Étape 4 — Enrichissement.** Pour chaque item de l'inbox : thread déroulé (déjà dans la réponse API), page liée récupérée (fetch simple d'abord, Firecrawl free tier si insuffisant), appel Anthropic (Haiku 4.5), note au format ci-dessus, régénération d'INDEX.md. Sortie : **une branche + une PR par lot**, jamais de push direct sur `main`. *Toi : clé API Anthropic (~5 $ de crédits, plusieurs mois d'usage) + revue de la première PR ensemble.*

**Étape 5 — Premier lot de bout en bout.** 10 bookmarks réels, PR revue par toi (édition des « pourquoi » directement dans l'interface GitHub, mobile ou web), merge, puis interrogation depuis Claude mobile. Critère de succès : tu retrouves une info précise en une question. *Toi : la revue et le test mobile.*

**Étape 6 — Régime de croisière.** Cadence validée ensemble (proposition : ingestion quotidienne, PR d'enrichissement 2×/semaine, ~10–20 notes par PR). Obsidian se branche sur le repo quand tu veux, sans conflit : le job n'écrit que via PR, tes éditions manuelles vont sur `main` — le seul point de friction possible est une note éditée des deux côtés, rare et résolu dans l'interface de PR.

## Les 3 questions dont la réponse changerait ma recommandation

1. **Le test de l'étape 0 passe-t-il ?** ✅ **Oui, avec repo public.** Le connecteur GitHub MCP fonctionne sur Claude mobile et peut interroger les notes. Limitation confirmée : repos privés inaccessibles → choix appliqué : repo public. La couche consultation B tient.

2. **Es-tu prêt à payer ~1–5 $/mois à X, à durée indéterminée, pour la friction zéro ?** À déterminer à l'étape 2 (première vraie facture API X, peut-être différente des estimations).

3. **Es-tu à l'aise avec un vault publiquement accessible sur GitHub ?** ✅ **Oui** (« go public »). Les notes ne contiennent pas de secrets de toute façon.
