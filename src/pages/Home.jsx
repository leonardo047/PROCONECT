import React, { memo, useEffect, Suspense, lazy, useState, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ProfessionalService, ClientReferralService, Category } from "@/lib/entities";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/componentes/interface do usuário/button";
import { ArrowRight, Paintbrush, Wrench, Zap,
  Droplets, Sparkles, TreePine, HardHat,
  Star, Loader2, Home as HomeIcon, Hammer, Scissors, Truck, Building2, ShoppingBag,
  Brush, Palette, LayoutGrid, ChevronRight, ChevronLeft, ChevronDown,
  Thermometer, Sun, Camera, Waves, Flower2, Bug, Sofa,
  DoorOpen, Frame, Layers, Square, ScrollText, Mountain,
  Package, Shovel, Container, FileText, PenTool,
  ClipboardCheck, Compass, Calculator, Settings, Flame,
  Snowflake, Fan, Trees, Share2, Check,
  Car, PawPrint, PartyPopper, Monitor, GraduationCap
} from "lucide-react";
import { serviceGroups } from "@/lib/constants/professionCategories";

// Lazy load do componente de card
const ProfessionalCard = lazy(() => import("@/componentes/interface do usuário/ProfessionalCard"));

// Skeleton para cards
const CardSkeleton = memo(() => (
  <div className="bg-white rounded-xl p-4 animate-pulse">
    <div className="w-full h-48 bg-slate-200 rounded-lg mb-4" />
    <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
    <div className="h-3 bg-slate-200 rounded w-1/2" />
  </div>
));

// Categorias populares fixas (atalhos)
const popularCategorySlugs = [
  { slug: "pintor", name: "Pintor", icon: Paintbrush, color: "bg-orange-500" },
  { slug: "pedreiro", name: "Pedreiro", icon: HardHat, color: "bg-slate-600" },
  { slug: "eletricista", name: "Eletricista", icon: Zap, color: "bg-yellow-500" },
  { slug: "encanador", name: "Encanador", icon: Droplets, color: "bg-blue-500" },
  { slug: "gesso_drywall", name: "Gesso/Drywall", icon: LayoutGrid, color: "bg-gray-500" },
  { slug: "azulejista", name: "Azulejista", icon: Square, color: "bg-cyan-500" },
  { slug: "telhadista", name: "Telhadista", icon: HomeIcon, color: "bg-red-600" },
  { slug: "ar_condicionado", name: "Ar Condicionado", icon: Snowflake, color: "bg-sky-500" },
  { slug: "limpeza", name: "Limpeza", icon: Sparkles, color: "bg-green-500" },
  { slug: "jardinagem", name: "Jardinagem", icon: TreePine, color: "bg-emerald-600" },
  { slug: "marceneiro", name: "Marceneiro", icon: Hammer, color: "bg-amber-700" }
];

// serviceGroups importado de @/lib/constants/professionCategories

// Item de serviço no carrossel horizontal
const ServiceItem = memo(({ service }) => {
  const IconComponent = service.icon;
  const slug = service.name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

  return (
    <Link
      to={createPageUrl(`SearchProfessionals?profession=${slug}`)}
      className="group flex-shrink-0 w-20 md:w-24"
    >
      <div className="flex flex-col items-center">
        <div className={`w-12 h-12 md:w-14 md:h-14 ${service.color} rounded-2xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-sm`}>
          <IconComponent className="w-6 h-6 md:w-7 md:h-7 text-white" />
        </div>
        <span className="text-[11px] md:text-xs text-center text-slate-700 font-medium leading-tight">
          {service.name}
        </span>
      </div>
    </Link>
  );
});

