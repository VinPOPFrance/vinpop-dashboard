#!/usr/bin/env node
/**
 * Verifie que le dossier local est aligne avec GitHub (origin/main).
 *
 * Utilise sur deux ordinateurs : a lancer AVANT de commencer a travailler.
 * Sortie 0 = synchronise, 1 = action requise.
 */
import { execFileSync } from "node:child_process";

const git = (...args) =>
  execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

const BRANCH = process.env.SYNC_BRANCH || "main";
const problems = [];

try {
  git("rev-parse", "--git-dir");
} catch {
  console.error("X Ce dossier n'est pas un depot Git. Impossible de verifier la synchro.");
  process.exit(1);
}

const branch = git("rev-parse", "--abbrev-ref", "HEAD");

console.log("Recuperation de l'etat de GitHub...");
try {
  git("fetch", "origin", "--prune");
} catch (err) {
  console.error("X Impossible de contacter GitHub :", err.stderr?.trim() || err.message);
  process.exit(1);
}

if (branch !== BRANCH) {
  problems.push(`Tu es sur la branche "${branch}", pas "${BRANCH}".`);
}

const dirty = git("status", "--porcelain");
if (dirty) {
  const files = dirty.split("\n");
  problems.push(
    `${files.length} fichier(s) modifie(s) non commite(s) :\n` +
      files.slice(0, 10).map((f) => "     " + f).join("\n") +
      (files.length > 10 ? `\n     ... et ${files.length - 10} autre(s)` : "")
  );
}

const [behind, ahead] = git(
  "rev-list", "--left-right", "--count", `origin/${BRANCH}...HEAD`
).split(/\s+/).map(Number);

if (behind > 0) problems.push(`${behind} commit(s) de retard sur GitHub  ->  git pull --rebase`);
if (ahead > 0) problems.push(`${ahead} commit(s) d'avance non pousse(s)  ->  git push`);

console.log(`\nBranche locale : ${branch}`);
console.log(`Local  : ${git("rev-parse", "--short", "HEAD")}  ${git("log", "-1", "--format=%s")}`);
console.log(`GitHub : ${git("rev-parse", "--short", `origin/${BRANCH}`)}  ${git("log", "-1", "--format=%s", `origin/${BRANCH}`)}`);

if (problems.length === 0) {
  console.log("\nOK - Le dossier local est identique a GitHub. Tu peux travailler.");
  process.exit(0);
}

console.log("\nATTENTION - Le dossier local n'est PAS aligne avec GitHub :\n");
problems.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
console.log("\nRegle : ne commence pas a coder tant que ce script n'affiche pas OK.");
process.exit(1);
