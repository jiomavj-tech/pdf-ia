# PDF → IA — offline

Converte PDFs e transcrições de vídeo em texto puro (`.txt`) ou Markdown (`.md`)
**inteiramente dentro do navegador**. Nenhum arquivo é enviado para lugar nenhum: não há
servidor, não há upload, não há conta.

É um arquivo HTML só. Dá para usar direto do celular, do computador, ou até em modo avião.

Três separadores:

| Separador | O que faz |
|---|---|
| **PDF** | Um ou muitos PDFs, uma pasta ou um `.zip` viram `.txt` ou `.md` |
| **YouTube** | Legenda de vídeo ou de playlist vira Markdown limpo e etiquetado, com um atalho que a vai buscar |
| **Nível profissional** | Regula a limpeza da fala e a estruturação da saída |

## Para que serve

Mandar um PDF para uma IA custa caro porque o arquivo carrega fontes, imagens e estrutura
que o modelo não precisa. Extrair o texto antes reduz muito o tamanho — e o Markdown ainda
preserva títulos, listas e tabelas, que ajudam o modelo a entender o documento.

## Como usar — PDF

Abra a página, escolha os PDFs (ou uma pasta inteira), confira a lista e aperte **Converter**.

- **Escolher PDFs** — um ou vários de uma vez
- **Escolher pasta** — pega todo PDF lá dentro, inclusive em subpastas
- **Arquivo .zip** — abre o zip e converte os PDFs de dentro
  (é o caminho no iPhone, onde o Safari não deixa escolher pastas)

Antes de converter, a lista de espera deixa remover arquivos, ordenar por nome e ir somando
mais. Depois, cada PDF vira um arquivo separado, com opção de baixar tudo num `.zip`
ou juntar num arquivo só.

### Opções

| Opção | O que faz |
|---|---|
| `.txt` / `.md` | Texto puro ou Markdown com títulos, listas e tabelas |
| Intervalo de páginas | Converte só um trecho, por exemplo `1-5, 12` |
| Juntar parágrafos | Emenda linhas quebradas no meio da frase (só `.txt`) |
| Marcar número de página | Insere uma marca a cada página |
| Enxugar espaços | Remove espaçamento excessivo |
| Limpar cabeçalhos e rodapés | Remove o título corrente e o «Página 3 de 40» repetidos |
| Dividir em blocos | Reparte a saída em ficheiros de ~8, 32 ou 100 mil tokens |

### Limpeza para IA

Três coisas que gastam tokens e confundem modelos, tratadas automaticamente:

**Cabeçalhos e rodapés repetidos.** Detetados por repetição nas primeiras e últimas
linhas de cada página. Para não apagar conteúdo, exige três condições: tamanho de letra
não maior que o corpo (um título de secção é maior e sobrevive), mesma altura na página, e
presença em pelo menos 60% das folhas. Os dígitos só são normalizados em linhas com até 25
caracteres — o suficiente para «Página 1 de 6» igualar «Página 5 de 6», sem colapsar
frases de corpo que apenas diferem num número. O app diz quantas linhas removeu, e a opção
pode ser desligada.

**Palavras cortadas por hífen.** `cons-\ntrução` volta a ser `construção`, nos dois
formatos, incluindo o hífen suave invisível (U+00AD). Assumida uma limitação: compostos
legitimamente hifenizados que caiam no fim da linha (`guarda-chuva`) ficam juntos —
distingui-los exigiria um dicionário.

**Divisão em blocos.** Os cortes caem em fronteiras de parágrafo, nunca no meio de uma
frase, e só se parte à força um parágrafo maior que o bloco inteiro. Cada ficheiro leva no
topo o nome do documento e a posição (`bloco 2 de 7`), para o modelo saber o que está a
ler. Sai um `.zip` com as partes.

## Como usar — YouTube