// Carrossel horizontal de serviços dentro de uma categoria expandida
const ServiceCarousel = memo(({ group }) => {
  const scrollRef = React.useRef(null);

  const scroll = useCallback((direction) => {
    if (scrollRef.current) {
      const amount = 240;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -amount : amount,
        behavior: 'smooth'
      });
    }
  }, []);

  return (
    <div className="relative">
      {/* Setas de navegação - apenas desktop */}
      <button
        onClick={() => scroll('left')}
        className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white rounded-full shadow-md border border-slate-200 items-center justify-center hover:bg-orange-50 hover:border-orange-300 transition-colors"
        aria-label="Rolar para esquerda"
      >
        <ChevronLeft className="w-4 h-4 text-slate-600" />
      </button>

      {/* Container scrollável */}
      <div
        ref={scrollRef}
        className="flex gap-3 md:gap-4 overflow-x-auto pb-2 px-1 scrollbar-hide scroll-smooth snap-x snap-mandatory md:snap-none"
        style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {group.services.map((service) => (
          <div key={service.name} className="snap-start">
            <ServiceItem service={service} />
          </div>
        ))}

        {/* Link "Ver todos" para Outros Serviços */}
        {group.linkTo && (
          <Link
            to={createPageUrl(group.linkTo)}
            className="flex-shrink-0 w-20 md:w-24 flex flex-col items-center justify-center group"
          >
            <div className="w-12 h-12 md:w-14 md:h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-2 group-hover:bg-slate-200 transition-colors">
              <ChevronRight className="w-6 h-6 text-slate-500" />
            </div>
            <span className="text-[11px] md:text-xs text-center text-orange-600 font-semibold leading-tight">
              Ver todos
            </span>
          </Link>
        )}
      </div>

      {/* Seta direita - apenas desktop */}
      <button
        onClick={() => scroll('right')}
        className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white rounded-full shadow-md border border-slate-200 items-center justify-center hover:bg-orange-50 hover:border-orange-300 transition-colors"
        aria-label="Rolar para direita"
      >
        <ChevronRight className="w-4 h-4 text-slate-600" />
      </button>
    </div>
  );
});

