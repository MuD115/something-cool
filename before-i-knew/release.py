"""Gather a release of Before I Knew into release/ and zip it.

Usage: python3 release.py

Builds the single file (build.py), then puts it in release/ beside a plain
README.txt and the screenshots in release/shots/ (made by a capture run, see
README.md), and zips the lot as release/before-i-knew.zip.
"""
import subprocess
import sys
import zipfile
from pathlib import Path

root = Path(__file__).parent
out = root / 'release'
shots = out / 'shots'

README = """قبل ما عرفت / Before I Knew
================================

An interactive side-scrolling story about one day in a besieged town in
Ghouta, outside Damascus: 14 August 2014. Sami, 27, walks home with his
closest friend, Ahmad. They part at a junction. Less than an hour later the
world has already changed, and Sami doesn't know it yet.

Four acts, from the afternoon to the next dawn. Three ways through the
evening, and five endings, none of them better than another. About an hour
for one playthrough.

Dialogue is in the Damascus dialect, with English subtitles; menus are in
Modern Standard Arabic and English.

CONTENT NOTE
  Life under military siege, shelling, sniper fire, hunger, the death of a
  friend, grief. Violence is heard and implied, never shown. Recommended for
  ages 16 and over. The characters are fictional. The siege was real.

HOW TO PLAY
  Open before-i-knew.html in a current browser (Chrome, Edge, Firefox,
  Safari). It needs no installation. Online, it loads its typefaces from
  Google Fonts; offline it falls back to system fonts.

  Walk          A / D or arrow keys      (touch: the arrows)
  Run           hold Shift               (touch: tap an arrow twice and hold)
  Jump / climb  Space, W or Up
  Crouch        C or Down
  Go prone      Z
  Interact      E or Enter               (touch: the hand)
  Switch tool   Q or Tab
  Use tool      F (hold F to crank the torch)
  Choose        1 / 2 / 3, or click or tap
  Next line     X or Backspace (hold to keep skipping)
  Menu          Esc or P

  Every key can be rebound under Controls. A gamepad works too. Progress is
  saved in the browser at each checkpoint; Chapters replays any scene you've
  reached.

CREDITS
  Story, design, art, code and sound: made for this project. Everything you
  see is drawn in code and everything you hear is synthesised; there are no
  recordings.
  Motion capture: the CMU Graphics Lab Motion Capture Database
  (mocap.cs.cmu.edu), BVH conversion by Bruce Hahne. The database was created
  with funding from NSF EIA-0196217.
  Typefaces: Aref Ruqaa, IBM Plex Sans Arabic, IBM Plex Sans, IBM Plex Mono and
  Source Serif 4, via Google Fonts (SIL Open Font License).
"""


def main():
    subprocess.run([sys.executable, str(root / 'build.py')], check=True)
    out.mkdir(exist_ok=True)
    game = root / 'before-i-knew.html'
    (out / 'before-i-knew.html').write_bytes(game.read_bytes())
    (out / 'README.txt').write_text(README, encoding='utf-8')
    pics = sorted(shots.glob('*.png')) if shots.exists() else []
    if not pics:
        print('note: no screenshots in release/shots/ yet')
    z = out / 'before-i-knew.zip'
    with zipfile.ZipFile(z, 'w', zipfile.ZIP_DEFLATED) as f:
        f.write(out / 'before-i-knew.html', 'before-i-knew/before-i-knew.html')
        f.write(out / 'README.txt', 'before-i-knew/README.txt')
        for p in pics:
            f.write(p, f'before-i-knew/screenshots/{p.name}')
    print(f'wrote {z.relative_to(root)} ({z.stat().st_size // 1024} KB, {len(pics)} screenshots)')


if __name__ == '__main__':
    main()
