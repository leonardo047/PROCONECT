import React, { useEffect } from 'react';
import { useAuth } from "@/lib/AuthContext";
import { Appointment, Professional } from "@/lib/entities";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/componentes/interface do usuário/card";
import { Loader2, Calendar } from "lucide-react";
import AppointmentCard from "@/componentes/agendamentos/AppointmentCard";

export default function ClientAppointments() {
  const { user, navigateToLogin, isLoadingAuth, isAuthenticated } = useAuth();
  const [redirecting, setRedirecting] = React.useState(false);

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated && !redirecting) {
      setRedirecting(true);
      setTimeout(() => navigateToLogin(), 100);
    }
  }, [isLoadingAuth, isAuthenticated, navigateToLogin, redirecting]);

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['my-appointments', user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        return await Appointment.filter(
          { client_id: user.id },
          { order: '-created_date', limit: 100 }
        );
      } catch (error) {
        return [];
      }
    },
    enabled: !!user,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const { data: professionals = [] } = useQuery({
    queryKey: ['professionals', appointments.map(a => a.professional_id)],
    queryFn: async () => {
      if (appointments.length === 0) return [];
      try {
        const profIds = [...new Set(appointments.map(a => a.professional_id))];
        const allProfs = await Professional.list();
        return allProfs.filter(p => profIds.includes(p.id));
      } catch (error) {
        return [];
      }
    },
    enabled: appointments.length > 0,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // Mostrar loading APENAS enquanto verifica autenticação inicial
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  // Se não está autenticado, redirecionar (o useEffect cuida disso)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Minhas Solicitações</h1>
          <p className="text-slate-600">Acompanhe seus pedidos de orçamento</p>
        </div>

        <div className="space-y-4">
          {appointments.length > 0 ? (
            appointments.map(appointment => {
              const professional = professionals.find(p => p.id === appointment.professional_id);
              return (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  isProfessional={false}
                  currentUser={user}
                  otherUser={professional || { id: appointment.professional_id, name: 'Profissional' }}
                />
              );
            })
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">Nenhuma solicitação ainda</p>
                <p className="text-sm text-slate-400 mt-2">
                  Busque profissionais e solicite orçamentos!
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
