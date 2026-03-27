from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parent.parent
OUT_PATH = ROOT / "docs" / "readme-banner-v2.png"
ICON_PATH = ROOT / "icons" / "gwu-128.png"
LOMBITE_SCREENSHOT = Path(
    "/home/vi7or/agent-prj-data/prj_data/github.com/Setmaster/gemini-web-utility/webstore/screenshots/04-image-cleanup.png"
)

W, H = 1440, 760
CARD_POSITIONS = [
    ("Clockwork Koi Tea", (760, 92), -9),
    ("Lombite Poster", (910, 238), 7),
    ("Pancake UFO", (1060, 98), 11),
]
CHAT_TITLES = ["Lombite Poster", "Clockwork Koi Tea", "Pancake UFO"]


def rounded_mask(size, radius):
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=255)
    return mask


def crop_lombite_image():
    screenshot = Image.open(LOMBITE_SCREENSHOT).convert("RGB")
    crop = screenshot.crop((458, 273, 816, 507))
    return crop.resize((230, 142), Image.Resampling.LANCZOS)


def draw_koi_teacup():
    img = Image.new("RGB", (230, 142), "#0c2238")
    draw = ImageDraw.Draw(img)

    for y in range(142):
        t = y / 141
        color = (
            int(8 + (27 - 8) * t),
            int(34 + (71 - 34) * t),
            int(56 + (102 - 56) * t),
        )
        draw.line((0, y, 230, y), fill=color)

    draw.ellipse((130, 12, 205, 72), fill=(255, 208, 90))
    draw.ellipse((138, 20, 197, 64), fill=(255, 223, 134))

    draw.polygon([(0, 108), (44, 88), (88, 108), (132, 90), (176, 106), (230, 80), (230, 142), (0, 142)], fill=(23, 78, 122))
    draw.polygon([(0, 120), (38, 106), (92, 122), (140, 110), (230, 126), (230, 142), (0, 142)], fill=(34, 119, 164))

    cup_x, cup_y = 58, 54
    draw.rounded_rectangle((cup_x, cup_y, cup_x + 94, cup_y + 54), radius=14, fill=(240, 245, 250), outline=(196, 205, 214), width=3)
    draw.arc((cup_x + 76, cup_y + 10, cup_x + 112, cup_y + 42), 270, 90, fill=(240, 245, 250), width=6)
    draw.rectangle((cup_x + 8, cup_y + 20, cup_x + 86, cup_y + 54), fill=(177, 234, 243))
    draw.rectangle((cup_x + 2, cup_y + 54, cup_x + 98, cup_y + 60), fill=(220, 228, 235))
    draw.rounded_rectangle((cup_x + 18, cup_y + 60, cup_x + 78, cup_y + 70), radius=5, fill=(233, 239, 244))

    body = [(102, 44), (140, 50), (166, 66), (168, 88), (148, 102), (114, 96), (92, 78)]
    draw.polygon(body, fill=(255, 145, 54))
    draw.ellipse((114, 52, 160, 92), fill=(255, 145, 54))
    draw.polygon([(90, 76), (62, 66), (70, 88)], fill=(255, 175, 92))
    draw.polygon([(140, 50), (126, 18), (152, 30)], fill=(255, 175, 92))
    draw.polygon([(132, 98), (120, 124), (146, 112)], fill=(255, 175, 92))
    draw.ellipse((138, 62, 147, 71), fill=(255, 255, 255))
    draw.ellipse((145, 64, 149, 68), fill=(24, 32, 52))
    draw.line((112, 58, 154, 86), fill=(255, 236, 219), width=3)
    draw.line((120, 56, 160, 84), fill=(255, 236, 219), width=2)
    draw.line((126, 52, 166, 80), fill=(255, 236, 219), width=2)

    for x, y in [(182, 34), (192, 54), (202, 42)]:
        draw.ellipse((x, y, x + 10, y + 10), outline=(245, 211, 74), width=3)
        draw.line((x + 5, y - 3, x + 5, y + 13), fill=(245, 211, 74), width=2)
        draw.line((x - 3, y + 5, x + 13, y + 5), fill=(245, 211, 74), width=2)

    return img


