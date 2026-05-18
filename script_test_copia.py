import pdfplumber
import json
import re
import requests
import io
import time
import os
import math

STAZIONI_TEST = {
    "M1_De_Angeli": "https://orari.atm.it/M1_514.pdf",
    "M1_San_Leonardo": "https://orari.atm.it/M1_518.pdf",
    "M1_Palestro": "https://orari.atm.it/M1_534.pdf",
    "M2_Cologno_Sud": "https://orari.atm.it/M2_669.pdf",
    "M2_Piola": "https://orari.atm.it/M2_676.pdf"
}

# Mappa di riconoscimento direzioni: keyword (uppercase) -> nome pulito per il JSON
# Le keyword sono ordinate dalla più specifica alla meno specifica
DIREZIONI_NOTE = [
    # M1
    ("SESTO",           "sesto_1_maggio_fs"),
    ("RHO",             "rho_fiera_bisceglie"),   # cattura "RHO Fiera/BISCEGLIE" e anche solo "RHO Fiera"
    ("BISCEGLIE",       "rho_fiera_bisceglie"),   # cattura eventuale "BISCEGLIE" singolo
    # M2
    ("ABBIATEGRASSO",   "abbiategrasso_assago_forum"),  # cattura "P.ZA ABBIATEGRASSO/ASSAGO Forum"
    ("ASSAGO",          "abbiategrasso_assago_forum"),   # cattura eventuale "ASSAGO Forum" singolo
    ("GESSATE",         "gessate_cologno_nord"),         # cattura "GESSATE/COLOGNO NORD" e solo "GESSATE"
    ("COLOGNO",         "gessate_cologno_nord"),         # cattura "COLOGNO NORD" singolo
    ("FAMAGOSTA",       "famagosta"),
]

# ============================================================
# MAPPING COLORE -> DESTINAZIONE (per direzione)
# Verificato empiricamente sui PDF ATM reali.
# Lo stesso colore mappa a destinazioni diverse a seconda della
# linea e della direzione corrente.
# ============================================================
COLORE_DESTINAZIONE = {
    "sesto_1_maggio_fs": {
        # Dir 1 M1: tutti i minuti sono neri -> unica destinazione
        "nero": "sesto_1_maggio_fs",
    },
    "rho_fiera_bisceglie": {
        # Dir 2 M1: treni misti per le diramazioni ovest
        "arancione": "rho_fiera",
        "blu": "bisceglie",
        "grigio": "molino_dorino",
    },
    "abbiategrasso_assago_forum": {
        # Dir 1 M2: treni verso sud
        "blu": "abbiategrasso",
        "arancione": "assago_forum",
    },
    "gessate_cologno_nord": {
        # Dir 2 M2: treni verso nord-est
        "arancione": "gessate",
        "blu": "cologno_nord",
        "nero": "cascina_gobba",
    },
}

# Colori di riferimento RGB normalizzati (0-1), estratti dai PDF reali
COLORI_RIFERIMENTO = {
    "nero":      (0.0, 0.0, 0.0),
    "blu":       (0.0, 0.0, 1.0),
    "arancione": (1.0, 0.398, 0.0),
    "grigio":    (0.5, 0.5, 0.5),
}

# Soglia di distanza euclidea per il matching colore
SOGLIA_COLORE = 0.15


def classifica_colore(rgb_tuple):
    """
    Converte una tupla RGB normalizzata (0-1) in un nome colore logico.
    Usa distanza euclidea con tolleranza per gestire variazioni minime
    nei valori restituiti da pdfplumber.
    
    Returns: "nero", "blu", "arancione", "grigio", oppure None se non riconosciuto.
    """
    if rgb_tuple is None:
        return "nero"  # default: testo senza colore = nero

    # Normalizza: gestisci sia tuple che singoli valori
    if isinstance(rgb_tuple, (int, float)):
        rgb_tuple = (rgb_tuple, rgb_tuple, rgb_tuple)
    
    # Prendi solo i primi 3 canali (ignora eventuale alpha)
    r, g, b = rgb_tuple[0], rgb_tuple[1], rgb_tuple[2]
    
    migliore_nome = None
    migliore_dist = float('inf')
    
    for nome, (rr, gg, bb) in COLORI_RIFERIMENTO.items():
        dist = math.sqrt((r - rr)**2 + (g - gg)**2 + (b - bb)**2)
        if dist < migliore_dist:
            migliore_dist = dist
            migliore_nome = nome
    
    if migliore_dist <= SOGLIA_COLORE:
        return migliore_nome
    
    return None


