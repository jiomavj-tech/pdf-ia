# Repetidor de legendas

Serviço pequeno que vai buscar ao YouTube a legenda de um vídeo, ou a lista de
vídeos de uma playlist, e devolve tudo ao conversor com os cabeçalhos que o
navegador exige. Um ficheiro, sem dependências.

Com ele ligado, o separador **YouTube** passa a funcionar assim: colar o link →
**Buscar** → **Converter**. Sem ele, é preciso colar a transcrição à mão — o que
continua a funcionar e continua a ser o modo por omissão.

## Porque é preciso

A página do conversor não consegue falar com o YouTube. A página `/watch` não
devolve cabeçalho CORS nenhum, e o endereço antigo de legendas
(`/api/timedtext`) responde vazio desde que passou a exigir parâmetros
assinados. Qualquer navegador bloqueia as duas coisas. Um serviço do lado do
servidor não tem essa limitação, e é ele que devolve o CORS.

## Antes de instalar, leia isto

**O YouTube trata pedidos vindos de datacenter como robôs.** Responde
`LOGIN_REQUIRED` — «faça login para confirmar que você não é um bot» — a uma
parte dos pedidos, e a proporção piora quanto mais se pede do mesmo endereço.

Medido a partir de uma máquina de nuvem, com pausa de 8 s entre pedidos e vídeos
diferentes: **4 em 6**. Martelando o mesmo vídeo de 2 em 2 segundos: **3 em 10**.

O repetidor faz o que dá para reduzir isso:

- **Vários clientes em cadeia** — tenta a API interna como iOS, depois Android,
  depois Android VR, e só então lê a página `/watch`. Qual deles passa muda ao
  longo do dia.
- **Cache de 24 h** — uma legenda já obtida não é pedida outra vez. Converter a
  mesma playlist duas vezes não volta a arriscar bloqueio.
- **Cookie opcional** — com a sessão de uma conta, passa quase sempre.

Mesmo assim, conte com «tente outra vez» de vez em quando. O app diz qual vídeo
falhou e porquê, e o botão **Buscar todas** pode ser carregado de novo: os que já
têm legenda não são pedidos outra vez.

**Se falhar muito, corra o repetidor em casa** (ver abaixo). A ligação doméstica
não sofre do mesmo problema na mesma medida.

## Correr no seu computador

Não precisa de conta em lado nenhum e é o caminho mais fiável.

```bash
node repetidor/local.mjs
```

No app, separador **Nível profissional**, campo do repetidor:

```
http://127.0.0.1:8787/?url={url}
```

O app tem de estar aberto por `http://` ou `https://`. Aberto por `file://` o
navegador recusa o pedido, porque a origem de um ficheiro local é `null`.

## Publicar no Cloudflare Workers

O plano grátis chega bem (100 mil pedidos por dia).

```bash
npm install -g wrangler
wrangler login
cd repetidor
wrangler deploy
```

O `wrangler.toml` já está aqui. No fim ele imprime o endereço; no app, cole:

```
https://SEU-WORKER.workers.dev/?url={url}
```

### Cookie da sessão (opcional, melhora muito)

```bash
wrangler secret put YT_COOKIE
```

Cole o cabeçalho `Cookie` de um pedido autenticado ao youtube.com (nas
ferramentas de programador do navegador, separador Rede). Fica guardado como
segredo do Worker, nunca no código.

**Pense antes de o fazer.** É a sessão da sua conta: quem tiver o endereço do
Worker passa a pedir legendas em nome dela. Use uma conta secundária, não a
principal, e nunca ponha o cookie num repositório.

## O que devolve

`GET /?url=<endereço do YouTube>&lang=pt`

Vídeo:

```json
{ "tipo": "video", "videoId": "...", "titulo": "...", "canal": "...",
  "duracao": 1193, "idioma": "pt", "automatica": true,
  "idiomas": [{ "codigo": "pt", "nome": "Português", "automatica": true }],
  "formato": "json3", "legenda": "..." }
```

Playlist:

```json
{ "tipo": "playlist", "playlist": "PL...", "titulo": "...",
  "videos": [{ "videoId": "...", "titulo": "...", "duracao": 54 }] }
```

Erro:

```json
{ "erro": "texto explicativo", "codigo": "youtube-bloqueou" }
```

Códigos: `endereco-invalido`, `sem-url`, `sem-legenda`, `indisponivel`,
`youtube-bloqueou`, `legenda-falhou`, `legenda-vazia`, `playlist-vazia`,
`youtube-recusou`.

O conversor também aceita um repetidor que devolva apenas o texto da legenda,
sem JSON — só perde o título, o canal e a expansão de playlist.

## Segurança

Só aceita identificadores de vídeo e de playlist do YouTube, extraídos por
expressão regular do que vem no parâmetro. **Não repete endereço arbitrário** —
sem isso seria um proxy aberto, e qualquer pessoa o usaria para alcançar redes
privadas a partir do seu Worker.

O que fica exposto é a lista de vídeos que você converte. Se isso incomodar,
corra-o em casa em vez de o publicar.

## Limites

- Playlist: 200 vídeos por pedido, em até 12 páginas.
- Vídeo privado, apagado ou com restrição de idade não tem como ser lido.
- Vídeo sem legenda nenhuma publicada devolve `sem-legenda` — não há o que
  converter, e nenhum repetidor resolve isso.
