import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('processing'); // processing, success, error
  const [message, setMessage] = useState('Verificando sua conta...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Obter os parametros da URL
        const token_hash = searchParams.get('token_hash');
        const type = searchParams.get('type');
        const error = searchParams.get('error');
        const error_description = searchParams.get('error_description');

        // Se tiver erro na URL, mostrar a mensagem
        if (error) {
          setStatus('error');
          setMessage(error_description || 'Erro ao verificar sua conta.');
          return;
        }

        // Se tiver token_hash, verificar o OTP
        if (token_hash && type) {
          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash,
            type: type,
          });

          if (verifyError) {
            console.error('Erro ao verificar token:', verifyError);
            setStatus('error');

            // Traduzir mensagens de erro comuns
            if (verifyError.message.includes('expired')) {
              setMessage('O link de confirmacao expirou. Por favor, solicite um novo email.');
            } else if (verifyError.message.includes('invalid')) {
              setMessage('Link de confirmacao inválido. Por favor, solicite um novo email.');
            } else {
              setMessage('Erro ao verificar sua conta. Tente novamente.');
            }
            return;
          }

          if (data?.session) {
            // Se for recovery (recuperação de senha), redirecionar para página de reset
            if (type === 'recovery') {
              setStatus('success');
              setMessage('Verificacao concluida! Redirecionando para definir nova senha...');
              setTimeout(() => {
                navigate('/reset-password');
              }, 1500);
              return;
            }

            setStatus('success');
            setMessage('Email confirmado com sucesso! Redirecionando...');

            // Aguardar um pouco para mostrar a mensagem de sucesso
            setTimeout(() => {
              // Redirecionar baseado no tipo de usuario
              const userType = data.session.user?.user_metadata?.user_type;
              if (userType === 'profissional') {
                navigate('/Onboarding');
              } else {
                navigate('/ClientDashboard');
              }
            }, 2000);
            return;
          }
        }

        // Verificar se já existe uma sessao (casó o usuario já esteja logado)
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          setStatus('success');
          setMessage('Você já está autenticado! Redirecionando...');
          setTimeout(() => {
            const userType = session.user?.user_metadata?.user_type;
            if (userType === 'profissional') {
              navigate('/Onboarding');
            } else {
              navigate('/ClientDashboard');
            }
          }, 1500);
          return;
        }

        // Se chegou aqui sem sessao e sem token, algo está errado
        setStatus('error');
        setMessage('Link inválido ou expirado. Por favor, faca login novamente.');

      } catch (err) {
        console.error('Erro no callback de autenticacao:', err);
        setStatus('error');
        setMessage('Ocorreu um erro inesperado. Tente novamente.');
      }
    };

    handleAuthCallback();
  }, [navigate, searchParams]);

  const handleRetryLogin = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        {status === 'processing' && (
          <>
            <Loader2 className="h-16 w-16 animate-spin text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Processando...</h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Sucesso!</h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Ops!</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <button
              onClick={handleRetryLogin}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Ir para Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
