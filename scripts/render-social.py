#!/usr/bin/env python3
"""Reframe owned CLI footage into social exports; no network or app dependencies."""
import argparse
import hashlib
import json
import shutil
import subprocess
import tempfile
import zipfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'docs/media/demo.mp4'
OUTPUT = ROOT / 'docs/media/social'
BG = '#101419'
WHITE = '#f3f5f7'
MUTED = '#b4bec8'
CYAN = '#40e8ff'
CROP = (240, 100, 360, 340)
SCENES = [
    ('01 / LABA-LABA', 'Delapan kaki bersendi.', '/neon demo spider'),
    ('02 / KUCING', 'Kedip, kumis, ekor bergerak.', '/neon demo cat'),
    ('03 / RUBAH', 'Telinga runcing. Ekor lebar.', '/neon demo fox'),
    ('04 / UBUR-UBUR', 'Ubur-ubur, versi wireframe.', '/neon demo jellyfish'),
    ('05 / GARIS ASCII', 'Detail Braille atau garis ASCII.', '/neon ascii'),
    ('06 / MONO + GERAK DIAM', 'Warna, posisi, ukuran, gerak.', '/neon motion still'),
]
PRESETS = {
    'vertical': (1080, 1920, 'reels-tiktok-stories-1080x1920.mp4', 'cover-vertical-1080x1920.png'),
    'feed': (1080, 1350, 'feed-1080x1350.mp4', 'cover-feed-1080x1350.png'),
    'square': (1080, 1080, 'square-1080x1080.mp4', 'cover-square-1080x1080.png'),
    'landscape': (1920, 1080, 'landscape-1920x1080.mp4', 'cover-landscape-1920x1080.png'),
    'status-lite': (720, 1280, 'status-lite-720x1280.mp4', 'cover-status-lite-720x1280.png'),
}
# Typography slots: x, y, point size. Hero rectangle is x, y, width, height.
LAYOUTS = {
    'vertical': {'brand': (92, 250, 32), 'title': (92, 330, 78), 'label': (92, 540, 32),
                 'hero': (110, 590, 680, 642), 'caption': (92, 1260, 33),
                 'command': (92, 1320, 30), 'footer': (92, 1400, 36),
                 'safe': (90, 230, 900, 1490), 'text_width': 810},
    'feed': {'brand': (72, 74, 30), 'title': (72, 140, 66), 'label': (72, 325, 30),
             'hero': (190, 390, 680, 642), 'caption': (72, 1070, 34),
             'command': (72, 1130, 29), 'footer': (72, 1210, 28),
             'safe': (60, 60, 1020, 1300), 'text_width': 936},
    'square': {'brand': (60, 55, 27), 'title': (60, 110, 59), 'label': (60, 275, 28),
               'hero': (290, 335, 530, 500), 'caption': (60, 870, 30),
               'command': (60, 925, 26), 'footer': (60, 982, 25),
               'safe': (50, 45, 1030, 1050), 'text_width': 960},
    'landscape': {'brand': (120, 165, 34), 'title': (120, 260, 84), 'label': (120, 500, 32),
                  'hero': (1100, 230, 680, 642), 'caption': (120, 580, 34),
                  'command': (120, 650, 30), 'footer': (120, 800, 25),
                  'safe': (100, 120, 1820, 950), 'text_width': 840},
}


def run(args):
    result = subprocess.run([str(a) for a in args], capture_output=True, text=True, check=False)
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or f'Command failed: {args[0]}')
    return result.stdout


