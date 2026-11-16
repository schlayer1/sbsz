import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import geminiHandler from './api/gemini';

function geminiLocalProxyPlugin(): Plugin {
  const attach = (server: any) => {
    server.middlewares.use('/api/gemini', async (req: any, res: any) => {
      try {
        let rawBody = '';
        for await (const chunk of req) {
          rawBody += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
        }
        let body: any = {};
        if (rawBody) {
          try {
            body = JSON.parse(rawBody);
          } catch {
            body = rawBody;
          }
        }
        const mockReq = { method: req.method, headers: req.headers, body };
        const mockRes = {
          setHeader: (k: string, v: string) => res.setHeader(k, v),
          status: (code: number) => {
            res.statusCode = code;
            return {
              json: (data: any) => {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
              },
              end: () => res.end(),
            };
          },
        };
        await geminiHandler(mockReq, mockRes);
      } catch (err: any) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err?.message || 'Server error' }));
      }
    });
  };

  return {
    name: 'gemini-local-proxy',
    configureServer: attach,
    configurePreviewServer: attach,
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  for (const [k, v] of Object.entries(env)) {
    if (process.env[k] === undefined) {
      process.env[k] = v;
    }
  }

  return {
    plugins: [react(), geminiLocalProxyPlugin()],
    server: {
      port: 5173,
      host: true,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
              return 'vendor-firebase';
            }
            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-icons';
            }
          },
        },
      },
    },
  };
});