def draw_pancake_ufo():
    img = Image.new("RGB", (230, 142), "#101735")
    draw = ImageDraw.Draw(img)

    for y in range(142):
        t = y / 141
        color = (
            int(16 + (40 - 16) * t),
            int(23 + (54 - 23) * t),
            int(53 + (82 - 53) * t),
        )
        draw.line((0, y, 230, y), fill=color)

    draw.ellipse((14, 18, 52, 56), fill=(255, 233, 114))
    for cx, cy in [(28, 22), (186, 22), (206, 36), (176, 54), (150, 18)]:
        draw.ellipse((cx, cy, cx + 4, cy + 4), fill=(255, 255, 255))

    draw.polygon([(18, 130), (58, 112), (96, 126), (134, 104), (170, 120), (230, 96), (230, 142), (0, 142), (0, 118)], fill=(66, 40, 97))
    draw.polygon([(0, 134), (36, 126), (88, 136), (142, 120), (194, 134), (230, 124), (230, 142), (0, 142)], fill=(92, 58, 127))

    beam = Image.new("RGBA", (230, 142), (0, 0, 0, 0))
    bd = ImageDraw.Draw(beam)
    bd.polygon([(82, 78), (148, 78), (188, 134), (42, 134)], fill=(108, 229, 232, 92))
    beam = beam.filter(ImageFilter.GaussianBlur(4))
    img = Image.alpha_composite(img.convert("RGBA"), beam).convert("RGB")
    draw = ImageDraw.Draw(img)

    plate = (52, 38, 182, 88)
    draw.ellipse(plate, fill=(185, 128, 72), outline=(251, 211, 147), width=4)
    draw.ellipse((58, 34, 176, 68), fill=(241, 186, 109), outline=(250, 223, 163), width=3)
    draw.ellipse((66, 28, 168, 58), fill=(244, 201, 129), outline=(255, 233, 180), width=3)
    draw.ellipse((96, 20, 138, 38), fill=(255, 243, 186), outline=(255, 255, 220), width=2)

    syrup = Image.new("RGBA", (230, 142), (0, 0, 0, 0))
    sd = ImageDraw.Draw(syrup)
    sd.polygon([(90, 40), (140, 40), (132, 86), (100, 86)], fill=(136, 65, 39, 210))
    sd.ellipse((92, 32, 138, 50), fill=(160, 82, 45, 230))
    for dx in [96, 114, 132]:
        sd.rounded_rectangle((dx, 44, dx + 10, 84), radius=5, fill=(136, 65, 39, 228))
    img = Image.alpha_composite(img.convert("RGBA"), syrup).convert("RGB")
    draw = ImageDraw.Draw(img)

    for bx, by in [(72, 104), (102, 116), (146, 108), (164, 124)]:
        draw.ellipse((bx, by, bx + 18, by + 18), fill=(72, 104, 214), outline=(196, 218, 255), width=2)

    draw.ellipse((98, 92, 110, 104), fill=(255, 240, 198))
    draw.ellipse((122, 94, 134, 106), fill=(255, 240, 198))

    return img


def make_card(image, active_title):
    card = Image.new("RGBA", (430, 284), (0, 0, 0, 0))

    shadow = Image.new("RGBA", (430, 284), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((18, 18, 412, 266), radius=28, fill=(0, 0, 0, 104))
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    card.alpha_composite(shadow)

    shell = Image.new("RGBA", (410, 264), (15, 23, 42, 0))
    shell_draw = ImageDraw.Draw(shell)
    shell_draw.rounded_rectangle((0, 0, 410, 264), radius=28, fill=(241, 245, 249, 255), outline=(255, 255, 255, 50), width=2)

    sidebar = Image.new("RGBA", (118, 264), (0, 0, 0, 0))
    side = ImageDraw.Draw(sidebar)
    side.rounded_rectangle((0, 0, 146, 264), radius=28, fill=(228, 236, 247, 255))
    side.rectangle((96, 0, 118, 264), fill=(228, 236, 247, 255))

    semi = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 11)
    body = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 10)
    tiny = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 9)

    side.text((14, 14), "Gemini", font=semi, fill=(31, 41, 55))
    side.text((14, 36), "My stuff", font=body, fill=(100, 116, 139))
    side.text((14, 58), "Chats", font=semi, fill=(55, 65, 81))

    y = 80
    for title in CHAT_TITLES:
        active = title == active_title
        fill = (191, 219, 254) if active else (0, 0, 0, 0)
        text_fill = (30, 64, 175) if active else (71, 85, 105)
        side.rounded_rectangle((10, y - 4, 106, y + 20), radius=12, fill=fill)
        side.text((16, y), title, font=tiny, fill=text_fill)
        y += 30

    shell.alpha_composite(sidebar, (0, 0))

    main = Image.new("RGBA", (274, 264), (255, 255, 255, 255))
    md = ImageDraw.Draw(main)
    md.rectangle((0, 0, 274, 264), fill=(255, 255, 255, 255))
    prompt = Image.new("RGBA", (214, 38), (0, 0, 0, 0))
    pd = ImageDraw.Draw(prompt)
    pd.rounded_rectangle((0, 0, 214, 38), radius=14, fill=(231, 238, 249))
    prompt_map = {
        "Lombite Poster": 'Create a sign-holding lombo image',
        "Clockwork Koi Tea": 'Create a clockwork koi in a teacup',
        "Pancake UFO": 'Create a pancake UFO over berries',
    }
    pd.text((12, 11), prompt_map[active_title], font=tiny, fill=(55, 65, 81))
    main.alpha_composite(prompt, (44, 16))

    framed = Image.new("RGBA", (230, 142), (0, 0, 0, 0))
    mask = rounded_mask((230, 142), 16)
    framed.paste(image, (0, 0), mask)
    main.alpha_composite(framed, (22, 74))

    for idx, x in enumerate([26, 48, 70]):
        color = (100, 116, 139) if idx != 1 else (59, 130, 246)
        md.ellipse((x, 224, x + 11, 235), outline=color, width=2)

    shell.alpha_composite(main, (118, 0))
    card.alpha_composite(shell, (10, 10))
    return card


