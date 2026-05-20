import '@angular/compiler';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

globalThis['require'] ??= createRequire(import.meta.url);

const __dir = dirname(fileURLToPath(import.meta.url));

let reqHandler;

async function getReqHandler() {
  if (!reqHandler) {
    const serverModule = await import(join(__dir, '../dist/market-frontend/server/server.mjs'));
    reqHandler = serverModule.reqHandler;
  }
  return reqHandler;
}

export default async function handler(req, res) {
  try {
    const handle = await getReqHandler();
    await handle(req, res, () => {
      res.statusCode = 404;
      res.end('Not found');
    });
  } catch (err) {
    console.error('SSR error:', err);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
}
