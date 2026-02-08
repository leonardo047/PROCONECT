import React from 'react';
import { Card } from "@/componentes/interface do usuário/card";
import { Badge } from "@/componentes/interface do usuário/badge";
import { Button } from "@/componentes/interface do usuário/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/componentes/interface do usuário/avatar";
import { MapPin, Star, Award, Zap, TrendingUp, MessageCircle, User } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import QuickContactButton from "@/componentes/profissional/QuickContactButton";

const professionLabels = {
  pintura_residencial: "Pintura Residencial e Comercial",
  pedreiro_alvenaria: "Pedreiro / Alvenaria",
  eletricista: "Elétrica",
  hidraulica: "Hidráulica",
  limpeza: "Limpeza",
  jardinagem: "Jardinagem / Roçada",
  gesso_drywall: "Gessó / Drywall",
  telhados: "Telhados",
  marido_aluguel: "Marido de Aluguel",
  carpinteiro: "Carpintaria",
  marceneiro: "Marcenaria",
  vidraceiro: "Vidraçaria",
  serralheiro: "Serralheria",
  azulejista: "Azulejista",
  ar_condicionado: "Ar Condicionado",
  dedetizacao: "Dedetização",
  mudancas: "Mudanças",
  montador_móveis: "Montador de Móveis",
  instalador_pisos: "Pisos",
  marmorista: "Marmorista",
  piscineiro: "Piscineiro",
  tapeceiro: "Tapeceiro",
  chaveiro: "Chaveiro",
  seguranca_eletronica: "Segurança Eletrônica",
  automacao: "Automação",
  energia_solar: "Energia Solar",
  impermeabilizacao: "Impermeabilização",
  arquiteto: "Arquitetura",
  engenheiro: "Engenharia",
  decorador: "Decoração",
  outros: "Outras"
};

const professionGradients = {
  pintor: "from-blue-500 to-blue-600",
  pedreiro: "from-orange-500 to-orange-600",
  eletricista: "from-yellow-500 to-yellow-600",
  encanador: "from-cyan-500 to-cyan-600",
  limpeza_residencial: "from-pink-500 to-pink-600",
  limpeza_pos_obra: "from-purple-500 to-purple-600",
  jardineiro: "from-green-500 to-green-600",
  outros: "from-slate-500 to-slate-600"
};

const levelBadges = {
  1: { icon: Zap, color: "bg-slate-500", label: "Iniciante" },
  2: { icon: TrendingUp, color: "bg-blue-500", label: "Promissor" },
  3: { icon: Star, color: "bg-purple-500", label: "Experiente" },
  4: { icon: Award, color: "bg-orange-500", label: "Expert" },
  5: { icon: Award, color: "bg-gradient-to-r from-yellow-400 to-orange-500", label: "Master" }
};

