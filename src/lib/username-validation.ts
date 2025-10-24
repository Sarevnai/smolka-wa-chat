/**
 * Validação de username para o sistema de identificação
 * Fase 5: Guard-rails preventivos
 */

export const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/;

export interface UsernameValidation {
  isValid: boolean;
  error?: string;
}

/**
 * Valida o formato de um username
 * - Apenas letras minúsculas, números e underscore
 * - Entre 3 e 30 caracteres
 */
export function validateUsername(username: string): UsernameValidation {
  if (!username || username.length === 0) {
    return {
      isValid: false,
      error: 'Username não pode estar vazio'
    };
  }

  if (username.length < 3) {
    return {
      isValid: false,
      error: 'Username deve ter pelo menos 3 caracteres'
    };
  }

  if (username.length > 30) {
    return {
      isValid: false,
      error: 'Username deve ter no máximo 30 caracteres'
    };
  }

  if (!USERNAME_REGEX.test(username)) {
    return {
      isValid: false,
      error: 'Username deve conter apenas letras minúsculas, números e underscore'
    };
  }

  // Verificar se começa com número
  if (/^\d/.test(username)) {
    return {
      isValid: false,
      error: 'Username não pode começar com número'
    };
  }

  return { isValid: true };
}

/**
 * Sanitiza um input de username removendo caracteres inválidos
 */
export function sanitizeUsername(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 30);
}

/**
 * Gera um username válido baseado em um nome
 */
export function generateUsernameFromName(name: string): string {
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20);

  // Se começar com número, adiciona prefixo
  if (/^\d/.test(sanitized)) {
    return 'user_' + sanitized;
  }

  return sanitized || 'user';
}