def probe(path):
    return json.loads(run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', path]))


def digest(path):
    checksum = hashlib.sha256()
    with path.open('rb') as source:
        for block in iter(lambda: source.read(1024 * 1024), b''):
            checksum.update(block)
    return checksum.hexdigest()


def draw_scene(name, scene, fonts, title='Terminal kamu\nbutuh teman.'):
    width, height, _, _ = PRESETS[name]
    layout = LAYOUTS[name]
    image = Image.new('RGB', (width, height), BG)
    draw = ImageDraw.Draw(image)
    bounds = []
    hero = layout['hero']
    safe = layout['safe']

    def text(slot, value, face, color):
        x, y, size = layout[slot]
        font = ImageFont.truetype(str(fonts[face]), size)
        for line in value.split('\n'):
            rect = draw.textbbox((x, y), line, font=font, anchor='lt')
            if rect[2] - rect[0] > layout['text_width']:
                raise ValueError(f'{name}/{slot}: text exceeds its layout width: {line}')
            if not (safe[0] <= rect[0] and safe[1] <= rect[1] and rect[2] <= safe[2] and rect[3] <= safe[3]):
                raise ValueError(f'{name}/{slot}: text escapes safe area: {line}')
            hx, hy, hw, hh = hero
            if rect[0] < hx + hw and rect[2] > hx and rect[1] < hy + hh and rect[3] > hy:
                raise ValueError(f'{name}/{slot}: footage would cover text: {line}')
            draw.text((x, y), line, font=font, fill=color, anchor='lt')
            bounds.append({'slot': slot, 'text': line, 'rect': list(rect)})
            y += round(size * 1.25)

    text('brand', 'CLI NEON OVERLAY / OMP + PI', 'regular', MUTED)
    text('title', title, 'bold', WHITE)
    text('label', scene[0], 'mono', CYAN)
    text('caption', scene[1], 'regular', WHITE)
    text('command', scene[2], 'mono', CYAN)
    footer = 'Preview CLI asli. Coba dari GitHub.\ngithub.com/Wayan123/cli-neon-overlay'
    text('footer', footer, 'regular', MUTED)
    return image, bounds


def verify_video(path, preset):
    width, height, _, _ = PRESETS[preset]
    metadata = probe(path)
    video = next(stream for stream in metadata['streams'] if stream['codec_type'] == 'video')
    if (video['width'], video['height'], video['codec_name'], video['pix_fmt']) != (width, height, 'h264', 'yuv420p'):
        raise ValueError(f'Incorrect export metadata: {path.name}')
    if video['avg_frame_rate'] != '30/1' or abs(float(metadata['format']['duration']) - 18) > .05:
        raise ValueError(f'Incorrect frame rate or duration: {path.name}')
    if video.get('sample_aspect_ratio') != '1:1':
        raise ValueError(f'Non-square pixels: {path.name}')
    if any(stream['codec_type'] == 'audio' for stream in metadata['streams']):
        raise ValueError(f'Unexpected audio in silent export: {path.name}')
    run(['ffmpeg', '-hide_banner', '-v', 'error', '-xerror', '-i', path, '-f', 'null', '-'])
    return {'file': path.name, 'width': width, 'height': height, 'fps': 30, 'duration_seconds': 18,
            'codec': 'h264', 'pixel_format': 'yuv420p', 'audio': False,
            'bytes': path.stat().st_size, 'sha256': digest(path), 'full_decode': 'pass'}


def extract(path, seconds, destination):
    run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-ss', seconds, '-i', path,
         '-frames:v', '1', '-update', '1', destination])


