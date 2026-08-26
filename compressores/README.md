# Giba Compressores — site

Site institucional de venda e assistência técnica de compressores de ar.
Publicado em <https://giba-compressores.web.app> pelo Firebase Hosting.

É **um arquivo só**: `index.html` traz o HTML, o CSS, o JavaScript e os desenhos.
Sem dependências, sem CDN, sem servidor. Dá para abrir o arquivo direto no navegador
para conferir antes de publicar.

## Antes de publicar: preencher os dados

No fim do `index.html`, logo no início do `<script>`, existe um bloco `DADOS` — é o
único lugar a editar:

```js
const DADOS = {
  whatsapp: '',   // só dígitos, com país e DDD: '5511999999999'
  telefone: '',   // como deve aparecer: '(11) 99999-9999'
  email:    '',   // 'contato@exemplo.com.br'
  area:     '',   // 'São Paulo e região metropolitana'
  horario:  ''    // 'Segunda a sexta, 8h às 18h · sábado até 12h'
};
```

Enquanto um campo estiver vazio, a página escreve **«a preencher»** no lugar. É de
propósito: um telefone inventado no ar é pior que um espaço em branco.

Com o WhatsApp configurado, os dois botões e o formulário passam a abrir a conversa
com o texto já montado. O formulário **não envia nada sozinho** e não guarda nada —
ele só monta a mensagem e entrega ao WhatsApp (ou ao e-mail, se não houver número).

## O que a página tem

| Seção | Conteúdo |
|---|---|
| Capa | Chamada, botão de WhatsApp e desenho do compressor |
| Serviços | Corretiva, preventiva, venda, peças, rede de ar e urgência |
| Atendimento | Os três passos até o orçamento aprovado |
| Equipamentos | Pistão, parafuso, isento de óleo e portátil |
| Quando chamar | Seis sintomas que justificam a visita |
| Contato | Dados, área atendida, horário e o formulário |

O texto dos serviços descreve o trabalho comum de assistência de compressores.
Ajuste o que não corresponder ao que a empresa realmente faz — sobretudo a tabela de
equipamentos e a seção de urgência.

## Publicar

Com o [Firebase CLI](https://firebase.google.com/docs/cli) instalado e a conta ligada:

```sh
cd compressores
firebase login          # só na primeira vez
firebase deploy --only hosting
```

O `.firebaserc` já aponta para o projeto `giba-compressores`, e o `firebase.json`
publica esta pasta com `Cache-Control: no-cache` no HTML — assim uma correção aparece
na visita seguinte, sem esperar cache expirar.

## Licença

**Todos os direitos reservados** — veja [LICENSE](../LICENSE), na raiz do repositório.
