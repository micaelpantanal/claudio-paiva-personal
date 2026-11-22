# Claudio Paiva · Personal Trainer

Site de apresentação do Claudio Paiva, Personal Trainer e Consultor Esportivo (CREF 071118-G/RJ).
O cliente conhece o trabalho, vê os planos e, com um toque, cai direto no WhatsApp com a mensagem já escrita.

**Site no ar:** <https://claudiopaiva.web.app/>

Site estático (HTML + CSS + JavaScript puro): não precisa de build, banco de dados nem servidor pago.

## Estrutura

```
index.html              → todo o conteúdo do site
assets/css/style.css    → identidade visual (cores, fontes, layout)
assets/js/main.js       → links do WhatsApp, menu mobile, animações
assets/img/             → logo, fotos, ícones e imagem de compartilhamento
assets/img/originais/   → arquivos originais (logo em JPG)
gestao/                 → sistema de gestão do Claudio (veja "Sistema de gestão")
firestore.rules         → quem pode entrar na gestão (fica só no computador; modelo em firestore.rules.exemplo)
```

## Seções

1. **Início**: nome, CREF, chamada para os planos e WhatsApp
2. **Sobre**: bio, formação e pós-graduação
3. **Trajetória**: números (anos de experiência, título INBA, faixa preta) e missão
4. **Planos**: Presencial, Silver Starter (R$ 140/mês) e Gold Premium (R$ 300/mês), cada um abre o WhatsApp com mensagem própria
5. **Consultoria online**: itens inclusos e o passo a passo para começar
6. **Resultados**: antes e depois
7. **Dúvidas**: perguntas frequentes
8. **Contato**: WhatsApp, telefone, Instagram (@claudiopersonalteam), CREF

## Como editar

| Quero mudar... | Onde |
| --- | --- |
| Número do WhatsApp | `assets/js/main.js` → `const WHATSAPP` (formato `55` + DDD + número) |
| Mensagem que chega no WhatsApp | atributo `data-wa="..."` do botão no `index.html` |
| Preço de um plano | `index.html` → procure `plan-price` |
| Cores | `assets/css/style.css` → variáveis no topo (`:root`) |
| Fotos | substitua o arquivo em `assets/img/` mantendo o mesmo nome |

Os "anos de experiência" e o ano do rodapé são calculados automaticamente (desde 1992).

## Rodar no computador

```powershell
python -m http.server 5500
```

Depois abra <http://localhost:5500>.

## Publicar (Firebase Hosting)

O site fica no Firebase Hosting, projeto `claudiopaiva`, no endereço <https://claudiopaiva.web.app>.
O GitHub guarda o código; o Firebase publica o site.

Instale o Firebase CLI uma vez:

```powershell
npm.cmd install -g firebase-tools
firebase login
```

Para publicar uma alteração (na pasta do projeto):

```powershell
firebase deploy --only hosting
```

O que vai para o ar e o cache de cada tipo de arquivo estão em `firebase.json`.
Se o endereço mudar (ex.: domínio próprio), atualize no `index.html` o `canonical`, `og:url` e `og:image`
para a prévia continuar aparecendo quando o link for enviado no WhatsApp.

Para usar um domínio próprio (ex.: `claudiopaiva.com.br`): Firebase Console → Hosting → **Add custom domain**.

## Sistema de gestão (`/gestao`)

Área interna para o Claudio controlar clientes, planos e mensalidades: <https://claudiopaiva.web.app/gestao/>
Não tem link no site, não aparece no Google e só entra a conta Google autorizada.

**O que faz**

- **Painel:** quanto já recebeu no mês, quanto falta, quem está atrasado, quem vence nos próximos 7 dias e a receita por plano
- **Clientes:** cadastro com plano, valor combinado, dia do vencimento, objetivo, origem e observações de saúde; pausar, cancelar e reativar
- **Cobranças:** a mensalidade de cada cliente ativo é criada sozinha todo mês. "Recebi" registra o pagamento (Pix, dinheiro ou cartão) e "Cobrar" abre o WhatsApp do aluno com a mensagem pronta
- **Planos:** preço e quantos alunos e quanto rende cada plano. Mudar o preço não altera o valor de quem já é aluno
- **Ajustes:** chave Pix, textos das mensagens de cobrança e backup dos dados
- Instala no celular como app (Chrome: *Instalar app* · iPhone/Safari: *Adicionar à Tela de Início*)

**Modo demonstração:** `/gestao/?demo` abre com dados de exemplo (nomes fictícios), salvos só no navegador.
Bom para mostrar o sistema sem mexer nos dados de verdade.

### Como está ligado ao Firebase

- **Banco de dados:** Cloud Firestore do projeto `claudiopaiva`.
- **Login:** conta Google (Authentication → Método de login → Google).
- **Chaves do app:** app Web “Gestao”, em `gestao/js/firebase-config.js`. Elas podem ficar no código e no site: quem protege os dados são as regras.
- **Quem pode entrar:** só os e-mails listados em `firestore.rules`. Qualquer outra conta vê “não tem acesso”.
  Esse arquivo **não vai para o GitHub** (o repositório é público e os e-mails ficariam expostos).
  O modelo é `firestore.rules.exemplo`: em outro computador, copie como `firestore.rules` e coloque os e-mails.

Para liberar ou tirar alguém, edite a lista em `firestore.rules` e publique as regras:

```powershell
firebase deploy --only firestore:rules
```

Para publicar o site e o sistema juntos com as regras:

```powershell
firebase deploy --only "firestore:rules,hosting"
```

No primeiro acesso, o sistema cria sozinho os 3 planos (Presencial, Silver Starter R$ 140 e Gold Premium R$ 300).
Para testar o login no computador, abra pelo endereço `http://localhost:...` (não `127.0.0.1`), que já é autorizado no Firebase.

### Arquivos

```
gestao/index.html              → página do sistema (ícones e estrutura)
gestao/app.css                 → visual (mesma identidade do site)
gestao/js/app.js               → telas e botões
gestao/js/store.js             → dados: planos, clientes, mensalidades, cálculos e dados de exemplo
gestao/js/util.js              → dinheiro, datas, telefone e WhatsApp
gestao/js/firebase-config.js   → chaves do Firebase (app Web "Gestao")
firestore.rules                → quem pode entrar (só no computador, fora do GitHub)
firestore.rules.exemplo        → modelo do firestore.rules
```

Valores ficam guardados em centavos (ex.: R$ 140,00 = `14000`). Cada mensalidade tem o código `cliente_AAAA-MM`,
então o sistema nunca cria duas para o mesmo mês.

## Pendências

- [ ] Conseguir as fotos originais de antes e depois (as atuais foram recortadas do cartão)
- [ ] Informar onde é o atendimento presencial (bairro ou academia)
- [ ] Gestão, próximas fases: despesas e lucro, gráfico dos últimos meses, Pix com QR code, recibo, aniversariantes, avaliações físicas
