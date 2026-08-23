# Chopeiras — gestão de manutenção

Cadastro das chopeiras de cada cliente, com acesso controlado: o cliente entra com a conta Google
dele e vê apenas os equipamentos da própria empresa. O Giba vê e mantém tudo.

Esta é a **primeira das cinco entregas** planeadas. O que está aqui já dá para usar no serviço
real; o que ainda não está vem listado no fim.

## O que já funciona

**Portão de acesso.** Login com conta Google. Quem entra pela primeira vez cai numa fila e não vê
nada até ser aprovado — e ninguém se aprova a si próprio, nem por erro de programação: a regra que
proíbe está em `firestore.rules`, conferida no servidor do Google, não nesta página.

**Convite por e-mail.** Ao cadastrar a empresa, escrevem-se os e-mails que podem entrar por ela.
Quem entrar com um desses e-mails já nasce ligado àquela empresa e liberado, sem passar pela fila.
Sem isto, um e-mail novo a aparecer no painel não teria como ser ligado à empresa certa — e aprovar
às cegas é como alguém acaba a ver a chopeira do vizinho.

**Cadastro de empresas.** CNPJ com máscara e conferência dos dois dígitos verificadores (avisa na
hora se não bater, e recusa CNPJ repetido noutra empresa), razão social, nome fantasia, endereço,
contacto e o WhatsApp — que é por onde os avisos de status vão sair na entrega 2.

**Cadastro de chopeiras.** Número da etiqueta (é por ele que se busca), empresa dona, local de
instalação, marca, modelo, tipo, torneiras, e os dados do compressor: marca, modelo, potência, gás
e aplicação. Mais uma foto, reduzida no próprio aparelho antes de subir.

**Painel de acessos.** Quem está na fila, quem já entrou, a que empresa cada um pertence, e os
botões de aprovar e bloquear. Aprovar alguém sem empresa ligada dá aviso antes — essa pessoa
entraria e não veria nada.

## Como se usa

Do lado do Giba: cadastra a empresa, escreve os e-mails de quem vai poder entrar, e lança as
chopeiras daquela empresa uma a uma. Do lado do cliente: abre, entra com o Google, e vê a lista dos
equipamentos dele com a ficha completa de cada um.

## Quem vê o quê

| | Cliente aprovado | Giba |
|---|---|---|
| A própria empresa | lê | lê e escreve todas |
| Chopeiras | lê só as da empresa dele | tudo |
| Fotos | lê só as da empresa dele; pode criar | tudo |
| O próprio acesso | não se aprova | aprova e bloqueia |
| Empresa a que pertence | não escolhe | define |

Isto não é conferido dentro da página. Está em `firestore.rules` e é conferido antes de gravar —
mesmo que alguém abra o console do navegador e tente escrever direto no banco, a regra recusa.

## Ligar ao Firebase (uma vez só)

O aplicativo abre já com as instruções na tela enquanto não estiver ligado. Em resumo:

1. Em [console.firebase.google.com](https://console.firebase.google.com), criar o projeto
   **giba-chopeiras**.
2. **Authentication → Sign-in method → Google**: ativar.
3. **Firestore Database → Criar banco**: modo produção, região `southamerica-east1` (São Paulo).
4. **Configurações do projeto → Seus apps → Web**: registar um app e copiar o bloco
   `firebaseConfig`.
5. Colar esses valores na constante `CFG`, no topo do `index.html`.
6. Publicar as regras: `firebase deploy --only firestore`.
7. **Authentication → Settings → Domínios autorizados**: acrescentar o domínio onde a página está
   publicada. Sem este passo o login abre e fecha sem dizer porquê.

Os valores do `CFG` não são segredo: numa página web são públicos por definição. Quem protege os
dados são as regras do passo 6.

Publicar: `firebase deploy --only hosting`.

## Estrutura

| Arquivo | Para que serve |
|---|---|
| `index.html` | O aplicativo inteiro: portão, cadastros, painel |
| `firestore.rules` | Quem vê o quê — conferido no servidor |
| `firebase.json`, `.firebaserc` | Hospedagem e projeto |
| `manifest.webmanifest` | Nome, cores e ícones para instalar no celular |
| `sw.js` | Faz o app abrir sem rede depois de instalado |

Ao publicar uma alteração, incrementar `VERSAO` no `sw.js` e o número em `#versaoApp` no
`index.html`. O `sw.js` busca o HTML **pela rede primeiro** e só recorre à cache se não houver
ligação: um service worker que serve a cache primeiro faz a versão antiga continuar a aparecer
depois de publicada uma correção, e o sintoma é indistinguível de um erro no código.

## O que ainda não está aqui

As quatro entregas seguintes, por ordem:

2. **Ordem de serviço e status.** Abertura de chamado pelo cliente (número da chopeira, foto,
   problema por texto ou por voz), fila para o Giba, mudança de status, linha do tempo para o
   cliente, aviso por WhatsApp e sino dentro do app.
3. **Peças e orçamento.** Cadastro de peças com preço, orçamento com peças e serviço separados, e
   a aprovação do cliente registada com nome e data.
4. **Laudo.** Texto montado a partir do que foi feito, PDF com as fotos, guardado junto da ordem.
5. **Avisos e agenda.** Notificação push, agendamento de recolha e entrega, visão da semana.

## Limitações conhecidas

- **Notificação push ainda não existe.** Na entrega 2 o aviso sai por WhatsApp, com a mensagem já
  escrita. Push automático exige servidor — e, no iPhone, exige ainda que o cliente tenha o app na
  tela inicial.
- **A foto vive dentro do banco**, num documento próprio, comprimida a 1280 px. Três a cinco fotos
  por equipamento é confortável; álbum, não.
- **O cadastro é mantido pelo Giba.** O cliente lê e não corrige — de propósito, para não haver
  duas versões da mesma empresa.

## Licença

**Todos os direitos reservados** — veja [LICENSE](../LICENSE).
