import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  handlePublicChatRequest,
  handlePublicChatStreamRequest,
} from '../src/server/publicChatEngine.ts';

interface VercelLikeRequest extends IncomingMessage {
  body?: unknown;
}

interface VercelLikeResponse extends ServerResponse {
  status?: (code: number) => VercelLikeResponse;
  json?: (payload: unknown) => void;
}

async function readJsonBody(req: VercelLikeRequest): Promise<unknown> {
  if (req.body !== undefined) {
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body);
      } catch {
        return {};
      }
    }
    return req.body;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return {};
  }
}

export default async function handler(
  req: VercelLikeRequest,
  res: VercelLikeResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  const forwardedFor = req.headers['x-forwarded-for'];
  const rawIp =
    typeof forwardedFor === 'string'
      ? forwardedFor.split(',')[0].trim()
      : Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : req.socket?.remoteAddress || 'unknown';

  const body = await readJsonBody(req);
  const acceptHeader = req.headers.accept;
  const wantsStream =
    (typeof acceptHeader === 'string' && acceptHeader.includes('text/event-stream')) ||
    (typeof body === 'object' &&
      body !== null &&
      (body as { stream?: unknown }).stream === true);

  if (wantsStream) {
    let streamStarted = false;
    const sendSse = (event: string, data: unknown) => {
      if (res.writableEnded) return;
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const preflightError = await handlePublicChatStreamRequest(body, rawIp, {
      onStartStream: () => {
        streamStarted = true;
        res.statusCode = 200;
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
      res.statusCode = preflightError.status;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(preflightError.body));
    } else if (streamStarted && !res.writableEnded) {
      res.end();
    }
    return;
  }

  const result = await handlePublicChatRequest(body, rawIp);

  if (result.headers) {
    for (const [key, value] of Object.entries(result.headers)) {
      res.setHeader(key, value);
    }
  }
  res.statusCode = result.status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(result.body));
}
