"""Read-only checks for the admitted unmodified native Heavy body/weapon atlases."""
import hashlib
import json
import math
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
folder = root / "assets/production/motion/heavy-post-2026-11-10"
library = json.loads((folder / "library.json").read_text(encoding="utf-8"))
assert library["registered"] is True
assert library["imagePixelsChanged"] is False
assert library["imageResizedOrBackgroundProcessed"] is False
assert library["mode"] == "built-in image_gen"
assert library["facings"] == ["south", "east", "north", "west"]
assert len(library["textures"]) == 6
assert sum(len(t["frames"]) for t in library["textures"]) == 44
rows = []
for texture in [*library["textures"], library["weapon"]]:
    path = root / texture["file"]
    assert path.resolve().parent == folder.resolve()
    raw = path.read_bytes()
    assert hashlib.sha256(raw).hexdigest() == texture["sha256"]
    assert math.isfinite(texture["displayScale"]) and texture["displayScale"] > 0
    with Image.open(path) as image:
        assert image.mode == "RGBA"
        assert list(image.size) == texture["nativeSize"]
        assert image.getchannel("A").getextrema() == (0, 255)
        for frame in texture.get("frames", []):
            assert frame["x"] >= 0 and frame["y"] >= 0
            assert frame["width"] > 0 and frame["height"] > 0
            assert frame["x"] + frame["width"] <= image.width
            assert frame["y"] + frame["height"] <= image.height
            assert all(math.isfinite(v) and 0 <= v <= 1 for v in frame["origin"])
        rows.append({"key": texture["key"], "size": list(image.size), "sha256": texture["sha256"]})
gun = library["weapon"]
for axis in range(2):
    assert abs(gun["nativeMuzzle"][axis] - gun["origin"][axis] * gun["nativeSize"][axis]) < 1e-8
assert len({r["key"] for r in rows}) == 7
print(json.dumps({"passed": True, "nativeTextures": 7, "bodyFrames": 44, "rows": rows, "pixelsEditedOrResized": False, "limits": "Native bytes, measured atlas bounds and muzzle anchor only. Rendered/device/human motion acceptance remains separate."}))
