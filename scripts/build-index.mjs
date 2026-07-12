#!/usr/bin/env node
// Régénère INDEX.md et les MOCs (moc/<theme>.md) depuis le front matter
// des notes. Déterministe : mêmes notes → mêmes fichiers. Zéro dépendance.
//
// Usage : node scripts/build-index.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NOTES = path.join(ROOT, "notes");
const MOC = path.join(ROOT, "moc");
const THEMES = path.join(ROOT, "themes.md");

// --- mini-parseur du front matter (nos champs sont plats : string ou [a, b]) ---
function parseFrontMatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const fm = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (!kv) continue;
    const [, key, raw] = kv;
    const v = raw.trim();
    if (v.startsWith("[")) {
      fm[key] = v
        .replace(/^\[|\]$/g, "")
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else {
      fm[key] = v.replace(/^["']|["']$/g, "");
    }
  }
  return fm;
}

function firstLine(md, marker) {
  // Extrait la 1re phrase du bloc "**Résumé** — …"
  const m = md.match(new RegExp(`\\*\\*${marker}\\*\\*\\s*—\\s*([^\\n]+)`));
  if (!m) return "";
  const text = m[1].trim();
  const dot = text.indexOf(". ");
  return dot > 20 ? text.slice(0, dot + 1) : text;
}

function title(md) {
  const m = md.match(/^# (.+)$/m);
  return m ? m[1].trim() : "(sans titre)";
}

// --- thèmes déclarés (slugs = titres ## de themes.md) ---
const themeSlugs = fs.existsSync(THEMES)
  ? [...fs.readFileSync(THEMES, "utf8").matchAll(/^## (.+)$/gm)].map((m) => m[1].trim())
  : [];

// --- lecture des notes ---
const files = fs.existsSync(NOTES)
  ? fs.readdirSync(NOTES).filter((f) => f.endsWith(".md")).sort().reverse() // récentes d'abord
  : [];

const notes = files.map((f) => {
  const md = fs.readFileSync(path.join(NOTES, f), "utf8");
  const fm = parseFrontMatter(md);
  return {
    file: f,
    slug: f.replace(/\.md$/, ""),
    title: title(md),
    summary: firstLine(md, "Résumé"),
    themes: fm.themes || [],
    tags: fm.tags || [],
    statut: fm.statut || "?",
    date: fm.date_bookmark || "",
  };
});

// --- INDEX.md ---
const esc = (s) => String(s).replace(/\|/g, "\\|");
let index = `# Index des notes

> Fichier généré par \`scripts/build-index.mjs\` — ne pas éditer à la main.
> Point d'entrée pour l'interrogation via Claude : lire ce fichier d'abord,
> puis ouvrir les notes pertinentes dans \`notes/\`.

${notes.length} note(s). Thèmes : ${themeSlugs.join(", ") || "(aucun)"}.

| Note | En une ligne | Thèmes | Tags | Statut |
|---|---|---|---|---|
`;
for (const n of notes) {
  index += `| [${esc(n.title)}](notes/${n.file}) | ${esc(n.summary)} | ${esc(n.themes.join(", "))} | ${esc(n.tags.join(", "))} | ${esc(n.statut)} |\n`;
}
fs.writeFileSync(path.join(ROOT, "INDEX.md"), index);
console.log(`✓ INDEX.md régénéré (${notes.length} notes).`);

// --- MOCs par thème ---
fs.mkdirSync(MOC, { recursive: true });
for (const theme of themeSlugs) {
  const inTheme = notes.filter((n) => n.themes.includes(theme));
  let moc = `# MOC — ${theme}

> Généré par \`scripts/build-index.mjs\` — ne pas éditer à la main.
> ${inTheme.length} note(s) sur ce thème.

`;
  for (const n of inTheme) {
    moc += `- [[${n.slug}]] — ${n.summary || n.title}\n`;
  }
  if (inTheme.length === 0) moc += "_Aucune note pour l'instant._\n";
  fs.writeFileSync(path.join(MOC, `${theme}.md`), moc);
}
console.log(`✓ ${themeSlugs.length} MOC(s) régénérée(s) dans moc/.`);

// Avertir (sans casser) si une note référence un thème hors registre
for (const n of notes) {
  for (const t of n.themes) {
    if (t && !themeSlugs.includes(t)) {
      console.warn(`⚠️ ${n.file} référence un thème hors registre : « ${t} »`);
    }
  }
}