def pulisci_nome_direzione(testo_pagina):
    """
    Estrae il nome della direzione dalla riga [1] del testo PDF.
    
    Layout costante dei PDF ATM:
      [0] Nome stazione (es. "DE ANGELI")
      [1] Direzione/Capolinea (es. "SESTO 1° MAGGIO FS")
      [2] "Treni per"
      [3] "Trains to"
    
    La funzione legge la riga [1] e la confronta con le keyword note.
    """
    lines = testo_pagina.split('\n')
    
    if len(lines) < 2:
        return None
    
    # La direzione è sempre alla riga [1], subito sotto il nome della stazione
    riga_direzione = lines[1].strip().upper()
    
    # Cerca una corrispondenza con le keyword note
    for keyword, nome_pulito in DIREZIONI_NOTE:
        if keyword in riga_direzione:
            return nome_pulito
    
    # Fallback: se non riconosciuta, normalizza il testo grezzo della riga [1]
    # (rimuovi caratteri speciali, sostituisci spazi con underscore)
    fallback = re.sub(r'[^A-Z0-9\s]', '', riga_direzione).strip()
    fallback = re.sub(r'\s+', '_', fallback).lower()
    
    return fallback if fallback else None


def estrai_orari_da_colonna(page, bbox, direzione_nome):
    """
    Estrae gli orari da una colonna (feriale/sabato/festivo) del PDF,
    catturando il colore di ogni minuto per determinare la destinazione.
    
    Args:
        page: pagina pdfplumber
        bbox: tuple (x0, y0, x1, y1) della colonna
        direzione_nome: nome della direzione corrente (es. "rho_fiera_bisceglie")
                        usato per il mapping colore -> destinazione
    
    Returns:
        (giornata, timetable) dove timetable ha la struttura:
        {"06": {"rho_fiera": [12, 34], "bisceglie": [18, 40]}, "07": "frequenza_alta", ...}
    """
    cropped = page.crop(bbox)
    
    # --- STEP 1: Estrai il testo semplice per identificare giornata e alta frequenza ---
    text = cropped.extract_text()
    if not text:
        return None, {}
    
    text_upper = text.upper()
    giornata = None
    
    if "LUNED" in text_upper or "VENERD" in text_upper:
        giornata = "feriale"
    elif "SABAT" in text_upper:
        giornata = "sabato"
    elif "FESTIV" in text_upper:
        giornata = "festivo"
    
    # --- STEP 2: Estrai le parole con i colori ---
    words = cropped.extract_words(extra_attrs=['non_stroking_color'])
    
    # Ricostruisci le righe dalle parole, raggruppando per coordinata Y
    # Parole con top simile (±3pt) appartengono alla stessa riga
    righe_words = {}
    for w in words:
        top_key = round(w['top'] / 3.0)  # raggruppa ogni ~3pt
        if top_key not in righe_words:
            righe_words[top_key] = []
        righe_words[top_key].append(w)
    
    # Ordina le righe per posizione verticale, e le parole per posizione orizzontale
    righe_ordinate = []
    for top_key in sorted(righe_words.keys()):
        riga = sorted(righe_words[top_key], key=lambda w: w['x0'])
        righe_ordinate.append(riga)
    
    # Ottieni il mapping colore -> destinazione per questa direzione
    mappa_colori = COLORE_DESTINAZIONE.get(direzione_nome, {})
    
    timetable = {}
    lines_text = text.split('\n')
    
    # --- STEP 3: Gestisci alta frequenza dal testo semplice ---
    # I PDF ATM strutturano la fascia di alta frequenza su righe separate:
    #   [7] "dalle from"                          <- trigger
    #   [8] "per to GESSATE per to COLOGNO NORD"  <- (opzionale)
    #   [9] "7 alle to 19"                        <- range orario
    #   [10] "ogni 5' - 12'"                      <- frequenza
    # NOTA: "DALLE" contiene "ALLE" come sottostringa → usiamo un regex
    # per trovare "N alle to M" come pattern distinto (cifra + "alle").
    ore_alta_frequenza = set()
    
    i = 0
    while i < len(lines_text):
        line = lines_text[i].strip()
        line_upper = line.upper()
        
        ora_inizio = None
        ora_fine = None
        frequenza_str = "frequenza_alta"
        
        if "DALLE" in line_upper:
            # Trovata riga trigger "dalle from"
            # Cerca il range orario "N alle to M" nella stessa riga o nelle successive
            for look in range(0, 5):
                if i + look < len(lines_text):
                    candidate_line = lines_text[i + look].strip()
                    # Cerca il pattern: numero + "alle" + "to" + numero
                    match_range = re.search(r'(\d{1,2})\s+alle\s+to\s+(\d{1,2})', candidate_line, re.IGNORECASE)
                    if match_range:
                        ora_inizio = int(match_range.group(1))
                        ora_fine = int(match_range.group(2))
                        break
        
        if ora_inizio is not None and ora_fine is not None:
            # Cerca la stringa di frequenza nelle righe circostanti
            for j in range(-2, 5):
                idx = i + j
                if 0 <= idx < len(lines_text):
                    candidate = lines_text[idx].strip()
                    if "OGNI" in candidate.upper() or "EVERY" in candidate.upper():
                        frequenza_str = candidate
                        break
            
            for h in range(ora_inizio, ora_fine):
                hour_key = f"{h:02d}"
                timetable[hour_key] = frequenza_str
                ore_alta_frequenza.add(hour_key)
        
        i += 1
    
    # --- STEP 4: Estrai minuti con colori dalle righe di parole ---
    current_hour = None
    
    for riga in righe_ordinate:
        # Ricostruisci il testo della riga
        riga_testo = " ".join(w['text'] for w in riga)
        
        # Cerca se la riga inizia con un'ora (es. "6:00" o "23:00")
        match_ora = re.match(r'^(\d{1,2}):00', riga_testo)
        if match_ora:
            current_hour = f"{int(match_ora.group(1)):02d}"
            
            # Se quest'ora è coperta dall'alta frequenza, skip
            if current_hour in ore_alta_frequenza:
                continue
            
            # Estrai i minuti colorati dalla riga (escludendo la parola dell'ora stessa)
            for w in riga:
                testo_parola = w['text'].replace('*', '').strip()
                
                # Ignora la parola dell'ora (es. "6:00")
                if ':' in w['text']:
                    continue
                
                # Verifica che sia un numero valido come minuto (0-59)
                if not testo_parola.isdigit():
                    continue
                    
                minuto = int(testo_parola)
                if minuto < 0 or minuto >= 60:
                    continue
                
                # Classifica il colore
                colore = classifica_colore(w.get('non_stroking_color'))
                
                if not colore:
                    continue
                
                # Mappa il colore alla destinazione
                destinazione = mappa_colori.get(colore)
                
                if not destinazione:
                    # Se il colore non ha mapping (es. nero per Dir 1 senza mapping esplicito),
                    # usa il nome della direzione come destinazione default
                    if colore == "nero" and "nero" not in mappa_colori:
                        destinazione = direzione_nome
                    else:
                        continue
                
                # Inizializza la struttura se necessario
                if current_hour not in timetable:
                    timetable[current_hour] = {}
                if isinstance(timetable[current_hour], str):
                    # L'ora è già segnata come alta frequenza, skip
                    continue
                if destinazione not in timetable[current_hour]:
                    timetable[current_hour][destinazione] = []
                
                if minuto not in timetable[current_hour][destinazione]:
                    timetable[current_hour][destinazione].append(minuto)
    
    # Ordina i minuti per ogni destinazione per ogni ora
    for hour_key, value in timetable.items():
        if isinstance(value, dict):
            for dest in value:
                value[dest] = sorted(value[dest])
    
    return giornata, timetable