def main():
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    canvas = Image.new("RGBA", (W, H), "#0b1020")
    draw = ImageDraw.Draw(canvas)

    for y in range(H):
        t = y / (H - 1)
        r = int(8 + (13 - 8) * t)
        g = int(12 + (20 - 12) * t)
        b = int(26 + (42 - 26) * t)
        draw.line((0, y, W, y), fill=(r, g, b, 255))

    blob = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    bd = ImageDraw.Draw(blob)
    bd.ellipse((860, -80, 1450, 500), fill=(52, 211, 153, 46))
    bd.ellipse((960, 260, 1520, 820), fill=(37, 99, 235, 54))
    bd.ellipse((-160, 420, 520, 980), fill=(22, 78, 99, 42))
    bd.ellipse((40, 120, 520, 560), fill=(59, 130, 246, 24))
    blob = blob.filter(ImageFilter.GaussianBlur(78))
    canvas.alpha_composite(blob)

    strokes = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(strokes)
    for offset, alpha in [(0, 26), (50, 18), (100, 12)]:
        sd.arc((760 + offset, -80 + offset, 1620 + offset, 780 + offset), 205, 312, fill=(255, 255, 255, alpha), width=2)
    strokes = strokes.filter(ImageFilter.GaussianBlur(2))
    canvas.alpha_composite(strokes)

    icon = Image.open(ICON_PATH).convert("RGBA").resize((84, 84), Image.Resampling.LANCZOS)
    chip = Image.new("RGBA", (448, 104), (255, 255, 255, 0))
    cd = ImageDraw.Draw(chip)
    cd.rounded_rectangle((0, 0, 448, 104), radius=28, fill=(255, 255, 255, 18), outline=(255, 255, 255, 32), width=2)
    chip.alpha_composite(icon, (14, 10))
    chip_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 26)
    cd.text((112, 27), "Gemini Web Utility", font=chip_font, fill=(242, 247, 255, 255))
    canvas.alpha_composite(chip, (84, 64))

    title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 66)
    body = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 24)
    small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 22)
    accent = (98, 234, 205, 255)
    muted = (198, 208, 224, 255)

    draw.text((88, 210), "Sharper Gemini,", font=title, fill=(244, 248, 255, 255))
    draw.text((88, 292), "less friction.", font=title, fill=accent)
    body_text = (
        "Focused quality-of-life fixes for the Gemini web app.\n"
        "Clean copy, export, shortcuts, auto-expand,\n"
        "and in-page image cleanup without replacing Gemini's flow."
    )
    draw.multiline_text((92, 400), body_text, font=body, fill=muted, spacing=10)

    pills = [
        ("Clean Copy", (59, 130, 246, 205)),
        ("Markdown Export", (16, 185, 129, 205)),
        ("Shortcut Rebinding", (245, 158, 11, 205)),
        ("Image Cleanup", (99, 102, 241, 205)),
    ]
    px, py = 92, 550
    for text, color in pills:
        pill_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 18)
        width = draw.textbbox((0, 0), text, font=pill_font)[2] + 32
        pill = Image.new("RGBA", (width, 46), (0, 0, 0, 0))
        pd = ImageDraw.Draw(pill)
        pd.rounded_rectangle((0, 0, width, 46), radius=16, fill=color, outline=(255, 255, 255, 30), width=1)
        pd.text((16, 11), text, font=pill_font, fill=(248, 250, 252, 255))
        canvas.alpha_composite(pill, (px, py))
        px += width + 12
        if px > 560:
            px = 92
            py += 58

    footer = "Manifest V3 Chrome extension  •  In-page utilities, not a Gemini redesign"
    draw.text((88, 694), footer, font=small, fill=(133, 145, 166, 255))

    images = {
        "Lombite Poster": crop_lombite_image(),
        "Clockwork Koi Tea": draw_koi_teacup(),
        "Pancake UFO": draw_pancake_ufo(),
    }

    cards = [
        make_card(images["Clockwork Koi Tea"], "Clockwork Koi Tea"),
        make_card(images["Pancake UFO"], "Pancake UFO"),
        make_card(images["Lombite Poster"], "Lombite Poster"),
    ]

    placements = {
        "Clockwork Koi Tea": ((760, 92), -9),
        "Lombite Poster": ((910, 238), 7),
        "Pancake UFO": ((1060, 98), 11),
    }

    for title, image in [("Clockwork Koi Tea", cards[0]), ("Pancake UFO", cards[1]), ("Lombite Poster", cards[2])]:
        pos, angle = placements[title]
        rotated = image.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)
        canvas.alpha_composite(rotated, pos)

    canvas.convert("RGB").save(OUT_PATH, quality=95)
    print(OUT_PATH)


if __name__ == "__main__":
    main()
