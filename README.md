# PDF → IA — offline

Converte PDFs em texto puro (`.txt`) ou Markdown (`.md`) **inteiramente dentro do navegador**.
Nenhum arquivo é enviado para lugar nenhum: não há servidor, não há upload, não há conta.

É um arquivo HTML só. Dá para usar direto do celular, do computador, ou até em modo avião.

## Para que serve

Mandar um PDF para uma IA custa caro porque o arquivo carrega fontes, imagens e estrutura
que o modelo não precisa. Extrair o texto antes reduz muito o tamanho — e o Markdown ainda
preserva títulos, listas e tabelas, que ajudam o modelo a entender o documento.

## Como usar

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

## Também neste repositório: Laudo

[**Laudo**](laudo/) é o segundo aplicativo daqui — mesma ideia (um arquivo HTML, sem servidor,
sem upload), outro problema. Monta relatórios de avaliação técnica de **elétrica, câmeras,
portões e cerca elétrica** direto do celular: tira a foto, fala a observação, e sai um PDF com
as imagens para mandar ao cliente. Os relatórios ficam guardados no aparelho, com backup em
arquivo e sincronização opcional com o **seu** Google Drive — sem servidor nenhum no meio.

Detalhes e limitações em [`laudo/README.md`](laudo/README.md).

## Licença

**Todos os direitos reservados** — veja [LICENSE](LICENSE).

O aplicativo é livre para usar. O código não é livre para copiar: redistribuir, hospedar
uma cópia própria, modificar ou explorar comercialmente exige autorização por escrito.
Pedidos pelo [perfil do autor](https://github.com/jiomavj-tech).

Enquanto o repositório for público, os Termos do GitHub permitem que outros utilizadores
o vejam e bifurquem dentro da plataforma — isso a licença não afasta. Fora do GitHub, as
restrições acima aplicam-se integralmente.
