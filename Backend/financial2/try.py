import os,json

base_dir = os.path.dirname(__file__)
parent_dir = os.path.dirname(base_dir)

file_path = os.path.join(parent_dir, "save_data", "companies2.json")

with open(file_path, "r") as f:
    scrips = json.load(f)

print(len(scrips))