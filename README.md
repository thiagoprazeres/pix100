# Origem100 — PIX Estático Offline

> **PWA 100% offline** para geração e gestão de cobranças via **PIX Estático**, com modelo de dados alinhado à API do **Celcoin**. Funciona sem internet após a primeira instalação — ideal para uso em campo, caixas físicos e pequenos negócios.

---

## ✦ Proposta

O Origem100 é um aplicativo web progressivo (PWA) que roda **integralmente no dispositivo**, sem depender de nenhum servidor em tempo de execução. Toda a persistência é feita via **IndexedDB** (biblioteca `idb`), todo o processamento acontece no browser.

O modelo de dados foi projetado para ser **compatível com a API Celcoin de PIX**: os campos de `Cobranca`, `Pagador` e `EventoConciliacao` espelham os contratos da Celcoin, permitindo integração futura sem refatoração.

---

## 🚀 Funcionalidades

### Perfil do Recebedor
- Cadastro de nome comercial (`merchantName`) e cidade (`merchantCity`) — campos exigidos pelo BR Code.
- Dados persistidos no IndexedDB e restaurados automaticamente na inicialização.

### Chaves Pix
- Suporte a todos os tipos: **CPF, CNPJ, Telefone, E-mail e Chave Aleatória**.
- Máscaras de input via `Maskito` (CPF, CNPJ, Telefone).
- Regras de negócio: apenas uma chave ativa por vez; chaves usadas em cobranças são **arquivadas** (não excluídas); `verificacaoStatus` rastreia confirmação por recebimento.
- Normalização automática de valores (remove formatação antes de gravar).

### Geração de Cobranças (PIX Estático)
- Gera **BR Code** (PIX Copia e Cola) e **QR Code** em Base64 instantaneamente, via `pix-utils`, 100% offline.
- Campos: valor, descrição, vencimento opcional.
- Cada cobrança recebe um `brCodeRef` único (TXID) e um `snapshot` imutável dos dados do recebedor no momento da criação.
- Status: `pendente → paga | expirada | cancelada`.

### Conciliação Manual
- Confirmação, desconfirmação e cancelamento de cobranças com trilha de auditoria completa.
- Expiração automática de cobranças com `vencimento` passado, processada na inicialização.
- **Idempotência garantida**: cada evento tem uma `idempotencyKey` baseada em `cobrancaId + tipo + janela de 1 min`, evitando duplicatas.

### Dados do Pagador (modelo Celcoin)
- Registro manual dos dados do pagador após confirmação, com campos espelhando o payload de confirmação da Celcoin:
  - `nome`, `documento` (CPF/CNPJ), `banco` (ISPB), `nomeBanco`
  - `agencia`, `conta`, `tipoConta` (`CACC | SVGS | TRAN | SLRY` — ISO 20022)
  - `chavePix` do pagador, `endToEndId` (E2EId), `paidAt` (timestamp)
- Preparado para receber dados diretamente de um webhook Celcoin sem mapeamento adicional.

### Histórico e Exportação
- Lista de todas as cobranças com filtro visual por status.
- Exportação para **CSV** com todos os campos relevantes.
- Cópia rápida do BR Code diretamente na listagem.

### Compartilhamento
- **Web Share API** com fallback para clipboard.
- Geração de imagem de ticket (Canvas 2D) com QR Code, valor e dados do recebedor para envio via WhatsApp.
- Download da imagem do ticket.

### PWA / Offline
- Angular Service Worker com cache prefetch de todos os assets de aplicação.
- Funciona 100% offline após a primeira carga — nenhuma chamada de rede em tempo de execução.
- Instalável como app nativo (Add to Home Screen) em iOS e Android.
- Dark Mode nativo via `ThemeService` + atributo `data-mode` do Taiga UI, com preferência persistida no `localStorage`.

---

## 🏗️ Arquitetura

O projeto segue uma **arquitetura em camadas** inspirada em DDD (Domain-Driven Design), com separação clara entre domínio, aplicação e infraestrutura.

```
src/app/
├── domain/                     # Modelos, regras e tipos puros (sem dependências Angular)
│   ├── cobranca/
│   │   ├── cobranca.model.ts   # Cobranca, Pagador, StatusCobranca, TipoConta
│   │   ├── cobranca.rules.ts   # Validação de transições de status
│   │   └── brcode.projection.ts# Sanitização de merchantName/City, geração de brCodeRef
│   ├── chave-pix/
│   │   ├── chave-pix.model.ts  # ChavePix, TipoChave, StatusChave, TipoPessoa
│   │   ├── chave-pix.normalizer.ts  # Normalização de valores por tipo
│   │   └── chave-pix.rules.ts  # Validação, unicidade, regras de remoção/arquivamento
│   ├── conciliacao/
│   │   ├── evento-conciliacao.model.ts  # EventoConciliacao, TipoEvento, OrigemEvento
│   │   └── conciliacao.rules.ts         # idempotencyKey, mapeamento tipo→status
│   └── perfil/
│       └── perfil.model.ts     # Perfil (merchantName, merchantCity)
│
├── application/                # Casos de uso — orquestram domínio + storage + signals
│   ├── perfil.service.ts       # CRUD de perfil + cascade delete
│   ├── chave-pix.service.ts    # Gestão de chaves com regras de negócio
│   ├── cobranca.service.ts     # Geração, expiração, registro de pagador
│   └── conciliacao.service.ts  # Aplicação de eventos de conciliação com idempotência
│
├── infrastructure/
│   ├── storage/
│   │   ├── storage.port.ts     # Interface abstrata de persistência
│   │   ├── idb.storage.ts      # Implementação IndexedDB (idb) com reconnect para iOS Safari
│   │   └── migration.service.ts# Migração de localStorage v1/v2 → IndexedDB
│   └── brcode/
│       └── pix-utils.adapter.ts# Adapter para a biblioteca pix-utils
│
├── pages/
│   ├── perfil/                 # Cadastro do recebedor
│   ├── chaves/                 # Gerenciamento de chaves Pix
│   ├── pix/                    # Formulário de nova cobrança
│   ├── pix-details/            # Detalhes, conciliação e dados do pagador
│   └── historico/              # Histórico e exportação CSV
│
└── guards/
    └── perfil-guard.ts         # Redireciona para /perfil se não há cadastro
```

