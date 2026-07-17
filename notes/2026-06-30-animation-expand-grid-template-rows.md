---
source_url: https://x.com/gabriell_lab/status/2071947977766117468
source_tweet_id: "2071947977766117468"
auteur: "@gabriell_lab"
date_bookmark: 2026-06-30
date_traitement: 2026-07-18
type: tutoriel
themes: []
tags: [css, animation, design-engineering]
statut: a-valider
---
# Les animations d'expansion moches viennent de `height: auto` — animer `grid-template-rows: 0fr → 1fr` à la place

**Résumé** — `height: auto` n'est pas animable en CSS, d'où les expand/collapse qui sautent. L'astuce : envelopper le contenu dans une grille et animer `grid-template-rows` de `0fr` à `1fr` — une valeur interpolable, donc une transition fluide vers une hauteur inconnue, sans JavaScript.

**Pourquoi gardé** — [nouveau thème ? : design-engineering — micro-techniques CSS d'interaction à la frontière design/code, qui reviennent souvent dans tes bookmarks.]

**Liens** —

**Étapes clés**

1. Conteneur en `display: grid` avec `grid-template-rows: 0fr` (état replié).
2. Enfant direct avec `overflow: hidden` et `min-height: 0`.
3. Au déclenchement, passer à `grid-template-rows: 1fr` avec une `transition` sur `grid-template-rows`.

**Contexte**

> « One CSS property is responsible for most ugly expand animations. It's height: auto. Replace it with: grid-template-rows: 0fr → 1fr ». Contenu principal : vidéo de démo, non analysée.
