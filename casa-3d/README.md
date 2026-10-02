# Viva Vida Sul em 3D · apartamento e condomínio

Dois passeios 3D interativos, feitos no navegador:

- **Apartamento** (`/`) — apartamento tipo de 2 quartos (36,24 m²): maquete com corte, planta com medidas e passeio em primeira pessoa por todos os cômodos. Dois estilos de decoração, dia/noite, planta espelhável e portas animadas (incluindo uma porta de correr).
- **Condomínio** (`/condominio/`) — o condomínio inteiro: 16 blocos, portaria, estacionamento, piscina, salão de festas, playground, fitness, praças, redário e pet place. Vista aérea, planta e passeio a pé com colisão, dia/noite, minimapa clicável e atalhos para cada área.

**[Ver ao vivo](https://casa-josifias.vercel.app)** · **[Condomínio](https://casa-josifias.vercel.app/condominio/)**

> Ilustração 3D independente, feita a partir da planta e do masterplan de divulgação pública do empreendimento. **Não é material oficial da construtora.** Móveis, decoração e acabamentos mostrados não fazem parte do imóvel entregue — veja a ficha técnica dentro do próprio app.

## Música ambiente

As duas páginas têm um botão **Música** (ou tecla `M`) que toca, em loop e com fade, a *Gymnopédie nº 1* (Erik Satie) na gravação de **Kevin MacLeod** ([incompetech.com](https://incompetech.com)), licenciada sob [Creative Commons Attribution 3.0](https://creativecommons.org/licenses/by/3.0/). O arquivo `musica/gymnopedie-1.mp3` foi convertido do original do Wikimedia Commons para MP3 de 112 kbps (2,6 MB); o crédito também aparece na ficha de cada página. A música só começa depois de um toque/clique (regra dos navegadores) e a preferência fica salva no aparelho.

## Tecnologia

Páginas únicas (`index.html` e `condominio/index.html`), sem backend, sem build step em produção. Usa [Three.js](https://threejs.org/) via CDN ([jsDelivr](https://www.jsdelivr.com/), versão fixada) para toda a modelagem 3D — arquitetura, móveis e texturas são gerados por código, sem assets externos.

## Estrutura

```
casa-3d/
├── index.html      ← apartamento publicado (gerado por build.py)
├── preview.jpg     ← miniatura para redes sociais / WhatsApp
├── build.py        ← concatena src/*.js dentro de src/shell.html (as duas páginas)
├── condominio/
│   ├── index.html  ← condomínio publicado (gerado por build.py)
│   ├── preview.jpg
│   └── src/
│       ├── shell.html     ← HTML, CSS e meta tags
│       ├── 01-core.js     ← implantação: blocos, áreas, pontos do passeio
│       ├── 02-textures.js ← texturas procedurais e materiais
│       ├── 03-helpers.js  ← primitivas, placas, postes, colisão, fusão de geometrias
│       ├── 04-site.js     ← chão, ruas, vizinhança, muro, portaria, prédios
│       ├── 05-site2.js    ← lazer, estacionamento, praças, postes, árvores
│       ├── 06-sky.js      ← céu, sol/lua, sombras, dia/noite
│       ├── 07-player.js   ← caminhar, colisão, olhar, joystick
│       └── 08-app.js      ← modos, minimapa, rótulos, interface, loop
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

Edite os arquivos em `src/` (apartamento) ou `condominio/src/` (condomínio) e gere as páginas:

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

No condomínio:

| Parâmetro | Efeito |
|---|---|
| `?modo=aerea\|planta\|passeio` | abre direto num modo |
| `?local=portaria\|estacionamento\|piscina\|salao\|playground\|fitness\|praca\|jogos\|pet\|redario\|bicicletario\|blocos` | abre o passeio num ponto |
| `?noite=1` | modo noturno |
| `?preview=1` | enquadramento da miniatura, sem interface |
| `?debug=1` | mostra FPS e expõe `window.__condo` para inspeção |

## Deploy

Site estático — qualquer host de arquivos estáticos serve. No [Vercel](https://vercel.com), basta importar o repositório sem configuração adicional; `vercel.json` já define cabeçalhos de segurança básicos (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`).
