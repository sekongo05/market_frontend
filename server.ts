import { AngularNodeAppEngine, createNodeRequestHandler, isMainModule, writeResponseToNodeResponse } from '@angular/ssr/node';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = join(serverDistFolder, '../browser');

const app = new AngularNodeAppEngine();

const server = createServer(async (req, res) => {
  try {
    const response = await app.handle(req, { staticFilesRoot: browserDistFolder });
    if (response) {
      writeResponseToNodeResponse(response, res);
    } else {
      res.statusCode = 404;
      res.end('Not found');
    }
  } catch (err) {
    console.error(err);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
});

if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  server.listen(port, () => {
    console.log(`Node server listening on http://localhost:${port}`);
  });
}

export const reqHandler = createNodeRequestHandler(async (req, res, next) => {
  const response = await app.handle(req, { staticFilesRoot: browserDistFolder });
  if (response) {
    writeResponseToNodeResponse(response, res);
  } else {
    next();
  }
});
