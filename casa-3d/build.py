"""Gera as páginas juntando cada src/shell.html com os módulos JS da mesma pasta (ordem pelo nome).

- src/              -> index.html             (apartamento)
- condominio/src/   -> condominio/index.html  (condomínio)
"""
from pathlib import Path

here = Path(__file__).parent


def build(out_dir: Path) -> None:
    src = out_dir / "src"
    js = "\n".join(p.read_text(encoding="utf-8") for p in sorted(src.glob("[0-9][0-9]-*.js")))
    shell = (src / "shell.html").read_text(encoding="utf-8")
    out = shell.replace("/*__JS__*/", js)
    (out_dir / "index.html").write_text(out, encoding="utf-8")
    print(f"{(out_dir / 'index.html').relative_to(here)} gerado ({len(out) // 1024} KB)")


build(here)
build(here / "condominio")
