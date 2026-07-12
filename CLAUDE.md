# Second cerveau d'Evan — contrat de consultation

Ce repo est le second cerveau d'Evan (UX/UI designer). Tu le consultes pour le
comprendre et répondre avec SA mémoire, pas seulement la tienne.

## Protocole de lecture

1. Lis `profile/USER.md` (qui il est) et `profile/working-style.md` (comment travailler avec lui).
2. Lis `INDEX.md` — la carte de toutes les notes (titre, résumé 1 ligne, type, thèmes).
3. N'ouvre ensuite QUE les notes pertinentes à la demande. Jamais de lecture massive.
4. `moc/<theme>.md` pour explorer un sujet ; `themes.md` pour le registre des thèmes.

## Protocole d'écriture

- **Cherche avant de créer** : une idée déjà notée s'enrichit par lien, pas par doublon.
- Nouvelle note → format `templates/TEMPLATE-note.md`, statut `a-valider`, dans `notes/`.
- Capture rapide sans traitement → fichier libre dans `inbox/` (la routine le traitera).
- **Jamais supprimer, jamais écraser** une note existante. En cas de doute : inbox.
- Après création de notes : `node scripts/build-index.mjs` régénère INDEX et MOCs.
- `themes.md` et `profile/` : Evan seul les édite.

## Pipeline (contexte)

Bookmarks X → GitHub Action quotidienne → `inbox/*.json` → routine d'enrichissement
(ENRICH-PROMPT.md) → notes + PR → validation Evan. Détails : ADR-001, ADR-002.
