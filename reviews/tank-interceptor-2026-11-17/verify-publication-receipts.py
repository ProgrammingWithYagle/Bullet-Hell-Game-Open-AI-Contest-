import hashlib
import json
import pathlib
import zipfile


def digest(data):
    return hashlib.sha256(data).hexdigest()


directory = pathlib.Path(__file__).resolve().parent
repo = directory.parents[1]
binding = json.loads((directory / "publication-byte-bindings.json").read_text(encoding="utf-8"))
assert binding["passed"] and not binding["includesBuildFiles"]
archive = repo / binding["archive"]
assert digest(archive.read_bytes()) == binding["archiveSha256"]
with zipfile.ZipFile(archive) as bundle:
    assert bundle.testzip() is None
    assert sorted(bundle.namelist()) == sorted(row["member"] for row in binding["rows"])
    for row in binding["rows"]:
        raw = bundle.read(row["member"])
        assert len(raw) == row["originalBytes"] and digest(raw) == row["originalSha256"]
        normalized = raw.replace(b"\r\n", b"\n")
        assert digest(normalized) == row["publishedLFSha256"]
        if row["path"]:
            assert digest((repo / row["path"]).read_bytes()) in (row["originalSha256"], row["publishedLFSha256"])
print(json.dumps({"passed": True, "originalReceiptsVerified": len(binding["rows"])}))
