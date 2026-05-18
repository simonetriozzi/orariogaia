/**
 * Test di validazione per orarioEngine.js
 * Esegui con: node testEngine.js
 */

// Per Node.js: caricamento ESM-compatibile
import { readFileSync } from "fs";
import {
  getTipoGiornata,
  getNextTrains,
  getDirezioni,
  getDestinazioniDisponibili,
  formattaNomeDestinazione,
} from "./orarioEngine.js";

// Carica i JSON di test
const palestro = JSON.parse(readFileSync("./json_orari/M1_Palestro.json", "utf-8"));
const piola = JSON.parse(readFileSync("./json_orari/M2_Piola.json", "utf-8"));

let testNum = 0;
let passed = 0;

function assert(condition, label) {
  testNum++;
  if (condition) {
    console.log(`  ✓ Test ${testNum}: ${label}`);
    passed++;
  } else {
    console.error(`  ✗ Test ${testNum}: ${label}`);
  }
}

// ============================================
// TEST 1: getTipoGiornata
// ============================================
console.log("\n=== getTipoGiornata ===");

// Lunedì normale
assert(getTipoGiornata(new Date("2026-05-18T10:00")) === "feriale", "Lunedì 18 Maggio → feriale");

// Sabato
assert(getTipoGiornata(new Date("2026-05-23T10:00")) === "sabato", "Sabato 23 Maggio → sabato");

// Domenica
assert(getTipoGiornata(new Date("2026-05-24T10:00")) === "festivo", "Domenica 24 Maggio → festivo");

// Natale (Giovedì)
assert(getTipoGiornata(new Date("2026-12-25T10:00")) === "festivo", "Natale 25 Dic → festivo");

// Sant'Ambrogio (Lunedì)
assert(getTipoGiornata(new Date("2026-12-07T10:00")) === "festivo", "Sant'Ambrogio 7 Dic → festivo");

// 25 Aprile
assert(getTipoGiornata(new Date("2026-04-25T10:00")) === "festivo", "25 Aprile → festivo");

// Pasquetta 2026 = 6 Aprile (Pasqua = 5 Aprile 2026)
assert(getTipoGiornata(new Date("2026-04-06T10:00")) === "festivo", "Pasquetta 2026 (6 Apr) → festivo");

// Regola mezzanotte: Sabato 00:30 → logicamente Venerdì → feriale
assert(getTipoGiornata(new Date("2026-05-23T00:30")) === "feriale", "Sabato 00:30 → feriale (regola mezzanotte)");

// Regola mezzanotte: Sabato 03:00 → logicamente Sabato → sabato
assert(getTipoGiornata(new Date("2026-05-23T03:00")) === "sabato", "Sabato 03:00 → sabato (dopo le 3)");

// Regola mezzanotte: Domenica 01:00 → logicamente Sabato → sabato
assert(getTipoGiornata(new Date("2026-05-24T01:00")) === "sabato", "Domenica 01:00 → sabato (regola mezzanotte)");

// Regola mezzanotte: Lunedì 02:00 → logicamente Domenica → festivo
assert(getTipoGiornata(new Date("2026-05-25T02:00")) === "festivo", "Lunedì 02:00 → festivo (regola mezzanotte)");

// ============================================
// TEST 2: getDirezioni
// ============================================
console.log("\n=== getDirezioni ===");

const dirPalestro = getDirezioni(palestro);
assert(dirPalestro.length === 2, `Palestro ha 2 direzioni (trovate: ${dirPalestro.length})`);
assert(dirPalestro.includes("sesto_1_maggio_fs"), "Include sesto_1_maggio_fs");
assert(dirPalestro.includes("rho_fiera_bisceglie"), "Include rho_fiera_bisceglie");

// ============================================
// TEST 3: getDestinazioniDisponibili
// ============================================
console.log("\n=== getDestinazioniDisponibili ===");

const destDir2 = getDestinazioniDisponibili(palestro, "rho_fiera_bisceglie", new Date("2026-05-18T10:00"));
assert(destDir2.includes("rho_fiera"), "Dir 2 Palestro include rho_fiera");
assert(destDir2.includes("bisceglie"), "Dir 2 Palestro include bisceglie");
assert(destDir2.includes("molino_dorino"), "Dir 2 Palestro include molino_dorino");

// ============================================
// TEST 4: getNextTrains — alta frequenza
// ============================================
console.log("\n=== getNextTrains — alta frequenza ===");

