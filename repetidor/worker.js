/* worker.js — repetidor de legendas do YouTube para o conversor PDF → IA.
   Feito para o plano grátis do Cloudflare Workers. Um ficheiro, sem npm.

   PORQUE ISTO EXISTE
   A página do conversor não consegue falar com o YouTube: /watch não devolve
   cabeçalho CORS e o /api/timedtext antigo responde vazio desde que passou a
   exigir parâmetros assinados. Um Worker não tem essa limitação — corre no
   servidor, e é ele que devolve o CORS ao navegador.

   COMO OBTÉM A LEGENDA
   Pela API interna do YouTube (InnerTube), com o cliente ANDROID. Foi a única
   rota que passou sem sessão iniciada a partir de um IP de datacenter: o
   cliente web leva «confirme que não é um robô», e o WEB_EMBEDDED_PLAYER
   devolve playabilityStatus=ERROR. A resposta do player traz as faixas de
   legenda com o baseUrl já assinado, e é esse URL que se busca.

   O QUE DEVOLVE
   GET /?url=<endereço do YouTube>[&lang=pt]
     vídeo    -> {tipo:"video", videoId, titulo, canal, duracao, idiomas[], legenda, formato}
     playlist -> {tipo:"playlist", playlist, videos:[{videoId, titulo}]}
   Erros -> {erro:"...", codigo:"..."} com o estado HTTP adequado.

   SEGURANÇA
   Só aceita identificadores de vídeo e de playlist do YouTube, extraídos por
   expressão regular. Não repete URL arbitrário: sem isso seria um proxy aberto
   e qualquer pessoa o usaria para alcançar redes privadas. */

/* Clientes da API interna, por ordem de tentativa.

   Não basta um: o YouTube responde LOGIN_REQUIRED («faça login para confirmar
   que você não é um bot») de forma intermitente a partir de IP de datacenter, e
   qual deles apanha muda ao longo do dia. Medido daqui: o ANDROID alterna entre
   OK e LOGIN_REQUIRED de minuto a minuto, o IOS aguenta melhor. Por isso
   tenta-se um a seguir ao outro, e só se desiste quando todos falham.

   A última tentativa não é a API: é ler a página /watch e tirar de lá o
   captionTracks. É mais frágil (depende do formato do HTML) mas usa um caminho
   diferente, e serve de rede quando a API está a recusar. */
const CLIENTES = [
  {
    nome: 'IOS',
    ua: 'com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_3_1 like Mac OS X)',
    client: { clientName: 'IOS', clientVersion: '20.10.4', deviceMake: 'Apple',
              deviceModel: 'iPhone16,2', osName: 'iPhone', osVersion: '18.3.1.22D72' }
  },
  {
    nome: 'ANDROID',
    ua: 'com.google.android.youtube/20.10.38 (Linux; U; Android 15) gzip',
    client: { clientName: 'ANDROID', clientVersion: '20.10.38', androidSdkVersion: 35 }
  },
  {
    nome: 'ANDROID_VR',
    ua: 'com.google.android.apps.youtube.vr.oculus/1.62.27 (Linux; U; Android 12L)',
    client: { clientName: 'ANDROID_VR', clientVersion: '1.62.27', androidSdkVersion: 32 }
  }
];

const UA_NAVEGADOR = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                   + '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const ID_VIDEO = '[A-Za-z0-9_-]{11}';
const ID_LISTA = '[A-Za-z0-9_-]{12,}';

function idDoVideo(s) {
  s = String(s || '').trim();
  const padroes = [
    new RegExp(`youtu\\.be/(${ID_VIDEO})`),
    new RegExp(`youtube\\.com/watch\\?(?:[^#]*&)?v=(${ID_VIDEO})`),
    new RegExp(`youtube\\.com/(?:embed|v|shorts|live)/(${ID_VIDEO})`)
  ];
  for (const p of padroes) { const m = s.match(p); if (m) return m[1]; }
  return new RegExp(`^${ID_VIDEO}$`).test(s) ? s : null;
}

function idDaLista(s) {
  s = String(s || '').trim();
  const m = s.match(new RegExp(`[?&]list=(${ID_LISTA})`));
  if (m) return m[1];
  return /^(?:PL|UU|LL|FL|OL|RD)[A-Za-z0-9_-]{10,}$/.test(s) ? s : null;
}

/* Cookie opcional. O YouTube trata pedido sem sessão vindo de datacenter como
   robô; com a sessão de uma conta, passa quase sempre. Fica como segredo do
   Worker (wrangler secret put YT_COOKIE) e nunca no código. */
let COOKIE = '';
function comCookie(h) { return COOKIE ? { ...h, cookie: COOKIE } : h; }

async function innertube(endpoint, corpo, cli) {
  cli = cli || CLIENTES[0];
  const r = await fetch(`https://www.youtube.com/youtubei/v1/${endpoint}`, {
    method: 'POST',
    headers: comCookie({ 'content-type': 'application/json', 'user-agent': cli.ua }),
    body: JSON.stringify({
      context: { client: { ...cli.client, hl: 'pt-BR', gl: 'BR' } }, ...corpo
    })
  });
  if (!r.ok) throw erro(`O YouTube respondeu ${r.status}.`, 'youtube-recusou', 502);
  return r.json();
}

