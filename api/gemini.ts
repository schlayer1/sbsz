/**
 * Vercel Serverless Function: /api/gemini
 * Schützt den GEMINI_API_KEY serverseitig als Vercel Secret.
 * Unterstützt Text-Feedback/Didaktik-Radar sowie multimodale IHK-Lösungsbogen-Erkennung.
 */

const CANDIDATE_FLASH_MODELS = [
  'gemini-4-hydrogen',
  'gemini-flash-lite-latest',
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-flash-latest',
];

const REQUEST_TIMEOUT_MS = 50000;

function isOriginAllowed(urlStr: string, requestHost: string): boolean {
  try {
    const parsed = new URL(urlStr);
    const hostname = parsed.hostname.toLowerCase();
    const host = parsed.host.toLowerCase();
    if (requestHost && host === requestHost.toLowerCase()) return true;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    const extraOrigins = (process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    return extraOrigins.includes(parsed.origin.toLowerCase());
  } catch {
    return false;
  }
}

function applyOriginProtection(req: any, res: any): boolean {
  const rawHost = req.headers?.['x-forwarded-host'] || req.headers?.host || '';
  const requestHost = (Array.isArray(rawHost) ? rawHost[0] : String(rawHost)).split(',')[0].trim();
  const rawOrigin = req.headers?.origin;
  const origin = Array.isArray(rawOrigin) ? rawOrigin[0] : (rawOrigin || '');
  const rawReferer = req.headers?.referer;
  const referer = Array.isArray(rawReferer) ? rawReferer[0] : (rawReferer || '');

  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Vary', 'Origin');

  if (origin && isOriginAllowed(origin, requestHost)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  if (req.method === 'OPTIONS') {
    if (origin && !isOriginAllowed(origin, requestHost)) {
      res.status(403).json({ error: 'CORS: Herkunft nicht erlaubt.' });
      return false;
    }
    res.status(200).end();
    return false;
  }

  if (origin) {
    if (!isOriginAllowed(origin, requestHost)) {
      res.status(403).json({ error: 'Zugriff verweigert: Unzulässige Herkunft (Origin).' });
      return false;
    }
    return true;
  }

  if (referer && isOriginAllowed(referer, requestHost)) {
    return true;
  }

  res.status(403).json({ error: 'Zugriff verweigert: Fehlender Origin-Header.' });
  return false;
}

export default async function handler(req: any, res: any) {
  if (!applyOriginProtection(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Nur POST-Anfragen sind für /api/gemini zulässig.' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ error: 'Ungültiges JSON im Request-Body.' });
      }
    }
    body = body || {};

    const {
      systemInstruction,
      systemPrompt,
      contents,
      parts,
      userPrompt,
      model,
      temperature = 0.4,
      responseMimeType,
      maxOutputTokens = 2048,
    } = body;

    const clientKey =
      typeof body.apiKey === 'string' && body.apiKey.trim() && body.apiKey.trim() !== 'serverless-proxy'
        ? body.apiKey.trim()
        : '';
    const serverKey = (process.env.GEMINI_API_KEY || '').trim();
    const activeKey = clientKey || serverKey;

    if (!activeKey) {
      return res.status(401).json({
        error:
          'Kein Gemini API-Schlüssel konfiguriert. Bitte hinterlege GEMINI_API_KEY in Vercel als Secret oder im Lehrer-Dashboard.',
      });
    }

    let finalContents: any[] = [];
    if (Array.isArray(contents) && contents.length > 0) {
      finalContents = contents;
    } else if (Array.isArray(parts) && parts.length > 0) {
      finalContents = [{ role: 'user', parts }];
    } else if (userPrompt) {
      finalContents = [{ role: 'user', parts: [{ text: String(userPrompt) }] }];
    } else {
      return res.status(400).json({ error: 'contents, parts oder userPrompt erforderlich.' });
    }

    const candidateModels: string[] = [];
    if (typeof model === 'string' && model.trim() && model !== 'auto') {
      candidateModels.push(model.trim());
    }
    for (const m of CANDIDATE_FLASH_MODELS) {
      if (!candidateModels.includes(m)) {
        candidateModels.push(m);
      }
    }

    const resolvedSys = systemInstruction || systemPrompt;
    let lastErrorMessage = '';

    for (const currentModel of candidateModels) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(currentModel)}:generateContent?key=${encodeURIComponent(activeKey)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const generationConfig: Record<string, any> = {
          temperature: typeof temperature === 'number' ? temperature : 0.4,
          maxOutputTokens: typeof maxOutputTokens === 'number' ? Math.min(maxOutputTokens, 8192) : 2048,
        };
        if (responseMimeType === 'application/json') {
          generationConfig.responseMimeType = 'application/json';
        }

        const payload: Record<string, any> = {
          contents: finalContents,
          generationConfig,
        };
        if (typeof resolvedSys === 'string' && resolvedSys.trim()) {
          payload.systemInstruction = { parts: [{ text: resolvedSys }] };
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify(payload),
        });

        clearTimeout(timeoutId);
        const data: any = await response.json().catch(() => null);

        if (response.ok && data) {
          const firstCandidate = data.candidates?.[0];
          const text = firstCandidate?.content?.parts?.[0]?.text;
          if (typeof text === 'string' && text.trim().length > 0) {
            return res.status(200).json({ text, model: currentModel });
          }

          const finishReason = firstCandidate?.finishReason;
          lastErrorMessage = finishReason
            ? `Modell ${currentModel} beendet mit Status "${finishReason}".`
            : `Modell ${currentModel} lieferte eine leere Antwort.`;
          continue;
        }

        const errMsg = data?.error?.message || `HTTP ${response.status}`;
        lastErrorMessage = errMsg;

        if (
          response.status === 400 &&
          (errMsg.includes('API_KEY_INVALID') || errMsg.includes('key not valid'))
        ) {
          return res.status(400).json({ error: 'Der Gemini API-Schlüssel ist ungültig.' });
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        lastErrorMessage =
          err?.name === 'AbortError'
            ? `Zeitüberschreitung nach ${REQUEST_TIMEOUT_MS / 1000}s bei Modell ${currentModel}`
            : err?.message || String(err);
      }
    }

    return res.status(502).json({
      error: `Kein Gemini-Modell erreichbar. Letzter Fehler: ${lastErrorMessage}`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Interner Serverfehler im Gemini-Proxy.' });
  }
}