// Bloco 1 - Hero com gradiente roxo/laranja
// Botões dinâmicos baseados no status do usuário
const SearchSection = memo(({ isAuthenticated, user }) => {
  // Determinar quais botões mostrar
  const isProfessional = user?.is_professional === true;

  // Renderizar botões baseado no status do usuário
  const renderButtons = () => {
    if (!isAuthenticated) {
      // VISITANTE (não logado)
      // Solicitar Orçamento, Buscar Profissionais, Sou Profissional
      return (
        <>
          <Link to={createPageUrl("RequestQuote")}>
            <Button size="lg" className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold px-6 py-5 rounded-xl shadow-lg">
              Solicitar Orçamento
            </Button>
          </Link>
          <Link to={createPageUrl("SearchProfessionals")}>
            <Button size="lg" variant="outline" className="w-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 border-2 border-white/30 font-semibold px-6 py-5 rounded-xl">
              Buscar Profissionais
            </Button>
          </Link>
          <Link to={createPageUrl("Onboarding")}>
            <Button size="lg" variant="outline" className="w-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 border-2 border-white/30 font-semibold px-6 py-5 rounded-xl">
              Área Profissional
            </Button>
          </Link>
        </>
      );
    }

    if (isProfessional) {
      // USUÁRIO É PROFISSIONAL (pode também ser cliente)
      // Painel Profissional, Buscar Profissionais, Solicitar Serviço
      return (
        <>
          <Link to={createPageUrl("ProfessionalDashboard")}>
            <Button size="lg" className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold px-6 py-5 rounded-xl shadow-lg">
              Painel Profissional
            </Button>
          </Link>
          <Link to={createPageUrl("SearchProfessionals")}>
            <Button size="lg" variant="outline" className="w-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 border-2 border-white/30 font-semibold px-6 py-5 rounded-xl">
              Buscar Profissionais
            </Button>
          </Link>
          <Link to={createPageUrl("RequestQuote")}>
            <Button size="lg" variant="outline" className="w-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 border-2 border-white/30 font-semibold px-6 py-5 rounded-xl">
              Solicitar Serviço
            </Button>
          </Link>
        </>
      );
    }

    // USUÁRIO SÓ É CLIENTE (não é profissional)
    // Solicitar Serviço, Buscar Profissionais, Tornar-se Profissional
    return (
      <>
        <Link to={createPageUrl("RequestQuote")}>
          <Button size="lg" className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold px-6 py-5 rounded-xl shadow-lg">
            Solicitar Serviço
          </Button>
        </Link>
        <Link to={createPageUrl("SearchProfessionals")}>
          <Button size="lg" variant="outline" className="w-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 border-2 border-white/30 font-semibold px-6 py-5 rounded-xl">
            Buscar Profissionais
          </Button>
        </Link>
        <Link to={createPageUrl("BecomeProfessional")}>
          <Button size="lg" variant="outline" className="w-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 border-2 border-white/30 font-semibold px-6 py-5 rounded-xl">
            Tornar-se Profissional
          </Button>
        </Link>
      </>
    );
  };

  return (
    <section className="bg-gradient-to-r from-purple-900 via-purple-800 to-orange-600 py-12 md:py-16 relative overflow-hidden">
      {/* Efeitos de fundo */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-400 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-400 rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
        <p className="text-base md:text-lg text-white/90 mb-6 max-w-2xl mx-auto leading-relaxed">
          Use sua localização para encontrar pintores, pedreiros, eletricistas e outros profissionais qualificados. Rápido, fácil e confiável. ✨
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-2xl mx-auto mb-8">
          {renderButtons()}
        </div>

        <div className="flex items-center justify-center gap-8 text-white/80 text-sm">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              <div className="w-6 h-6 bg-orange-500 rounded-full border-2 border-white" />
              <div className="w-6 h-6 bg-blue-500 rounded-full border-2 border-white" />
              <div className="w-6 h-6 bg-green-500 rounded-full border-2 border-white" />
            </div>
            <span className="font-semibold">500+</span>
            <span>Profissionais</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            <span className="font-semibold">4.8/5</span>
            <span>Avaliação</span>
          </div>
        </div>
      </div>
    </section>
  );
});

// Bloco 2 - Categorias Populares (Atalhos)
const PopularCategories = memo(() => {
  return (
    <section className="py-8 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4">
        <h3 className="text-lg font-semibold text-slate-700 mb-6 text-center">
          Acessó Rápido às Categorias Populares
        </h3>
        <div className="flex flex-wrap justify-center gap-4 md:gap-6">
          {popularCategorySlugs.map((cat) => {
            const IconComponent = cat.icon;
            return (
              <Link
                key={cat.slug}
                to={createPageUrl(`SearchProfessionals?profession=${cat.slug}`)}
                className="group flex flex-col items-center"
              >
                <div className={`w-14 h-14 ${cat.color} rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-md`}>
                  <IconComponent className="w-7 h-7 text-white" />
                </div>
                <p className="text-xs font-medium text-slate-600 text-center max-w-[70px] leading-tight">{cat.name}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
});

// Seção de categorias com gavetas (accordion)
const CategoryAccordionSection = memo(() => {
  const [openIndex, setOpenIndex] = useState(null);
  const navigate = useNavigate();

  const toggleCategory = useCallback((index) => {
    const group = serviceGroups[index];
    if (group.linkTo) {
      navigate(createPageUrl(group.linkTo));
      return;
    }
    setOpenIndex((prev) => (prev === index ? null : index));
  }, [navigate]);

  // Agrupar categorias em linhas de 2 (desktop)
  const DESKTOP_COLS = 2;
  const rows = [];
  for (let i = 0; i < serviceGroups.length; i += DESKTOP_COLS) {
    rows.push(serviceGroups.slice(i, i + DESKTOP_COLS));
  }

  return (
    <section className="py-12 bg-slate-50">
      <div className="max-w-4xl mx-auto px-4">
        {/* Título principal */}
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
            Serviços de Construção Civil e Reformas
          </h2>
          <p className="text-slate-600">
            Profissionais, Empresas e Fornecedores - Tudo para sua obra em um só lugar!
          </p>
        </div>

        {/* Cards de categoria em gavetas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {serviceGroups.map((group, globalIndex) => {
            const isOpen = globalIndex === openIndex;
            const isLastInRow = (globalIndex % DESKTOP_COLS === DESKTOP_COLS - 1) || globalIndex === serviceGroups.length - 1;
            const rowStart = Math.floor(globalIndex / DESKTOP_COLS) * DESKTOP_COLS;
            const rowEnd = Math.min(rowStart + DESKTOP_COLS, serviceGroups.length);
            const openInRow = openIndex !== null && openIndex >= rowStart && openIndex < rowEnd;

            return (
              <React.Fragment key={group.title}>
                <button
                  onClick={() => toggleCategory(globalIndex)}
                  className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl border transition-all text-left ${
                    isOpen
                      ? 'bg-white border-orange-300 shadow-md ring-1 ring-orange-200'
                      : 'bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300'
                  }`}
                >
                  <div className={`w-10 h-10 ${group.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <span className="text-lg">{group.emoji}</span>
                  </div>
                  <span className="font-semibold text-slate-800 text-sm md:text-base flex-1">
                    {group.title}
                  </span>
                  {group.linkTo ? (
                    <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown
                      className={`w-5 h-5 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  )}
                </button>

                {/* Mobile: painel abre logo abaixo do item clicado */}
                {isOpen && (
                  <div className="md:hidden bg-white rounded-xl border border-slate-200 shadow-sm p-4 animate-accordion-down overflow-hidden">
                    <ServiceCarousel group={group} />
                  </div>
                )}

                {/* Desktop: painel abre abaixo da linha de 2 colunas */}
                {isLastInRow && openInRow && (
                  <div className="hidden md:block md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-6 animate-accordion-down overflow-hidden">
                    <ServiceCarousel group={serviceGroups[openIndex]} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </section>
  );
});

// Seção de profissionais em destaque
const FeaturedProfessionals = memo(({ professionals }) => {
  if (!professionals?.length) return null;

  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-1">
              Profissionais em Destaque
            </h2>
            <p className="text-slate-600">
              Os mais bem avaliados da plataforma
            </p>
          </div>
          <Link to={createPageUrl("SearchProfessionals")}>
            <Button variant="outline" className="hidden md:flex items-center gap-2">
              Ver Todos
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Suspense fallback={<><CardSkeleton /><CardSkeleton /><CardSkeleton /></>}>
            {professionals.map((professional) => (
              <ProfessionalCard key={professional.id} professional={professional} distance={null} />
            ))}
          </Suspense>
        </div>
      </div>
    </section>
  );
});

// Como funciona
const HowItWorks = memo(() => (
  <section className="py-12 bg-slate-50">
    <div className="max-w-7xl mx-auto px-4">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
          Como Funciona
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { step: "01", title: "Busque", desc: "Escolha o serviço e sua cidade" },
          { step: "02", title: "Compare", desc: "Veja fotos e avaliações" },
          { step: "03", title: "Contrate", desc: "Contato direto por WhatsApp" }
        ].map((item, i) => (
          <div key={i} className="text-center bg-white rounded-xl p-6 shadow-sm">
            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center text-xl font-bold mx-auto mb-3">
              {item.step}
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">{item.title}</h3>
            <p className="text-slate-600 text-sm">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
));

// CTA para profissionais com botão de compartilhamento
const ProfessionalCTA = memo(({ isAuthenticated, user }) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = typeof window !== 'undefined' ? window.location.origin : 'https://connectpro.app.br';
  const shareText = 'Encontre profissionais qualificados para sua obra ou serviço no ConectPro!';
  const isProfessional = user?.is_professional === true;

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'ConectPro - Profissionais de Construção',
          text: shareText,
          url: shareUrl
        });
      } catch (error) {
        // Usuário cancelou ou erro
      }
    } else {
      // Fallback: copiar link
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        // Erro ao copiar
      }
    }
  }, [shareUrl, shareText]);

  // Se já é profissional, mostrar CTA diferente
  if (isAuthenticated && isProfessional) {
    return (
      <section className="py-12 bg-gradient-to-r from-orange-500 to-orange-600">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Gerencie seu perfil profissional
          </h2>
          <p className="text-lg text-orange-100 mb-6 max-w-xl mx-auto">
            Atualize suas informações, fotos e acompanhe seus contatos
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to={createPageUrl("ProfessionalDashboard")}>
              <Button size="lg" className="bg-white text-orange-600 hover:bg-orange-50 font-semibold px-8 py-5 rounded-xl">
                Meu Painel
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              onClick={handleShare}
              className="bg-white/10 text-white hover:bg-white/20 border-2 border-white/30 font-semibold px-8 py-5 rounded-xl"
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Link Copiado!
                </>
              ) : (
                <>
                  <Share2 className="w-5 h-5 mr-2" />
                  Compartilhar Site
                </>
              )}
            </Button>
          </div>
        </div>
      </section>
    );
  }

  // Se é cliente logado, mostrar CTA para virar profissional
  if (isAuthenticated && !isProfessional) {
    return (
      <section className="py-12 bg-gradient-to-r from-orange-500 to-orange-600">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Quer oferecer seus serviços?
          </h2>
          <p className="text-lg text-orange-100 mb-6 max-w-xl mx-auto">
            Torne-se um profissional e mostre seu trabalho para milhares de clientes
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to={createPageUrl("BecomeProfessional")}>
              <Button size="lg" className="bg-white text-orange-600 hover:bg-orange-50 font-semibold px-8 py-5 rounded-xl">
                Tornar-se Profissional
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              onClick={handleShare}
              className="bg-white/10 text-white hover:bg-white/20 border-2 border-white/30 font-semibold px-8 py-5 rounded-xl"
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Link Copiado!
                </>
              ) : (
                <>
                  <Share2 className="w-5 h-5 mr-2" />
                  Compartilhar Site
                </>
              )}
            </Button>
          </div>
        </div>
      </section>
    );
  }

  // Visitante (não logado) - CTA padrão
  return (
    <section className="py-12 bg-gradient-to-r from-orange-500 to-orange-600">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
          É profissional da construção?
        </h2>
        <p className="text-lg text-orange-100 mb-6 max-w-xl mx-auto">
          Cadastre-se e mostre seu trabalho para milhares de clientes
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link to={createPageUrl("Onboarding")}>
            <Button size="lg" className="bg-white text-orange-600 hover:bg-orange-50 font-semibold px-8 py-5 rounded-xl">
              Criar Meu Perfil
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          <Button
            size="lg"
            variant="outline"
            onClick={handleShare}
            className="bg-white/10 text-white hover:bg-white/20 border-2 border-white/30 font-semibold px-8 py-5 rounded-xl"
          >
            {copied ? (
              <>
                <Check className="w-5 h-5 mr-2" />
                Link Copiado!
              </>
            ) : (
              <>
                <Share2 className="w-5 h-5 mr-2" />
                Compartilhar Site
              </>
            )}
          </Button>
        </div>
      </div>
    </section>
  );
});