Cole o link do vídeo (ou da playlist, ou vários links de uma vez, um por linha), depois cole
a transcrição de cada um. No YouTube ela sai em **…mais → Mostrar transcrição**, selecionar
tudo e copiar. Também aceita ficheiros de legenda largados na página: `.srt`, `.vtt`,
`.json3`, `.srv3`, `.ttml` e `.sbv`, vários ao mesmo tempo — é o caminho para uma playlist
inteira de uma vez.

Cada vídeo sai num `.md` próprio, com nome previsível (`titulo-do-video-ID.md`). Vários
saem num `.zip`, ou juntos num ficheiro só — e aí os cabeçalhos YAML de cada um dão lugar
a secções, porque num ficheiro só o primeiro cabeçalho seria lido.

### O atalho «Pegar do YouTube» — o caminho sem instalar nada

No separador do YouTube há um botão amarelo para arrastar até à barra de favoritos. Depois,
em qualquer vídeo, um clique nesse favorito guarda a legenda num ficheiro e copia-a.

É o caminho recomendado, e resolve os dois problemas de uma vez. O conversor não pode falar
com o YouTube por causa do CORS; um repetidor em servidor pode, mas apanha «faça login para
confirmar que você não é um bot» porque vem de datacenter. O atalho corre **dentro da página
do vídeo**: está na origem `youtube.com`, por isso não há CORS pelo meio, e leva a sessão de
quem está a ver, que é precisamente o que falta ao servidor.

O ficheiro sai com o identificador no nome (`… [bdh0XH21QBs].pt.json3`), e é daí que o
conversor tira sozinho o endereço do vídeo e os carimbos de tempo clicáveis.

A fonte do atalho é [`repetidor/bookmarklet.js`](repetidor/bookmarklet.js). A página não
guarda uma cópia minificada: monta o endereço do favorito a partir dessa mesma fonte, para
não haver duas versões a divergir.

No telemóvel dá mais trabalho — não há barra de favoritos, e é preciso criar o favorito à
mão e colar o endereço.

### Colar a legenda, ou deixar o repetidor buscá-la

Por omissão a legenda vem de si, porque o navegador não consegue ir buscá-la sozinho: a
página do vídeo não devolve cabeçalho CORS nenhum, e o endereço antigo de legendas
(`/api/timedtext`) responde vazio desde que o YouTube passou a exigir parâmetros
assinados. Qualquer página que tente é bloqueada.

Com o **repetidor** ligado (pasta [`repetidor/`](repetidor/)), o fluxo passa a ser colar o
link → **Buscar** → **Converter**, e um endereço de playlist abre-se sozinho na lista de
vídeos, cada um já com o título, o canal e a duração certos. Corre no seu computador
(`node repetidor/local.mjs`) ou no plano grátis do Cloudflare Workers.

Enquanto o campo do repetidor estiver vazio — e vem vazio — não há requisição de rede
nenhuma e o modo avião continua a valer.

Aviso que consta também do [README do repetidor](repetidor/README.md): o YouTube trata
pedidos vindos de datacenter como robôs e recusa uma parte deles. Medido a partir de uma
máquina de nuvem, com pausas e vídeos diferentes, **4 em 6**. O repetidor tenta quatro
caminhos diferentes e guarda em cache o que conseguiu, mas conte com «tente outra vez».
Correr o repetidor em casa evita quase todo esse problema.

## Nível profissional

Fala não é texto escrito: repete-se, não tem pontuação e vem embrulhada em pedidos de
inscrição. Este separador regula as quatro passagens que desfazem isso.

**Sobreposição.** As legendas automáticas vêm em rolo — cada bloco repete o fim do
anterior. A junção compara palavra a palavra, não carácter, senão colava `pesca` com `r`.

**Parágrafos pela pausa.** Sem pontuação, o único sinal de fronteira que a legenda dá é o
silêncio: uma pausa de 2,2 s abre parágrafo. Sem tempos nenhuns, corta-se por tamanho.

