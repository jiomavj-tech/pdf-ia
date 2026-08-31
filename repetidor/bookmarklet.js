/* bookmarklet.js — «Pegar do YouTube».
   Fonte legível do atalho que o separador YouTube gera. O app monta o
   javascript: a partir daqui; editar este ficheiro é o que muda o atalho.

   PORQUE ISTO RESOLVE O QUE O REPETIDOR NÃO RESOLVE
   O conversor não pode falar com o YouTube (sem CORS), e um repetidor em
   servidor apanha «faça login para confirmar que você não é um bot», porque
   vem de datacenter. Já o navegador de quem está a ver o vídeo está na origem
   youtube.com — não há CORS pelo meio — e leva a sessão da própria pessoa,
   que é exatamente o que falta ao servidor. Zero infraestrutura, zero conta.

   Num vídeo, tira a legenda e grava um ficheiro .json3.
   Numa playlist, percorre os vídeos e grava um ficheiro .lote.json com todos,
   que o conversor abre como uma lista. */
(function () {
  'use strict';

  var MAX_VIDEOS = 60;      // trava: uma playlist de centenas irrita o YouTube
  var PAUSA_MS = 350;       // respiro entre vídeos, para não levar 429

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
    if (erro !== 'fica') setTimeout(function () { if (d.parentNode) d.remove(); }, erro ? 9000 : 6000);
    return d;
  }

  function guardar(nome, texto, tipo) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([texto], { type: tipo || 'application/json' }));
    a.download = nome;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }

  function limpo(t, tam) {
    return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      .toLowerCase().slice(0, tam || 60);
  }

  /* ---------- ler o que a página já traz ---------- */

  function doHtml(nome) {
    var html = document.documentElement.innerHTML;
    // o fecho de script vai partido: inteiro, terminaria a tag que embute esta fonte
    var fim = '</scr' + 'ipt>';
    var m = html.match(new RegExp(nome + '\\s*=\\s*(\\{.+?\\})\\s*;\\s*(?:var |window\\.|' + fim + ')'));
    if (!m) m = html.match(new RegExp(nome + '\\s*=\\s*(\\{.+?\\})\\s*;'));
    if (m) { try { return JSON.parse(m[1]); } catch (e) {} }
    return null;
  }

  function respostaDoPlayer() {
    var p = window.ytInitialPlayerResponse;
    return (p && p.videoDetails) ? p : doHtml('ytInitialPlayerResponse');
  }

  function dadosDaPagina() { return window.ytInitialData || doHtml('ytInitialData'); }

  /* A configuração da própria página é o que deixa chamar a API interna sem
     inventar chave nenhuma: reutiliza-se o contexto que o YouTube já montou. */
  function config() {
    var chave = null, ctx = null;
    try {
      if (window.ytcfg && window.ytcfg.get) {
        chave = window.ytcfg.get('INNERTUBE_API_KEY');
        ctx = window.ytcfg.get('INNERTUBE_CONTEXT');
      }
    } catch (e) {}
    if (!chave) {
      var m = document.documentElement.innerHTML.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
      if (m) chave = m[1];
    }
    if (!ctx) {
      var c = document.documentElement.innerHTML.match(/"INNERTUBE_CONTEXT":(\{.+?\}),"INNERTUBE_CONTEXT_CLIENT_NAME"/);
      if (c) { try { ctx = JSON.parse(c[1]); } catch (e) {} }
    }
    return { chave: chave, ctx: ctx || { client: { clientName: 'WEB', clientVersion: '2.0' } } };
  }

  function api(endpoint, corpo) {
    var cfg = config();
    return fetch('/youtubei/v1/' + endpoint + (cfg.chave ? '?key=' + cfg.chave : ''), {
      method: 'POST', credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(Object.assign({ context: cfg.ctx }, corpo))
    }).then(function (r) {
      if (!r.ok) throw new Error('a API do YouTube respondeu ' + r.status);
      return r.json();
    });
  }

  /* ---------- legenda de um vídeo ---------- */

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

  function legendaDe(pr) {
    var faixas = (pr && pr.captions && pr.captions.playerCaptionsTracklistRenderer
                  && pr.captions.playerCaptionsTracklistRenderer.captionTracks) || [];
    if (!faixas.length) return Promise.reject(new Error('sem legenda publicada'));
    var faixa = escolher(faixas, 'pt');
    var u = new URL(faixa.baseUrl, location.origin);
    u.searchParams.set('fmt', 'json3');     // o formato que o conversor lê melhor
    return fetch(u.toString(), { credentials: 'same-origin' })
      .then(function (r) {
        if (!r.ok) throw new Error('a legenda respondeu ' + r.status);
        return r.text();
      })
      .then(function (texto) {
        if (!texto.trim()) throw new Error('a legenda veio vazia');
        return { texto: texto, faixa: faixa };
      });
  }

  /* ---------- vídeos de uma playlist ---------- */

  function colher(no, saida, vistos) {
    if (!no || typeof no !== 'object') return saida;
    if (Array.isArray(no)) { no.forEach(function (x) { colher(x, saida, vistos); }); return saida; }
    var r = no.playlistVideoRenderer;
    if (r && r.videoId && !vistos[r.videoId]) {
      vistos[r.videoId] = 1;
      saida.push({
        videoId: r.videoId,
        titulo: (r.title && (r.title.simpleText || (r.title.runs && r.title.runs[0] && r.title.runs[0].text))) || '',
        duracao: r.lengthSeconds ? Number(r.lengthSeconds) : null
      });
    }
    for (var k in no) colher(no[k], saida, vistos);
    return saida;
  }

  function token(o) {
    var m = JSON.stringify(o).match(/"continuationCommand":\{"token":"([^"]+)"/);
    return m ? m[1] : null;
  }

  function listaDaPlaylist(dados) {
    var vistos = {}, videos = colher(dados, [], vistos);
    var seguinte = token(dados), voltas = 0;

    function mais() {
      if (!seguinte || videos.length >= MAX_VIDEOS || voltas >= 8) return Promise.resolve(videos);
      voltas++;
      return api('browse', { continuation: seguinte }).then(function (j) {
        var antes = videos.length;
        colher(j, videos, vistos);
        if (videos.length === antes) return videos;
        seguinte = token(j);
        aviso('A ler a playlist… ' + videos.length + ' vídeos');
        return mais();
      }).catch(function () { return videos; });   // parou de dar: fica o que já há
    }
    return mais();
  }

  /* ---------- os dois caminhos ---------- */

  function umVideo(pr) {
    aviso('A buscar a legenda…');
    return legendaDe(pr).then(function (r) {
      var d = pr.videoDetails;
      var nome = limpo(d.title) + ' [' + d.videoId + '].' + (r.faixa.languageCode || 'pt') + '.json3';
      guardar(nome, r.texto);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(r.texto).then(function () {
          aviso('Pronto. Ficheiro guardado e legenda copiada — largue no PDF → IA ou cole lá.');
        }, function () {
          aviso('Pronto: ' + nome + ' guardado nos downloads. Largue-o no PDF → IA.');
        });
      }
      aviso('Pronto: ' + nome + ' guardado nos downloads. Largue-o no PDF → IA.');
    });
  }

  function playlistInteira(dados, idLista) {
    var titulo = '';
    try {
      titulo = (dados.header && dados.header.playlistHeaderRenderer
                && dados.header.playlistHeaderRenderer.title
                && dados.header.playlistHeaderRenderer.title.simpleText) || '';
    } catch (e) {}

    return listaDaPlaylist(dados).then(function (videos) {
      if (!videos.length) throw new Error('não encontrei vídeos nesta playlist');
      if (videos.length > MAX_VIDEOS) videos = videos.slice(0, MAX_VIDEOS);

      if (!confirm('Esta playlist tem ' + videos.length + ' vídeo(s).\n\n'
                 + 'Vou buscar a legenda de cada um, um de cada vez — leva cerca de '
                 + Math.ceil(videos.length * 1.2 / 60) + ' minuto(s).\n\nContinuar?')) {
        throw new Error('cancelado por si');
      }

      var caixa = aviso('A começar…', 'fica');
      var saida = [], falhas = [];

      /* Em série e com pausa: em paralelo o YouTube corta com 429 e perde-se a
         playlist inteira em vez de um vídeo. */
      function passo(i) {
        if (i >= videos.length) return Promise.resolve();
        var v = videos[i];
        caixa.textContent = 'Vídeo ' + (i + 1) + ' de ' + videos.length
          + (saida.length ? ' · ' + saida.length + ' ok' : '')
          + (falhas.length ? ' · ' + falhas.length + ' sem legenda' : '');
        return api('player', { videoId: v.videoId })
          .then(function (pr) {
            return legendaDe(pr).then(function (r) {
              var d = pr.videoDetails || {};
              saida.push({
                videoId: v.videoId,
                titulo: d.title || v.titulo || '',
                canal: d.author || '',
                duracao: d.lengthSeconds ? Number(d.lengthSeconds) : v.duracao,
                idioma: r.faixa.languageCode || '',
                automatica: r.faixa.kind === 'asr',
                formato: 'json3',
                legenda: r.texto
              });
            });
          })
          .catch(function (e) { falhas.push((v.titulo || v.videoId) + ': ' + (e && e.message || 'erro')); })
          .then(function () {
            return new Promise(function (r) { setTimeout(r, PAUSA_MS); }).then(function () { return passo(i + 1); });
          });
      }

      return passo(0).then(function () {
        if (caixa.parentNode) caixa.remove();
        if (!saida.length) throw new Error('nenhum dos vídeos tinha legenda');
        var lote = { tipo: 'lote', playlist: idLista || '', titulo: titulo, videos: saida };
        var nome = (limpo(titulo || 'playlist', 40) || 'playlist') + '-' + saida.length + '-videos.lote.json';
        guardar(nome, JSON.stringify(lote));
        aviso(saida.length + ' legenda(s) num ficheiro só: ' + nome
              + (falhas.length ? ' · ' + falhas.length + ' sem legenda' : '')
              + '. Largue-o no PDF → IA.');
      });
    });
  }

  /* ---------- decidir onde estamos ---------- */

  var idLista = (location.search.match(/[?&]list=([A-Za-z0-9_-]{12,})/) || [])[1] || '';
  var pr = respostaDoPlayer();
  var naPlaylist = /\/playlist/.test(location.pathname);

  var trabalho;
  if (pr && pr.videoDetails && !naPlaylist) {
    // a ver um vídeo: se ele está dentro de uma playlist, perguntar qual dos dois
    if (idLista && confirm('Este vídeo está numa playlist.\n\nOK = pegar a playlist inteira\n'
                         + 'Cancelar = pegar só este vídeo')) {
      trabalho = api('browse', { browseId: 'VL' + idLista })
        .then(function (j) { return playlistInteira(j, idLista); });
    } else {
      trabalho = umVideo(pr);
    }
  } else if (naPlaylist || idLista) {
    var dados = dadosDaPagina();
    if (!dados) { aviso('Não consegui ler esta playlist. Recarregue a página e tente outra vez.', true); return; }
    trabalho = playlistInteira(dados, idLista);
  } else {
    aviso('Abra um vídeo ou uma playlist do YouTube e clique de novo neste atalho.', true);
    return;
  }

  trabalho.catch(function (e) {
    var caixa = document.getElementById('pdfia-aviso');
    if (caixa) caixa.remove();
    aviso('Não deu: ' + (e && e.message || 'erro desconhecido'), true);
  });
})();
