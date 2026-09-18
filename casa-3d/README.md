# Apartamento 3D · 2 quartos

Passeio 3D interativo, feito no navegador, de um apartamento tipo de 2 quartos (36,24 m²) do empreendimento Viva Vida Sul — maquete com corte, planta com medidas, e um passeio em primeira pessoa por todos os cômodos. Dois estilos de decoração alternáveis, ciclo dia/noite, planta espelhável e portas animadas (incluindo uma porta de correr).

**[Ver demo ao vivo](#)** — link do Vercel

> Ilustração 3D independente, feita a partir da planta de divulgação pública do empreendimento. **Não é material oficial da construtora.** Móveis, decoração e acabamentos mostrados não fazem parte do imóvel entregue — veja a ficha técnica dentro do próprio app.

## Tecnologia

Página única (`index.html`), sem backend, sem build step em produção. Usa [Three.js](https://threejs.org/) via CDN ([jsDelivr](https://www.jsdelivr.com/), versão fixada) para toda a modelagem 3D — arquitetura, móveis e texturas são gerados por código, sem assets externos.

## Estrutura

```
casa-3d/
├── index.html      ← arquivo publicado (gerado por build.py)
├── preview.jpg     ← miniatura para redes sociais / WhatsApp
├── build.py        ← concatena src/*.js dentro de src/shell.html
└── src/
    ├── shell.html      ← HTML, CSS e meta tags
    ├── 01-core.js      ← config, medidas, texturas procedurais
    ├── 02-materials.js ← materiais, temas, helpers de geometria
    ├── 03-arch.js      ← paredes, portas, janelas, teto
    ├── 04-rooms-a.js   ← sala, entrada, cozinha, serviço
    ├── 05-rooms-b.js   ← banheiro, quarto casal, quarto infantil
    ├── 06-app.js       ← cena, câmeras, colisão, passeio
    └── 07-ui.js        ← interface, entrada, loop de renderização
```

## Desenvolvimento

Edite os arquivos em `src/` e gere o `index.html`:

```bash
python build.py
```

Depois abra `index.html` direto no navegador (funciona via `file://`), ou sirva localmente:

```bash
python -m http.server 8000
```

### Parâmetros de URL úteis para testes

| Parâmetro | Efeito |
|---|---|
| `?modo=maquete\|planta\|passeio` | abre direto num modo |
| `?comodo=sala\|cozinha\|servico\|banheiro\|casal\|infantil\|entrada` | abre direto num cômodo |
| `?estilo=tour\|fotos` | escolhe o estilo de decoração |
| `?espelho=1` | planta espelhada |
| `?noite=1` | modo noturno |
| `?debug=1` | mostra FPS e expõe `window.__casa` para inspeção |

## Deploy

Site estático — qualquer host de arquivos estáticos serve. No [Vercel](https://vercel.com), basta importar o repositório sem configuração adicional; `vercel.json` já define cabeçalhos de segurança básicos (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`).
