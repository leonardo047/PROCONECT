import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Hook reutilizavel para gerenciar subscriptions do Supabase Realtime
 *
 * @param {Object} options - Opcoes de configuracao
 * @param {string} options.table - Nome da tabela para escutar
 * @param {string} options.event - Tipo de evento ('INSERT', 'UPDATE', 'DELETE', '*')
 * @param {Object} options.filter - Filtro para a subscription (ex: { column: 'appointment_id', value: '123' })
 * @param {Function} options.onInsert - Callback quando um INSERT acontece
 * @param {Function} options.onUpdate - Callback quando um UPDATE acontece
 * @param {Function} options.onDelete - Callback quando um DELETE acontece
 * @param {Function} options.onChange - Callback para qualquer mudanca
 * @param {boolean} options.enabled - Se a subscription esta habilitada (default: true)
 */
export function useSupabaseSubscription({
  table,
  event = '*',
  filter = null,
  onInsert,
  onUpdate,
  onDelete,
  onChange,
  enabled = true
}) {
  const channelRef = useRef(null);
  const callbacksRef = useRef({ onInsert, onUpdate, onDelete, onChange });

  // Atualizar refs dos callbacks sem re-criar channel
  useEffect(() => {
    callbacksRef.current = { onInsert, onUpdate, onDelete, onChange };
  }, [onInsert, onUpdate, onDelete, onChange]);

  const setupSubscription = useCallback(() => {
    if (!enabled || !table) return null;

    // Criar um nome unico para o canal
    const channelName = filter
      ? `${table}_${filter.column}_${filter.value}_${Date.now()}`
      : `${table}_all_${Date.now()}`;

    // Configurar o canal
    let channel = supabase.channel(channelName);

    // Configurar o filtro se fornecido
    const realtimeConfig = {
      event,
      schema: 'public',
      table
    };

    if (filter && filter.column && filter.value) {
      realtimeConfig.filter = `${filter.column}=eq.${filter.value}`;
    }

    channel = channel.on('postgres_changes', realtimeConfig, (payload) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;

      // Chamar callback especifico
      if (eventType === 'INSERT' && callbacksRef.current.onInsert) {
        callbacksRef.current.onInsert(newRecord);
      } else if (eventType === 'UPDATE' && callbacksRef.current.onUpdate) {
        callbacksRef.current.onUpdate(newRecord, oldRecord);
      } else if (eventType === 'DELETE' && callbacksRef.current.onDelete) {
        callbacksRef.current.onDelete(oldRecord);
      }

      // Chamar callback generico
      if (callbacksRef.current.onChange) {
        callbacksRef.current.onChange(payload);
      }
    });

    // Inscrever no canal
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        // Subscription ativa
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`[Realtime] Error subscribing to ${table}`);
      }
    });

    return channel;
  }, [table, event, filter?.column, filter?.value, enabled]);

  useEffect(() => {
    // Limpar subscription anterior
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Criar nova subscription
    channelRef.current = setupSubscription();

    // Cleanup no unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [setupSubscription]);

  // Retornar funcao para unsubscribe manual
  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  return { unsubscribe };
}

export default useSupabaseSubscription;