export default function ProfessionalCard({ professional, distance }) {
  // Usar avatar_url como foto principal se disponível, senão a primeira foto do array
  const mainPhoto = professional.avatar_url || professional.photos?.[0] || `https://via.placeholder.com/400x300/1e293b/ffffff?text=${encodeURIComponent(professional.profession)}`;
  const avatarUrl = professional.avatar_url;
  const level = professional.level || 1;

  // Gerar iniciais do nome para fallback do avatar
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };
  const levelInfo = levelBadges[Math.min(level, 5)];
  const LevelIcon = levelInfo.icon;
  const gradient = professionGradients[professional.profession] || professionGradients.outros;
  
  const isPaidPlan = professional.plan_type !== 'free' && professional.plan_active;
  
  const handleCardClick = () => {
    if (isPaidPlan) {
      // Profissional pago - vai para Portfolio completo
      window.location.href = createPageUrl(`Portfolio?id=${professional.id}`);
    } else {
      // Profissional grátis - vai para perfil normal (com chat interno)
      window.location.href = createPageUrl(`ProfessionalProfile?id=${professional.id}`);
    }
  };
  
  return (
    <div onClick={handleCardClick} className="cursor-pointer">
      <Card className="group relative overflow-hidden bg-white hover:shadow-2xl transition-all duration-500 border-0 shadow-lg hover:-translate-y-2">
        {/* Level Badge */}
        <div className="absolute top-3 left-3 z-20">
          <div className={`${levelInfo.color} text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold shadow-lg`}>
            <LevelIcon className="w-3.5 h-3.5" />
            <span>Nv. {level}</span>
          </div>
        </div>
        
        {/* Distance Badge */}
        {distance !== null && distance !== undefined && (
          <div className="absolute top-3 right-3 z-20 bg-black/70 backdrop-blur-sm text-white px-3 py-1.5 rounded-full flex items-center gap-1 text-xs font-bold">
            <MapPin className="w-3 h-3" />
            {distance.toFixed(1)} km
          </div>
        )}
        
        {/* Image Section */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <img 
            src={mainPhoto} 
            alt={professional.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />
          
          {/* Gradient Overlay */}
          <div className={`absolute inset-0 bg-gradient-to-t ${gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-500`} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          {/* Profession Badge */}
          <div className="absolute top-16 left-3">
            <Badge className={`bg-gradient-to-r ${gradient} text-white font-bold px-4 py-1.5 text-sm shadow-lg border-0`}>
              {professionLabels[professional.profession] || professional.profession}
            </Badge>
          </div>
          
          {/* Photos Count */}
          {professional.photos?.length > 0 && (
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-semibold">
              <div className="flex -space-x-1">
                <div className="w-4 h-4 bg-orange-400 rounded-full border border-white" />
                <div className="w-4 h-4 bg-orange-500 rounded-full border border-white" />
                <div className="w-4 h-4 bg-orange-600 rounded-full border border-white" />
              </div>
              {professional.photos.length} fotos
            </div>
          )}
          
          {/* Info at Bottom */}
          <div className="absolute bottom-3 left-3 right-3">
            <div className="flex items-center gap-3 mb-2">
              {/* Avatar pequeno */}
              <Avatar className="h-10 w-10 border-2 border-white shadow-lg">
                <AvatarImage src={avatarUrl} alt={professional.name} />
                <AvatarFallback className="bg-orange-500 text-white text-sm font-bold">
                  {getInitials(professional.name)}
                </AvatarFallback>
              </Avatar>
              <h3 className="text-white font-bold text-xl leading-tight drop-shadow-lg flex-1">
                {professional.name}
              </h3>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-white/90 text-sm">
                <MapPin className="w-4 h-4" />
                <span className="font-medium">{professional.city}, {professional.state}</span>
              </div>

              {professional.rating && (
                <div className="flex items-center gap-1 bg-yellow-400/90 text-yellow-900 px-2 py-1 rounded-full text-xs font-bold">
                  <Star className="w-3 h-3 fill-current" />
                  {professional.rating.toFixed(1)}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Bottom Info */}
        <div className="p-4 bg-gradient-to-br from-slate-50 to-white">
          <div className="flex items-center justify-between">
            <p className="text-slate-600 text-sm line-clamp-2 leading-relaxed flex-1">
              {professional.description || "Profissional qualificado pronto para atender você."}
            </p>
            
            {professional.total_jobs > 0 && (
              <div className="ml-3 text-center">
                <div className="text-lg font-bold text-orange-600">{professional.total_jobs}</div>
                <div className="text-xs text-slate-500">trabalhos</div>
              </div>
            )}
          </div>
          
          {/* Badges */}
          {professional.badges && professional.badges.length > 0 && (
            <div className="flex gap-1 mt-3 flex-wrap">
              {professional.badges.slice(0, 3).map((badge, i) => (
                <Badge 
                  key={i} 
                  variant="outline" 
                  className="text-xs px-2 py-0.5 border-orange-300 text-orange-700 bg-orange-50"
                >
                  {badge}
                </Badge>
              ))}
            </div>
          )}
        </div>
        
        {/* Plano Badge */}
        {isPaidPlan && (
          <div className="absolute top-16 right-3 z-20">
            <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold shadow-lg border-0">
              ⭐ Premium
            </Badge>
          </div>
        )}
        
        {/* Hover Effect Border */}
        <div className={`absolute inset-0 border-2 border-transparent group-hover:border-orange-500 rounded-xl transition-colors duration-500 pointer-events-none`} />
      </Card>
    </div>
  );
}