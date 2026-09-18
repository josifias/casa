"""Gera index.html juntando src/shell.html com os módulos JS de src/ (ordem pelo nome)."""
from pathlib import Path

here = Path(__file__).parent
src = here / "src"
js = "\n".join(p.read_text(encoding="utf-8") for p in sorted(src.glob("[0-9][0-9]-*.js")))
shell = (src / "shell.html").read_text(encoding="utf-8")
out = shell.replace("/*__JS__*/", js)
(here / "index.html").write_text(out, encoding="utf-8")
print(f"index.html gerado ({len(out) // 1024} KB)")
