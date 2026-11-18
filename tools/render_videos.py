"""Genera dos demostraciones del mapa logístico y sus imágenes de portada.

Requiere Python, Pillow y FFmpeg. Ejecutar desde cualquier carpeta:
    python tools/render_videos.py --ffmpeg ruta/al/ffmpeg
Cada línea se calcula con x[n+1] = r*x[n]*(1-x[n]).
"""
import argparse
from pathlib import Path
import subprocess

from PIL import Image, ImageDraw, ImageFont

WIDTH, HEIGHT = 960, 540
FPS = 20
PAPER, INK, RUST, GRID = "#f6f2e9", "#244d40", "#9a482e", "#d2cabc"
PROJECT = Path(__file__).resolve().parents[1]
FONT_DIR = Path("C:/Windows/Fonts")


def font(name, size):
    try:
        return ImageFont.truetype(str(FONT_DIR / name), size)
    except OSError:
        return ImageFont.load_default(size=size)


TITLE = font("georgia.ttf", 43)
TEXT = font("segoeui.ttf", 27)
AXIS = font("consola.ttf", 21)


def logistic(rate, initial, steps):
    values = [initial]
    for _ in range(steps):
        value = values[-1]
        values.append(rate * value * (1 - value))
    return values


def graph(draw, series, limit, total_steps):
    left, right, top, bottom = 108, 885, 138, 405
    for value in [0, .25, .5, .75, 1]:
        y = round(bottom - value * (bottom - top))
        draw.line((left, y, right, y), fill=GRID, width=2)
        draw.text((left - 12, y), f"{value:g}".replace(".", ","), fill=INK, font=AXIS, anchor="rm")
    points = [0, total_steps // 2, total_steps]
    for step in points:
        x = round(left + step * (right - left) / total_steps)
        draw.line((x, top, x, bottom), fill=GRID, width=2)
        draw.text((x, bottom + 14), str(step), fill=INK, font=AXIS, anchor="mt")
    draw.text((57, 111), "x", fill=INK, font=AXIS)
    draw.text((902, 418), "n", fill=INK, font=AXIS)

    for rank, values in enumerate(series):
        positions = [
            (left + step * (right - left) / total_steps, bottom - value * (bottom - top))
            for step, value in enumerate(values[:limit])
        ]
        if rank == 0:
            draw.line(positions, fill=INK, width=5, joint="curve")
        else:
            for index, (x, y) in enumerate(positions):
                if index:
                    px, py = positions[index - 1]
                    draw.line((px, py, (px+x)/2, (py+y)/2), fill=RUST, width=3)
                draw.ellipse((x-3, y-3, x+3, y+3), fill=RUST)


def frame_background(title, label):
    image = Image.new("RGB", (WIDTH, HEIGHT), PAPER)
    draw = ImageDraw.Draw(image)
    draw.text((57, 29), title, fill=INK, font=TITLE)
    draw.text((58, 86), label, fill=INK, font=AXIS)
    return image, draw


def compare_frame(frame_number):
    time = frame_number / FPS
    image, draw = frame_background("Dos estados iniciales", "r = 3,9 en ambas trayectorias")
    limit = 2 + round(min(1, max(0, (time - 2) / 10)) * 43)
    graph(draw, COMPARE, limit, 44)
    draw.text((110, 452), "A  x₀ = 0,25", fill=INK, font=TEXT)
    draw.text((342, 452), "B  x₀ = 0,2501", fill=RUST, font=TEXT)
    caption = "Empiezan con una diferencia de 0,0001." if time < 8 else "Con la misma regla, las trayectorias se separan."
    draw.text((110, 489), caption, fill=INK, font=TEXT)
    return image


def regimes_frame(frame_number):
    time = frame_number / FPS
    number = min(2, int(time / 7))
    rate_label, caption, values = REGIMES[number]
    image, draw = frame_background("Tres valores de r", "x₀ = 0,25   ·   r = " + rate_label)
    limit = 2 + round(min(1, (time % 7) / 3.7) * 23)
    graph(draw, [values], limit, 24)
    draw.text((110, 469), caption, fill=INK, font=TEXT)
    return image


def render(ffmpeg, filename, seconds, frame_function, poster_time):
    folder = PROJECT / "assets" / "videos"
    folder.mkdir(parents=True, exist_ok=True)
    output = folder / (filename + ".mp4")
    pending = output.with_suffix(".pending.mp4")
    encoder = [
        ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-f", "rawvideo",
        "-pixel_format", "rgb24", "-video_size", f"{WIDTH}x{HEIGHT}",
        "-framerate", str(FPS), "-i", "-", "-an", "-c:v", "libx264",
        "-pix_fmt", "yuv420p", "-preset", "fast", "-crf", "22",
        "-movflags", "+faststart", str(pending)
    ]
    with subprocess.Popen(encoder, stdin=subprocess.PIPE) as process:
        with process.stdin as stream:
            for index in range(seconds * FPS):
                stream.write(frame_function(index).tobytes())
        if process.wait() != 0:
            raise RuntimeError("FFmpeg no pudo codificar " + filename)
    pending.replace(output)
    frame_function(round(poster_time * FPS)).save(folder / (filename + ".png"), optimize=True)
    print(filename, output.stat().st_size, flush=True)


COMPARE = [logistic(3.9, initial, 44) for initial in [.25, .2501]]
REGIMES = [
    ("2,8", "Estable. Se acerca a un valor fijo.", logistic(2.8, .25, 24)),
    ("3,2", "Periódico. Alterna entre dos niveles.", logistic(3.2, .25, 24)),
    ("3,9", "Caótico. Oscila de forma irregular.", logistic(3.9, .25, 24)),
]

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ffmpeg", default="ffmpeg")
    args = parser.parse_args()
    render(args.ffmpeg, "condiciones-iniciales", 18, compare_frame, 15)
    render(args.ffmpeg, "tres-regimenes", 21, regimes_frame, 11)
