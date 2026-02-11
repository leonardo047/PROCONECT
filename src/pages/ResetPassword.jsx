import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/componentes/interface do usuário/button';
import { Input } from '@/componentes/interface do usuário/input';
import { Label } from '@/componentes/interface do usuário/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/componentes/interface do usuário/card';
import { Alert, AlertDescription } from '@/componentes/interface do usuário/alert';
import { Loader2, Lock, CheckCircle } from 'lucide-react';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hasSession, setHasSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Verificar se o usuario tem uma sessao valida (veio do link de recovery)
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setHasSession(true);
        }
      } catch {
        // Sessão não encontrada
      } finally {
        setCheckingSession(false);
      }
    };

    checkSession();
  }, []);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Validações - mesmas regras do cadastro
    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      setIsLoading(false);
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError('A senha deve conter pelo menos uma letra maiúscula.');
      setIsLoading(false);
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError('A senha deve conter pelo menos um número.');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      setIsLoading(false);
      return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);

      // Aguardar e redirecionar para login
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      if (err.message.includes('same')) {
        setError('A nova senha não pode ser igual a senha anterior.');
      } else if (err.message.includes('weak')) {
        setError('A senha é muito fraca. Use uma senha mais forte.');
      } else {
        setError('Erro ao atualizar a senha. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-purple-600">ConnectPro</CardTitle>
            <CardDescription>Link expirado ou inválido</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                Este link de recuperação de senha é inválido ou já expirou. Por favor, solicite um novo link.
              </AlertDescription>
            </Alert>
            <Button
              onClick={() => navigate('/forgot-password')}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              Solicitar novo link
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/login')}
              className="w-full"
            >
              Voltar para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Senha alterada com sucesso!</h2>
              <p className="text-gray-600 mb-4">Você será redirecionado para a página de login...</p>
              <Loader2 className="h-6 w-6 animate-spin text-orange-500 mx-auto" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-purple-600">ConnectPro</CardTitle>
          <CardDescription>Defina sua nova senha</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Nova senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Mín. 8 chars, maiúscula e número"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repita a nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                'Salvar nova senha'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
