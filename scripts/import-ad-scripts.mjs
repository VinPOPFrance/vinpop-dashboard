/**
 * Importe "Ads integral.xlsx" vers src/data/ad-scripts.json.
 *
 * Le classeur est la seule trace ecrite des scripts video : ce qui est dit,
 * montre et vendu a chaque seconde de chaque publicite. Le dashboard doit
 * pouvoir l afficher a cote des chiffres de la creative, sans quoi "hook rate
 * faible" reste un chiffre sans texte a corriger.
 *
 * Pourquoi un import plutot qu une lecture a chaud : le classeur n est pas
 * deploye sur Vercel, et lire du xlsx demanderait une dependance de plus pour
 * des donnees qui changent quelques fois par mois. Le JSON genere est commite,
 * donc versionne et diffable.
 *
 * Relancer apres chaque mise a jour du classeur :
 *   npm run import:ad-scripts
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceFile = path.join(projectRoot, 'Ads intégral.xlsx');
const outputFile = path.join(projectRoot, 'src', 'data', 'ad-scripts.json');

/* ------------------------------------------------------------------ */
/* Lecture du conteneur ZIP                                            */
/* ------------------------------------------------------------------ */

/**
 * Extrait les fichiers d une archive ZIP.
 *
 * Un .xlsx est un ZIP de fichiers XML. Vingt lignes de lecture d archive
 * evitent d ajouter une dependance npm a un projet qui n en a que sept.
 */
function readZip(buffer) {
  const endOfCentralDirectory = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (endOfCentralDirectory < 0) throw new Error('Archive ZIP invalide : fin de repertoire central introuvable');

  const entryCount = buffer.readUInt16LE(endOfCentralDirectory + 10);
  let offset = buffer.readUInt32LE(endOfCentralDirectory + 16);
  const files = new Map();

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error('Entree de repertoire central invalide');
    const compressionMethod = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength);

    // Les longueurs de l en-tete local different de celles du repertoire
    // central : il faut les relire pour savoir ou commencent les donnees.
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const data = buffer.subarray(dataStart, dataStart + compressedSize);

    files.set(name, compressionMethod === 0 ? data : zlib.inflateRawSync(data));
    offset += 46 + nameLength + extraLength + commentLength;
  }

  return files;
}

/* ------------------------------------------------------------------ */
/* Lecture du classeur                                                 */
/* ------------------------------------------------------------------ */

function decodeXmlText(value) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&amp;/g, '&');
}

/** Table des chaines partagees : les cellules texte n y renvoient que par index. */
function readSharedStrings(xml) {
  if (!xml) return [];
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) =>
    decodeXmlText([...match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((part) => part[1]).join('')),
  );
}

/** "C" -> 2. La position compte : une cellule vide n est pas ecrite dans le XML. */
function columnIndexFromRef(ref) {
  let index = 0;
  for (const letter of ref) index = index * 26 + (letter.charCodeAt(0) - 64);
  return index - 1;
}

