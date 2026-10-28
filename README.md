# VELOCITY / Motoca

Loja conceito de motos com experiência 3D, identidade amarela, vitrine de 12 modelos atuais e radar conectado a publicações oficiais dos fabricantes.

## Executar

Requer Node.js 24. Não utiliza dependências externas de servidor.

```text
npm ci
npm test
npm run build
npm start
```

Abra `http://localhost:10000`. Para outra porta, defina `PORT`.

## Render

Publique como **Web Service**, runtime **Node**, branch `main`.

- Build: `npm ci && npm test && npm run build`
- Start: `npm start`
- Plano: `free`
- Saúde: `/healthz`
- Node: versão 24, declarada em `.node-version` e `package.json`

O processo escuta em `0.0.0.0:$PORT`, preserva a API e encerra de forma controlada com SIGTERM. A implantação direta pelo Render permite atualização automática a partir da branch `main` quando o provedor Git está conectado. O plano gratuito pode hibernar após inatividade.

## Estrutura

- `frontend/`: HTML, CSS, JavaScript, Three.js, fontes e imagens locais.
- `scripts/server.mjs`: servidor HTTP para Render e execução local.
- `scripts/check-site.mjs`: confere sintaxe, módulos, imagens e dados necessários.
- `worker/api.mjs`: serviço compartilhado que consulta fontes oficiais de Honda, Yamaha, Shineray e BMW.
- `data/launches-snapshot.json`: seleção verificada usada e identificada quando uma fonte falha.
- `tests/`: testes de agregação, cache, falhas, rotas HTTP e proteção de arquivos.

## API

`GET /api/launches` retorna comunicados dos últimos 366 dias. O parâmetro `brand` aceita `Honda`, `Yamaha`, `Shineray` ou `BMW`.

O servidor mantém cache por até 15 minutos. A página renova a consulta a cada 15 minutos enquanto estiver aberta. `fetchedAt` informa quando a consulta ocorreu; `sources` informa se cada origem respondeu ou se foi usada uma seleção de referência. As datas dos cartões são as datas originais de publicação. Nenhuma chave externa é necessária.

Os endpoints públicos dos fabricantes podem mudar e exigem manutenção dos parsers. O radar é uma agregação independente, sem vínculo comercial declarado com os fabricantes.

## Conteúdo comercial

A vitrine é informativa e não representa estoque ou oferta comercial. Fotos e especificações têm links para suas fontes oficiais. Não foram inventados preços, quilometragens de unidades, contatos ou endereço. O formulário prepara um resumo local; não envia dados, não cria reservas e não constitui proposta comercial. Preencha os dados reais da loja e integre o atendimento antes de operar comercialmente.

As fontes tipográficas e o Three.js incluem suas licenças em `frontend/assets/`. Marcas e fotografias de divulgação pertencem aos respectivos titulares.
