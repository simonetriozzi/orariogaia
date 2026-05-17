import pdfplumber
import json
import re
import requests
import io

def parse_table_rows(matrix):
    timetable = {}
    for row in matrix:
        if not row or row[0] is None:
            continue
        
        hour_match = re.search(r'(\d+)', str(row[0]))
        if not hour_match:
            continue
        
        hour_key = f"{int(hour_match.group(1)):02d}"
        minutes = []
        
        for cell in row[1:]:
            if cell:
                found_minutes = re.findall(r'\d+', str(cell))
                for m in found_minutes:
                    m_int = int(m)
                    if 0 <= m_int < 60:
                        minutes.append(m_int)
        
        if minutes:
            timetable[hour_key] = sorted(list(set(minutes)))
            
    return timetable

def update_timetable_from_url():
    url = "https://orari.atm.it/M2_669.pdf"
    response = requests.get(url)
    
    result = {
        "assago_forum": {"feriale": {}, "sabato": {}, "festivo": {}},
        "cologno_nord": {"feriale": {}, "sabato": {}, "festivo": {}}
    }
    
    with pdfplumber.open(io.BytesIO(response.content)) as pdf:
        # --- PAGINA 1 ---
        tables_p1 = pdf.pages[0].extract_tables()
        parsed_tables_p1 = [parse_table_rows(t) for t in tables_p1 if t]
        parsed_tables_p1.sort(key=lambda x: sum(len(v) for v in x.values()), reverse=True)
        if len(parsed_tables_p1) >= 3:
            result["assago_forum"]["feriale"] = parsed_tables_p1[0]
            result["assago_forum"]["sabato"] = parsed_tables_p1[1]
            result["assago_forum"]["festivo"] = parsed_tables_p1[2]
            
        # --- PAGINA 2 ---
        tables_p2 = pdf.pages[1].extract_tables()
        parsed_tables_p2 = [parse_table_rows(t) for t in tables_p2 if t]
        parsed_tables_p2.sort(key=lambda x: sum(len(v) for v in x.values()), reverse=True)
        if len(parsed_tables_p2) >= 3:
            result["cologno_nord"]["feriale"] = parsed_tables_p2[0]
            result["cologno_nord"]["sabato"] = parsed_tables_p2[1]
            result["cologno_nord"]["festivo"] = parsed_tables_p2[2]

    with open("orari_m2.json", 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

if __name__ == "__main__":
    update_timetable_from_url()