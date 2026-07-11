# Companheiro do Mestre

Ferramentas para a sua mesa de RPG: controlador de iniciativa, fichas & status,
personagens, itens mágicos e diário de campanha. Funciona offline (PWA) e salva
tudo no próprio navegador.

Feito com **Vue 3 + Vite + TypeScript + Pinia**.

## Funcionalidades

- **Combate avançado** (aba Iniciativa):
  - Rolagem automática de iniciativa (d20 + bônus da ficha), inclusive "rolar todas" no Novo Combate.
  - Grupos de monstros (campo "Qtd" cria `Goblin 1`, `Goblin 2`...).
  - Contador de **rodadas** e **duração de condições** (decrementam sozinhas e expiram).
  - **Teste de concentração** automático ao aplicar dano (`CD = máx(10, dano/2)`).
  - **HP temporário** e **resistência/vulnerabilidade/imunidade** por tipo de dano.
  - **Ações lendárias** para chefes.
  - **Log de combate** com envio de resumo direto ao Diário.
  - Atalho de teclado: `N` avança o turno.
- **Rolador de dados** flutuante (`d20`, `2d8+3`, `d%`...) com histórico.
- **Modo escuro** (botão no cabeçalho), persistido.
- **Statblocks** completos nas fichas (atributos, CR, ações) e **import do SRD 5e** via [Open5e](https://open5e.com/).
- **Diário**: tags, filtro por tag, linha do tempo e **@menções** clicáveis a personagens/fichas.
- **Tela de Jogador** em janela pop-up separada (read-only, HP em barras) para arrastar a um segundo monitor/TV; espelha o combate ao vivo via `BroadcastChannel` sem travar a tela do mestre.
- **Backup na nuvem** (Google Drive) — veja a configuração abaixo.

## Pré-requisitos

- [Node.js](https://nodejs.org/) 20+ (LTS) — inclui o `npm`

## Rodar em desenvolvimento

```bash
npm install     # 1ª vez ou quando as dependências mudarem
npm run dev      # abre em http://localhost:5173/companheiro-do-mestre/ com hot reload
```

Ao editar arquivos em `src/`, a página recarrega sozinha.

## Gerar a versão de produção

```bash
npm run build    # verifica tipos (vue-tsc) e gera a pasta dist/ (estática, com PWA)
npm run preview  # opcional: testa localmente o resultado do build
```

## Publicar (GitHub Pages)

O deploy é automático: a cada push na branch `main`, o workflow em
[.github/workflows/deploy.yml](.github/workflows/deploy.yml) faz o build e publica
o conteúdo de `dist/` no GitHub Pages.

Para ativar (uma vez): em **Settings > Pages** do repositório, selecione
**Source: GitHub Actions**.

O site é servido em um subcaminho (`/companheiro-do-mestre/`), definido em `base`
no [vite.config.ts](vite.config.ts). Se for hospedar na raiz de um domínio, troque
`base` para `'/'`.

## Testes

```bash
npm test          # roda os testes uma vez (Vitest)
npm run test:watch  # modo observação
```

Os testes cobrem as funções puras em `src/utils/` (dados, combate, menções).

## Backup na nuvem (Google Drive) — opcional

A sincronização usa OAuth do Google e guarda um único arquivo de backup na pasta
privada do app (`appDataFolder`), invisível no Drive do usuário. Para ativar:

1. No [Google Cloud Console](https://console.cloud.google.com/), crie um projeto.
2. Ative a **Google Drive API**.
3. Configure a **tela de consentimento OAuth** (tipo Externo) e adicione seu e-mail
   como usuário de teste.
4. Crie uma credencial **OAuth Client ID** do tipo **Aplicativo da Web** e adicione
   suas origens autorizadas (ex.: `http://localhost:5173` e a URL do GitHub Pages).
5. Crie um arquivo `.env.local` na raiz do projeto:

   ```
   VITE_GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
   ```

6. Rode `npm run dev` (ou `npm run build`). O botão **☁ Nuvem** no cabeçalho passa a
   permitir **Conectar**, **Enviar backup** e **Restaurar**.

Sem essa variável, o botão continua visível, mas apenas informa que a nuvem não foi
configurada — o export/import manual em arquivo `.json` segue funcionando normalmente.

## Estrutura do projeto

```
src/
├── main.ts                # ponto de entrada (monta o app + Pinia)
├── App.vue                # header, navegação e seções
├── types.ts               # tipos de domínio (Campaign, Creature, Ficha, ...)
├── constants.ts           # condições D&D, raridades e cores
├── assets/styles.css      # estilos globais (tema pergaminho)
├── stores/                # campaign (estado + persistência) e settings (tema)
├── composables/           # useIdbStorage (IndexedDB)
├── utils/                 # dice, combat, mentions, open5e, gdrive, highlight, ...
└── components/
    ├── AppHeader.vue, AppNav.vue
    ├── ui/                # BaseModal, ImagePopup, DiceRoller, PlayerView
    └── sections/          # Initiative, Fichas, Personagens, Itens, Diary
```

## Armazenamento e dados

- Os dados ficam no navegador em **IndexedDB** (com fallback para `localStorage`),
  na chave `nc_data` — o mesmo formato da versão anterior, então dados já salvos
  continuam funcionando.
- Use **Exportar/Importar** (no cabeçalho) para backup em arquivo `.json`.
- O ambiente de desenvolvimento (`localhost`) é uma origem separada da produção,
  então os dados de teste não se misturam com os reais.

## Versão anterior

O app original (arquivo único) foi preservado em [legacy/](legacy/) como
referência.