/** Lit une feuille en tableau de lignes, chaque ligne indexee par colonne. */
function readSheet(xml, sharedStrings) {
  const rows = [];
  for (const rowMatch of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells = [];
    for (const cellMatch of rowMatch[1].matchAll(/<c([^>]*)\/>|<c([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attributes = cellMatch[1] ?? cellMatch[2] ?? '';
      const content = cellMatch[3] ?? '';
      const ref = (attributes.match(/r="([A-Z]+)\d+"/) ?? [])[1];
      if (!ref) continue;
      const type = (attributes.match(/t="([^"]+)"/) ?? [])[1];
      const rawValue = (content.match(/<v>([\s\S]*?)<\/v>/) ?? [])[1];

      let text;
      if (type === 's') text = sharedStrings[Number(rawValue)] ?? '';
      else if (type === 'inlineStr' || type === 'str') {
        text = decodeXmlText([...content.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((part) => part[1]).join(''));
      } else text = rawValue == null ? '' : decodeXmlText(rawValue);

      cells[columnIndexFromRef(ref)] = text.trim();
    }
    rows.push(Array.from(cells, (cell) => cell ?? ''));
  }
  return rows;
}

function isEmptyRow(row) {
  return row.every((cell) => !cell);
}

/* ------------------------------------------------------------------ */
/* Mise en forme                                                       */
/* ------------------------------------------------------------------ */

/** Un identifiant d annonce Meta : une longue suite de chiffres. */
function isAdId(value) {
  return /^\d{15,20}$/.test(value ?? '');
}

/**
 * Vrai si la ligne est la ligne d en-tete d une feuille de script.
 *
 * Les libelles d en-tete sont abimes d une feuille a l autre : "Sequence_Temps"
 * ailleurs coupe en "Sequence" + "Temps", "Etape_Marketing" recolle au voisin
 * en "TempsEtape" + "MarketingDescription_Visuelle", parfois les cinq libelles
 * empiles dans la seule cellule A. Chercher un libelle exact ne marcherait donc
 * que sur un tiers du classeur : on cherche un mot-cle qui ne peut pas
 * apparaitre dans une ligne de donnees.
 */
function isHeaderRow(row) {
  const joined = row.join(' ');
  return /Marketing|Script_Original|Texte_Original|Element_Visuel/.test(joined);
}

/**
 * En-tetes normalises.
 *
 * Les libelles du classeur sont inexploitables (voir `isHeaderRow`) mais les
 * lignes de donnees, elles, ont toujours la meme forme : reperage, etape
 * marketing, description, texte d origine, traduction. On reconstruit donc des
 * en-tetes propres et on ne lit dans ceux du classeur que les deux seules
 * informations qu ils portent de facon fiable : publicite video ou image, et
 * langue du texte d origine.
 */
function canonicalHeaders(headerRow) {
  const joined = headerRow.join(' ');
  const isImage = joined.includes('Element_Visuel');
  const language = /EN_Sub_NL/.test(joined)
    ? 'EN, sous-titres NL'
    : /Original_EN\b|Original_EN[^_]/.test(joined)
      ? 'EN'
      : 'NL';

  return {
    isImage,
    headers: [
      isImage ? 'Element visuel' : 'Sequence',
      'Etape marketing',
      isImage ? 'Description graphique' : 'Description visuelle',
      `Texte original (${language})`,
      'Traduction (FR)',
    ],
  };
}

/**
 * Aligne une ligne sur ses en-tetes.
 *
 * Quelques lignes du classeur ont une colonne de trop : une description
 * visuelle contenant une virgule a ete coupee en deux a l export, ce qui
 * decale le neerlandais et le francais d une colonne. Les deux premieres
 * colonnes (sequence, etape) et les deux dernieres (NL, FR) sont fiables ;
 * tout ce qui se trouve entre les deux appartient a la description. Aligner
 * par les deux bouts remet donc la ligne d aplomb sans perdre de texte.
 */
function alignRow(row, headerCount) {
  const cells = [...row];
  while (cells.length && !cells[cells.length - 1]) cells.pop();
  if (cells.length <= headerCount) {
    return Array.from({ length: headerCount }, (_, index) => cells[index] ?? '');
  }

  const head = cells.slice(0, 2);
  const tail = cells.slice(cells.length - 2);
  const middle = cells.slice(2, cells.length - 2).filter(Boolean).join(' ');
  return [...head, middle, ...tail].slice(0, headerCount);
}

function main() {
  const files = readZip(fs.readFileSync(sourceFile));
  const read = (name) => {
    const file = files.get(name);
    return file ? file.toString('utf8') : null;
  };

  const sharedStrings = readSharedStrings(read('xl/sharedStrings.xml'));
  const relationships = new Map(
    [...(read('xl/_rels/workbook.xml.rels') ?? '').matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)].map((match) => [
      match[1],
      match[2].replace(/^\/?xl\//, ''),
    ]),
  );
  const sheets = [...(read('xl/workbook.xml') ?? '').matchAll(/<sheet[^>]*name="([^"]*)"[^>]*r:id="([^"]*)"/g)].map(
    (match) => ({ name: decodeXmlText(match[1]), file: `xl/${relationships.get(match[2])}` }),
  );

  const sheetRows = new Map(sheets.map((sheet) => [sheet.name, readSheet(read(sheet.file) ?? '', sharedStrings)]));

  // "Sheet1" est l index du classeur : une ligne par publicite, dans l ordre
  // des feuilles numerotees. Les premieres feuilles ne rappellent pas
  // l identifiant de l annonce, c est cet index qui les rattache.
  const index = (sheetRows.get('Sheet1') ?? [])
    .filter((row) => isAdId(row[0]))
    .map((row) => ({ adId: row[0], adName: row[1] ?? '' }));

  const ads = [];
  const warnings = [];

  for (const sheet of sheets) {
    if (sheet.name === 'Sheet1') continue;
    const position = Number(sheet.name);
    const rows = (sheetRows.get(sheet.name) ?? []).filter((row) => !isEmptyRow(row));
    if (!Number.isInteger(position) || rows.length === 0) {
      warnings.push(`Feuille "${sheet.name}" ignoree : nom non numerique ou feuille vide`);
      continue;
    }

    // Trois dispositions coexistent : identifiant repete sur chaque ligne
    // (feuille 1), identifiant en ligne de titre (feuilles 7 et suivantes), ou
    // aucun identifiant (feuilles 2 a 6). L index de Sheet1 tranche.
    const indexEntry = index[position - 1];
    const titleRow = isAdId(rows[0]?.[0]) && !rows[0]?.[2] ? rows[0] : null;
    const headerRowPosition = rows.findIndex((row) => row[0] === 'ID' || isHeaderRow(row));
    if (headerRowPosition < 0) {
      // Deux feuilles ne contiennent que leur ligne de titre : la publicite est
      // referencee mais son script n a jamais ete ecrit.
      const label = indexEntry ? `${indexEntry.adName} (${indexEntry.adId})` : `feuille "${sheet.name}"`;
      warnings.push(`Script absent du classeur : ${label}`);
      continue;
    }

    const rawHeaders = rows[headerRowPosition];
    // La feuille 1 porte deux colonnes de plus (ID, Nom) devant les cinq
    // colonnes de script : les retirer donne a toutes les feuilles la meme
    // forme.
    const skip = rawHeaders[0] === 'ID' ? 2 : 0;
    const { headers, isImage } = canonicalHeaders(rawHeaders.slice(skip));

    const firstDataRow = rows[headerRowPosition + 1] ?? [];
    const adId = titleRow?.[0] ?? (skip && isAdId(firstDataRow[0]) ? firstDataRow[0] : null) ?? indexEntry?.adId ?? null;
    const adName = titleRow?.[1] || (skip ? firstDataRow[1] : null) || indexEntry?.adName || '';
    if (!adId) {
      warnings.push(`Feuille "${sheet.name}" ignoree : aucun identifiant d annonce`);
      continue;
    }
    if (indexEntry && indexEntry.adId !== adId) {
      warnings.push(
        `Feuille "${sheet.name}" : identifiant du titre (${adId}) different de Sheet1 (${indexEntry.adId})`,
      );
    }

    const scriptRows = rows
      .slice(headerRowPosition + 1)
      .map((row) => alignRow(row.slice(skip), headers.length))
      .filter((row) => row.some(Boolean));

    if (scriptRows.length === 0) {
      warnings.push(`Feuille "${sheet.name}" ignoree : aucune ligne de script`);
      continue;
    }

    ads.push({
      adId,
      adName: adName || 'Publicite sans nom',
      sheet: sheet.name,
      // Les publicites image decrivent des elements de composition, pas une
      // suite temporelle : la page de detail ne leur affiche pas de minutage.
      format: isImage ? 'image' : 'video',
      headers,
      rows: scriptRows,
    });
  }

  const covered = new Set(ads.map((ad) => ad.adId));
  const withoutScript = index.filter((entry) => !covered.has(entry.adId));

  const payload = {
    generatedAt: new Date().toISOString().slice(0, 10),
    source: path.basename(sourceFile),
    ads: ads.sort((a, b) => Number(a.sheet) - Number(b.sheet)),
    adsWithoutScript: withoutScript,
  };

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  console.log(`${ads.length} script(s) importe(s) vers ${path.relative(projectRoot, outputFile)}`);
  console.log(`${index.length} publicite(s) dans l index, ${withoutScript.length} sans script.`);
  for (const warning of warnings) console.log(`  ! ${warning}`);
}

main();
