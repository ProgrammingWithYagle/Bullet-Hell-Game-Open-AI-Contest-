"""Read-only native verification of the exact selected generated PNGs."""
import hashlib
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
folder = root / "assets/production/ui/engineer-tree-2026-11-03"
manifest = json.loads((folder / "provenance.json").read_text(encoding="utf-8"))
catalog = json.loads((root / "content/catalog.json").read_text(encoding="utf-8"))
expected = {s["id"] for s in catalog["specializationSkills"] if s["classId"] == "engineer"}
assert {a["id"] for a in manifest["assets"]} == expected
assert len(manifest["assets"]) == len(expected) == 22
rows = []
for asset in manifest["assets"]:
    path = root / asset["file"]
    assert path.resolve().parent == folder.resolve()
    raw = path.read_bytes()
    assert hashlib.sha256(raw).hexdigest() == asset["sha256"]
    assert len(raw) == asset["bytes"]
    assert asset["mode"] == "built-in image_gen" and asset["prompt"].strip()
    with Image.open(path) as image:
        assert image.mode == "RGBA", asset["id"]
        assert image.width >= 512 and image.height >= 512
        alpha = image.getchannel("A")
        assert alpha.getextrema() == (0, 255), asset["id"]
        box = alpha.point(lambda a: 255 if a >= 16 else 0).getbbox()
        assert box and box[0] > 0 and box[1] > 0 and box[2] < image.width and box[3] < image.height, asset["id"]
        assert alpha.getpixel((0, 0)) == alpha.getpixel((image.width - 1, image.height - 1)) == 0
        rows.append({"id": asset["id"], "size": list(image.size), "alphaBounds": list(box), "sha256": asset["sha256"]})
print(json.dumps({"passed": True, "assets": rows, "limits": ["Native files and alpha only; rendered UI, device and human visual acceptance remain separate."]}))
