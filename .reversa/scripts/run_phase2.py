import os, json, datetime

now = datetime.datetime.now(datetime.timezones.utc).isoformat()
os.makedirs('_reversa_sdd/flowcharts', exist_ok=True)
os.makedirs( .versa/context', exist_ok=True)

from pathlib import Path

with open('.reversa/context/modules.json', 'w', encoding='utf-8') as f:
    json.dump({}, f, indent=2)

print('Phase 2 prepared')
