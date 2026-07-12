---
source_url: https://x.com/UiSavior/status/1863377431719018860
source_tweet_id: "1863377431719018860"
auteur: "@UiSavior"
date_bookmark: 2024-12-02
date_traitement: 2026-07-13
type: concept
themes: [design-systems, ux-mobile]
tags: [corner-radius, formule, composants, cohérence]
statut: a-valider
---
# Un rayon de coin cohérent se calcule : rayon extérieur = rayon intérieur + padding

**Résumé** — Pour que des coins arrondis imbriqués paraissent concentriques (un bouton dans une carte, une image dans un conteneur), le rayon extérieur doit valoir le rayon intérieur plus l'épaisseur du padding qui les sépare. Régler chaque rayon à l'œil casse cet alignement optique ; la formule le rend systématique et transposable en token.

**Pourquoi gardé** — [hypothèse : s'inscrit dans ton thème « design-systems » — une règle géométrique qui se tokenise et évite les incohérences de rayon entre composants imbriqués.]

**Liens** — [[2026-07-05-tokens-semantic-vs-primitive]]

**Contexte**

> « If you're looking for a perfect corner radius formula, here's one to help you out! » Contenu principal : image expliquant la formule (non analysée). La règle de référence dans le milieu : `rayon_extérieur = rayon_intérieur + padding`.
