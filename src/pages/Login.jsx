import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { ProfessionalService, ClientReferralService } from '@/lib/entities';
import { validateReturnUrl } from '@/lib/security';
import { translateSupabaseError } from '@/utils/translateSupabaseError';
import { Button } from '@/componentes/interface do usuário/button';
import { Input } from '@/componentes/interface do usuário/input';
import { Label } from '@/componentes/interface do usuário/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/componentes/interface do usuário/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/componentes/interface do usuário/tabs';
import { Alert, AlertDescription } from '@/componentes/interface do usuário/alert';
import { Loader2, Mail, Lock, User, Gift, Phone, Eye, EyeOff } from 'lucide-react';

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

  // Referral code state
  const [referralCode, setReferralCode] = useState('');
  const [referrerName, setReferrerName] = useState('');

  // Password visibility state
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

    // Validação robusta de senha
    if (registerPassword.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      setIsLoading(false);
      return;
    }
    if (!/[A-Z]/.test(registerPassword)) {
      setError('A senha deve conter pelo menos uma letra maiúscula.');
      setIsLoading(false);
      return;
    }
    if (!/[0-9]/.test(registerPassword)) {
      setError('A senha deve conter pelo menos um número.');
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
      // Todos os novos usuários começam como cliente
      // Podem virar profissional depois pelo menu
      await signUp(registerEmail, registerPassword, {
        full_name: registerName,
        phone: phoneDigits, // Send only digits, trigger will format
        user_type: 'cliente',
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
          <CardTitle className="text-2xl font-bold text-purple-600">ConnectPro</CardTitle>
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
                      type={showLoginPassword ? "text" : "password"}
                      placeholder="Sua senha"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
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
                  <Label htmlFor="register-password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="register-password"
                      type={showRegisterPassword ? "text" : "password"}
                      placeholder="Mín. 8 chars, maiúscula e número"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      {showRegisterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-confirm-password">Confirmar senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="register-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Repita a senha"
                      value={registerConfirmPassword}
                      onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
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
