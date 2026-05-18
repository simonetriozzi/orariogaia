import pdfplumber
import json
import re
import requests
import io
import time
import os

STAZIONI_TEST = {
    "M1_De_Angeli": "https://orari.atm.it/M1_514.pdf",
    "M1_San_Leonardo": "https://orari.atm.it/M1_518.pdf",
    "M1_Palestro": "https://orari.atm.it/M1_534.pdf",
    "M2_Cologno_Sud": "https://orari.atm.it/M2_669.pdf",
    "M2_Piola": "https://orari.atm.it/M2_676.pdf"
}

# Dizionario chiuso dei capolinea ATM (M1 e M2)
DESTINAZIONI_CAPOLINEA = {
    "SESTO": "sesto_1_maggio",
    "RHO FIERA": "rho_fiera",
    "BISCEGLIE": "bisceglie",
    "ASSAGO": "assago_forum",
    "ABBIATEGRASSO": "abbiategrasso",
    "COLOGNO NORD": "cologno_nord",
    "GESSATE": "gessate",
    "FAMAGOSTA": "famagosta"
}

def pulisci_nome_direzione(testo_pagina):
    # Cerca la parola chiave e scansiona solo i 150 caratteri successivi
    match = re.search(r'(?:Treni per|Trains to|per to)[\s\S]{1,150}', testo_pagina, re.IGNORECASE)
    
    if match:
        frammento = match.group(0).upper()
        direzioni_trovate = []
        
        # Verifica quali capolinea noti sono presenti in quel frammento
        for chiave, valore in DESTINAZIONI_CAPOLINEA.items():
            if chiave in frammento:
                if valore not in direzioni_trovate:
                    direzioni_trovate.append(valore)
        
        # Se trova più destinazioni (es. Abbiategrasso/Assago), le unisce
        if direzioni_trovate:
            return "_".join(direzioni_trovate)
            
    return None

def estrai_orari_da_colonna(page, bbox):
    cropped = page.crop(bbox)
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
        
    timetable = {}
    lines = text.split('\n')
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        # 1. Estrazione minuti esatti
        match_ora = re.search(r'^(\d{1,2}):00(.*)', line)
        if match_ora:
            hour = f"{int(match_ora.group(1)):02d}"
            minutes_str = match_ora.group(2)
            minutes = [int(m) for m in re.findall(r'\b\d{1,2}\b', minutes_str)]
            valid_minutes = sorted(list(set(m for m in minutes if 0 <= m < 60)))
            
            if valid_minutes:
                if hour not in timetable:
                    timetable[hour] = []
                timetable[hour].extend(valid_minutes)
                timetable[hour] = sorted(list(set(timetable[hour])))
            i += 1
            continue
            
        # 2. Estrazione stringhe alta frequenza
        if "DALLE" in line.upper() and "ALLE" in line.upper():
            ore = re.findall(r'\b\d{1,2}\b', line)
            if len(ore) >= 2:
                ora_inizio = int(ore[0])
                ora_fine = int(ore[1])
                
                frequenza_str = "frequenza_alta"
                for j in range(1, 3):
                    if i + j < len(lines):
                        next_line = lines[i+j].strip()
                        if "OGNI" in next_line.upper() or "EVERY" in next_line.upper():
                            frequenza_str = next_line
                            break
                
                for h in range(ora_inizio, ora_fine):
                    hour_key = f"{h:02d}"
                    timetable[hour_key] = frequenza_str
            i += 1
            continue
            
        i += 1
                
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
                    giornata, orari = estrai_orari_da_colonna(page, bbox)
                    if giornata and orari:
                        result[direzione_nome][giornata].update(orari)

        # Salvataggio
        cartella_output = "json_orari"
        if not os.path.exists(cartella_output):
            os.makedirs(cartella_output)
            
        nome_file = os.path.join(cartella_output, f"{nome_stazione}.json")
        
        with open(nome_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
            
        print(f"Test completato e salvato in: {nome_file}")
        
        time.sleep(2)

if __name__ == "__main__":
    update_test_timetables()