const treniFreq = getNextTrains(palestro, "sesto_1_maggio_fs", null, new Date("2026-05-18T14:30"), 3);
assert(treniFreq.length === 1, `Alta frequenza: 1 risultato (trovati: ${treniFreq.length})`);
assert(treniFreq[0].tipo === "frequenza", "Tipo = frequenza");
assert(treniFreq[0].messaggio.includes("ogni"), `Messaggio contiene 'ogni': "${treniFreq[0].messaggio}"`);
console.log("    →", treniFreq[0]);

// ============================================
// TEST 5: getNextTrains — minuti esatti
// ============================================
console.log("\n=== getNextTrains — minuti esatti ===");

// Palestro Dir 2 feriale alle 21:05 → deve trovare treni misti rho/bisceglie
const treniEsatti = getNextTrains(palestro, "rho_fiera_bisceglie", null, new Date("2026-05-18T21:05"), 5);
assert(treniEsatti.length === 5, `Trovati 5 treni (trovati: ${treniEsatti.length})`);
assert(treniEsatti.every((t) => t.tipo === "esatto"), "Tutti tipo esatto");
assert(treniEsatti[0].minuti_attesa >= 0, "minuti_attesa ≥ 0");
assert(treniEsatti[0].minuti_attesa <= treniEsatti[1].minuti_attesa, "Ordinati cronologicamente");

console.log("    Treni trovati:");
for (const t of treniEsatti) {
  console.log(`      ${t.ora_partenza} → ${t.destinazione} (attesa: ${t.minuti_attesa} min)`);
}

// ============================================
// TEST 6: getNextTrains — filtro destinazione
// ============================================
console.log("\n=== getNextTrains — con filtro destinazione ===");

const soloRho = getNextTrains(palestro, "rho_fiera_bisceglie", "rho_fiera", new Date("2026-05-18T21:00"), 3);
assert(soloRho.every((t) => t.destinazione === "rho_fiera"), "Tutti per rho_fiera");
console.log("    Solo Rho Fiera:");
for (const t of soloRho) {
  console.log(`      ${t.ora_partenza} → ${t.destinazione} (attesa: ${t.minuti_attesa} min)`);
}

// ============================================
// TEST 7: getNextTrains — ricerca cross-ora
// ============================================
console.log("\n=== getNextTrains — cross-ora ===");

// Alle 23:50 ci sono pochi treni nell'ora 23, deve cercare nelle ore 00+
const treniNotte = getNextTrains(palestro, "sesto_1_maggio_fs", null, new Date("2026-05-18T23:50"), 3);
assert(treniNotte.length >= 1, `Trovati treni notturni (trovati: ${treniNotte.length})`);
console.log("    Treni notturni da 23:50:");
for (const t of treniNotte) {
  console.log(`      ${t.ora_partenza} → ${t.destinazione} (attesa: ${t.minuti_attesa} min)`);
}

// ============================================
// TEST 8: getNextTrains — M2 Piola
// ============================================
console.log("\n=== getNextTrains — M2 Piola ===");

const treniM2 = getNextTrains(piola, "gessate_cologno_nord", null, new Date("2026-05-18T21:00"), 5);
assert(treniM2.length === 5, `M2 Piola: 5 treni (trovati: ${treniM2.length})`);

const destM2 = new Set(treniM2.map((t) => t.destinazione));
console.log(`    Destinazioni trovate: ${[...destM2].join(", ")}`);
console.log("    Treni:");
for (const t of treniM2) {
  console.log(`      ${t.ora_partenza} → ${t.destinazione} (attesa: ${t.minuti_attesa} min)`);
}

// ============================================
// TEST 9: formattaNomeDestinazione
// ============================================
console.log("\n=== formattaNomeDestinazione ===");

assert(formattaNomeDestinazione("rho_fiera") === "Rho Fiera", "rho_fiera → Rho Fiera");
assert(formattaNomeDestinazione("sesto_1_maggio_fs") === "Sesto 1 Maggio FS", "sesto_1_maggio_fs → Sesto 1 Maggio FS");
assert(formattaNomeDestinazione("cascina_gobba") === "Cascina Gobba", "cascina_gobba → Cascina Gobba");

// ============================================
// RIEPILOGO
// ============================================
console.log(`\n${"=".repeat(40)}`);
console.log(`Risultati: ${passed}/${testNum} test superati`);
if (passed === testNum) {
  console.log("🎉 Tutti i test passati!");
} else {
  console.log(`⚠️  ${testNum - passed} test falliti`);
  process.exit(1);
}