/* Lê a página /watch e tira o captionTracks de dentro do JSON embutido.
   Só serve de último recurso: o HTML muda quando lhes apetece. */
async function pelaPagina(id) {
  const r = await fetch(`https://www.youtube.com/watch?v=${id}&hl=pt-BR&bpctr=9999999999`,
    { headers: comCookie({ 'user-agent': UA_NAVEGADOR, 'accept-language': 'pt-BR,pt;q=0.9' }) });
  if (!r.ok) return null;
  const html = await r.text();

  const mt = html.match(/"captionTracks":(\[.*?\])(?:,"audioTracks"|,"translationLanguages"|\})/s);
  if (!mt) return null;
  let faixas;
  try { faixas = JSON.parse(mt[1]); } catch (e) { return null; }
  if (!faixas.length) return null;

  const tit = html.match(/"title":\s*\{\s*"simpleText":\s*"((?:[^"\\]|\\.)*)"/)
           || html.match(/<meta name="title" content="([^"]*)"/);
  const aut = html.match(/"ownerChannelName":"((?:[^"\\]|\\.)*)"/);
  const dur = html.match(/"lengthSeconds":"(\d+)"/);

  function texto(x) {
    if (!x) return '';
    try { return JSON.parse('"' + x + '"'); } catch (e) { return x; }
  }
  return {
    faixas,
    detalhes: {
      title: texto(tit && tit[1]),
      author: texto(aut && aut[1]),
      lengthSeconds: dur ? dur[1] : null,
      channelId: ''
    }
  };
}

function erro(msg, codigo, estado) {
  const e = new Error(msg);
  e.codigo = codigo; e.estado = estado || 400;
  return e;
}

/* Escolher a faixa: primeiro o idioma pedido, depois português — dando
   preferência à legenda escrita à mão sobre a gerada automaticamente, que erra
   nomes de peixe — e só depois qualquer uma. Um vídeo sem faixa nenhuma é caso
   de erro claro, não de resposta vazia. */
function escolherFaixa(faixas, lang) {
  const prefixo = (t) => String(t.languageCode || '').toLowerCase();
  const manual = (t) => t.kind !== 'asr';
  const alvo = String(lang || 'pt').toLowerCase();

  const tentativas = [
    (t) => prefixo(t) === alvo,
    (t) => manual(t) && prefixo(t).startsWith(alvo.slice(0, 2)),
    (t) => prefixo(t).startsWith(alvo.slice(0, 2)),
    (t) => manual(t),
    () => true
  ];
  for (const teste of tentativas) {
    const achada = faixas.find(teste);
    if (achada) return achada;
  }
  return faixas[0];
}

async function buscarVideo(id, lang) {
  let faixas = null, detalhes = null, ultimoMotivo = '';

  for (const cli of CLIENTES) {
    let j;
    try { j = await innertube('player', { videoId: id }, cli); }
    catch (e) { ultimoMotivo = e.message; continue; }

    const estado = j?.playabilityStatus?.status;
    const achadas = j?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (achadas && achadas.length) {
      faixas = achadas;
      detalhes = j.videoDetails || {};
      break;
    }
    ultimoMotivo = j?.playabilityStatus?.reason || estado || 'sem faixas';
  }

  if (!faixas) {
    const pagina = await pelaPagina(id);
    if (pagina) { faixas = pagina.faixas; detalhes = pagina.detalhes; }
  }

  if (!faixas) {
    // separar «o YouTube recusou» de «o vídeo não tem legenda» poupa o utilizador
    // de procurar defeito onde não há: as duas coisas pedem ações diferentes
    const bloqueio = /bot|login|sign in/i.test(ultimoMotivo);
    throw erro(
      bloqueio
        ? 'O YouTube recusou o pedido do repetidor («' + ultimoMotivo + '»). '
          + 'Costuma passar daqui a pouco — tente outra vez.'
        : 'Este vídeo não tem legenda publicada' + (ultimoMotivo ? ' (' + ultimoMotivo + ')' : '')
          + '. Sem legenda não há o que converter.',
      bloqueio ? 'youtube-bloqueou' : 'sem-legenda',
      bloqueio ? 503 : 404);
  }

  const faixa = escolherFaixa(faixas, lang);

  // json3 é o formato que o conversor lê com menos ambiguidade
  const u = new URL(faixa.baseUrl);
  u.searchParams.set('fmt', 'json3');
  const r = await fetch(u.toString(), { headers: comCookie({ 'user-agent': UA_NAVEGADOR }) });
  if (!r.ok) throw erro(`A legenda não desceu (${r.status}).`, 'legenda-falhou', 502);
  const legenda = await r.text();
  if (!legenda.trim()) throw erro('O YouTube devolveu a legenda vazia.', 'legenda-vazia', 502);

  const d = detalhes || {};
  return {
    tipo: 'video',
    videoId: id,
    titulo: d.title || '',
    canal: d.author || '',
    duracao: d.lengthSeconds ? Number(d.lengthSeconds) : null,
    idioma: faixa.languageCode || '',
    automatica: faixa.kind === 'asr',
    idiomas: faixas.map((t) => ({
      codigo: t.languageCode,
      nome: t.name?.simpleText || t.name?.runs?.[0]?.text || t.languageCode,
      automatica: t.kind === 'asr'
    })),
    formato: 'json3',
    legenda
  };
}

