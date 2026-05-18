/**
 * ============================================================
 * OrarioGaia — Motore logico per calcolo prossimi treni
 * ============================================================
 * Modulo UI-agnostic. Riceve i dati JSON della stazione e
 * restituisce un array strutturato con i prossimi treni.
 *
 * Utilizzo:
 *   import { getNextTrains, getTipoGiornata } from './orarioEngine.js';
 *
 *   const result = getNextTrains(stazioneData, "rho_fiera_bisceglie", "bisceglie");
 *   // → [{ ora_partenza: "14:34", destinazione: "bisceglie", minuti_attesa: 4, tipo: "esatto" }]
 */

// ============================================================
// FESTIVITÀ ITALIANE (fisse + Milano)
// ============================================================

/**
 * Festività fisse italiane. Formato: [mese (1-indexed), giorno].
 * Include Sant'Ambrogio (7 Dic) — festività locale di Milano.
 */
const FESTIVITA_FISSE = [
  [1, 1],   // Capodanno
  [1, 6],   // Epifania
  [4, 25],  // Liberazione
  [5, 1],   // Festa dei Lavoratori
  [6, 2],   // Festa della Repubblica
  [8, 15],  // Ferragosto
  [11, 1],  // Ognissanti
  [12, 7],  // Sant'Ambrogio (Milano)
  [12, 8],  // Immacolata Concezione
  [12, 25], // Natale
  [12, 26], // Santo Stefano
];

/**
 * Calcola la data di Pasqua per un dato anno usando
 * l'algoritmo anonimo gregoriano (Meeus/Jones/Butcher).
 *
 * @param {number} anno - Anno (es. 2026)
 * @returns {Date} - Data della Domenica di Pasqua
 */
function calcolaPasqua(anno) {
  const a = anno % 19;
  const b = Math.floor(anno / 100);
  const c = anno % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mese = Math.floor((h + l - 7 * m + 114) / 31); // 3 = marzo, 4 = aprile
  const giorno = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(anno, mese - 1, giorno);
}

/**
 * Calcola la data di Pasquetta (Lunedì dell'Angelo) per un dato anno.
 *
 * @param {number} anno
 * @returns {Date}
 */
function calcolaPasquetta(anno) {
  const pasqua = calcolaPasqua(anno);
  const pasquetta = new Date(pasqua);
  pasquetta.setDate(pasquetta.getDate() + 1);
  return pasquetta;
}

// ============================================================
// TIPO GIORNATA (con regola della mezzanotte)
// ============================================================

/**
 * Determina il tipo di giornata ("feriale", "sabato", "festivo")
 * applicando la regola della mezzanotte ATM:
 *
 *   Le ore 00:00–02:59 appartengono logicamente al giorno precedente.
 *   Es: Sabato 01:30 → si usa l'orario del Venerdì ("feriale").
 *
 * @param {Date} date - Timestamp di riferimento (default: now)
 * @returns {"feriale" | "sabato" | "festivo"}
 */
export function getTipoGiornata(date = new Date()) {
  // --- Regola della mezzanotte: 00:00–02:59 → giorno precedente ---
  let dataLogica = new Date(date);
  if (dataLogica.getHours() < 3) {
    dataLogica.setDate(dataLogica.getDate() - 1);
  }

  const giorno = dataLogica.getDay(); // 0=Dom, 6=Sab
  const mese = dataLogica.getMonth() + 1; // 1-indexed
  const giornoMese = dataLogica.getDate();
  const anno = dataLogica.getFullYear();

  // 1. Controlla festività fisse
  for (const [m, g] of FESTIVITA_FISSE) {
    if (mese === m && giornoMese === g) {
      return "festivo";
    }
  }

  // 2. Controlla Pasquetta (festività mobile)
  const pasquetta = calcolaPasquetta(anno);
  if (
    dataLogica.getMonth() === pasquetta.getMonth() &&
    dataLogica.getDate() === pasquetta.getDate()
  ) {
    return "festivo";
  }

  // 3. Giorno della settimana
  if (giorno === 0) return "festivo"; // Domenica
  if (giorno === 6) return "sabato";
  return "feriale";
}

// ============================================================
// MOTORE RICERCA TRENI
// ============================================================

