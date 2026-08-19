# Laudo — relatório de avaliação técnica

Monta relatórios de vistoria de **elétrica, câmeras, portões e cerca elétrica** direto do celular:
tira a foto, fala o que está vendo, e no fim sai um **PDF com as imagens**, pronto para mandar
ao cliente.

É um arquivo HTML só, como o resto deste repositório. Sem servidor, sem conta, sem upload:
os relatórios e as fotos ficam guardados dentro do aparelho.

👉 [abrir o app](https://jiomavj-tech.github.io/pdf-ia/laudo/)

## Como se usa em campo

1. **Novo relatório** e, se quiser, preencha cliente e local (dá para deixar para depois).
2. Escolha a área do próximo registro: *Elétrica*, *Câmeras*, *Portões*, *Cerca elétrica* ou *Geral*.
3. **Tirar foto**. A foto vira um item novo já naquela área.
4. **Ditar**: aperte e fale. O que você disser vai entrando no texto do item, frase a frase.
5. Classifique com um toque: **Conforme**, **Atenção** ou **Crítico**.
6. Repita. No fim, escreva o parecer e aperte **Gerar PDF** — ou **Compartilhar PDF**, que abre
   a folha de partilha do celular e manda direto pelo WhatsApp.

O título do item pode ser escrito ou escolhido nas sugestões da área — quadro de distribuição,
dispositivo DR, aterramento, imagem noturna, fim de curso, tensão de saída e por aí. É só para
não ter de digitar em pé, no meio do serviço.

## O que sai no PDF

Capa com o cliente, os dados da vistoria e o placar (quantos itens, quantas fotos, quantos
críticos). Depois os itens agrupados por área, cada um com o selo da classificação, a observação
e as fotos. No fim, o parecer técnico e as linhas de assinatura do técnico e do cliente.

O gerador de PDF é escrito à mão, sem biblioteca nenhuma. Duas decisões que se veem no resultado:

- **As fotos entram como JPEG cru** (filtro `DCTDecode`), que é o formato que o PDF aceita sem
  conversão. É por isso que a foto é recomprimida em JPEG logo na captura, a 1600 px no lado maior:
  o original de 4 MB do celular ocuparia 8 cm na folha impressa e faria um arquivo que não passa
  no WhatsApp.
- **O texto é medido antes de ser escrito.** O PDF não quebra linha sozinho — cada linha é
  posicionada por coordenada. A tabela de larguras da Helvetica está embutida no app, e é ela que
  faz a linha parar antes da margem. Também é ela que decide quando um item não cabe no que resta
  da folha: nesse caso o item começa numa página nova, para a observação não ficar separada da
  foto que a prova, e o nome da área não ficar sozinho no pé da página.

## Ditado

O ditado usa o reconhecimento de voz do próprio navegador. Duas coisas que vale saber:

- **Precisa de internet no momento da fala** — o reconhecimento acontece no serviço do navegador,
  não dentro do app. Sem sinal, escreva no teclado; o resto do app funciona em modo avião.
- No celular a sessão de escuta **termina sozinha depois de um silêncio**. O app religa por baixo
  enquanto você não mandar parar, e cada trecho reconhecido é escrito no campo na hora — se o
  aplicativo for para segundo plano no meio, nada se perde.

No iPhone, se o ditado não estiver disponível, o microfone do próprio teclado funciona igual.

## Redação com IA (opcional, desligada)

O app funciona inteiro sem isso. Se você colar uma **chave da API da Anthropic** nos ajustes,
aparecem dois botões a mais:

- **Melhorar com IA**, em cada item: reescreve a fala solta em linguagem técnica. O que você
  ditou fica guardado, e **Desfazer IA** traz de volta.
- **Revisar tudo com IA**: passa por todos os itens e ainda escreve o parecer final, com as
  recomendações em ordem de prioridade.

A instrução dada ao modelo proíbe inventar: nada de medidas, marcas, normas ou causas que você
não tenha dito, e a gravidade não pode ser aumentada nem suavizada. Ainda assim, **releia antes
de assinar** — quem assina o laudo é você.

A chave fica guardada só neste aparelho, no navegador, e só é enviada para `api.anthropic.com`.
Cada revisão é cobrada na sua conta da Anthropic. O botão **Testar a chave** confirma que ela
funciona antes de você contar com ela em campo.

## Nuvem e backup

Os relatórios nascem e vivem dentro do aparelho. Sair de lá é escolha sua, e há dois caminhos.

### Backup em arquivo (sem conta, sem nada)

Nos ajustes, **Exportar tudo** baixa um `.zip` com todos os relatórios e todas as fotos.
**Importar arquivo** faz o caminho de volta, em qualquer aparelho. É o backup que não depende de
ninguém: guarde onde quiser — Drive, iCloud, pendrive, ou mandando para você mesmo no WhatsApp.

Ao importar, um relatório que já exista ali entra como **cópia**, com fotos próprias. Nada é
sobreposto sem você ver.

### Sincronização com o Google Drive

Ligada nos ajustes, cada relatório sobe para uma pasta **Laudo** dentro do **seu** Drive, e desce
nos outros aparelhos onde você entrar com a mesma conta. Não existe servidor deste app no meio: a
página fala direto com o Google, com uma credencial que é sua.

O acesso pedido é o `drive.file` — o mais estreito que existe. O app enxerga **apenas os arquivos
que ele mesmo criou**; o resto do seu Drive é invisível para ele. Como esse acesso não é
classificado como sensível pelo Google, não há processo de verificação a cumprir.

**Criar a credencial (uma vez só).** No `console.cloud.google.com`: crie um projeto, ative a
**Google Drive API**, configure a **tela de permissão OAuth** como *Externo* e publique, e crie um
**ID do cliente OAuth** do tipo *Aplicativo da Web*. Em **URIs de redirecionamento autorizados**,
cole o endereço que o app mostra nos ajustes (há um botão para copiar). Copie o ID do cliente e
cole no app. O passo a passo completo está dentro dos próprios ajustes, para consultar na hora.

**O que o app faz sozinho:** sincroniza ao abrir, ao fechar um relatório e quando a internet
volta. Também dá para forçar pelo botão **Nuvem**, no topo.

**Quando os dois aparelhos mexem no mesmo relatório**, nada é sobreposto: a sua versão fica como
está e a que veio do Drive entra como cópia, marcada *(do outro aparelho)*, com fotos próprias —
e sobe na mesma hora, para não existir só num aparelho. Perder trabalho de campo por causa de um
relógio seria inaceitável; um relatório repetido, você resolve num minuto.

**Apagar também sincroniza.** Apagar num aparelho apaga no Drive e, na sincronização seguinte, no
outro aparelho. Sem isso, o relatório apagado voltaria do céu na primeira sincronização.

**Uma chatice honesta:** uma página estática não tem onde guardar segredo, então o Google só
entrega uma autorização de **uma hora**. Passada a hora, o app pede outra — em silêncio quando
você abre o aplicativo, e por toque quando você está no meio do trabalho (um redirecionamento
inesperado com o relatório aberto seria pior). Se a sessão do Google tiver caído, o botão do topo
passa a dizer **Religar o Drive** e espera por você; ele não fica tentando sozinho.

## Onde ficam os dados

Na IndexedDB do navegador, dentro do aparelho: o texto do relatório de um lado, as fotos do
outro — assim a lista de relatórios abre sem carregar imagem nenhuma.

Isso tem uma consequência que convém saber: **limpar os dados do site apaga os relatórios**. Com
o Drive ligado, eles voltam na sincronização seguinte; sem ele, o que fica é o PDF gerado e o
arquivo de backup. Os ajustes mostram quanto espaço está ocupado.

## Instalar como aplicativo

Servida por HTTPS, a página instala-se como aplicativo de verdade — ícone próprio, janela sem
barra de endereço, e abre sem internet.

- **Android e computador (Chrome, Edge):** aparece o botão **Instalar aplicativo** no topo.
- **iPhone e iPad:** toque em **Partilhar** e escolha *Adicionar ao Ecrã Principal* — a página
  mostra essa dica sozinha quando deteta iOS.

## Estrutura

| Arquivo | Para que serve |
|---|---|
| `index.html` | O aplicativo inteiro: interface, armazenamento, ditado, gerador de PDF |
| `manifest.webmanifest` | Nome, cores e ícones para a instalação |
| `sw.js` | Faz o app abrir sem rede depois de instalado |
| `icone-*.png` | Ícone no ecrã principal e na lista de aplicativos |

Ao publicar uma alteração, incrementar `VERSAO` no `sw.js` e o número em `#versaoApp` no
`index.html`: é assim que o app avisa que há versão nova. O `sw.js` busca o HTML **pela rede
primeiro** e só recorre à cache se não houver ligação — um service worker que serve a cache
primeiro faz a versão antiga continuar a aparecer depois de publicada uma correção, e o sintoma
é indistinguível de um erro no código.

## Limitações

- **Sem internet não há ditado.** O reconhecimento de voz é do navegador, não do app.
- **O ditado não é perfeito.** Termo técnico, marca e número saem errados às vezes; o texto fica
  editável justamente por isso.
- **Não guarda o áudio.** O que fica é o texto reconhecido, não a gravação.
- **A sincronização é sua para montar.** Precisa de uma credencial OAuth criada por você no
  Google Cloud, uma vez. Sem servidor próprio não há como fugir disso — e é o que garante que
  nenhum dado passa por mim.
- **A autorização do Google dura uma hora.** É o limite de uma página sem servidor: não há como
  guardar um segredo que permita renovar em silêncio para sempre.
- **A sincronização é de relatório inteiro.** Um relatório alterado sobe por completo, não só a
  diferença. Com as fotos comprimidas isso dá poucas centenas de KB, mas não é um Dropbox.
- **Fórmula, tabela e desenho não entram** no PDF: o relatório é texto, foto e classificação.

## Licença

**Todos os direitos reservados** — veja [LICENSE](../LICENSE).
