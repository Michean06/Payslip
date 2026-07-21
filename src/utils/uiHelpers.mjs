export function buildApiUrl(baseUrl, path) {
  const normalizedBase = (baseUrl || '').replace(/\/+$/, '');
  const normalizedPath = (path || '').replace(/^\/+/, '');

  if (!normalizedBase) {
    return normalizedPath ? `/${normalizedPath}` : '/';
  }

  return normalizedPath ? `${normalizedBase}/${normalizedPath}` : normalizedBase;
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
    return { error: 'The API request did not return any data.' };
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