def render(name, fonts, temp):
    width, height, filename, cover = PRESETS[name]
    output = OUTPUT / filename
    if name == 'status-lite':
        source = OUTPUT / PRESETS['vertical'][2]
        if not source.exists():
            render('vertical', fonts, temp)
        run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', source,
             '-vf', 'scale=720:1280:flags=lanczos,setsar=1', '-an', '-c:v', 'libx264',
             '-preset', 'medium', '-crf', '25', '-threads', '2', '-pix_fmt', 'yuv420p',
             '-movflags', '+faststart', output])
        factor = 2 / 3
        bounds = []
        for scene in SCENES:
            _, items = draw_scene('vertical', scene, fonts)
            bounds.append([{**item, 'rect': [round(n * factor) for n in item['rect']]} for item in items])
        safe = [round(n * factor) for n in LAYOUTS['vertical']['safe']]
    else:
        paths = []
        bounds = []
        for index, scene in enumerate(SCENES):
            image, items = draw_scene(name, scene, fonts)
            path = temp / f'{name}-{index}.png'
            image.save(path)
            paths.append(path)
            bounds.append(items)
        concat = temp / f'{name}.ffconcat'
        # Paths live in a controlled temporary directory; quoted concat entries also support spaces.
        quote = lambda path: str(path).replace("'", "'\\''")
        concat.write_text('ffconcat version 1.0\n' + ''.join(f"file '{quote(p)}'\nduration 3\n" for p in paths)
                          + f"file '{quote(paths[-1])}'\n", encoding='utf8')
        x, y, cw, ch = CROP
        hx, hy, hw, hh = LAYOUTS[name]['hero']
        filters = (f'[0:v]fps=30,format=yuv420p[base];'
                   f'[1:v]crop={cw}:{ch}:{x}:{y},scale={hw}:{hh}:flags=neighbor,fps=30[animal];'
                   f'[base][animal]overlay={hx}:{hy}:shortest=1,setsar=1[out]')
        run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-filter_complex_threads', '1',
             '-f', 'concat', '-safe', '0', '-i', concat, '-i', SOURCE,
             '-filter_complex', filters, '-map', '[out]', '-t', '18', '-an', '-c:v', 'libx264',
             '-preset', 'medium', '-crf', '20', '-threads', '2', '-pix_fmt', 'yuv420p',
             '-movflags', '+faststart', '-color_primaries', 'bt709', '-color_trc', 'bt709',
             '-colorspace', 'bt709', output])
        safe = list(LAYOUTS[name]['safe'])
    result = verify_video(output, name)
    extract(output, 4.2, OUTPUT / cover)
    with Image.open(OUTPUT / cover) as image:
        if image.size != (width, height):
            raise ValueError(f'Incorrect cover dimensions: {cover}')
    result.update({'cover': cover, 'cover_sha256': digest(OUTPUT / cover), 'safe_area': safe, 'text_bounds': bounds})
    print(f'{name}: {width}x{height}, 18s, 30fps, decode PASS, {result["bytes"]:,} bytes', flush=True)
    return result


