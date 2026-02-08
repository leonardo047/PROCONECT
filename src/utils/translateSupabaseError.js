/**
 * Traduz erros do Supabase para mensagens amigáveis em português
 * @param {Error|string|object} error - O erro retornado pelo Supabase
 * @returns {string} Mensagem de erro traduzida
 */
export const translateSupabaseError = (error) => {
  // Capturar todas as informações possíveis do erro
  const message = error?.message || error || '';
  const errorCode = error?.code || error?.error_code || '';
  const errorDetails = error?.details || error?.hint || error?.cause?.message || '';

  // Combinar todas as informações para busca
  const fullErrorText = `${message} ${errorCode} ${errorDetails} ${JSON.stringify(error)}`.toLowerCase();

  // PRIORIDADE 1: Erros de constraint de banco de dados (mais específicos)
  // Telefone duplicado - verificar primeiro pois é o erro mais comum
  if (fullErrorText.includes('users_phone_key') ||
      fullErrorText.includes('phone_key') ||
      (fullErrorText.includes('duplicate') && fullErrorText.includes('phone')) ||
      (fullErrorText.includes('unique') && fullErrorText.includes('phone')) ||
      (fullErrorText.includes('already') && fullErrorText.includes('phone'))) {
    return 'Este número de telefone já está cadastrado em outra conta. Por favor, use um número diferente ou faça login com o email associado a esse telefone.';
  }

  // Email duplicado
  if (fullErrorText.includes('users_email_key') ||
      fullErrorText.includes('email_key') ||
      (fullErrorText.includes('duplicate') && fullErrorText.includes('email')) ||
      (fullErrorText.includes('unique') && fullErrorText.includes('email'))) {
    return 'Este email já está cadastrado. Faça login ou use a opção "Esqueceu a senha?" para recuperar sua conta.';
  }

  // PRIORIDADE 2: Erros de cadastro do Supabase Auth
  if (message.includes('User already registered') ||
      message.includes('already been registered') ||
      message.includes('email already exists') ||
      errorCode === 'user_already_exists') {
    return 'Este email já está cadastrado. Faça login ou use a opção "Esqueceu a senha?" para recuperar sua conta.';
  }

  // PRIORIDADE 3: Erros de validação
  if (message.includes('Invalid email') || message.includes('invalid email')) {
    return 'O formato do email está inválido. Verifique e tente novamente.';
  }
  if (message.includes('Unable to validate email') || message.includes('cannot be validated')) {
    return 'Não foi possível validar o email. Verifique se digitou corretamente.';
  }

  // Erros de senha
  if (message.includes('Password should be at least') || message.includes('password is too short')) {
    return 'A senha deve ter pelo menos 6 caracteres.';
  }
  if (message.includes('password is too weak')) {
    return 'A senha é muito fraca. Use uma combinação de letras, números e símbolos.';
  }

  // PRIORIDADE 4: Erros de login
  if (message.includes('Invalid login credentials') ||
      message.includes('invalid credentials') ||
      errorCode === 'invalid_credentials') {
    return 'Email ou senha incorretos. Verifique suas credenciais e tente novamente.';
  }

  if (message.includes('User not found') ||
      message.includes('user not found') ||
      errorCode === 'user_not_found') {
    return 'Nenhuma conta encontrada com este email. Verifique o email ou crie uma nova conta.';
  }

  // Erros de confirmação de email
  if (message.includes('Email not confirmed') ||
      message.includes('email not verified') ||
      errorCode === 'email_not_confirmed') {
    return 'Seu email ainda não foi confirmado. Verifique sua caixa de entrada (e spam) e clique no link de confirmação.';
  }

  // Link expirado ou inválido
  if (message.includes('link is invalid') ||
      message.includes('link has expired') ||
      message.includes('expired') ||
      errorCode === 'otp_expired') {
    return 'O link expirou ou é inválido. Solicite um novo link de acesso.';
  }

  // Conta desativada ou banida
  if (message.includes('User is banned') ||
      message.includes('account has been disabled') ||
      errorCode === 'user_banned') {
    return 'Sua conta foi desativada. Entre em contato com o suporte para mais informações.';
  }

  // Rate limiting
  if (message.includes('Too many requests') ||
      message.includes('rate limit') ||
      errorCode === 'over_request_rate_limit') {
    return 'Muitas tentativas. Por segurança, aguarde alguns minutos antes de tentar novamente.';
  }

  // Cadastros desativados
  if (message.includes('Signups not allowed') || message.includes('signups are disabled')) {
    return 'Novos cadastros estão temporariamente desativados. Tente novamente mais tarde.';
  }

  // PRIORIDADE 5: Erros genéricos de banco de dados - tentar identificar a causa
  if (fullErrorText.includes('database error') || fullErrorText.includes('unexpected_failure')) {
    // Verificar se tem alguma pista sobre o campo problemático
    if (fullErrorText.includes('phone') || fullErrorText.includes('telefone')) {
      return 'Este número de telefone já está cadastrado em outra conta. Por favor, use um número diferente.';
    }
    if (fullErrorText.includes('email')) {
      return 'Este email já está cadastrado. Faça login ou recupere sua senha.';
    }
    // Erro de banco genérico
    return 'Ocorreu um erro ao processar seu cadastro. Verifique se o email e telefone não estão cadastrados em outra conta.';
  }

  // PRIORIDADE 6: Erros de conexão/rede
  if (message.includes('network') ||
      message.includes('fetch') ||
      message.includes('Failed to fetch') ||
      message.includes('NetworkError') ||
      message.includes('timeout')) {
    return 'Erro de conexão. Verifique sua internet e tente novamente.';
  }

  // Servidor indisponível
  if (message.includes('503') || message.includes('Service Unavailable')) {
    return 'Serviço temporariamente indisponível. Tente novamente em alguns instantes.';
  }

  // Erro interno do servidor
  if (message.includes('500') || message.includes('Internal Server Error')) {
    return 'Ocorreu um erro no servidor. Tente novamente em alguns instantes.';
  }

  // Se não conseguir traduzir, retorna mensagem genérica mas útil
  return 'Ocorreu um erro inesperado. Verifique se seus dados estão corretos ou tente novamente mais tarde.';
};

export default translateSupabaseError;
