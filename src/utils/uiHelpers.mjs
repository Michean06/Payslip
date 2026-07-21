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