/**
 * Calcola i prossimi N treni in arrivo per una stazione, direzione
 * e (opzionalmente) sotto-destinazione specifiche.
 *
 * @param {Object} stazioneData - JSON parsato della stazione
 * @param {string} macroDirezione - Chiave direzione (es. "rho_fiera_bisceglie")
 * @param {string|null} [filtroDestinazione=null] - Sotto-destinazione (es. "bisceglie").
 *        Se null, restituisce treni per tutte le destinazioni.
 * @param {Date} [targetDate=new Date()] - Orario di riferimento
 * @param {number} [limiteN=3] - Quanti treni restituire
 *
 * @returns {Array<{
 *   ora_partenza: string,
 *   destinazione: string,
 *   minuti_attesa: number,
 *   tipo: "esatto" | "frequenza",
 *   messaggio?: string
 * }>}
 *
 * @example
 * // Tutti i treni verso Rho/Bisceglie
 * getNextTrains(data, "rho_fiera_bisceglie");
 *
 * // Solo treni per Bisceglie
 * getNextTrains(data, "rho_fiera_bisceglie", "bisceglie");
 *
 * // Specifica orario e numero risultati
 * getNextTrains(data, "sesto_1_maggio_fs", null, new Date("2026-05-18T22:30"), 5);
 */
export function getNextTrains(
  stazioneData,
  macroDirezione,
  filtroDestinazione = null,
  targetDate = new Date(),
  limiteN = 3
) {
  // --- Validazione input ---
  const direzioneDati = stazioneData?.[macroDirezione];
  if (!direzioneDati) {
    console.warn(`[OrarioEngine] Direzione "${macroDirezione}" non trovata nel JSON.`);
    return [];
  }

  const tipoGiornata = getTipoGiornata(targetDate);
  const orariGiornata = direzioneDati[tipoGiornata];

  if (!orariGiornata || Object.keys(orariGiornata).length === 0) {
    console.warn(`[OrarioEngine] Nessun orario per "${tipoGiornata}" in direzione "${macroDirezione}".`);
    return [];
  }

  // --- Ora e minuto correnti ---
  const oraCorrente = targetDate.getHours();
  const minutoCorrente = targetDate.getMinutes();

  // Timestamp di riferimento (per calcolo minuti_attesa)
  const timestampRef = targetDate.getTime();

  const risultati = [];

  // Scansiona fino a 25 ore avanti (copre anche il passaggio mezzanotte)
  for (let offset = 0; offset < 25 && risultati.length < limiteN; offset++) {
    const oraTarget = (oraCorrente + offset) % 24;
    const oraKey = oraTarget.toString().padStart(2, "0");

    const nodoOra = orariGiornata[oraKey];
    if (nodoOra === undefined || nodoOra === null) {
      continue;
    }

    // --- CASO 1: Alta frequenza (stringa) ---
    if (typeof nodoOra === "string") {
      // Se siamo nell'ora corrente (offset === 0) O nell'ora successiva,
      // l'alta frequenza è rilevante: restituisci subito il messaggio.
      if (offset === 0) {
        return [
          {
            ora_partenza: null,
            destinazione: filtroDestinazione || macroDirezione,
            minuti_attesa: null,
            tipo: "frequenza",
            messaggio: nodoOra,
          },
        ];
      }
      // Se siamo in un'ora futura con alta frequenza,
      // segnala il primo treno approssimato all'inizio di quell'ora
      risultati.push({
        ora_partenza: `${oraKey}:00`,
        destinazione: filtroDestinazione || macroDirezione,
        minuti_attesa: calcolaMinutiAttesa(oraCorrente, minutoCorrente, oraTarget, 0),
        tipo: "frequenza",
        messaggio: nodoOra,
      });
      continue;
    }

    // --- CASO 2: Minuti esatti (oggetto {destinazione: [minuti]}) ---
    if (typeof nodoOra === "object") {
      // Raccogli tutti i treni di quest'ora
      const treniOra = [];

      const destinazioni = filtroDestinazione
        ? { [filtroDestinazione]: nodoOra[filtroDestinazione] }
        : nodoOra;

      for (const [dest, minuti] of Object.entries(destinazioni)) {
        if (!Array.isArray(minuti)) continue;

        for (const minuto of minuti) {
          // Nell'ora corrente: prendi solo treni futuri (minuto >= minutoCorrente)
          // Nelle ore successive: prendi tutti
          if (offset === 0 && minuto < minutoCorrente) {
            continue;
          }

          treniOra.push({
            ora_partenza: `${oraKey}:${minuto.toString().padStart(2, "0")}`,
            destinazione: dest,
            minuti_attesa: calcolaMinutiAttesa(oraCorrente, minutoCorrente, oraTarget, minuto),
            tipo: "esatto",
          });
        }
      }

      // Ordina cronologicamente i treni di quest'ora
      treniOra.sort((a, b) => a.minuti_attesa - b.minuti_attesa);

      // Aggiungi fino al limite
      for (const treno of treniOra) {
        if (risultati.length >= limiteN) break;
        risultati.push(treno);
      }
    }
  }

  return risultati;
}