**Chamadas de canal e patrocínio.** São 34 padrões — «se inscreve», «deixa o like», «ativa
o sininho», «link na descrição», «patrocinado por», «use o cupom», «fala galera», «até o
próximo vídeo» — escritos com e sem acento, porque a legenda automática troca as grafias
sem critério.

A regra que manda em tudo: **uma frase apanhada por um destes padrões mas que fala de pesca
não é deitada fora.** Apara-se só o pedido e o resto fica. «Deixa o like e amarra o anzol
com nó cego» perde o pedido e mantém o nó. Cortar a frase inteira seria pior do que deixar
passar um «deixa o like», porque o conhecimento não volta.

**Vícios de linguagem**, em quatro níveis:

| Nível | O que apaga |
|---|---|
| Nenhuma | só junta as repetições da legenda |
| Segura | «né», «tipo assim», «tá ligado», hesitações, palavra dobrada |
| Padrão | mais «cara», «sabe», «beleza» — só quando isolados por vírgula |
| Agressiva | essas muletas em qualquer posição |

O nível agressivo tem guardas: `cara` e `gente` não se apagam com artigo ou preposição à
frente (`a gente vai pescar` é «nós», `a cara do peixe` é a cara do peixe), e `sabe`,
`entendeu` e `viu` não se apagam com sujeito à frente (`você sabe amarrar o nó`, `ele viu o
cardume`). Sem essas guardas, o primeiro teste escreveu «hoje a vai pescar tilápia».

Um pormenor que dá trabalho em português: o `\b` do JavaScript conta só `[A-Za-z0-9_]` como
palavra, por isso `\bné\b` nunca casa — entre o `é` e o espaço não há fronteira aos olhos
dele. As fronteiras estão escritas à mão, com a classe acentuada.

### Estruturação e vocabulário controlado

A saída leva cabeçalho YAML e secções `# Tipo de Peixe`, `# Local`, `# Técnica`, `# Isca`,
`# Equipamento`, `# Segurança`, com a contagem de vezes que cada termo aparece — o peixe
citado trinta vezes é o assunto, o citado uma vez é passagem.

As etiquetas saem de um vocabulário fechado de 86 termos canónicos: `tilapia`, `Tilápias` e
`TILÁPIA` viram sempre **Tilápia**. Etiqueta livre escrita de três maneiras parte a
importação, por isso a lista é fechada e está visível no separador. Não há modelo nenhum
nisto — é dicionário e correspondência de palavra inteira, o que faz correr offline e
devolver sempre o mesmo resultado para a mesma entrada.

Com a auditoria ligada, o ficheiro termina com a contagem do que foi retirado e a lista das
frases removidas e aparadas. Sem isso a limpeza é invisível, e limpeza invisível não se
confere antes de importar.

## Como funciona

O extrator de PDF é escrito do zero em JavaScript, sem nenhuma biblioteca externa.
Ele descomprime os fluxos com a `DecompressionStream` nativa, varre os objetos do
documento, expande object streams, percorre a árvore de páginas e interpreta os
operadores de texto do content stream, montando as linhas por coordenada.

Problemas de PDFs reais que ele resolve, todos encontrados em documentos de verdade:

- **Fontes CID sem tabela `ToUnicode`.** Os códigos guardados são índices de glifo, não
  letras, e o texto sai ilegível. A solução é colher as tabelas `cmap` de outras fontes da
  mesma família dentro do próprio documento e emprestá-las para traduzir os glifos.
- **Sobreimpressão.** Alguns PDFs desenham o mesmo texto dezenas de vezes na mesma
  coordenada. Fragmentos repetidos na mesma posição são descartados.
- **Escala na matriz de texto.** As posições estão no espaço do dispositivo e o avanço do
  texto no espaço do texto. Somá-los só funciona com escala 1; em PDFs de Illustrator e
  InDesign, que usam letra de tamanho ~1,6 com escala ~27, o texto saía estilhaçado
  (`equipamen  t o`). O avanço é convertido antes de ser somado.
