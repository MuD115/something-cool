"""Bundle Event Horizon into one self-contained HTML file.

Usage: python3 build.py [output path]   (default: event-horizon.html)

The page's own modules are inlined; three.js still loads from jsDelivr, so
the file needs an internet connection but no server. Double-click to open.
"""
import re
import sys
from pathlib import Path

root = Path(__file__).parent
MODULES = ['shader.js', 'audio.js', 'merger.js', 'scope.js', 'sky.js']


def module(name):
    src = (root / 'src' / name).read_text()
    src = re.sub(r"^import [^;]*;\n", '', src, flags=re.M)
    names = re.findall(r"^export (?:const|function|class) (\w+)", src, flags=re.M)
    src = re.sub(r"^export ", '', src, flags=re.M)
    exports = ', '.join(names)
    # Each module gets its own scope so private names can't collide.
    return f"const {{ {exports} }} = (() => {{\n{src}\nreturn {{ {exports} }};\n}})();\n"


main = (root / 'src' / 'main.js').read_text()
imports = [l for l in main.split('\n') if l.startswith('import ') and "'./" not in l]
body = re.sub(r"^import [^;]*;\n", '', main, flags=re.M)
js = '\n'.join(imports) + '\n\n' + ''.join(module(m) for m in MODULES) + '\n' + body

html = (root / 'index.html').read_text()
tag = '<script type="module" src="./src/main.js"></script>'
assert tag in html
html = html.replace(tag, '<script type="module">\n' + js + '\n</script>')

out = Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'event-horizon.html'
out.write_text(html)
print(f'wrote {out} ({len(html) // 1024} KB)')