def update_test_timetables():
    for nome_stazione, url in STAZIONI_TEST.items():
        response = requests.get(url)
        if response.status_code != 200:
            print(f"Errore download {nome_stazione} (Status: {response.status_code})")
            continue
            
        result = {}
        
        with pdfplumber.open(io.BytesIO(response.content)) as pdf:
            for page_num in range(len(pdf.pages)):
                page = pdf.pages[page_num]
                testo_completo = page.extract_text() or ""
                
                direzione_nome = pulisci_nome_direzione(testo_completo)
                if not direzione_nome:
                    direzione_nome = f"direzione_{page_num+1}"
                
                result[direzione_nome] = {"feriale": {}, "sabato": {}, "festivo": {}}
                
                w, h = page.width, page.height
                bboxes = [
                    (0, 0, w / 3.0, h),
                    (w / 3.0, 0, 2.0 * w / 3.0, h),
                    (2.0 * w / 3.0, 0, w, h)
                ]
                
                for bbox in bboxes:
                    giornata, orari = estrai_orari_da_colonna(page, bbox, direzione_nome)
                    if giornata and orari:
                        # Merge intelligente: per ogni ora, unisci i dizionari destinazione
                        for hour_key, value in orari.items():
                            if hour_key not in result[direzione_nome][giornata]:
                                result[direzione_nome][giornata][hour_key] = value
                            elif isinstance(value, str):
                                # Alta frequenza: sovrascrive
                                result[direzione_nome][giornata][hour_key] = value
                            elif isinstance(value, dict):
                                existing = result[direzione_nome][giornata][hour_key]
                                if isinstance(existing, dict):
                                    for dest, minuti in value.items():
                                        if dest not in existing:
                                            existing[dest] = minuti
                                        else:
                                            existing[dest] = sorted(list(set(existing[dest] + minuti)))

        # Salvataggio
        cartella_output = "json_orari"
        if not os.path.exists(cartella_output):
            os.makedirs(cartella_output)
            
        nome_file = os.path.join(cartella_output, f"{nome_stazione}.json")
        
        with open(nome_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
            
        print(f"✓ {nome_stazione} salvato in: {nome_file}")
        
        time.sleep(2)

if __name__ == "__main__":
    update_test_timetables()