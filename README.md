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
```

## Seções

1. **Início**: nome, CREF, chamada para os planos e WhatsApp
2. **Sobre**: bio, formação e pós-graduação
3. **Trajetória**: números (anos de experiência, título INBA, faixa preta) e missão
4. **Planos**: Presencial, Silver Starter (R$ 140/mês) e Gold Premium (R$ 240/mês), cada um abre o WhatsApp com mensagem própria
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

## Pendências

- [ ] Conseguir as fotos originais de antes e depois (as atuais foram recortadas do cartão)
- [ ] Informar onde é o atendimento presencial (bairro ou academia)
