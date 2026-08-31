/* local.mjs — corre o mesmo repetidor no seu computador, sem Cloudflare.
   node repetidor/local.mjs   ->   http://127.0.0.1:8787

   Serve para duas coisas: experimentar antes de publicar, e fugir ao problema
   principal do Worker — o YouTube recusa muito pedido vindo de IP de
   datacenter, e a ligação de casa não sofre disso na mesma medida.
   Aceita o cookie da sessão em YT_COOKIE, como o Worker. */
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const worker = (await import(
  path.join(path.dirname(fileURLToPath(import.meta.url)), 'worker.js')
)).default;

const PORTA = Number(process.env.PORTA || 8787);

http.createServer(async (req, res) => {
  try {
    const r = await worker.fetch(
      new Request('http://local' + req.url, { method: req.method }),
      { YT_COOKIE: process.env.YT_COOKIE || '' },
      { waitUntil() {} }
    );
    res.writeHead(r.status, Object.fromEntries(r.headers));
    res.end(Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    res.writeHead(500, { 'content-type': 'application/json; charset=utf-8',
                         'access-control-allow-origin': '*' });
    res.end(JSON.stringify({ erro: String(e && e.message || e), codigo: 'local' }));
  }
}).listen(PORTA, '127.0.0.1', () => {
  console.log(`repetidor local em http://127.0.0.1:${PORTA}`);
  console.log('no app, separador «Nível profissional», cole:');
  console.log(`  http://127.0.0.1:${PORTA}/?url={url}`);
});
