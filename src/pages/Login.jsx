import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { ProfessionalService, ClientReferralService } from '@/lib/entities';
import { validateReturnUrl } from '@/lib/security';
import { Button } from '@/componentes/interface do usuário/button';
import { Input } from '@/componentes/interface do usuário/input';
import { Label } from '@/componentes/interface do usuário/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/componentes/interface do usuário/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/componentes/interface do usuário/tabs';
import { Alert, AlertDescription } from '@/componentes/interface do usuário/alert';
import { Loader2, Mail, Lock, User, Building2, Gift, Phone } from 'lucide-react';

// Função para traduzir erros do Supabase para mensagens amigáveis
const translateSupabaseError = (error) => {
  // Capturar todas as informações possíveis do erro
  const message = error?.message || error || '';
  const errorCode = error?.code || error?.error_code || '';
  const errorDetails = error?.details || error?.hint || error?.cause?.message || '';

  // Combinar todas as informações para busca
  const fullErrorText = `${message} ${errorCode} ${errorDetails} ${JSON.stringify(error)}`.toLowerCase();

  // Log para debug
  console.log('Erro recebido:', { message, errorCode, errorDetails, fullError: error });

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
  console.error('Erro não traduzido:', message, errorCode, error);
  return 'Ocorreu um erro inesperado. Verifique se seus dados estão corretos ou tente novamente mais tarde.';
};

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signUp, isAuthenticated, isLoadingAuth } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [userType, setUserType] = useState('cliente');

  // Referral code state
  const [referralCode, setReferralCode] = useState('');
  const [referrerName, setReferrerName] = useState('');

  // Validar returnUrl para prevenir Open Redirect attacks
  const rawReturnUrl = searchParams.get('returnUrl');
  const returnUrl = validateReturnUrl(rawReturnUrl);
  const refCode = searchParams.get('ref');

  // Format phone number as user types
  const formatPhoneInput = (value) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');

    // Limit to 11 digits (DDD + 9 digits)
    const limited = digits.slice(0, 11);

    // Format as (XX) XXXXX-XXXX
    if (limited.length <= 2) {
      return limited;
    } else if (limited.length <= 7) {
      return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
    } else {
      return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
    }
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneInput(e.target.value);
    setRegisterPhone(formatted);
  };

  useEffect(() => {
    if (isAuthenticated && !isLoadingAuth) {
      // returnUrl já foi validada e decodificada pelo validateReturnUrl
      navigate(returnUrl);
    }
  }, [isAuthenticated, isLoadingAuth, navigate, returnUrl]);

  // Capture referral code from URL ou localStorage (pode ser de profissional ou cliente)
  useEffect(() => {
    const captureReferralCode = async () => {
      if (refCode) {
        // Código veio da URL - validar e salvar
        try {
          const referrerProfessional = await ProfessionalService.findByReferralCode(refCode);
          if (referrerProfessional) {
            setReferralCode(refCode);
            setReferrerName(referrerProfessional.name);
            localStorage.setItem('referral_code', refCode);
            localStorage.setItem('referrer_name', referrerProfessional.name);
          } else {
            const referrerClient = await ClientReferralService.findByReferralCode(refCode);
            if (referrerClient) {
              setReferralCode(refCode);
              setReferrerName(referrerClient.full_name || '');
              localStorage.setItem('referral_code', refCode);
              localStorage.setItem('referrer_name', referrerClient.full_name || '');
            }
          }
        } catch (error) {
          // Ignorar código de referral inválido
        }
      } else {
        // Verificar se tem código salvo no localStorage (pode ter vindo da Home)
        const storedCode = localStorage.getItem('referral_code');
        const storedName = localStorage.getItem('referrer_name');
        if (storedCode) {
          setReferralCode(storedCode);
          if (storedName) {
            setReferrerName(storedName);
          }
        }
      }
    };
    captureReferralCode();
  }, [refCode]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await signIn(loginEmail, loginPassword);
      // returnUrl já foi validada pelo validateReturnUrl
      navigate(returnUrl);
    } catch (err) {
      setError(translateSupabaseError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    if (registerPassword !== registerConfirmPassword) {
      setError('As senhas não coincidem.');
      setIsLoading(false);
      return;
    }

    if (registerPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      setIsLoading(false);
      return;
    }

    // Validate phone number (must have at least 10 digits)
    const phoneDigits = registerPhone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      setError('Digite um número de telefone válido com DDD.');
      setIsLoading(false);
      return;
    }

    try {
      await signUp(registerEmail, registerPassword, {
        full_name: registerName,
        phone: phoneDigits, // Send only digits, trigger will format
        user_type: userType,
        referred_by_code: referralCode || null
      });
      setSuccess('Cadastro realizado! Verifique seu email para confirmar sua conta.');
      setRegisterEmail('');
      setRegisterPassword('');
      setRegisterConfirmPassword('');
      setRegisterName('');
      setRegisterPhone('');
      localStorage.removeItem('referral_code');
      localStorage.removeItem('referrer_name');
    } catch (err) {
      setError(translateSupabaseError(err));
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-orange-600">ConectPro</CardTitle>
          <CardDescription>Acesse sua conta ou cadastre-se</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="register">Cadastrar</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Sua senha"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Entrar
                </Button>

                <div className="text-center text-sm mt-4">
                  <Link to="/forgot-password" className="text-orange-600 hover:underline">
                    Esqueceu a senha?
                  </Link>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                {referralCode && (
                  <Alert className="border-purple-500 bg-purple-50">
                    <Gift className="h-4 w-4 text-purple-600" />
                    <AlertDescription className="text-purple-700">
                      {referrerName
                        ? `Você foi indicado por ${referrerName}!`
                        : 'Você foi indicado! Seu cadastro ajudará quem te indicou.'}
                    </AlertDescription>
                  </Alert>
                )}

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="border-green-500 bg-green-50">
                    <AlertDescription className="text-green-700">{success}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="register-name">Nome completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="register-name"
                      type="text"
                      placeholder="Seu nome"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-phone">WhatsApp / Telefone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="register-phone"
                      type="tel"
                      placeholder="(47) 98486-7906"
                      value={registerPhone}
                      onChange={handlePhoneChange}
                      className="pl-10"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500">Digite o DDD + número com 9 digitos</p>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de conta</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={userType === 'cliente' ? 'default' : 'outline'}
                      className={userType === 'cliente' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                      onClick={() => setUserType('cliente')}
                    >
                      <User className="h-4 w-4 mr-2" />
                      Cliente
                    </Button>
                    <Button
                      type="button"
                      variant={userType === 'profissional' ? 'default' : 'outline'}
                      className={userType === 'profissional' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                      onClick={() => setUserType('profissional')}
                    >
                      <Building2 className="h-4 w-4 mr-2" />
                      Profissional
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-confirm-password">Confirmar senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="register-confirm-password"
                      type="password"
                      placeholder="Repita a senha"
                      value={registerConfirmPassword}
                      onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Criar conta
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  Ao criar uma conta, você concorda com nossos{' '}
                  <Link to="/termos" className="text-orange-600 hover:underline">
                    Termos de Uso
                  </Link>{' '}
                  e{' '}
                  <Link to="/privacidade" className="text-orange-600 hover:underline">
                    Política de Privacidade
                  </Link>
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
