import React, { useState, useEffect } from 'react';
import { Notification } from "@/lib/entities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/componentes/interface do usuário/button";
import { ScrollArea } from "@/componentes/interface do usuário/scroll-area";
import { Badge } from "@/componentes/interface do usuário/badge";
import {
  Bell, X, Check, Star, MessageCircle, Search,
  Shield, DollarSign, AlertTriangle, CheckCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const notificationIcons = {
  search: Search,
  message: MessageCircle,
  review: Star,
  approval: Shield,
  payment: DollarSign,
  report: AlertTriangle,
  response: MessageCircle,
  update: CheckCircle
};

const notificationColors = {
  high: 'bg-red-100 text-red-600 border-red-300',
  medium: 'bg-orange-100 text-orange-600 border-orange-300',
  low: 'bg-blue-100 text-blue-600 border-blue-300'
};

export default function NotificationPanel({ isOpen, onClose, userId }) {
  const queryClient = useQueryClient();

  const { data: notifications = [], refetch } = useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      if (!userId) return [];
      const results = await Notification.filter(
        { user_id: userId },
        '-created_date',
        50
      );
      return results;
    },
    enabled: !!userId,
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId) => {
      await Notification.update(notificationId, { is_read: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      for (const id of unreadIds) {
        await Notification.update(id, { is_read: true });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="absolute right-0 top-16 w-full sm:w-96 bg-white rounded-xl shadow-2xl border-2 border-slate-200 z-50"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold text-lg text-slate-900">Notificações</h3>
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white">{unreadCount}</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsReadMutation.mutate()}
                className="text-xs"
              >
                <Check className="w-3 h-3 mr-1" />
                Marcar todas
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Bell className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">Nenhuma notificação</p>
              <p className="text-sm text-slate-400">Você está em dia!</p>
            </div>
          ) : (
            <div className="p-2">
              {notifications.map((notification) => {
                const Icon = notificationIcons[notification.type] || Bell;
                const colorClass = notificationColors[notification.priority] || notificationColors.medium;

                return (
                  <Link
                    key={notification.id}
                    to={notification.link ? createPageUrl(notification.link.replace('/', '')) : '#'}
                    onClick={() => {
                      if (!notification.is_read) {
                        markAsReadMutation.mutate(notification.id);
                      }
                      onClose();
                    }}
                  >
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className={`p-4 rounded-lg mb-2 cursor-pointer transition-all ${
                        notification.is_read
                          ? 'bg-slate-50 hover:bg-slate-100'
                          : 'bg-orange-50 hover:bg-orange-100 border-l-4 border-orange-500'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClass} border-2`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-slate-900 mb-1">
                            {notification.title}
                          </p>
                          <p className="text-sm text-slate-600 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {new Date(notification.created_date).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-orange-500 rounded-full mt-2" />
                        )}
                      </div>
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </motion.div>
    </AnimatePresence>
  );
}
