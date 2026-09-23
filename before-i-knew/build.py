"""Bundle A Suit for Burying into one self-contained HTML file.

Usage: python3 build.py [output path]   (default: before-i-knew.html)

Every module under src/ is inlined into a single script. Each module keeps
its own scope, so private names can't collide, and imports become lookups
into the exporting module's namespace object. The result has no external
dependencies apart from Google Fonts, and opens by double-click.
"""
import re
import sys
from pathlib import Path, PurePosixPath

root = Path(__file__).parent
IMPORT = re.compile(r"^import\s+(?:\{([^}]*)\}|\*\s+as\s+(\w+))\s+from\s+'(\.[^']+)';\s*$", re.M)
EXPORT = re.compile(r"^export\s+(?:const|let|function|class)\s+(\w+)", re.M)

modules = {}  # path -> (var name, source)
order = []


def var_for(path):
    return '__' + re.sub(r'\W', '_', str(path).removesuffix('.js'))


def load(path):
    if path in modules:
        return
    src = (root / path).read_text()
    modules[path] = None
    deps = []

    def rewrite(m):
        names, star, rel = m.groups()
        dep = str(PurePosixPath(path).parent.joinpath(rel))
        dep = str(PurePosixPath(*[p for p in PurePosixPath(dep).parts]))
        dep = normalise(dep)
        deps.append(dep)
        if star:
            return f'const {star} = {var_for(dep)};'
        return f'const {{ {names.strip()} }} = {var_for(dep)};'

    body = IMPORT.sub(rewrite, src)
    leftover = re.findall(r"^import .*$", body, re.M)
    assert not leftover, f'{path}: unsupported import {leftover}'
    for dep in deps:
        load(dep)
    names = EXPORT.findall(body)
    body = re.sub(r"^export\s+", '', body, flags=re.M)
    modules[path] = (var_for(path), body, names)
    order.append(path)


def normalise(p):
    parts = []
    for part in p.split('/'):
        if part == '..':
            parts.pop()
        elif part not in ('.', ''):
            parts.append(part)
    return '/'.join(parts)


load('src/main.js')

chunks = []
for path in order:
    var, body, names = modules[path]
    chunks.append(f'// ---- {path}\nconst {var} = (() => {{\n{body}\nreturn {{ {", ".join(names)} }};\n}})();\n')

html = (root / 'index.html').read_text()
tag = '<script type="module" src="./src/main.js"></script>'
assert tag in html
html = html.replace(tag, '<script type="module">\n' + '\n'.join(chunks) + '</script>')

out = Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'before-i-knew.html'
out.write_text(html)
print(f'wrote {out} ({len(html) // 1024} KB, {len(order)} modules)')
