export function buildApiUrl(baseUrl, path) {
  const normalizedBase = (baseUrl || '').replace(/\/+$/, '');
  const normalizedPath = (path || '').replace(/^\/+/, '');

  if (!normalizedBase) {
    return normalizedPath ? `/${normalizedPath}` : '/';
  }

  return normalizedPath ? `${normalizedBase}/${normalizedPath}` : normalizedBase;
}

export function getApiCandidates(baseUrl, path) {
  const normalizedPath = (path || '').replace(/^\/+/, '');
  const candidates = [];
  const seen = new Set();

  const addCandidate = (value) => {
    if (!value) {
      return;
    }

    const normalizedValue = String(value).replace(/\/+$/, '');
    if (!seen.has(normalizedValue)) {
      seen.add(normalizedValue);
      candidates.push(normalizedValue);
    }
  };

  addCandidate(buildApiUrl(baseUrl, `/${normalizedPath}`));
  addCandidate(buildApiUrl('', `/${normalizedPath}`));

  if (typeof window !== 'undefined') {
    const currentOrigin = (window.location?.origin || '').replace(/\/+$/, '');
    if (currentOrigin) {
      addCandidate(buildApiUrl(currentOrigin, `/${normalizedPath}`));
    }

    const host = String(window.location?.hostname || '').toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') {
      addCandidate(buildApiUrl('http://127.0.0.1:3000', `/${normalizedPath}`));
      addCandidate(buildApiUrl('http://localhost:3000', `/${normalizedPath}`));
    }
  }

  return candidates;
}

export async function requestApiJson(baseUrl, path, options = {}) {
  const candidates = getApiCandidates(baseUrl, path);
  let lastError = 'The API request did not return any data.';

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, options);
      const payload = await parseResponsePayload(response);

      if (response.ok && !payload?.error) {
        return { response, payload };
      }

      if (payload?.error) {
        lastError = payload.error;
      } else {
        lastError = `The request failed with status ${response.status}.`;
      }
    } catch (error) {
      lastError = error?.message || lastError;
    }
  }

  throw new Error(lastError);
}

export function getEmailButtonLabel({ alreadySent, isEditable }) {
  if (alreadySent) {
    return 'Email has been sent';
  }

  if (isEditable) {
    return 'Send Again';
  }

  return 'Email';
}

export async function parseResponsePayload(response) {
  const contentType = response?.headers?.get?.('content-type') || '';
  const text = await response?.text?.();

  if (!text) {
    const host = typeof window !== 'undefined' ? String(window.location?.hostname || '').toLowerCase() : '';
    const localHint = host === 'localhost' || host === '127.0.0.1' || host === '[::1]'
      ? ' The local API server may not be running. Start it with npm start or node server/index.js and try again.'
      : '';
    return { error: `The API request did not return any data.${localHint}` };
  }

  if (contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
    try {
      return JSON.parse(text);
    } catch {
      return { error: 'The API returned invalid JSON.' };
    }
  }

  return { error: 'The API endpoint responded with an unexpected page. Please refresh or try again later.' };
}
