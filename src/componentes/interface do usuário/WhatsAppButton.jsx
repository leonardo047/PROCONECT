import React from 'react';
import { Button } from "@/componentes/interface do usuário/button";
import { MessageCircle } from "lucide-react";

export default function WhatsAppButton({ phone, professionalName, disabled = false, className = "" }) {
  const handleClick = () => {
    if (disabled) return;
    
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Olá ${professionalName}! Vi seu perfil no app e gostaria de solicitar um orçamento.`);
    window.open(`https://wa.me/55${cleanPhone}?text=${message}`, '_blank');
  };
  
  return (
    <Button 
      onClick={handleClick}
      disabled={disabled}
      className={`bg-green-500 hover:bg-green-600 text-white font-semibold gap-2 ${className}`}
    >
      <MessageCircle className="w-5 h-5" />
      {disabled ? "Assine para ver contato" : "Chamar no WhatsApp"}
    </Button>
  );
}