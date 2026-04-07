/**
 * Utilitários de segurança para o aplicativo
 */

/**
 * Valida se uma URL de retorno é segura (contra Open Redirect)
 * Apenas permite URLs relativas ou do mesmo domínio
 *
 * @param {string} url - URL a validar
 * @param {string[]} allowedHosts - Lista de hosts permitidos (opcional)
 * @returns {string} URL segura ou '/' se inválida
 */
export const validateReturnUrl = (url, allowedHosts = []) => {
  // URL vazia ou nula - retornar home
  if (!url || typeof url !== 'string') {
    return '/';
  }

  // Decodificar se necessário
  let decodedUrl = url;
  try {
    // Tentar decodificar (pode já estar decodificada)
    if (url.includes('%')) {
      decodedUrl = decodeURIComponent(url);
    }
  } catch {
    return '/';
  }

  // Remover espaços em branco
  decodedUrl = decodedUrl.trim();

  // Bloquear URLs vazias
  if (!decodedUrl) {
    return '/';
  }

  // Bloquear protocolos perigosos
  const dangerousProtocols = [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    'ftp:',
    'blob:'
  ];

  const lowerUrl = decodedUrl.toLowerCase();
  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return '/';
    }
  }

  // Bloquear // no início (protocol-relative URL)
  if (decodedUrl.startsWith('//')) {
    return '/';
  }

  // Bloquear \ (backslash pode ser interpretado como / em alguns navegadores)
  if (decodedUrl.includes('\\')) {
    return '/';
  }

  // Se começa com / mas não com // - é uma URL relativa segura
  if (decodedUrl.startsWith('/') && !decodedUrl.startsWith('//')) {
    // Garantir que não há tentativas de escape
    // Bloquear /\ ou /. seguido de / (path traversal)
    if (/^\/[\\.]/.test(decodedUrl)) {
      return '/';
    }
    return decodedUrl;
  }

  // Se é uma URL absoluta, verificar se é do mesmo domínio
  try {
    const urlObj = new URL(decodedUrl, window.location.origin);

    // Verificar se é do mesmo host
    if (urlObj.host === window.location.host) {
      return urlObj.pathname + urlObj.search + urlObj.hash;
    }

    // Verificar hosts permitidos
    if (allowedHosts.length > 0 && allowedHosts.includes(urlObj.host)) {
      return decodedUrl;
    }

    // Host diferente não permitido
    return '/';
  } catch {
    // URL inválida
    return '/';
  }
};

/**
 * Sanitiza uma string para uso seguro em contextos HTML
 * NOTA: React já faz isso automaticamente, mas útil para casos especiais
 *
 * @param {string} str - String a sanitizar
 * @returns {string} String sanitizada
 */
export const sanitizeHtml = (str) => {
  if (!str || typeof str !== 'string') {
    return '';
  }

  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };

  return str.replace(/[&<>"']/g, (char) => map[char]);
};

/**
 * Valida e sanitiza campos de filtro para queries
 * Previne injection de operadores Supabase
 *
 * @param {Object} filters - Objeto com filtros
 * @param {string[]} allowedFields - Lista de campos permitidos
 * @returns {Object} Filtros sanitizados
 */
export const sanitizeQueryFilters = (filters, allowedFields) => {
  if (!filters || typeof filters !== 'object') {
    return {};
  }

  const sanitized = {};

  for (const [key, value] of Object.entries(filters)) {
    // Verificar se o campo é permitido
    if (!allowedFields.includes(key)) {
      console.warn(`Campo não permitido ignorado: ${key}`);
      continue;
    }

    // Verificar se não há tentativas de injection
    const keyLower = key.toLowerCase();
    if (keyLower.includes('or=') || keyLower.includes('and=') ||
        keyLower.includes('not=') || keyLower.includes('select=')) {
      console.warn(`Possível tentativa de injection detectada: ${key}`);
      continue;
    }

    // Sanitizar valores de array
    if (Array.isArray(value)) {
      sanitized[key] = value.map(v => {
        if (typeof v === 'string') {
          // Remover caracteres perigosos
          return v.replace(/[;'"\\]/g, '');
        }
        return v;
      });
    } else if (typeof value === 'string') {
      // Sanitizar strings
      sanitized[key] = value.replace(/[;'"\\]/g, '');
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Gera um código aleatório seguro (usando crypto API)
 *
 * @param {number} length - Tamanho do código
 * @param {string} chars - Caracteres permitidos
 * @returns {string} Código gerado
 */
export const generateSecureCode = (length = 8, chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789') => {
  // Usar crypto.getRandomValues para aleatoriedade criptograficamente segura
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);

  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[array[i] % chars.length];
  }

  return code;
};

/**
 * Valida se uma extensão de arquivo é permitida
 *
 * @param {string} filename - Nome do arquivo
 * @param {string[]} allowedExtensions - Extensões permitidas (sem ponto)
 * @returns {boolean} Se a extensão é permitida
 */
export const isAllowedFileExtension = (filename, allowedExtensions) => {
  if (!filename || typeof filename !== 'string') {
    return false;
  }

  const ext = filename.split('.').pop()?.toLowerCase();
  return allowedExtensions.includes(ext);
};

/**
 * Gera um nome de arquivo seguro e único
 *
 * @param {string} originalName - Nome original do arquivo
 * @returns {string} Nome seguro
 */
export const generateSafeFileName = (originalName) => {
  // Extrair extensão de forma segura
  const parts = originalName.split('.');
  const ext = parts.length > 1 ? parts.pop().toLowerCase() : '';

  // Gerar nome único com timestamp e random
  const timestamp = Date.now();
  const random = generateSecureCode(8);

  return ext ? `${timestamp}-${random}.${ext}` : `${timestamp}-${random}`;
};