// ============================================================
// UTILITY INTERNE
// ============================================================

/**
 * Calcola i minuti di attesa tra l'orario corrente e un treno futuro.
 * Gestisce correttamente il passaggio di mezzanotte.
 *
 * @param {number} oraCorrente - Ora corrente (0-23)
 * @param {number} minutoCorrente - Minuto corrente (0-59)
 * @param {number} oraTreno - Ora del treno (0-23)
 * @param {number} minutoTreno - Minuto del treno (0-59)
 * @returns {number} Minuti di attesa (sempre ≥ 0)
 */
function calcolaMinutiAttesa(oraCorrente, minutoCorrente, oraTreno, minutoTreno) {
  let minutiCorrente = oraCorrente * 60 + minutoCorrente;
  let minutiTreno = oraTreno * 60 + minutoTreno;

  // Gestione passaggio mezzanotte:
  // Se il treno è "indietro" rispetto all'ora corrente, è il giorno dopo
  if (minutiTreno < minutiCorrente) {
    minutiTreno += 24 * 60;
  }

  return minutiTreno - minutiCorrente;
}

// ============================================================
// FUNZIONI ACCESSORIE ESPORTATE
// ============================================================

/**
 * Restituisce la lista delle macro-direzioni disponibili per una stazione.
 *
 * @param {Object} stazioneData - JSON parsato della stazione
 * @returns {string[]} - Es. ["sesto_1_maggio_fs", "rho_fiera_bisceglie"]
 */
export function getDirezioni(stazioneData) {
  return Object.keys(stazioneData || {});
}

/**
 * Restituisce la lista delle sotto-destinazioni per una macro-direzione
 * nel tipo di giornata corrente. Utile per popolare una UI con i filtri.
 *
 * @param {Object} stazioneData
 * @param {string} macroDirezione
 * @param {Date} [targetDate=new Date()]
 * @returns {string[]} - Es. ["rho_fiera", "bisceglie", "molino_dorino"]
 */
export function getDestinazioniDisponibili(stazioneData, macroDirezione, targetDate = new Date()) {
  const tipoGiornata = getTipoGiornata(targetDate);
  const orariGiornata = stazioneData?.[macroDirezione]?.[tipoGiornata];

  if (!orariGiornata) return [];

  const destinazioni = new Set();
  for (const nodoOra of Object.values(orariGiornata)) {
    if (typeof nodoOra === "object" && nodoOra !== null) {
      for (const dest of Object.keys(nodoOra)) {
        destinazioni.add(dest);
      }
    }
  }

  return [...destinazioni];
}

/**
 * Formatta un nome destinazione da snake_case a titolo leggibile.
 * Es. "rho_fiera" → "Rho Fiera"
 *     "sesto_1_maggio_fs" → "Sesto 1 Maggio FS"
 *
 * @param {string} nomeDestinazione
 * @returns {string}
 */
export function formattaNomeDestinazione(nomeDestinazione) {
  if (!nomeDestinazione) return "";

  return nomeDestinazione
    .split("_")
    .map((word) => {
      // Acronimi noti: mantieni maiuscoli
      if (["fs", "pza"].includes(word.toLowerCase())) {
        return word.toUpperCase();
      }
      // Numeri: lascia così
      if (/^\d+$/.test(word)) {
        return word;
      }
      // Capitalizza prima lettera
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}
