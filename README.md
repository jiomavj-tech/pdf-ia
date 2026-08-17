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

## Como funciona

O extrator de PDF é escrito do zero em JavaScript, sem nenhuma biblioteca externa.
Ele descomprime os fluxos com a `DecompressionStream` nativa, varre os objetos do
documento, expande object streams, percorre a árvore de páginas e interpreta os
operadores de texto do content stream, montando as linhas por coordenada.

Dois problemas de PDFs reais que ele resolve:

- **Fontes CID sem tabela `ToUnicode`.** Os códigos guardados são índices de glifo, não
  letras, e o texto sai ilegível. A solução é colher as tabelas `cmap` de outras fontes da
  mesma família dentro do próprio documento e emprestá-las para traduzir os glifos.
- **Sobreimpressão.** Alguns PDFs desenham o mesmo texto dezenas de vezes na mesma
  coordenada. Fragmentos repetidos na mesma posição são descartados.

Num catálogo de 52 páginas, a saída ficou em 96% do volume do `pdftotext` do Poppler,
com 0,2% de caracteres sem tradução.

## Limitações

- **PDFs escaneados não funcionam.** Se as páginas forem fotografias, não existe texto para
  extrair e o resultado sai vazio. Isso exige OCR, que é outra tecnologia. O app avisa quando
  detecta esse caso.
- **PDFs com senha** precisam ser abertos e salvos sem proteção antes.
- Alguns glifos podem faltar quando nenhuma fonte do documento oferece a correspondência.
- Lotes muito grandes podem pesar no celular. O app avisa e permite cancelar no meio.

## Estrutura

Tudo — HTML, CSS, JavaScript, o extrator de PDF, o gerador e o leitor de ZIP — está
dentro de `index.html`. É proposital: sem instalação, sem dependências, sem CDN.
Basta salvar o arquivo e abrir.

## Publicar sua própria cópia

Ative o GitHub Pages nas configurações do repositório (Settings → Pages → Branch: `main`,
pasta `/root`). Em poucos minutos a página fica no ar e você compartilha o link.

Servida por HTTPS, ela ganha duas coisas que o `file://` não permite: o botão de copiar
usa a área de transferência moderna, e dá para adicionar à tela de início do celular.

## Licença

MIT — veja [LICENSE](LICENSE).