- **Texto justificado.** O espaçamento esticado põe cada palavra numa posição própria, e
  parágrafos inteiros eram lidos como tabelas. Distinguem-se pela decisão das colunas
  (numa tabela cada coluna está quase sempre cheia ou quase sempre vazia) e pelo conteúdo
  numérico.
- **Pontilhado de índices.** `Título ....... 12` vem em fragmentos sobrepostos, com o
  triplo dos pontos necessários. Gastava tokens e fazia o índice parecer tabela.
- **Versalete.** A inicial maior parte a palavra (`L EI DE D ALTON`). A mudança de tamanho
  de letra é a assinatura, e a junção está presa a ela — senão `DO AR` viraria `DOAR`.
- **PDFs cifrados sem palavra-passe.** A maioria dos PDFs "protegidos" abre em qualquer
  leitor: a cifra marca restrições de permissões, não esconde conteúdo. Implementa o
  handler padrão com RC4 (MD5 e RC4 escritos à mão) e AES-128 pela WebCrypto.

Num catálogo de 52 páginas, a saída ficou em 96% do volume do `pdftotext` do Poppler,
com 0,2% de caracteres sem tradução.

## Limitações

- **PDFs escaneados não funcionam.** Se as páginas forem fotografias, não existe texto para
  extrair e o resultado sai vazio. Isso exige OCR, que é outra tecnologia. O app avisa
  quando deteta esse caso, e no `.zip` o ficheiro leva uma nota a explicar em vez de sair
  com zero bytes.
- **Fórmulas matemáticas saem estropiadas.** Os parênteses grandes são montados com
  pecinhas cujos códigos calham em letras acentuadas, e aparecem no texto como `ç` ou `÷`.
  Pior: uma equação é bidimensional, com numerador sobre denominador, e texto corrido é
  uma linha só — a informação perde-se na conversão. Nenhuma ferramenta de extração
  resolve isto bem; o `pdftotext` sofre do mesmo.
- **PDFs com palavra-passe a sério** continuam a precisar de ser abertos e gravados sem
  proteção antes. O mesmo para **AES-256**, que ainda não está implementado — em ambos os
  casos o app diz qual é o caso, em vez de devolver texto errado.
- **A legenda tem de entrar por uma das três portas**: o atalho «Pegar do YouTube», um
  ficheiro largado na página, ou colada à mão. A página, sozinha, não consegue buscar nada.
  Expandir um endereço de playlist em vídeos continua a exigir o repetidor.
- **Com repetidor, o YouTube recusa parte dos pedidos** por virem de datacenter. Não há
  volta a dar do lado do código; há mitigação (vários clientes, cache, cookie opcional) e
  há a saída de o correr em casa.
- **A legenda automática erra nomes.** Num vídeo real sobre robalo, o YouTube escreveu
  «roubalo», «roubal» e «romalo». O conversor limpa ruído e repetição; não conserta o que
  o YouTube ouviu mal, e nenhuma ferramenta conserta sem reprocessar o áudio.
- **A pontuação é heurística.** Os parágrafos são cortados pelas pausas do vídeo, não por
  compreensão da frase. Sai legível, mas não é a pontuação que um humano poria.
- **O vocabulário é fechado.** Um peixe fora da lista dos 86 termos não é etiquetado. É o
  preço de nunca inventar uma etiqueta que o app do outro lado não conhece.
- Alguns glifos podem faltar quando nenhuma fonte do documento oferece a correspondência.
- Lotes muito grandes podem pesar no celular. O app avisa e permite cancelar no meio.

## Saber que versão está a correr

O rodapé mostra a versão. Quando o servidor tem uma mais recente, aparece ao lado
**«há uma versão nova: feche e reabra a aplicação»**.