export default function Home() {
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get('ref');
  const { user, isAuthenticated } = useAuth();

  // Capturar código de indicação da URL e salvar no localStorage
  useEffect(() => {
    const captureReferralCode = async () => {
      if (refCode) {
        try {
          const referrerProfessional = await ProfessionalService.findByReferralCode(refCode);
          if (referrerProfessional) {
            localStorage.setItem('referral_code', refCode);
            localStorage.setItem('referrer_name', referrerProfessional.name);
          } else {
            const referrerClient = await ClientReferralService.findByReferralCode(refCode);
            if (referrerClient) {
              localStorage.setItem('referral_code', refCode);
              localStorage.setItem('referrer_name', referrerClient.full_name || '');
            }
          }
        } catch (error) {
          localStorage.setItem('referral_code', refCode);
        }
      }
    };
    captureReferralCode();
  }, [refCode]);

  // Buscar categorias do banco (para possível uso futuro)
  useQuery({
    queryKey: ['home-categories'],
    queryFn: () => Category.filter({
      orderBy: { field: 'order', direction: 'asc' },
      limit: 500
    }),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return (
    <div>
      {/* Bloco 1 - Hero */}
      <SearchSection isAuthenticated={isAuthenticated} user={user} />

      {/* Bloco 2 - Categorias Populares (Atalhos) */}
      <PopularCategories />

      {/* Bloco 3 - Categorias com Gavetas (Accordion + Carrossel) */}
      <CategoryAccordionSection />

      {/* Como Funciona */}
      <HowItWorks />

      {/* CTA para Profissionais */}
      <ProfessionalCTA isAuthenticated={isAuthenticated} user={user} />
    </div>
  );
}
