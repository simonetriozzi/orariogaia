import os
import json

stations_simone = [
    "M2_Cologno_Sud",
    "M2_Piola",
    "M2_Loreto",
    "M2_S_Ambrogio"
]

stations_gaia = [
    "M1_De_Angeli",
    "M1_Conciliazione",
    "M1_Cadorna",
    "M1_Cairoli",
    "M1_Cordusio",
    "M1_Duomo",
    "M1_San_Babila",
    "M1_Palestro",
    "M1_Porta_Venezia",
    "M1_Lima",
    "M1_Loreto",
    "M2_Cadorna",
    "M2_Loreto"
]

all_stations = list(set(stations_simone + stations_gaia))
bundle = {}

for st in all_stations:
    path = f"json_orari/{st}.json"
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            bundle[st] = json.load(f)
    else:
        print(f"Warning: {path} not found")

with open("bundle_orari.js", "w", encoding="utf-8") as f:
    f.write("const BUNDLE_ORARI = ")
    json.dump(bundle, f, separators=(',', ':'))
    f.write(";")
print("bundle_orari.js generated successfully.")
