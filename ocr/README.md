# `ocr/` — o leitor de páginas escaneadas

Esta pasta guarda o motor de OCR que o separador **PDF** usa quando a opção
«Ler páginas escaneadas» está ligada. São ficheiros de terceiros, guardados aqui
de propósito.

## Porque estão aqui e não num CDN

A aplicação tem uma promessa simples: **nada do que você abre sai do seu
aparelho**. Um CDN não receberia os seus documentos, mas veria o seu endereço IP
e o momento exato em que você faz OCR — e o `sw.js` não guarda em cache o que
vem de outra origem, por isso a cada uso haveria rede outra vez.

Servidos daqui, os ficheiros vêm do mesmo site, ficam na cache do service worker
à primeira utilização e depois o OCR funciona **sem ligação**. O que desce é o
motor; não sobe nada.

São ~5 MB no total, e só descem se alguém ligar a opção **e** tiver de facto
uma página sem texto. Quem nunca usar OCR nunca os descarrega: não estão na
lista de `ESSENCIAIS` do `sw.js`.

## O que é cada ficheiro

| Ficheiro | O que é |
|---|---|
| `tesseract.min.js` | Biblioteca principal, carregada só quando o OCR é ligado |
| `worker.min.js` | O worker que corre o reconhecimento fora da linha principal |
| `tesseract-core-simd-lstm.wasm.js` | Motor em WebAssembly, versão com SIMD (a normal) |
| `tesseract-core-lstm.wasm.js` | O mesmo motor sem SIMD, para navegadores mais antigos |
| `por.traineddata.gz` | Modelo de português |

O navegador escolhe sozinho entre as duas versões do motor: descarrega **uma**,
nunca as duas.

## Origem e versões

- **Tesseract.js 5.1.1** — <https://github.com/naptha/tesseract.js>
  (`tesseract.min.js`, `worker.min.js`)
- **tesseract.js-core 5.1.1** — <https://github.com/naptha/tesseract.js-core>
  (os dois `tesseract-core-*.wasm.js`)
- **`por.traineddata`** — do repositório `tessdata_fast` do projeto Tesseract OCR,
  <https://github.com/tesseract-ocr/tessdata_fast>, comprimido com `gzip -9`.
  A variante `fast` foi escolhida por ser a mais pequena; `tessdata` e
  `tessdata_best` são mais exatas e bastante maiores.

Só se usam as variantes `-lstm` do motor porque a aplicação pede sempre o
reconhecimento moderno (LSTM). As variantes com o motor antigo não são
necessárias e não estão aqui.

## Licenças

Todos estes ficheiros são de terceiros e distribuídos sob a
**Licença Apache 2.0** — <https://www.apache.org/licenses/LICENSE-2.0>.
São de projetos independentes, com os seus próprios autores e direitos, e o
`LICENSE` na raiz deste repositório **não se aplica a esta pasta**.

## Atualizar

Substitua os ficheiros pelas versões novas, mantendo os mesmos nomes, e
incremente o `VERSAO` no `sw.js` — sem isso os antigos continuam na cache de
quem já usou o OCR. Se mudar a versão do Tesseract.js, confirme que os nomes que
a biblioteca procura continuam a ser estes: é ela que decide qual dos motores
pede, conforme o navegador tenha SIMD ou não.
