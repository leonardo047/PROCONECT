import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { ProfessionalService } from '@/lib/entities';
import { Button } from '@/componentes/interface do usuário/button';
import { Input } from '@/componentes/interface do usuário/input';
import { Label } from '@/componentes/interface do usuário/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/componentes/interface do usuário/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/componentes/interface do usuário/tabs';
import { Alert, AlertDescription } from '@/componentes/interface do usuário/alert';
import { Loader2, Mail, Lock, User, Building2, Gift } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signUp, signInWithProvider, isAuthenticated, isLoadingAuth } = useAuth();

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
  const [userType, setUserType] = useState('cliente');

  // Referral code state
  const [referralCode, setReferralCode] = useState('');
  const [referrerName, setReferrerName] = useState('');

  const returnUrl = searchParams.get('returnUrl') || '/';
  const refCode = searchParams.get('ref');

  useEffect(() => {
    if (isAuthenticated && !isLoadingAuth) {
      navigate(decodeURIComponent(returnUrl));
    }
  }, [isAuthenticated, isLoadingAuth, navigate, returnUrl]);

  // Capture referral code from URL
  useEffect(() => {
    const captureReferralCode = async () => {
      if (refCode) {
        try {
          const referrer = await ProfessionalService.findByReferralCode(refCode);
          if (referrer) {
            setReferralCode(refCode);
            setReferrerName(referrer.name);
            localStorage.setItem('referral_code', refCode);
          }
        } catch (error) {
          console.error('Invalid referral code:', error);
        }
      } else {
        const storedCode = localStorage.getItem('referral_code');
        if (storedCode) {
          setReferralCode(storedCode);
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
      navigate(decodeURIComponent(returnUrl));
    } catch (err) {
      setError(err.message || 'Erro ao fazer login. Verifique suas credenciais.');
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

    try {
      await signUp(registerEmail, registerPassword, {
        full_name: registerName,
        user_type: userType,
        referred_by_code: referralCode || null
      });
      setSuccess('Cadastro realizado! Verifique seu email para confirmar sua conta.');
      setRegisterEmail('');
      setRegisterPassword('');
      setRegisterConfirmPassword('');
      setRegisterName('');
      localStorage.removeItem('referral_code');
    } catch (err) {
      setError(err.message || 'Erro ao criar conta. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');

    try {
      await signInWithProvider('google');
    } catch (err) {
      setError(err.message || 'Erro ao fazer login com Google.');
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
          <CardTitle className="text-2xl font-bold text-orange-600">ProObra</CardTitle>
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

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">ou continue com</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                >
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </Button>

                <div className="text-center text-sm">
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
                        ? `Voce foi indicado por ${referrerName}!`
                        : 'Voce foi indicado! Seu cadastro ajudara quem te indicou.'}
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
