import numpy as np
from PIL import Image
SRC_DARK, SRC_LIGHT = np.array([0x00, 0x5D, 0xA5], float), np.array([0x00, 0xA9, 0xE7], float)
DST_DARK, DST_LIGHT = np.array([0x00, 0x97, 0xA7], float), np.array([0x00, 0xBC, 0xD4], float)   # site --primary-dark, --primary
im = np.array(Image.open("/w/original.png").convert("RGBA")).astype(float)
rgb, a = im[..., :3], im[..., 3:]
d = SRC_LIGHT - SRC_DARK
t = np.clip(((rgb - SRC_DARK) @ d) / (d @ d), 0, 1)[..., None]          # position between the two source blues
off = np.linalg.norm(rgb - (SRC_DARK + t * d), axis=-1)
print("max distance of any opaque pixel from the dark-light blue line:", round(float(off[im[..., 3] > 0].max()), 1))
out = np.concatenate([DST_DARK + t * (DST_LIGHT - DST_DARK), a], axis=-1).round().clip(0, 255).astype(np.uint8)
Image.fromarray(out, "RGBA").save("/w/original_teal.png", optimize=True)
print("saved original_teal.png")