/* Varre a resposta do browse à procura dos vídeos. A forma da árvore muda
   conforme o cliente e a versão, por isso procura-se pelo renderer em vez de
   seguir um caminho fixo — um caminho fixo parte à primeira mudança do lado
   deles. */
function colherVideos(no, saida, vistos) {
  if (!no || typeof no !== 'object') return saida;
  if (Array.isArray(no)) { for (const x of no) colherVideos(x, saida, vistos); return saida; }
  const r = no.playlistVideoRenderer;
  if (r && r.videoId && !vistos.has(r.videoId)) {
    vistos.add(r.videoId);
    saida.push({
      videoId: r.videoId,
      titulo: r.title?.runs?.[0]?.text || r.title?.simpleText || '',
      duracao: r.lengthSeconds ? Number(r.lengthSeconds) : null
    });
  }
  for (const k in no) colherVideos(no[k], saida, vistos);
  return saida;
}

function proximoToken(j) {
  const m = JSON.stringify(j).match(/"continuationCommand":\{"token":"([^"]+)"/);
  return m ? m[1] : null;
}

const MAX_VIDEOS = 200;   // trava de segurança: uma playlist de milhares esgota o Worker

async function buscarPlaylist(id) {
  const vistos = new Set();
  const videos = [];
  let j = await innertube('browse', { browseId: 'VL' + id });
  const titulo = j?.header?.playlistHeaderRenderer?.title?.simpleText
              || j?.metadata?.playlistMetadataRenderer?.title || '';
  colherVideos(j, videos, vistos);

  let token = proximoToken(j), voltas = 0;
  while (token && videos.length < MAX_VIDEOS && voltas < 12) {
    voltas++;
    j = await innertube('browse', { continuation: token });
    const antes = videos.length;
    colherVideos(j, videos, vistos);
    if (videos.length === antes) break;          // parou de crescer: não insistir
    token = proximoToken(j);
  }

  if (!videos.length) {
    throw erro('Não foi encontrado nenhum vídeo nesta playlist. Ela pode ser privada.',
               'playlist-vazia', 404);
  }
  return { tipo: 'playlist', playlist: id, titulo, videos: videos.slice(0, MAX_VIDEOS) };
}

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400'
};

function json(dados, estado) {
  return new Response(JSON.stringify(dados), {
    status: estado || 200,
    headers: { 'content-type': 'application/json; charset=utf-8', ...CORS }
  });
}

export default {
  async fetch(pedido, env, ctx) {
    COOKIE = (env && env.YT_COOKIE) || '';
    if (pedido.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (pedido.method !== 'GET') return json({ erro: 'Só GET.', codigo: 'metodo' }, 405);

    const u = new URL(pedido.url);
    const alvo = u.searchParams.get('url') || u.searchParams.get('v') || '';
    const lang = u.searchParams.get('lang') || 'pt';
    if (!alvo) return json({ erro: 'Falta o parâmetro url.', codigo: 'sem-url' }, 400);

    const video = idDoVideo(alvo);
    const lista = idDaLista(alvo);
    if (!video && !lista) {
      return json({ erro: 'Não reconheci nenhum vídeo ou playlist do YouTube neste endereço.',
                    codigo: 'endereco-invalido' }, 400);
    }

    /* Guardar o que correu bem é o que torna isto utilizável. O YouTube recusa
       muito pedido vindo de datacenter, e uma legenda já obtida não tem de ser
       pedida outra vez — converter a mesma playlist duas vezes passa a bater na
       cache em vez de arriscar um bloqueio a cada vídeo. */
    const chaveCache = new Request(
      `https://cache.local/${video ? 'v' : 'p'}/${video || lista}/${lang}`, { method: 'GET' });
    const cache = typeof caches !== 'undefined' && caches.default;
    if (cache) {
      const guardado = await cache.match(chaveCache);
      if (guardado) {
        const copia = new Response(guardado.body, guardado);
        copia.headers.set('x-cache', 'hit');
        return copia;
      }
    }

    try {
      // um endereço com vídeo e lista ao mesmo tempo é um vídeo a tocar dentro
      // da playlist: o que a pessoa pediu foi o vídeo
      const dados = video ? await buscarVideo(video, lang) : await buscarPlaylist(lista);
      const resposta = json(dados);
      resposta.headers.set('cache-control', 'public, max-age=86400');
      if (cache) {
        const guardar = cache.put(chaveCache, resposta.clone());
        if (ctx && ctx.waitUntil) ctx.waitUntil(guardar); else await guardar;
      }
      return resposta;
    } catch (e) {
      return json({ erro: e.message || 'Falhou.', codigo: e.codigo || 'desconhecido' },
                  e.estado || 500);
    }
  }
};
