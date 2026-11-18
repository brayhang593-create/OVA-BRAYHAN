"""Renderiza el video narrado de Créditos con Pillow, FFmpeg y SAPI en español."""
import argparse
import base64
import json
import math
import os
from pathlib import Path
import subprocess
import tempfile
import wave

from PIL import Image, ImageDraw
from render_videos import AXIS, FPS, GRID, HEIGHT, INK, PAPER, RUST, TEXT, TITLE, WIDTH, graph, logistic

PROJECT = Path(__file__).resolve().parents[1]
NARRATION = [["introduccion","En un sistema determinista, el estado actual y la regla determinan el estado siguiente."],["introduccion","Aun así, el futuro puede ser difícil de predecir si conocemos el estado inicial con poca precisión."],["trayectorias","Probemos el mapa logístico. Las dos curvas usan el mismo parámetro, erre igual a tres coma nueve."],["trayectorias","Los estados iniciales difieren en una diezmilésima. Al principio las curvas casi se superponen. Después se separan."],["regimenes","Si cambiamos erre a tres coma dos, la trayectoria termina alternando entre dos valores."],["regimenes","Con erre igual a tres coma nueve aparece una evolución irregular. La regla sigue siendo determinista."],["sistemas","En Teoría General de Sistemas, esto ayuda a entender los límites de una predicción. Cada estado se convierte en la entrada del paso siguiente."],["sistemas","El caos determinista también puede observarse en un circuito real, como el de Chua. En el simulador puedes comparar ambos regímenes."]]
CURVES = [logistic(3.9, start, 44) for start in [0.25, 0.2501]]
CYCLE = logistic(3.2, .25, 24)
CHAOS = logistic(3.9, .25, 24)

SAPI = """
$ErrorActionPreference = 'Stop'
$folder = $env:OVA_VIDEO_TEMP
$segments = Get-Content -Encoding UTF8 -Raw -LiteralPath (Join-Path $folder 'narracion.json') | ConvertFrom-Json
$voice = New-Object -ComObject SAPI.SpVoice
$spanish = $voice.GetVoices() | Where-Object { $_.GetDescription() -match 'Spanish|Espa.ol' } | Select-Object -First 1
if (-not $spanish) { throw 'Se necesita una voz SAPI en español.' }
$voice.Voice = $spanish
$voice.Rate = -1
for ($i = 0; $i -lt $segments.Count; $i++) {
  $stream = New-Object -ComObject SAPI.SpFileStream
  $stream.Open((Join-Path $folder ("audio-$i.wav")), 3)
  try {
    $voice.AudioOutputStream = $stream
    $null = $voice.Speak([string]$segments[$i])
  } finally {
    $stream.Close()
  }
}
"""


def synthesize(folder):
    (folder / "narracion.json").write_text(
        json.dumps([text for _, text in NARRATION], ensure_ascii=False), encoding="utf-8"
    )
    command = base64.b64encode(SAPI.encode("utf-16-le")).decode("ascii")
    subprocess.run(
        ["powershell.exe", "-NoProfile", "-NonInteractive", "-EncodedCommand", command],
        env={**os.environ, "OVA_VIDEO_TEMP": str(folder)}, check=True,
    )
    segments = []
    with wave.open(str(folder / "narracion.wav"), "wb") as combined:
        for index, (scene, text) in enumerate(NARRATION):
            with wave.open(str(folder / f"audio-{index}.wav"), "rb") as clip:
                profile = (clip.getnchannels(), clip.getsampwidth(), clip.getframerate())
                if index == 0:
                    combined.setnchannels(profile[0])
                    combined.setsampwidth(profile[1])
                    combined.setframerate(profile[2])
                elif profile != (combined.getnchannels(), combined.getsampwidth(), combined.getframerate()):
                    raise RuntimeError("La voz cambió de formato entre segmentos.")
                frames = clip.getnframes()
                combined.writeframes(clip.readframes(frames))
                silence = round(profile[2] * .24)
                combined.writeframes(bytes(silence * profile[0] * profile[1]))
                segments.append((scene, text, (frames + silence) / profile[2]))
        ending = round(combined.getframerate() * .5)
        combined.writeframes(bytes(ending * combined.getnchannels() * combined.getsampwidth()))
    return segments


def lines_for(draw, text, width, font):
    lines = [""]
    for word in text.split():
        joined = f"{lines[-1]} {word}".strip()
        if draw.textlength(joined, font=font) <= width:
            lines[-1] = joined
        else:
            lines.append(word)
    return lines


def draw_caption(draw, text):
    caption = text.replace("erre igual a", "r =").replace("erre a", "r a")
    for index, line in enumerate(lines_for(draw, caption, WIDTH - 114, AXIS)):
        draw.text((57, 449 + 25 * index), line, fill=INK, font=AXIS)


