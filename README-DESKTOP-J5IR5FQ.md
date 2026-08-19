# MemoRY

Aplicação de notas/tarefas com foco em produtividade local, construída com React + TypeScript + Tailwind.

## Tecnologias

- Vite
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Query
- Vitest

## Rodando localmente

Pré-requisitos:

- Node.js 18+
- npm 9+

Instalação e execução:

```sh
npm install
npm run dev
```

## Scripts úteis

- `npm run dev` — inicia ambiente de desenvolvimento
- `npm run build` — gera build de produção
- `npm run preview` — serve build localmente
- `npm run lint` — executa lint
- `npm run test` — executa testes

## Organização de estilos

Os estilos foram organizados em camadas dentro de `src/styles`:

- `base/` — Tailwind directives, tema, tipografia e base global
- `utilities/` — utilitários compartilhados (ex.: marcadores e scrollbar)
- `pages/` — estilos com escopo explícito de página

Todos os estilos são importados centralmente em `src/main.tsx` para manter previsibilidade de carregamento.