def extras(fonts, temp):
    carousel = OUTPUT / 'carousel'
    carousel.mkdir(exist_ok=True)
    posters = []
    titles = ['Laba-laba\nbersendi.', 'Kucing\nwireframe.', 'Rubah\ndi terminal.', 'Ubur-ubur\nversi CLI.']
    for index in range(4):
        raw = temp / f'animal-{index}.png'
        extract(SOURCE, index * 3 + 1.2, raw)
        with Image.open(raw) as image:
            x, y, w, h = CROP
            animal = image.crop((x, y, x + w, y + h)).resize((680, 642), Image.Resampling.NEAREST)
        poster, _ = draw_scene('feed', SCENES[index], fonts, titles[index])
        poster.paste(animal, LAYOUTS['feed']['hero'][:2])
        path = carousel / f'{index + 1:02d}-{["spider", "cat", "fox", "jellyfish"][index]}.png'
        poster.save(path)
        posters.append({'file': path.relative_to(OUTPUT).as_posix(), 'width': 1080, 'height': 1350, 'sha256': digest(path)})
    with Image.open(OUTPUT / PRESETS['vertical'][3]) as image:
        safe = image.convert('RGBA')
    shade = Image.new('RGBA', safe.size, (0, 0, 0, 130))
    drawing = ImageDraw.Draw(shade)
    box = LAYOUTS['vertical']['safe']
    drawing.rectangle(box, fill=(0, 0, 0, 0), outline=(244, 86, 224, 255), width=4)
    Image.alpha_composite(safe, shade).convert('RGB').save(OUTPUT / 'safe-area-vertical.png')
    tiles = []
    label_font = ImageFont.truetype(str(fonts['mono']), 22)
    for name, (width, height, _, cover) in PRESETS.items():
        with Image.open(OUTPUT / cover) as image:
            tile = image.copy()
        tile.thumbnail((390, 540), Image.Resampling.LANCZOS)
        panel = Image.new('RGB', (420, 610), BG)
        panel.paste(tile, ((420 - tile.width) // 2, 50))
        ImageDraw.Draw(panel).text((12, 12), f'{name} {width}x{height}', font=label_font, fill=WHITE)
        tiles.append(panel)
    contact = Image.new('RGB', (420 * len(tiles), 610), BG)
    for index, tile in enumerate(tiles):
        contact.paste(tile, (index * 420, 0))
    contact.save(OUTPUT / 'overview.jpg', quality=92)
    return posters


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--preset', choices=['all', *PRESETS], default='all')
    parser.add_argument('--font-dir', type=Path, default=Path('/usr/share/fonts/truetype/dejavu'))
    parser.add_argument('--verify-only', action='store_true')
    args = parser.parse_args()
    if not shutil.which('ffmpeg') or not shutil.which('ffprobe'):
        parser.error('FFmpeg and ffprobe must be installed; no automatic downloads.')
    if args.verify_only:
        for name, (_, _, filename, cover) in PRESETS.items():
            result = verify_video(OUTPUT / filename, name)
            with Image.open(OUTPUT / cover) as image:
                if image.size != PRESETS[name][:2]:
                    raise ValueError(f'Incorrect cover: {cover}')
            print(f'{name}: metadata and full decode PASS ({result["bytes"]:,} bytes)')
        return
    fonts = {face: args.font_dir / filename for face, filename in [
        ('regular', 'DejaVuSans.ttf'), ('bold', 'DejaVuSans-Bold.ttf'), ('mono', 'DejaVuSansMono.ttf')]}
    if any(not path.is_file() for path in fonts.values()):
        parser.error('DejaVu fonts not found; pass --font-dir pointing to the three font files.')
    source = probe(SOURCE)
    video = next(stream for stream in source['streams'] if stream['codec_type'] == 'video')
    if (video['width'], video['height'], video['avg_frame_rate']) != (832, 560, '10/1') or abs(float(source['format']['duration']) - 18) > .01:
        parser.error('Source differs from the measured CLI recording; review crop and scene timing before rendering.')
    OUTPUT.mkdir(parents=True, exist_ok=True)
    names = list(PRESETS) if args.preset == 'all' else [args.preset]
    with tempfile.TemporaryDirectory(prefix='neon-social-') as folder:
        temp = Path(folder)
        results = [render(name, fonts, temp) for name in names]
        if args.preset == 'all':
            posters = extras(fonts, temp)
            manifest = {'source': SOURCE.relative_to(ROOT).as_posix(), 'source_sha256': digest(SOURCE),
                        'source_dimensions': [832, 560], 'source_fps': 10, 'crop_xywh': list(CROP),
                        'duration_seconds': 18, 'render_method': 'local Pillow composition + FFmpeg; source frames repeated to 30fps',
                        'music_and_narration': 'none', 'fonts': {face: path.name for face, path in fonts.items()},
                        'videos': results, 'carousel': posters}
            (OUTPUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf8')
            archive_path = OUTPUT / 'cli-neon-social-pack.zip'
            with zipfile.ZipFile(archive_path, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
                for path in sorted(OUTPUT.rglob('*')):
                    if path.is_file() and path != archive_path:
                        archive.write(path, arcname=Path('cli-neon-social-pack') / path.relative_to(OUTPUT))
            print(f'Pack: {archive_path.relative_to(ROOT)}, {archive_path.stat().st_size:,} bytes', flush=True)


if __name__ == '__main__':
    try:
        main()
    except (OSError, RuntimeError, ValueError, StopIteration) as error:
        raise SystemExit(f'Social render: {error}')
