/* bookmarklet.js — «Pegar do YouTube».
   Fonte legível do atalho que o separador YouTube gera. O app monta o
   javascript: a partir daqui; editar este ficheiro é o que muda o atalho.

   PORQUE ISTO RESOLVE O QUE O REPETIDOR NÃO RESOLVE
   O conversor não pode falar com o YouTube (sem CORS), e um repetidor em
   servidor apanha «faça login para confirmar que você não é um bot», porque
   vem de datacenter. Já o navegador de quem está a ver o vídeo está na origem
   youtube.com — não há CORS pelo meio — e leva a sessão da própria pessoa,
   que é exatamente o que falta ao servidor. Zero infraestrutura, zero conta.

   Corre na página do vídeo, tira a legenda do ytInitialPlayerResponse que já
   está ali, grava um ficheiro e copia o conteúdo. Depois é largar no
   conversor ou colar. */
(function () {
  'use strict';

  function aviso(texto, erro) {
    var id = 'pdfia-aviso', velho = document.getElementById(id);
    if (velho) velho.remove();
    var d = document.createElement('div');
    d.id = id;
    d.style.cssText = 'position:fixed;z-index:2147483647;left:50%;top:24px;transform:translateX(-50%);'
      + 'background:' + (erro ? '#A8500F' : '#141C33') + ';color:#fff;font:600 14px/1.45 system-ui,sans-serif;'
      + 'padding:13px 18px;border-radius:3px;box-shadow:0 6px 24px rgba(0,0,0,.35);max-width:min(90vw,520px)';
    d.textContent = texto;
    document.body.appendChild(d);
    setTimeout(function () { if (d.parentNode) d.remove(); }, erro ? 9000 : 6000);
  }

  /* A resposta do player está na variável global; quando a navegação interna
     do YouTube a deixa desatualizada, procura-se no HTML. */
  function respostaDoPlayer() {
    if (window.ytInitialPlayerResponse && window.ytInitialPlayerResponse.videoDetails) {
      return window.ytInitialPlayerResponse;
    }
    var html = document.documentElement.innerHTML;
    var m = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\})\s*;\s*(?:var |window\.|<\/script>)/);
    if (!m) m = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\})\s*;/);
    if (m) { try { return JSON.parse(m[1]); } catch (e) {} }
    return null;
  }

  /* Preferir português, e dentro dele a legenda escrita à mão: a automática
     erra nomes de peixe («roubalo» por robalo). */
  function escolher(faixas, idioma) {
    var alvo = (idioma || 'pt').toLowerCase();
    var doIdioma = faixas.filter(function (f) {
      return String(f.languageCode || '').toLowerCase().indexOf(alvo) === 0;
    });
    return doIdioma.filter(function (f) { return f.kind !== 'asr'; })[0]
        || doIdioma[0]
        || faixas.filter(function (f) { return f.kind !== 'asr'; })[0]
        || faixas[0];
  }

  function nomeDoFicheiro(det, faixa) {
    var base = String(det.title || 'transcricao')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      .toLowerCase().slice(0, 60) || 'transcricao';
    return base + ' [' + det.videoId + '].' + (faixa.languageCode || 'pt') + '.json3';
  }

  var pr = respostaDoPlayer();
  if (!pr || !pr.videoDetails) {
    aviso('Abra um vídeo do YouTube e clique de novo neste atalho.', true);
    return;
  }
  var faixas = (pr.captions && pr.captions.playerCaptionsTracklistRenderer
                && pr.captions.playerCaptionsTracklistRenderer.captionTracks) || [];
  if (!faixas.length) {
    aviso('Este vídeo não tem legenda publicada — não há transcrição para tirar.', true);
    return;
  }

  var faixa = escolher(faixas, 'pt');
  var u = new URL(faixa.baseUrl);
  u.searchParams.set('fmt', 'json3');          // o formato que o conversor lê melhor
  aviso('A buscar a legenda (' + (faixa.languageCode || '?')
        + (faixa.kind === 'asr' ? ', automática' : '') + ')…');

  fetch(u.toString(), { credentials: 'same-origin' })
    .then(function (r) {
      if (!r.ok) throw new Error('o YouTube respondeu ' + r.status);
      return r.text();
    })
    .then(function (texto) {
      if (!texto.trim()) throw new Error('veio vazia');
      var nome = nomeDoFicheiro(pr.videoDetails, faixa);

      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
      a.download = nome;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);

      // copiar também: quem preferir colar não precisa de procurar o ficheiro
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texto).then(function () {
          aviso('Pronto. Ficheiro guardado e legenda copiada — largue no PDF → IA ou cole lá.');
        }, function () {
          aviso('Pronto: ' + nome + ' guardado nos downloads. Largue-o no PDF → IA.');
        });
      } else {
        aviso('Pronto: ' + nome + ' guardado nos downloads. Largue-o no PDF → IA.');
      }
    })
    .catch(function (e) {
      aviso('Não deu para tirar a legenda: ' + (e && e.message || 'erro desconhecido'), true);
    });
})();
