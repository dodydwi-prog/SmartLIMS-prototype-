import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  handlePublicChatRequest,
  handlePublicChatStreamRequest,
} from './src/server/publicChatEngine.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer(): Promise<void> {
  const app = express();
  const port = Number(process.env.PORT || 3000);
  const isProd = process.env.NODE_ENV === 'production';

  app.set('trust proxy', 1);
  app.use(express.json({ limit: '32kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/public-chat', async (req, res) => {
    const forwardedFor = req.headers['x-forwarded-for'];
    const rawIp =
      typeof forwardedFor === 'string'
        ? forwardedFor.split(',')[0].trim()
        : Array.isArray(forwardedFor)
          ? forwardedFor[0]
          : req.ip || req.socket.remoteAddress || 'unknown';

    const wantsStream =
      Boolean(req.headers.accept?.includes('text/event-stream')) ||
      (typeof req.body === 'object' &&
        req.body !== null &&
        (req.body as { stream?: unknown }).stream === true);

    if (wantsStream) {
      let streamStarted = false;
      const sendSse = (event: string, data: unknown) => {
        if (res.writableEnded) return;
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };

      const preflightError = await handlePublicChatStreamRequest(req.body, rawIp, {
        onStartStream: () => {
          streamStarted = true;
          res.status(200);
          res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
          res.setHeader('Cache-Control', 'no-cache, no-transform');
          res.setHeader('Connection', 'keep-alive');
          res.setHeader('X-Accel-Buffering', 'no');
          res.flushHeaders?.();
        },
        onDelta: (text) => {
          sendSse('delta', { text });
        },
        onDone: (meta) => {
          sendSse('done', meta);
          if (!res.writableEnded) res.end();
        },
        onStreamError: (payload) => {
          sendSse('error', payload);
          if (!res.writableEnded) res.end();
        },
      });

      if (preflightError && !streamStarted) {
        if (preflightError.headers) {
          for (const [key, value] of Object.entries(preflightError.headers)) {
            res.setHeader(key, value);
          }
        }
        res.status(preflightError.status).json(preflightError.body);
      } else if (streamStarted && !res.writableEnded) {
        res.end();
      }
      return;
    }

    const result = await handlePublicChatRequest(req.body, rawIp);
    if (result.headers) {
      for (const [key, value] of Object.entries(result.headers)) {
        res.setHeader(key, value);
      }
    }
    res.status(result.status).json(result.body);
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`SmartLIMS server listening on http://0.0.0.0:${port}`);
  });
}

void startServer();
