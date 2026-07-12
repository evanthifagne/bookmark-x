# ADR-002 — Du pipeline bookmarks au second cerveau complet

Date : 2026-07-13 · Statut : **proposé** · Complète ADR-001 (la brique ingestion X reste valable telle quelle).

## La vision

Un second cerveau unique où TOUT vit : bookmarks X (références design, concepts, tutoriels, tweets), notes propres, projets, décisions. Claude y est connecté en permanence — chaque conversation peut le consulter pour comprendre Evan et répondre avec SA mémoire. Coût : 0 € au-delà de l'existant (~1 $/mois d'API X).

## Ce que dit la recherche (X, Reddit, forums, blogs de praticiens — juillet 2026)

Les deux rapports complets sont résumés ici ; les décisions en découlent directement.

1. **Aucun système canonique (PARA pur, Zettelkasten pur) ne survit à 1-2 ans.** Ce qui survit : un hybride minimal — *les dossiers encodent le cycle de vie (inbox → notes → archive), les liens/MOCs encodent les sujets*. Les MOCs se créent **après coup**, quand un thème déborde, jamais par taxonomie a priori.
2. **Le regret n°1 : la sur-structuration précoce** (« over-engineering as procrastination ») ; le n°2 : la collectionnite — capturer sans jamais relire. Cas emblématique : 10 000 notes supprimées après 7 ans. Un second cerveau ne vaut que par ce qu'il **produit**.
3. **La relecture par discipline échoue ; le push léger survit.** Revues hebdo exhaustives et résumés préventifs en batch = théâtre abandonné. Ce qui marche : une ligne « pourquoi je garde ça » à la capture (déjà notre pilier), du resurfacing micro-dosé sans obligation (quelques vieilles notes remontées automatiquement), et la distillation *à l'usage* (quand un projet rend une note pertinente).
4. **Les images volumineuses dans git = piège irréversible** (l'historique garde tout, repos qui explosent). Les références design doivent vivre HORS git, ou en vignettes légères.
5. **Vault + LLM** : le pattern gagnant 2026 = agent CLI sur le vault (grep ciblé ~100 tokens vs MCP full-scan ~millions), `CLAUDE.md` comme contrat, `INDEX.md` compact avec `summary:` par note, notes atomiques, « chercher avant de créer », **jamais d'écriture agent sans git + règle anti-suppression** (déjà les nôtres).
6. **Claude connecté (docs Anthropic)** : les Projects claude.ai ont maintenant un RAG automatique (~10× la fenêtre de contexte, tous plans) avec GitHub integration (sync manuel, lecture seule) ; la mémoire native (tous plans) est un résumé opaque — complément pour les préférences, pas un stockage de connaissances ; le connecteur GitHub MCP reste la voie lecture ciblée + écriture sur mobile.

## Architecture retenue

**Le repo `bookmark-x` devient le second cerveau entier.** Rien ne change pour l'existant, on étend.

### Structure (minimale — on ne crée un dossier que quand du contenu l'exige)

```
inbox/          capture brute : JSON X (auto) + captures manuelles (.md libres)
notes/          notes atomiques, à plat — TOUT le savoir, tous types confondus
moc/            cartes par thème (générées) + MOCs émergents (manuels)
profile/        qui je suis — lu par Claude à chaque session (voir plus bas)
attachments/    images LÉGÈRES uniquement (vignettes < ~300 Ko, renommées)
templates/, themes.md, INDEX.md, CLAUDE.md
(projects/, journal/, archive/ : créés le jour où le besoin existe, pas avant)
```

### Les 4 types de contenu des bookmarks

Un champ `type:` dans le front matter, pas des dossiers : `reference-design` | `concept` | `tutoriel` | `tweet`. L'INDEX et les MOCs affichent le type ; Obsidian filtre dessus. Traitement différencié par l'enrichissement :
- **reference-design** → la note décrit CE QUI est remarquable visuellement (composition, couleur, pattern) — c'est la description qui rend l'image retrouvable en langage naturel. L'image elle-même reste sur X (lien) ; si elle est précieuse, Evan la sauvegarde dans Eagle ou `attachments/` en vignette. Pas d'image lourde dans git.
- **concept** → le format actuel (claim, résumé, pourquoi, liens).
- **tutoriel** → + section « étapes clés » condensées, pour que le tuto soit utilisable sans retourner à la source.
- **tweet** (divers) → format actuel court.

### « Claude me comprend » : le dossier `profile/`

Pattern CLAUDE.md/USER.md documenté et promu par Anthropic :
- `profile/USER.md` — qui est Evan : rôle, projets en cours, objectifs, stack, goûts design. **Rempli par Evan, mis à jour comme du code.**
- `profile/working-style.md` — comment travailler avec lui (concision, direct, FR).
- `CLAUDE.md` à la racine — le contrat : « lis profile/ et INDEX.md d'abord, cherche avant de créer, ne supprime jamais ».

### Claude connecté en permanence — 3 canaux, 0 €

| Canal | Usage | Mécanisme |
|---|---|---|
| **Project claude.ai « Second Brain »** | web + mobile, conversations courantes | GitHub integration dans le project knowledge (RAG auto ~10×). Instructions du Project : « lis INDEX.md et profile/USER.md d'abord ». Limite : bouton Sync manuel de temps en temps. |
| **Connecteur GitHub MCP** (en place) | lecture ciblée + écriture depuis mobile | « ajoute une note à mon second cerveau » fonctionne depuis le téléphone |
| **Claude Code local** | travail profond, maintenance du vault | le vault EST le dossier de travail ; CLAUDE.md lu automatiquement |

- **Mémoire native Claude : à activer** (Settings → Capabilities) — elle retiendra l'existence et le mode d'emploi du vault entre les conversations.

### Le rituel anti-cimetière (révisé par la recherche)

1. **La PR reste le point de validation** — mais elle devient aussi le **resurfacing push** : chaque PR d'enrichissement inclut une section « 🔁 3 notes d'il y a longtemps » (aléatoires). Tu les revois sans effort en relisant la PR. Zéro discipline requise.
2. **Droit de jeter** : une note `a-valider` dont tu ne confirmes pas le « pourquoi » en 2 PRs → suppression assumée. Le vault se mesure à ce qu'il produit.
3. **Distillation à l'usage seulement** : on n'améliore une note que quand un vrai besoin la fait ressortir. Pas de batch.

### Capture manuelle (nouveau canal d'entrée)

Depuis n'importe où : dire à Claude (mobile, via MCP GitHub) « ajoute à mon inbox : … » → fichier dans `inbox/`, traité par la routine comme un bookmark. Depuis Obsidian : note directe dans `inbox/`. Même moulinette, même validation.

## Ce qu'on ne fait PAS (et pourquoi)

- **Pas de dossiers thématiques**, pas de hiérarchie > 2 niveaux — les liens font ce travail (regret n°1 des praticiens).
- **Pas d'index vectoriel/MCP memory** pour l'instant — INDEX.md + RAG des Projects suffit très en dessous de ~1 000 notes. Le candidat validé si besoin un jour : mcp-memory sur Cloudflare free tier (custom connector, mobile OK).
- **Pas d'images lourdes dans git** — références en lien + description ; Eagle en local si collection sérieuse.
- **Pas de journal/SRS/revue hebdo formelle** — théâtre documenté.
- **Pas de refonte de l'existant** : les 14 notes, l'ingestion, la routine restent. On étend, on ne casse pas.

## Plan d'implémentation

| # | Quoi | Qui |
|---|---|---|
| 1 | `CLAUDE.md`, `profile/USER.md` (squelette), `profile/working-style.md`, champ `type:` dans le template, ENRICH-PROMPT mis à jour (types + resurfacing + capture manuelle), INDEX avec colonne type | Claude ✅ |
| 2 | Remplir `profile/USER.md` (15 min, le geste le plus rentable du système) | **Evan** |
| 3 | Créer le Project « Second Brain » sur claude.ai + GitHub integration + instructions | **Evan** (guidé) |
| 4 | Activer la mémoire native (Settings → Capabilities) | **Evan** |
| 5 | Créer la routine planifiée d'enrichissement | Claude, sur feu vert |
| 6 | Vivre avec 2-4 semaines, PUIS décider des extensions (journal, projets, Eagle, vectoriel) sur besoin réel | les deux |

## Risques

- Sync manuel du Project : la connaissance du Project peut dater de quelques jours. Mitigé par le connecteur MCP (toujours frais).
- Repo public = tout le second cerveau est public. OK pour du contenu de veille ; **le jour où du personnel/client y entre, il faudra re-trancher** (repo privé + consultation via Project sync uniquement, qui marche en privé).
- La théorie dit que les systèmes meurent par excès d'ambition. Ce plan est volontairement minimal ; la discipline est de le garder tel quel un mois.
