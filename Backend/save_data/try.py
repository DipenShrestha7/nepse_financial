import json

data=None
with open("./companies2.json", "r") as f:
    data = json.load(f)

for dat in data:
    if dat["symbol"] == "RSML":
        print(dat)