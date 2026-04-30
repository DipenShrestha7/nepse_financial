import json

data=None
with open("./companies2.json", "r") as f:
    data = json.load(f)

print(data[2]["symbol"])