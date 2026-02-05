import React, { useState, useEffect } from 'react';
import { useAuth } from "@/lib/AuthContext";
import { Professional, Appointment, Availability, User } from "@/lib/entities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/interface do usuário/card";
import { Button } from "@/componentes/interface do usuário/button";
import { Badge } from "@/componentes/interface do usuário/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/componentes/interface do usuário/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentes/interface do usuário/select";
import { Label } from "@/componentes/interface do usuário/label";
import { Calendar, Clock, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import AppointmentCard from "@/componentes/agendamentos/AppointmentCard";

const daysOfWeek = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' }
];

export default function ProfessionalSchedule() {
  const queryClient = useQueryClient();
  const { user, navigateToLogin, isLoadingAuth, isAuthenticated } = useAuth();
  const [editingDay, setEditingDay] = useState(null);
  const [redirecting, setRedirecting] = useState(false);
  const [timeConfig, setTimeConfig] = useState({
    start_time: '08:00',
    end_time: '18:00',
    is_available: true
  });

  // Usar React Query para carregar professional
  const { data: professional = null, isLoading: loadingProfessional, isError: errorProfessional } = useQuery({
    queryKey: ['my-professional', user?.id],
    queryFn: async () => {
      try {
        const profResults = await Professional.filter({ filters: { user_id: user.id } });
        return profResults[0] || null;
      } catch (error) {
        return null;
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated && !redirecting) {
      setRedirecting(true);
      setTimeout(() => navigateToLogin(), 100);
    }
  }, [isLoadingAuth, isAuthenticated, navigateToLogin, redirecting]);

  const { data: appointments = [], isLoading: loadingAppointments } = useQuery({
    queryKey: ['professional-appointments', professional?.id],
    queryFn: async () => {
      if (!professional) return [];
      return await Appointment.filter(
        { professional_id: professional.id },
        { order: '-created_date', limit: 100 }
      );
    },
    enabled: !!professional
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', appointments.map(a => a.client_id)],
    queryFn: async () => {
      if (appointments.length === 0) return [];
      const clientIds = [...new Set(appointments.map(a => a.client_id))];
      const users = await User.list();
      return users.filter(u => clientIds.includes(u.id));
    },
    enabled: appointments.length > 0
  });

  const { data: availability = [], isLoading: loadingAvailability } = useQuery({
    queryKey: ['professional-availability', professional?.id],
    queryFn: async () => {
      if (!professional) return [];
      return await Availability.filter(
        { professional_id: professional.id }
      );
    },
    enabled: !!professional
  });

  const saveAvailabilityMutation = useMutation({
    mutationFn: async ({ day, config }) => {
      const existing = availability.find(a => a.day_of_week === day);

      if (existing) {
        await Availability.update(existing.id, config);
      } else {
        await Availability.create({
          professional_id: professional.id,
          day_of_week: day,
          ...config
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professional-availability'] });
      setEditingDay(null);
    }
  });

  const handleSaveDay = (day) => {
    saveAvailabilityMutation.mutate({ day, config: timeConfig });
  };

  const pendingAppointments = appointments.filter(a => a.status === 'pending');
  const acceptedAppointments = appointments.filter(a => a.status === 'accepted');
  const otherAppointments = appointments.filter(a => !['pending', 'accepted'].includes(a.status));

  // Mostrar loading enquanto verifica autenticação ou está redirecionando
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
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Minha Agenda</h1>
          <p className="text-slate-600">Gerencie seus agendamentos e disponibilidade</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-2 border-yellow-200 bg-yellow-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Pendentes</p>
                  <p className="text-3xl font-bold text-yellow-700">{pendingAppointments.length}</p>
                </div>
                <AlertCircle className="w-12 h-12 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-200 bg-green-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Aceitos</p>
                  <p className="text-3xl font-bold text-green-700">{acceptedAppointments.length}</p>
                </div>
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Total</p>
                  <p className="text-3xl font-bold text-blue-700">{appointments.length}</p>
                </div>
                <Calendar className="w-12 h-12 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="bg-white shadow-sm border">
            <TabsTrigger value="pending">
              Pendentes ({pendingAppointments.length})
            </TabsTrigger>
            <TabsTrigger value="accepted">
              Aceitos ({acceptedAppointments.length})
            </TabsTrigger>
            <TabsTrigger value="history">
              Histórico
            </TabsTrigger>
            <TabsTrigger value="availability">
              Disponibilidade
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <div className="space-y-4">
              {pendingAppointments.length > 0 ? (
                pendingAppointments.map(appointment => {
                  const client = clients.find(c => c.id === appointment.client_id);
                  return (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      isProfessional={true}
                      currentUser={user}
                      otherUser={client || { id: appointment.client_id, full_name: appointment.client_name }}
                    />
                  );
                })
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Nenhuma solicitação pendente</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="accepted">
            <div className="space-y-4">
              {acceptedAppointments.length > 0 ? (
                acceptedAppointments.map(appointment => {
                  const client = clients.find(c => c.id === appointment.client_id);
                  return (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      isProfessional={true}
                      currentUser={user}
                      otherUser={client || { id: appointment.client_id, full_name: appointment.client_name }}
                    />
                  );
                })
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Nenhum agendamento aceito</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <div className="space-y-4">
              {otherAppointments.length > 0 ? (
                otherAppointments.map(appointment => {
                  const client = clients.find(c => c.id === appointment.client_id);
                  return (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      isProfessional={true}
                      currentUser={user}
                      otherUser={client || { id: appointment.client_id, full_name: appointment.client_name }}
                    />
                  );
                })
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Nenhum registro no histórico</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="availability">
            <Card>
              <CardHeader>
                <CardTitle>Configurar Horários de Trabalho</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {daysOfWeek.map(day => {
                    const dayAvailability = availability.find(a => a.day_of_week === day.value);
                    const isEditing = editingDay === day.value;

                    return (
                      <div key={day.value} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900">{day.label}</p>
                          {isEditing ? (
                            <div className="flex gap-3 mt-2">
                              <div>
                                <Label className="text-xs">Início</Label>
                                <input
                                  type="time"
                                  value={timeConfig.start_time}
                                  onChange={(e) => setTimeConfig({ ...timeConfig, start_time: e.target.value })}
                                  className="border rounded px-2 py-1"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Término</Label>
                                <input
                                  type="time"
                                  value={timeConfig.end_time}
                                  onChange={(e) => setTimeConfig({ ...timeConfig, end_time: e.target.value })}
                                  className="border rounded px-2 py-1"
                                />
                              </div>
                            </div>
                          ) : dayAvailability ? (
                            <p className="text-sm text-slate-600 mt-1">
                              {dayAvailability.start_time} - {dayAvailability.end_time}
                            </p>
                          ) : (
                            <p className="text-sm text-slate-400 mt-1">Não configurado</p>
                          )}
                        </div>

                        <div className="flex gap-2">
                          {isEditing ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleSaveDay(day.value)}
                                disabled={saveAvailabilityMutation.isPending}
                              >
                                Salvar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingDay(null)}
                              >
                                Cancelar
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingDay(day.value);
                                if (dayAvailability) {
                                  setTimeConfig({
                                    start_time: dayAvailability.start_time,
                                    end_time: dayAvailability.end_time,
                                    is_available: dayAvailability.is_available
                                  });
                                }
                              }}
                            >
                              {dayAvailability ? 'Editar' : 'Configurar'}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