def frame(scene, text, elapsed, second_part):
    image = Image.new("RGB", (WIDTH, HEIGHT), PAPER)
    draw = ImageDraw.Draw(image)
    headings = {
        "introduccion": "Caos en los sistemas",
        "trayectorias": "Dos trayectorias, una regla",
        "regimenes": "Cambiar r cambia la dinámica",
        "sistemas": "Límites de la predicción",
    }
    draw.text((57, 30), headings[scene], fill=INK, font=TITLE)
    if scene == "introduccion":
        draw.text((58, 128), "Mapa logístico", fill=RUST, font=AXIS)
        draw.text((58, 171), "x(n + 1) = r · x(n) · [1 − x(n)]", fill=INK, font=TITLE)
        draw.line((59, 254, 899, 254), fill=GRID, width=2)
        steps = ["Estado actual", "Aplicar la regla", "Estado siguiente"]
        for index, step in enumerate(steps):
            draw.text((62 + 288 * index, 287), step, fill=INK, font=TEXT)
            if index < 2:
                draw.text((278 + 288 * index, 286), "→", fill=RUST, font=TEXT)
        if second_part:
            draw.text((62, 358), "La precisión del estado inicial importa.", fill=RUST, font=TEXT)
    elif scene == "trayectorias":
        draw.text((58, 89), "A: x(0) = 0,25", fill=INK, font=AXIS)
        draw.text((297, 89), "B: x(0) = 0,2501", fill=RUST, font=AXIS)
        draw.text((650, 89), "r = 3,9 en ambas", fill=INK, font=AXIS)
        visible = 2 + round(min(1, elapsed / 9.5) * 43)
        graph(draw, CURVES, visible, 44)
    elif scene == "regimenes":
        label = "r = 3,9 · régimen caótico" if second_part else "r = 3,2 · ciclo de período 2"
        draw.text((58, 89), label, fill=INK, font=AXIS)
        graph(draw, [CHAOS if second_part else CYCLE], 2 + round(min(1, elapsed / 4.5) * 23), 24)
    else:
        draw.text((58, 127), "TEORÍA GENERAL DE SISTEMAS", fill=RUST, font=AXIS)
        draw.text((58, 176), "El estado de hoy alimenta el paso siguiente.", fill=INK, font=TEXT)
        draw.line((58, 238, 895, 238), fill=GRID, width=2)
        if second_part:
            draw.text((58, 276), "Circuito de Chua", fill=INK, font=TITLE)
            draw.text((58, 345), "Ejemplo físico de caos determinista · Campos (2002)", fill=INK, font=AXIS)
        else:
            draw.text((58, 290), "Una medición imprecisa puede limitar la predicción.", fill=INK, font=TEXT)
    draw_caption(draw, text)
    return image


def render(ffmpeg, workspace):
    target = PROJECT / "assets/videos"
    target.mkdir(parents=True, exist_ok=True)
    name = "caos-en-los-sistemas-narrado"
    pending = target / (name + ".pending.mp4")
    with tempfile.TemporaryDirectory(dir=workspace) as scratch:
        folder = Path(scratch)
        segments = synthesize(folder)
        command = [
            ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
            "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{WIDTH}x{HEIGHT}", "-r", str(FPS), "-i", "-",
            "-i", str(folder / "narracion.wav"), "-c:v", "libx264", "-preset", "fast",
            "-pix_fmt", "yuv420p", "-crf", "21", "-c:a", "aac", "-b:a", "96k",
            "-shortest", "-movflags", "+faststart", str(pending),
        ]
        current_time = 0
        frames_written = 0
        scene_elapsed = 0
        previous = None
        with subprocess.Popen(command, stdin=subprocess.PIPE) as process:
            with process.stdin as stream:
                for index, (scene, text, duration) in enumerate(segments):
                    if scene != previous:
                        scene_elapsed = 0
                    current_time += duration
                    limit = round(current_time * FPS)
                    for frame_index in range(frames_written, limit):
                        elapsed = (frame_index - frames_written) / FPS
                        if scene == "trayectorias":
                            elapsed += scene_elapsed
                        stream.write(frame(scene, text, elapsed, index % 2 == 1).tobytes())
                    frames_written = limit
                    scene_elapsed += duration
                    previous = scene
                final_frame = frame(scene, text, scene_elapsed, True).tobytes()
                for _ in range(math.ceil(.55 * FPS)):
                    stream.write(final_frame)
            if process.wait() != 0:
                raise RuntimeError("Falló la codificación de video y audio.")
        pending.replace(target / (name + ".mp4"))
        frame("trayectorias", NARRATION[3][1], 10, True).save(target / (name + ".png"), optimize=True)
        print(f"Video narrado: {current_time + .5:.1f} segundos")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ffmpeg", default="ffmpeg")
    parser.add_argument("--work", type=Path)
    args = parser.parse_args()
    render(args.ffmpeg, args.work)
