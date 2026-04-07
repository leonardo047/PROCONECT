import React from 'react';
import { MessageCircle } from "lucide-react";

export default function FloatingWhatsAppButton({ whatsapp, professionalName }) {
  if (!whatsapp) return null;

  const handleClick = () => {
    const phone = whatsapp.replace(/\D/g, '');
    const message = encodeURIComponent(
      `Ola${professionalName ? ` ${professionalName}` : ''}! Vi seu perfil no ConectPro e gostaria de saber mais sobre seus serviços.`
    );
    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-50 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110 flex items-center gap-2 group"
      aria-label="Conversar no WhatsApp"
    >
      <MessageCircle className="w-6 h-6" />
      <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap">
        WhatsApp
      </span>
    </button>
  );
}
