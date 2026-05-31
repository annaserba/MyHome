from PIL import Image, ImageDraw
import math, subprocess

SIZE = 1024
img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

cx, cy = SIZE / 2, SIZE / 2
R = SIZE * 0.44

draw.rounded_rectangle((0, 0, SIZE, SIZE), radius=int(R * 0.6), fill=(22, 26, 34, 255))

teal = (125, 196, 205, 255)
white = (255, 255, 255, 255)
glass = (30, 36, 46, 220)
dark = (22, 26, 34, 255)
warm = (90, 145, 155, 255)

margin = SIZE * 0.28
inner = SIZE - margin * 2

draw.rounded_rectangle(
    (margin, margin, SIZE - margin, SIZE - margin),
    radius=48, fill=glass
)

t = inner * 0.15
hx, hy = cx, cy - inner * 0.10
draw.polygon([
    (hx, hy - inner * 0.28),
    (hx - inner * 0.25, hy - inner * 0.02),
    (hx - inner * 0.25, hy + inner * 0.22),
    (hx + inner * 0.25, hy + inner * 0.22),
    (hx + inner * 0.25, hy - inner * 0.02),
], fill=teal)

draw.rectangle(
    (hx - inner * 0.07, hy + inner * 0.01, hx + inner * 0.07, hy + inner * 0.22),
    fill=dark
)

dot_r = int(inner * 0.15)
draw.ellipse((int(cx - dot_r), int(cy + inner * 0.13), int(cx + dot_r), int(cy + inner * 0.13 + dot_r * 2)), fill=warm)

wave_r = inner * 0.28
wave_cx, wave_cy = cx + inner * 0.22, cy - inner * 0.06
for i, ang in enumerate([math.radians(210), math.radians(250), math.radians(290)]):
    sx = wave_cx + wave_r * math.cos(ang)
    sy = wave_cy - wave_r * math.sin(ang)
    ex = wave_cx + (wave_r + inner * 0.08) * math.cos(ang)
    ey = wave_cy - (wave_r + inner * 0.08) * math.sin(ang)
    draw.line([(sx, sy), (ex, ey)], fill=teal, width=4)

import os as _os
out_dir = _os.path.join(_os.path.dirname(__file__), "..", "assets")
_os.makedirs(out_dir, exist_ok=True)
icon_png = _os.path.join(out_dir, "icon_1024.png")
img.save(icon_png, "PNG")
print(f"saved {icon_png}")

iconset = _os.path.join(out_dir, "icon.iconset")
_os.makedirs(iconset, exist_ok=True)

for s in [16, 32, 64, 128, 256, 512]:
    img.resize((s, s), Image.LANCZOS).save(_os.path.join(iconset, f"icon_{s}x{s}.png"), "PNG")
    img.resize((s * 2, s * 2), Image.LANCZOS).save(_os.path.join(iconset, f"icon_{s}x{s}@2x.png"), "PNG")

subprocess.run(["iconutil", "-c", "icns", "-o", _os.path.join(out_dir, "icon.icns"), iconset], check=True)
print("icon.icns created")
