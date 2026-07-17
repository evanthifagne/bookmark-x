---
source_url: https://x.com/sorenblank/status/2028520200417706017
source_tweet_id: "2028520200417706017"
auteur: "@sorenblank"
date_bookmark: 2026-03-02
date_traitement: 2026-07-18
type: concept
themes: [design-systems, ux-mobile]
tags: [typographie, css, chiffres, micro-regles]
statut: a-valider
---
# Tout nombre qui change à l'écran devrait être en tabular-nums pour éviter que l'UI tressaute

**Résumé** — Les chiffres à chasse variable font bouger la mise en page dès qu'une valeur change (timer, compteur, prix, score, data live). La règle : activer les chiffres tabulaires par défaut sur ces éléments via `font-variant-numeric: tabular-nums` — chaque chiffre occupe la même largeur, les colonnes s'alignent et rien ne saute.

**Pourquoi gardé** — [hypothèse : s'inscrit dans ton thème « design-systems » — une micro-règle typo à inscrire d'office dans les tokens/styles de tout composant numérique.]

**Liens** — [[2026-01-12-trois-tips-ui-rico]]

**Contexte**

> « `tabular-nums` should be the default for any number that updates (timers, counters, prices, percentages, scores, live data etc). You can enable this tnum OpenType feature using the CSS property `font-variant-numeric`. » — @sorenblank
