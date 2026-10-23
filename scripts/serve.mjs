// Servidor local simples para testar a pasta web/ — uso: npm start
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const base = fileURLToPath(new URL('../web/', import.meta.url));
const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const porta = Number(process.env.PORT) || 8080;

createServer(async (req, res) => {
  let caminho = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  if (caminho.endsWith('/')) caminho += 'index.html';
  try {
    const dados = await readFile(join(base, caminho));
    res.writeHead(200, { 'Content-Type': tipos[extname(caminho)] || 'application/octet-stream' });
    res.end(dados);
  } catch {
    res.writeHead(404); res.end('Não encontrado');
  }
}).listen(porta, () => console.log(`Licita IAC em http://localhost:${porta}`));
