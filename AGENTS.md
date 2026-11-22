# Claudio Paiva · Personal Trainer — regras para agentes de IA

Este arquivo é lido pelo Antigravity (e pelo Claude Code, via `CLAUDE.md`). Vale para o projeto inteiro.

Dois sistemas na mesma pasta, no mesmo Git (repositório **público** no GitHub) e no mesmo Firebase (projeto `claudiopaiva`):

| | Site | Gestão |
| --- | --- | --- |
| Arquivos | `index.html`, `assets/` | `gestao/` |
| No ar | https://claudiopaiva.web.app | https://claudiopaiva.web.app/gestao |
| Quem usa | qualquer pessoa | só contas Google autorizadas |

Sem build e sem npm: HTML, CSS e JavaScript puro (módulos ES direto no navegador).
Não adicionar framework, bundler ou dependência sem o dono do projeto pedir.
O `README.md` explica a estrutura e tem a lista de pendências.

## Idioma e visual

- Interface, comentários, commits e respostas em **português do Brasil**, com linguagem simples (o Claudio não é técnico).
- Identidade: preto + azul cromado; prata e ouro nos planos; fontes Teko (títulos e números) e Manrope.
  As cores ficam em variáveis no topo de `assets/css/style.css` e `gestao/app.css`.
- Celular primeiro: tudo tem que funcionar em 375 px de largura, sem rolagem para os lados.

## Rodar e testar

```powershell
python -m http.server 5500
```

- Site: http://localhost:5500
- Gestão: http://localhost:5500/gestao/
- Gestão com dados de exemplo: http://localhost:5500/gestao/?demo

**Teste sempre em `?demo`.** A gestão rodando no computador usa o banco de dados REAL.
Nunca entre com Google para testar e nunca crie dados de teste no Firestore.
O login Google só funciona em `localhost` (não em `127.0.0.1`).
Depois de mudar JS ou CSS, recarregue sem cache.

## Gestão: como funciona

- `gestao/js/app.js`: telas e botões · `store.js`: dados, regras de negócio e dados de exemplo · `util.js`: dinheiro, datas, telefone · `firebase-config.js`: chaves do Firebase.
- Firestore: coleções `planos`, `clientes`, `mensalidades` e o documento `config/geral`.
- **Dinheiro sempre em centavos, número inteiro** (R$ 140,00 = `14000`).
- Datas em texto `AAAA-MM-DD` e meses em `AAAA-MM`, no horário do aparelho.
- O id da mensalidade é sempre `<idDoCliente>_<AAAA-MM>`: é isso que impede cobrar duas vezes o mesmo mês. Não mude o formato.
- As mensalidades são criadas sozinhas, todo mês, para clientes ativos, a partir de `cobrarDesde`.
- Situações da mensalidade: `aberta`, `paga`, `cancelada`. "Atrasada" não é gravada: é calculada (aberta e vencida).
- Situações do cliente: `ativo`, `pausado`, `cancelado`. Cancelar guarda o histórico; excluir apaga.
- Mudar o preço de um plano não altera quem já é aluno: o valor de cada um fica no cliente.
- O Firestore não aceita `undefined`: use `null`.
- A cobrança pelo WhatsApp é um link `wa.me` com mensagem pronta. Não existe envio automático.

## Site

- O preço de cada plano aparece em 3 lugares no `index.html`: o card (`plan-price`), a mensagem `data-wa` do botão e o `priceRange` do JSON-LD.
  Mudou preço? Mude também em `gestao/js/store.js` (`PLANOS_PADRAO` e dados de exemplo) e no `README.md`.
- Número do WhatsApp do site: `assets/js/main.js` (`const WHATSAPP`).

## Segurança e privacidade (obrigatório)

- `firestore.rules` tem os e-mails autorizados e fica **fora do Git** (`.gitignore`), porque o repositório é público.
  Nunca faça commit dele e nunca coloque e-mails em arquivos versionados ou publicados. O modelo é `firestore.rules.exemplo`.
- Quem protege os dados são as regras do Firestore. As chaves de `firebase-config.js` são públicas mesmo.
- Os dados dos alunos incluem informações de saúde (dados sensíveis pela LGPD): não registre em log, não exporte e não envie para serviços externos.
- Dados de exemplo usam só nomes e telefones fictícios (`(21) 90000-00xx`).

## Publicar

```powershell
firebase deploy --only hosting            # site + gestão
firebase deploy --only firestore:rules    # só quando mudar quem pode entrar
```

- Antes de publicar: teste no navegador, no tamanho de celular e de computador, sem erros no console.
- Só faça commit, push ou deploy quando o dono do projeto pedir.
- Os arquivos que não vão para o ar estão em `hosting.ignore`, no `firebase.json`.
- Cuidado com `redirects` no `firebase.json`: um redirect de `/gestao` para `/gestao/` já deixou a página em loop.
  Por isso os caminhos da gestão são absolutos (`/gestao/...` e `/assets/...`).

## Git

- Commits pequenos, com mensagem em português no imperativo ("Adiciona…", "Corrige…", "Muda…").
- Antigravity e Claude Code são usados no mesmo projeto: faça commit antes de trocar de ferramenta e não edite os mesmos arquivos ao mesmo tempo.
