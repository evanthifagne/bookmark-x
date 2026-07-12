# Bookmark X — second cerveau

Pipeline : bookmarks X → notes atomiques → vault interrogeable depuis Claude
(web et mobile). Architecture et décisions : [ADR-001-architecture.md](ADR-001-architecture.md) ·
Spécification du build : [HANDOFF-build.md](HANDOFF-build.md).

## Comment ça s'emboîte

```
X (bookmarks @weshcevan)
   │  GitHub Action quotidienne (.github/workflows/ingest.yml)
   │  — secrets X, rotation du refresh token, MAX 10/run
   ▼
inbox/*.json  (bookmarks bruts, commités sur main)
   │  Routine Claude planifiée (suit ENRICH-PROMPT.md, tourne sur le Max d'Evan)
   │  — 1 note par idée, « pourquoi gardé » ancré dans themes.md
   ▼
Pull Request enrich/AAAA-MM-JJ  →  revue humaine  →  merge
   ▼
notes/*.md + INDEX.md + moc/   (le vault, ouvrable dans Obsidian)
   ▼
Claude mobile (connecteur GitHub MCP) : lire INDEX.md, ouvrir les notes
```

## Le rituel hebdo (5–10 min)

1. Ouvre la ou les PR `enrich/…` en attente (web ou mobile).
2. Pour chaque note : lis le **Pourquoi gardé**. C'est une hypothèse entre
   crochets — confirme-la en la réécrivant dans tes mots, ou corrige-la.
   Une note dont le pourquoi reste `[à compléter]` après ta relecture est
   candidate à la suppression : si tu ne sais pas dire pourquoi tu l'as gardée,
   tu ne l'as pas gardée.
3. Ajuste thèmes/tags si besoin. Si la PR propose un `[nouveau thème ? : …]`
   qui te parle, ajoute-le toi-même à `themes.md` (toi seul édites ce fichier).
4. Merge. Le merge = validation (`statut: a-valider` peut alors passer à
   `validee` — édition libre, ou laisse tel quel, l'INDEX l'affiche).

## Interroger le vault depuis Claude

Sur mobile ou web, avec le connecteur GitHub MCP :
> « Lis INDEX.md du repo evanthifagne/bookmark-x, puis ouvre les notes
> pertinentes : qu'est-ce que mes notes disent sur … ? »

## Setup restant (à faire une fois)

1. **PAT GitHub** (rotation du token X) : GitHub → Settings (compte) →
   Developer settings → Fine-grained tokens → nouveau token, accès au seul
   repo `bookmark-x`, permission **Secrets: Read and write** (et Metadata:
   Read, ajoutée automatiquement). L'ajouter en secret du repo sous `GH_PAT`.
2. **Routine planifiée** : via `/schedule` dans Claude Code — quotidienne,
   ~1 h après l'ingestion (qui tourne à 06:17 UTC), prompt :
   « Suis les instructions de ENRICH-PROMPT.md du repo evanthifagne/bookmark-x. »
3. **Crédits X** : ne pas activer la recharge auto. Vérifier la première
   facture (bug rapporté : bookmarks parfois facturés 0,005 $ au lieu de 0,001 $).

## Fichiers

| Chemin | Rôle | Édité par |
|---|---|---|
| `inbox/` | bookmarks bruts en attente | Action (création), routine (retrait) |
| `notes/` | les notes atomiques | routine (création), Evan (édition) |
| `templates/TEMPLATE-note.md` | format d'une note | Evan |
| `themes.md` | registre des thèmes (ancrage du « pourquoi ») | **Evan uniquement** |
| `INDEX.md`, `moc/` | index et MOCs générés | `scripts/build-index.mjs` uniquement |
| `ENRICH-PROMPT.md` | instructions de la routine | Evan |
| `.processed.json` | IDs de tweets déjà ingérés | `scripts/ingest.mjs` uniquement |
| `scripts/` | ingestion, index, OAuth | — |

## Lancer un test manuel

```bash
# Ingestion locale (10 bookmarks max) — nécessite les 3 valeurs X en env :
X_CLIENT_ID=… X_CLIENT_SECRET=… X_REFRESH_TOKEN=… node scripts/ingest.mjs

# Ou via GitHub : onglet Actions → « Ingest X bookmarks » → Run workflow.

# Régénérer l'index localement :
node scripts/build-index.mjs
```

⚠️ Un run local consomme le refresh token courant (rotation X) : le nouveau
token est alors dans le fichier pointé par `ROTATED_TOKEN_FILE` si défini —
pense à mettre à jour le secret `X_REFRESH_TOKEN` ensuite, sinon le prochain
run GitHub partira avec un token mort.
