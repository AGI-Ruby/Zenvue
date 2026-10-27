"""Export platform icon formats from Zenvue's approved generated master (Pillow)."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
master = Image.open(ROOT / "branding/icon-master.png").convert("RGBA")
if master.width != master.height:
    raise ValueError("The app icon master must be square")
if master.getchannel("A").getextrema()[0] != 0:
    raise ValueError("The app icon master must preserve transparent corners")
app_icons = ROOT / "public/app-icons"
app_icons.mkdir(parents=True, exist_ok=True)
for size in (16, 24, 32, 48, 64, 128, 256, 512, 1024):
    exported = master.resize((size, size), Image.Resampling.LANCZOS)
    exported.save(app_icons / f"zenvue-{size}.png")
    exported.save(ROOT / f"icons/icons/png/{size}x{size}.png")
master.save(ROOT / "icons/icons/win/icon.ico", sizes=[(s, s) for s in (16,24,32,48,64,128,256)])
master.save(ROOT / "icons/icons/mac/icon.icns", format="ICNS")
# Obsolete upstream app icons are no longer shipped as this fork's brand.
for old in app_icons.glob("recordly*.png"):
    if old.resolve().parent != app_icons.resolve():
        raise ValueError("Unexpected icon output path")
    old.unlink()
print("Exported 9 PNG sizes, a multi-size ICO and ICNS from the approved master.")