A cópia instalada fica guardada no aparelho, e o navegador só a troca quando a aplicação é
**fechada e reaberta** — no telemóvel, pelo multitarefas; ir ao ecrã principal não chega.
Ao publicar uma alteração, incrementar `VERSAO` no `sw.js` e o número em `#versaoApp` no
`index.html`.

## Instalar como aplicativo

Servida por HTTPS, a página instala-se como um aplicativo de verdade — ícone próprio,
janela sem barra de endereço, e abre **sem internet**.

- **Android e computador (Chrome, Edge):** no menu do navegador, escolha *Instalar*.
- **iPhone e iPad:** toque em **Partilhar** na barra do Safari e escolha
  *Adicionar ao Ecrã Principal*.

A página mostra o caminho certo sozinha, conforme o aparelho, e esconde-o quando já está
instalada. Houve aqui um botão «Instalar aplicativo», retirado por depender do aviso
`beforeinstallprompt`: aparecia e desaparecia sozinho, e quando aparecia sem o aviso não
fazia nada. O menu do navegador faz o mesmo e está sempre no mesmo sítio.

Depois de instalado, o app abre em modo avião: os arquivos ficam guardados no aparelho.

## Estrutura

O aplicativo continua a ser **um arquivo só**: `index.html` traz o HTML, o CSS, o
JavaScript, o extrator de PDF, o gerador e o leitor de ZIP. Sem dependências, sem CDN.
Basta salvar esse arquivo e abrir — funciona sozinho.

Os restantes arquivos existem apenas para a versão publicada por HTTPS e são opcionais:

| Arquivo | Para que serve |
|---|---|
| `manifest.webmanifest` | Nome, cores e ícones para a instalação |
| `sw.js` | Faz o app abrir sem rede depois de instalado |
| `icone-*.png` | Ícone no ecrã principal e na lista de aplicativos |
| `robots.txt`, `sitemap.xml` | Permitem que buscadores encontrem a página |

O `sw.js` busca o HTML **pela rede primeiro** e só recorre à cache se não houver ligação.
É deliberado: um service worker que serve a cache primeiro faz a versão antiga continuar
a aparecer depois de publicada uma correção, e o sintoma é indistinguível de um erro no
código. Ao alterar o app, incremente `VERSAO` no topo do `sw.js`.

## Publicar sua própria cópia

Ative o GitHub Pages nas configurações do repositório (Settings → Pages → Branch: `master`,
pasta `/root`). Em poucos minutos a página fica no ar e você compartilha o link.

Servida por HTTPS, ela ganha três coisas que o `file://` não permite: o botão de copiar
usa a área de transferência moderna, o botão **Compartilhar** abre a folha de partilha do
celular (ou copia o link no computador), e dá para adicionar à tela de início.

## Aplicativo irmão: Laudo

[**Laudo**](https://github.com/jiomavj-tech/laudo) parte da mesma ideia — um arquivo HTML,
sem servidor, sem upload — para outro problema: relatórios de avaliação técnica de elétrica,
câmeras, portões e cerca elétrica, montados no celular a partir de foto e voz.

Esteve na pasta `laudo/` deste repositório e mudou-se para o seu próprio, em
<https://jiomavj-tech.github.io/laudo/>. Dois aplicativos no mesmo sítio partilhavam sitemap,
histórico e publicação, e cada alteração num obrigava a pensar no outro.

## Licença

**Todos os direitos reservados** — veja [LICENSE](LICENSE).

O aplicativo é livre para usar. O código não é livre para copiar: redistribuir, hospedar
uma cópia própria, modificar ou explorar comercialmente exige autorização por escrito.
Pedidos pelo [perfil do autor](https://github.com/jiomavj-tech).

Enquanto o repositório for público, os Termos do GitHub permitem que outros utilizadores
o vejam e bifurquem dentro da plataforma — isso a licença não afasta. Fora do GitHub, as
restrições acima aplicam-se integralmente.
