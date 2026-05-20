import pdfplumber
import json
import re
import requests
import io
import time
import os
import math

STAZIONI = {
    # ========== LINEA M1 (38 stazioni) ==========
    "M1_Rho_Fiera": "https://orari.atm.it/M1_504.pdf",
    "M1_Pero": "https://orari.atm.it/M1_505.pdf",
    "M1_Bisceglie": "https://orari.atm.it/M1_509.pdf",
    "M1_Inganni": "https://orari.atm.it/M1_510.pdf",
    "M1_Primaticcio": "https://orari.atm.it/M1_511.pdf",
    "M1_Bande_Nere": "https://orari.atm.it/M1_512.pdf",
    "M1_Gambara": "https://orari.atm.it/M1_513.pdf",
    "M1_De_Angeli": "https://orari.atm.it/M1_514.pdf",
    "M1_Wagner": "https://orari.atm.it/M1_515.pdf",
    "M1_Molino_Dorino": "https://orari.atm.it/M1_517.pdf",
    "M1_San_Leonardo": "https://orari.atm.it/M1_518.pdf",
    "M1_Bonola": "https://orari.atm.it/M1_519.pdf",
    "M1_Uruguay": "https://orari.atm.it/M1_520.pdf",
    "M1_Lampugnano": "https://orari.atm.it/M1_521.pdf",
    "M1_QT8": "https://orari.atm.it/M1_522.pdf",
    "M1_Lotto": "https://orari.atm.it/M1_523.pdf",
    "M1_Amendola": "https://orari.atm.it/M1_524.pdf",
    "M1_Buonarroti": "https://orari.atm.it/M1_525.pdf",
    "M1_Pagano": "https://orari.atm.it/M1_526.pdf",
    "M1_Conciliazione": "https://orari.atm.it/M1_527.pdf",
    "M1_Cadorna": "https://orari.atm.it/M1_528.pdf",
    "M1_Cairoli": "https://orari.atm.it/M1_529.pdf",
    "M1_Cordusio": "https://orari.atm.it/M1_530.pdf",
    "M1_Duomo": "https://orari.atm.it/M1_531.pdf",
    "M1_San_Babila": "https://orari.atm.it/M1_533.pdf",
    "M1_Palestro": "https://orari.atm.it/M1_534.pdf",
    "M1_Porta_Venezia": "https://orari.atm.it/M1_536.pdf",
    "M1_Lima": "https://orari.atm.it/M1_537.pdf",
    "M1_Loreto": "https://orari.atm.it/M1_538.pdf",
    "M1_Pasteur": "https://orari.atm.it/M1_539.pdf",
    "M1_Rovereto": "https://orari.atm.it/M1_540.pdf",
    "M1_Turro": "https://orari.atm.it/M1_541.pdf",
    "M1_Gorla": "https://orari.atm.it/M1_542.pdf",
    "M1_Precotto": "https://orari.atm.it/M1_543.pdf",
    "M1_Villa_S_Giovanni": "https://orari.atm.it/M1_544.pdf",
    "M1_Sesto_Marelli": "https://orari.atm.it/M1_545.pdf",
    "M1_Sesto_Rondo": "https://orari.atm.it/M1_546.pdf",
    "M1_Sesto_I_Maggio": "https://orari.atm.it/M1_547.pdf",
    # ========== LINEA M2 (35 stazioni) ==========
    "M2_Gessate": "https://orari.atm.it/M2_653.pdf",
    "M2_Cascina_Antonietta": "https://orari.atm.it/M2_654.pdf",
    "M2_Gorgonzola": "https://orari.atm.it/M2_655.pdf",
    "M2_Villa_Pompea": "https://orari.atm.it/M2_656.pdf",
    "M2_Bussero": "https://orari.atm.it/M2_657.pdf",
    "M2_Cassina_de_Pecchi": "https://orari.atm.it/M2_658.pdf",
    "M2_Villa_Fiorita": "https://orari.atm.it/M2_659.pdf",
    "M2_Cernusco": "https://orari.atm.it/M2_660.pdf",
    "M2_Cascina_Burrona": "https://orari.atm.it/M2_662.pdf",
    "M2_Vimodrone": "https://orari.atm.it/M2_663.pdf",
    "M2_Cologno_Nord": "https://orari.atm.it/M2_667.pdf",
    "M2_Cologno_Centro": "https://orari.atm.it/M2_668.pdf",
    "M2_Cologno_Sud": "https://orari.atm.it/M2_669.pdf",
    "M2_Cascina_Gobba": "https://orari.atm.it/M2_670.pdf",
    "M2_Crescenzago": "https://orari.atm.it/M2_671.pdf",
    "M2_Cimiano": "https://orari.atm.it/M2_672.pdf",
    "M2_Udine": "https://orari.atm.it/M2_673.pdf",
    "M2_Lambrate": "https://orari.atm.it/M2_674.pdf",
    "M2_Piola": "https://orari.atm.it/M2_676.pdf",
    "M2_Loreto": "https://orari.atm.it/M2_677.pdf",
    "M2_Caiazzo": "https://orari.atm.it/M2_679.pdf",
    "M2_Centrale": "https://orari.atm.it/M2_680.pdf",
    "M2_Gioia": "https://orari.atm.it/M2_681.pdf",
    "M2_Garibaldi": "https://orari.atm.it/M2_682.pdf",
    "M2_Moscova": "https://orari.atm.it/M2_683.pdf",
    "M2_Lanza": "https://orari.atm.it/M2_684.pdf",
    "M2_Cadorna": "https://orari.atm.it/M2_685.pdf",
    "M2_S_Ambrogio": "https://orari.atm.it/M2_686.pdf",
    "M2_S_Agostino": "https://orari.atm.it/M2_687.pdf",
    "M2_Porta_Genova": "https://orari.atm.it/M2_688.pdf",
    "M2_Romolo": "https://orari.atm.it/M2_689.pdf",
    "M2_Famagosta": "https://orari.atm.it/M2_690.pdf",
    "M2_Abbiategrasso": "https://orari.atm.it/M2_692.pdf",
    "M2_Assago_M_Nord": "https://orari.atm.it/M2_693.pdf",
    "M2_Assago_M_Forum": "https://orari.atm.it/M2_694.pdf",
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
    ("COLOGNO",         "gessate_cologno_nord"),         # cattura "COLOGNO NORD" singolo e "COLOGNO NORD/CASCINA GOBBA"
    ("CASCINA GOBBA",   "gessate_cologno_nord"),         # cattura "CASCINA GOBBA" (es. Assago Forum terminus)
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
    Estrae gli orari da una colonna (feriale/sabato/festivo) del PDF.

    ARCHITETTURA a 2 passi:
    1. extract_text()  -> struttura ora:minuti (gestisce correttamente il caso
       in cui pdfplumber mette il label '6:00' e i suoi minuti su y leggermente
       diversi, risolvendolo internamente prima di restituire il testo).
    2. extract_words() -> lookup colore per destinazione, abbinato per
       prossimita di y al label dell'ora.

    Fix range alta frequenza: INCLUSIVO (ora_fine compreso).
    """
    cropped = page.crop(bbox)

    # STEP 1: testo semplice per giornata e struttura
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

    if not giornata:
        return None, {}

    # STEP 2: parole con colori -> indice per lookup
    words = cropped.extract_words(extra_attrs=['non_stroking_color'])

    # digit_color_index: valore_minuto -> [(y_top, colore), ...]
    digit_color_index = {}
    # hour_y_index: ora_key -> y_top del label 'H:00'
    hour_y_index = {}

    for w in words:
        txt = w['text'].replace('*', '').strip()
        if ':' in w['text']:
            mh = re.match(r'^(\d{1,2}):0+$', txt)
            if mh:
                hk = f"{int(mh.group(1)):02d}"
                hour_y_index[hk] = w['top']
        elif txt.isdigit():
            val = int(txt)
            if 0 <= val < 60:
                colore = classifica_colore(w.get('non_stroking_color'))
                digit_color_index.setdefault(val, []).append((w['top'], colore))

    mappa_colori = COLORE_DESTINAZIONE.get(direzione_nome, {})
    timetable = {}
    lines_text = text.split('\n')

    # STEP 3: struttura ora->minuti da extract_text()
    # extract_text() raggruppa correttamente "6:00 7 16 23..." su un unica riga
    # anche quando extract_words() li separa per y leggermente diversi.
    text_hours = {}  # {ora_key: [minuto, ...]}
    for line in lines_text:
        line = line.strip()
        mora = re.match(r'^(\d{1,2}):00\s*(.*)', line)
        if mora:
            hk = f"{int(mora.group(1)):02d}"
            mins = [int(t) for t in re.findall(r'\b(\d{1,2})\b', mora.group(2))
                    if 0 <= int(t) < 60]
            if mins:
                text_hours.setdefault(hk, []).extend(mins)

    # STEP 4: associa colore a ciascun minuto tramite prossimita-y
    for hk, mins in text_hours.items():
        hour_y = hour_y_index.get(hk)
        for minute_val in mins:
            candidates = digit_color_index.get(minute_val, [])
            if candidates:
                if hour_y is not None:
                    _, best_colore = min(candidates, key=lambda c: abs(c[0] - hour_y))
                else:
                    _, best_colore = candidates[0]
            else:
                best_colore = "nero"

            destinazione = mappa_colori.get(best_colore)
            if not destinazione:
                if best_colore == "nero" and "nero" not in mappa_colori:
                    destinazione = direzione_nome
                else:
                    continue

            if hk not in timetable:
                timetable[hk] = {}
            if isinstance(timetable[hk], str):
                timetable[hk] = {}
            if destinazione not in timetable[hk]:
                timetable[hk][destinazione] = []
            if minute_val not in timetable[hk][destinazione]:
                timetable[hk][destinazione].append(minute_val)

    # STEP 5: alta frequenza (solo ore ancora vuote; range INCLUSIVO)
    i = 0
    while i < len(lines_text):
        line = lines_text[i].strip()
        if "DALLE" in line.upper():
            ora_inizio = ora_fine = None
            for look in range(0, 5):
                if i + look < len(lines_text):
                    cl = lines_text[i + look].strip()
                    mr = re.search(r'(\d{1,2})\s+alle\s+to\s+(\d{1,2})', cl, re.IGNORECASE)
                    if mr:
                        ora_inizio = int(mr.group(1))
                        ora_fine   = int(mr.group(2))
                        break
            if ora_inizio is not None and ora_fine is not None:
                freq_str = "frequenza_alta"
                for j in range(-2, 5):
                    idx = i + j
                    if 0 <= idx < len(lines_text):
                        cand = lines_text[idx].strip()
                        if "OGNI" in cand.upper() or "EVERY" in cand.upper():
                            freq_str = cand
                            break
                for h in range(ora_inizio, ora_fine + 1):  # +1 = inclusivo
                    hkey = f"{h:02d}"
                    if hkey not in timetable:
                        timetable[hkey] = freq_str
        i += 1

    # ordina minuti
    for hkey, value in timetable.items():
        if isinstance(value, dict):
            for dest in value:
                value[dest] = sorted(value[dest])

    return giornata, timetable


def update_all_timetables():
    for nome_stazione, url in STAZIONI.items():
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

    # Automatically generate bundle_orari.js
    os.system("python3 bundle_jsons.py")
    print("Bundle generated successfully.")

if __name__ == "__main__":
    update_all_timetables()