---

## 🗄️ Banco de dados (IndexedDB)

**Nome do banco:** `origem100` | **Versão:** 1

| Store | Key | Índices |
|---|---|---|
| `perfil` | `id` | — |
| `chaves_pix` | `id` | `perfilId`, `status` |
| `cobrancas` | `id` | `perfilId`, `chavePixId`, `statusAtual`, `criadaEm` |
| `eventos_conciliacao` | `id` | `cobrancaId`, `timestamp`, `idempotencyKey` (unique) |

A conexão com o IndexedDB usa um mecanismo de **reconnect automático** para lidar com o fechamento silencioso de conexões no iOS Safari.

---

## 📐 Modelo de dados principal

### `Cobranca`
```typescript
interface Cobranca {
  id: string;               // UUID interno
  brCodeRef: string;        // TXID do BR Code (≤ 25 chars, alphanum)
  perfilId: string;
  chavePixId: string;
  snapshot: SnapshotCobranca; // Dados do recebedor no momento da criação (imutável)
  valor: number;
  descricao?: string;
  vencimento?: number;      // timestamp ms
  statusAtual: StatusCobranca;
  brcode: string;           // PIX Copia e Cola
  qrBase64?: string;        // QR Code como data URL
  pagador?: Pagador;        // Dados do pagador (modelo Celcoin)
  criadaEm: number;
  atualizadaEm: number;
  providerRef?: string;     // Referência futura de provider (ex: Celcoin transactionId)
}
```

### `Pagador` (alinhado ao payload Celcoin)
```typescript
interface Pagador {
  nome: string;
  documento: string;        // CPF ou CNPJ
  banco: string;            // ISPB (ex: "341" = Itaú)
  nomeBanco?: string;
  agencia?: string;
  conta?: string;
  tipoConta?: 'CACC' | 'SVGS' | 'TRAN' | 'SLRY'; // ISO 20022
  chavePix?: string;
  endToEndId?: string;      // E2EId da transação Pix
  paidAt: number;           // timestamp ms do pagamento
}
```

### `EventoConciliacao`
```typescript
type TipoEvento =
  | 'criada'
  | 'confirmada_manualmente'
  | 'desconfirmada'
  | 'expirada_automaticamente'
  | 'cancelada'
  | 'pagador_registrado';
```

---

## 🛠️ Tecnologias

| Tecnologia | Versão | Uso |
|---|---|---|
| [Angular](https://angular.dev/) | 21 | Framework — Standalone Components + Signals |
| [Tailwind CSS](https://tailwindcss.com/) | 4 | Estilização utilitária |
| [Taiga UI](https://taiga-ui.dev/) | 4 | Componentes UI (botões, badges, inputs, notificações, switches, radios) |
| [Ionic](https://ionicframework.com/) | 8 | Componentes mobile (tab bar, spinner, toast) |
| [idb](https://github.com/jakearchibald/idb) | 8 | IndexedDB com suporte a TypeScript |
| [pix-utils](https://github.com/vagnercardosoweb/pix-utils) | 2 | Geração de BR Code e QR Code offline |
| [Maskito](https://maskito.dev/) | 5 | Máscaras de input (CPF, CNPJ, Telefone) |
| @angular/service-worker | 21 | PWA / cache offline |

---

## 🖥️ Como rodar localmente

```bash
npm install
ng serve
```

Acesse `http://localhost:4200`. O Service Worker é desabilitado em modo dev — use o build de produção para testar o comportamento offline.

### Build de produção

```bash
ng build --configuration production
```

Output em `dist/pix100/`. Para testar o PWA localmente com SW ativo:

```bash
npx http-server dist/pix100 -p 8080
```

---

## 🔮 Roadmap / Integração futura com Celcoin

O modelo de dados foi desenhado para suportar uma integração futura com a **API Celcoin de PIX Estático** sem refatoração:

- `Cobranca.providerRef` → receberá o `transactionId` da Celcoin após criação remota
- `Pagador` → campos mapeados diretamente do webhook de confirmação de pagamento Celcoin
- `EventoConciliacao` com `origem: 'sistema'` → reservado para eventos vindos do webhook
- `idempotencyKey` → compatível com o padrão de idempotência da Celcoin
