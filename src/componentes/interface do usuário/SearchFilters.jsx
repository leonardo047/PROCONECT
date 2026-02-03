import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentes/interface do usuário/select";
import { Input } from "@/componentes/interface do usuário/input";
import { Label } from "@/componentes/interface do usuário/label";
import { Slider } from "@/componentes/interface do usuário/slider";
import { Calendar } from "@/componentes/interface do usuário/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/componentes/interface do usuário/popover";
import { Button } from "@/componentes/interface do usuário/button";
import { Search, MapPin, Briefcase, Calendar as CalendarIcon, Star } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const professions = [
  { value: "all", label: "Todas as Profissões" },
  { value: "construcao", label: "🏗️ CONSTRUÇÃO E REFORMA", disabled: true },
  { value: "pintura_residencial", label: "Pintura Residencial e Comercial" },
  { value: "pedreiro_alvenaria", label: "Pedreiro / Alvenaria" },
  { value: "eletricista", label: "Eletricista" },
  { value: "hidraulica", label: "Encanador / Hidráulica" },
  { value: "gesso_drywall", label: "Gesso / Drywall" },
  { value: "telhados", label: "Telhados" },
  { value: "calheiro", label: "Calheiro / Calhas" },
  { value: "azulejista", label: "Azulejista / Revestimentos" },
  { value: "marmorista", label: "Marmorista / Granitos" },
  { value: "instalador_pisos", label: "Instalador de Pisos" },
  { value: "impermeabilizacao", label: "Impermeabilização" },
  { value: "carpinteiro", label: "Carpintaria" },
  { value: "marceneiro", label: "Marcenaria" },
  { value: "vidraceiro", label: "Vidraçaria" },
  { value: "serralheiro", label: "Serralheria" },
  { value: "arquiteto", label: "Arquitetura e Projetos" },
  { value: "engenheiro", label: "Engenharia Civil" },
  { value: "limpeza_servicos", label: "🧹 LIMPEZA E MANUTENÇÃO", disabled: true },
  { value: "limpeza", label: "Limpeza Residencial / Pós-obra" },
  { value: "limpeza_fachada", label: "Limpeza de Fachada" },
  { value: "limpeza_reservatorio", label: "Limpeza de Reservatório" },
  { value: "polimento_pisos", label: "Polimento de Pisos" },
  { value: "dedetizacao", label: "Dedetização" },
  { value: "controle_pragas", label: "Controle de Pragas" },
  { value: "fumigacao", label: "Fumigação" },
  { value: "desentupidor", label: "Desentupidor" },
  { value: "jardinagem", label: "Jardinagem / Roçada" },
  { value: "piscineiro", label: "Piscineiro / Manutenção de Piscinas" },
  { value: "instalacoes", label: "⚡ INSTALAÇÕES E TECNOLOGIA", disabled: true },
  { value: "ar_condicionado", label: "Ar Condicionado / Refrigeração" },
  { value: "energia_solar", label: "Energia Solar" },
  { value: "automacao", label: "Automação Residencial" },
  { value: "seguranca_eletronica", label: "Segurança Eletrônica / CFTV" },
  { value: "alarmes", label: "Alarmes" },
  { value: "cameras_seguranca", label: "Câmeras de Segurança" },
  { value: "cerca_eletrica", label: "Cerca Elétrica" },
  { value: "portoes_automaticos", label: "Portões Automáticos" },
  { value: "instalacao_internet", label: "Instalação de Internet" },
  { value: "antenas_satelite", label: "Antenas e Satélite" },
  { value: "som_automotivo", label: "Som Automotivo" },
  { value: "decoracao_design", label: "🎨 DECORAÇÃO E DESIGN", disabled: true },
  { value: "decorador", label: "Decoração de Interiores" },
  { value: "instalacao_cortinas", label: "Instalação de Cortinas" },
  { value: "instalacao_persianas", label: "Instalação de Persianas" },
  { value: "instalacao_papel_parede", label: "Instalação de Papel de Parede" },
  { value: "tapeceiro", label: "Tapeceiro / Estofador" },
  { value: "tapecaria_estofamento", label: "Tapecaria e Estofamento" },
  { value: "restauracao_moveis", label: "Restauração de Móveis" },
  { value: "automotivo", label: "🚗 AUTOMOTIVO", disabled: true },
  { value: "mecanico_auto", label: "Mecânico Automotivo" },
  { value: "eletricista_auto", label: "Eletricista Automotivo" },
  { value: "funilaria_pintura", label: "Funilaria e Pintura Auto" },
  { value: "vidraceiro_auto", label: "Vidraceiro Automotivo" },
  { value: "lavagem_automotiva", label: "Lavagem Automotiva" },
  { value: "estetica_automotiva", label: "Estética Automotiva" },
  { value: "reboque_guincho", label: "Reboque / Guincho" },
  { value: "borracheiro", label: "Borracheiro" },
  { value: "alinhamento_balanceamento", label: "Alinhamento e Balanceamento" },
  { value: "troca_oleo", label: "Troca de Óleo" },
  { value: "saude_bem_estar", label: "💆 SAÚDE E BEM-ESTAR", disabled: true },
  { value: "manicure_pedicure", label: "Manicure e Pedicure" },
  { value: "cabeleireiro", label: "Cabeleireiro" },
  { value: "barbeiro", label: "Barbearia" },
  { value: "estetica_facial", label: "Estética Facial" },
  { value: "depilacao", label: "Depilação" },
  { value: "massagem", label: "Massagem" },
  { value: "personal_trainer", label: "Personal Trainer" },
  { value: "nutricao", label: "Nutrição" },
  { value: "psicologia", label: "Psicologia" },
  { value: "pets", label: "🐾 PET E ANIMAIS", disabled: true },
  { value: "veterinario", label: "Veterinário" },
  { value: "pet_grooming", label: "Pet Grooming / Banho e Tosa" },
  { value: "passeador_caes", label: "Passeador de Cães" },
  { value: "adestramento", label: "Adestramento" },
  { value: "educacao_eventos", label: "🎓 EDUCAÇÃO E EVENTOS", disabled: true },
  { value: "aulas_particulares", label: "Aulas Particulares" },
  { value: "traducao", label: "Tradução" },
  { value: "informatica_ti", label: "Informática e TI" },
  { value: "design_grafico", label: "Design Gráfico" },
  { value: "fotografia", label: "Fotografia" },
  { value: "video", label: "Vídeo / Filmagem" },
  { value: "eventos", label: "Organização de Eventos" },
  { value: "buffet", label: "Buffet / Catering" },
  { value: "decoracao_festas", label: "Decoração de Festas" },
  { value: "musicos", label: "Músicos" },
  { value: "dj", label: "DJ" },
  { value: "brinquedos_inflaveis", label: "Brinquedos Infláveis" },
  { value: "outros_servicos", label: "🔧 OUTROS SERVIÇOS", disabled: true },
  { value: "marido_aluguel", label: "Marido de Aluguel" },
  { value: "mudancas", label: "Mudanças e Fretes" },
  { value: "montador_moveis", label: "Montador de Móveis" },
  { value: "chaveiro", label: "Chaveiro" },
  { value: "aluguel_equipamentos", label: "Aluguel de Equipamentos" },
  { value: "empresa_local", label: "Empresa Local (Contato Direto)" },
  { value: "encontra_objeto", label: "Encontra Objeto Perdido" },
  { value: "encontra_produto", label: "Encontra Produto Específico" },
  { value: "outros", label: "Outras Especialidades" }
];

const states = [
  { value: "all", label: "Todos os Estados" },
  { value: "AC", label: "Acre" },
  { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapá" },
  { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" },
  { value: "CE", label: "Ceará" },
  { value: "DF", label: "Distrito Federal" },
  { value: "ES", label: "Espírito Santo" },
  { value: "GO", label: "Goiás" },
  { value: "MA", label: "Maranhão" },
  { value: "MT", label: "Mato Grosso" },
  { value: "MS", label: "Mato Grosso do Sul" },
  { value: "MG", label: "Minas Gerais" },
  { value: "PA", label: "Pará" },
  { value: "PB", label: "Paraíba" },
  { value: "PR", label: "Paraná" },
  { value: "PE", label: "Pernambuco" },
  { value: "PI", label: "Piauí" },
  { value: "RJ", label: "Rio de Janeiro" },
  { value: "RN", label: "Rio Grande do Norte" },
  { value: "RS", label: "Rio Grande do Sul" },
  { value: "RO", label: "Rondônia" },
  { value: "RR", label: "Roraima" },
  { value: "SC", label: "Santa Catarina" },
  { value: "SP", label: "São Paulo" },
  { value: "SE", label: "Sergipe" },
  { value: "TO", label: "Tocantins" }
];

export default function SearchFilters({ filters, onFilterChange, hideLocationFields = false }) {
  const [selectedDate, setSelectedDate] = React.useState(filters.availableDate || null);
  
  const handleDateChange = (date) => {
    setSelectedDate(date);
    onFilterChange({ ...filters, availableDate: date });
  };
  
  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 border-2 border-orange-100 space-y-6">
      <div className={`grid grid-cols-1 ${hideLocationFields ? 'md:grid-cols-1' : 'md:grid-cols-3'} gap-4`}>
        <div className="relative">
          <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-500" />
          <Select 
            value={filters.profession} 
            onValueChange={(value) => onFilterChange({ ...filters, profession: value })}
          >
            <SelectTrigger className="pl-10 h-12 border-2 border-orange-200 focus:ring-orange-500 focus:border-orange-500">
              <SelectValue placeholder="Selecione a profissão" />
            </SelectTrigger>
            <SelectContent>
              {professions.map(p => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {!hideLocationFields && (
          <>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-500" />
              <Select 
                value={filters.state} 
                onValueChange={(value) => onFilterChange({ ...filters, state: value })}
              >
                <SelectTrigger className="pl-10 h-12 border-2 border-orange-200 focus:ring-orange-500 focus:border-orange-500">
                  <SelectValue placeholder="Selecione o estado" />
                </SelectTrigger>
                <SelectContent>
                  {states.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-500" />
              <Input 
                placeholder="Buscar por cidade..."
                value={filters.city}
                onChange={(e) => onFilterChange({ ...filters, city: e.target.value })}
                className="pl-10 h-12 border-2 border-orange-200 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </>
        )}
      </div>
      
      {/* Advanced Filters */}
      <div className="border-t pt-6">
        <h3 className="font-semibold text-slate-900 mb-4">Filtros Avançados</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Date Filter */}
          <div>
            <Label className="mb-2 block">Disponível em:</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Qualquer data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateChange}
                  disabled={(date) => date < new Date()}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          {/* Rating Filter */}
          <div>
            <Label className="mb-2 block">Avaliação Mínima:</Label>
            <Select 
              value={filters.minRating || 'all'}
              onValueChange={(value) => onFilterChange({ ...filters, minRating: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as avaliações</SelectItem>
                <SelectItem value="4.5">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    4.5+
                  </div>
                </SelectItem>
                <SelectItem value="4">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    4.0+
                  </div>
                </SelectItem>
                <SelectItem value="3">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    3.0+
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Price Filter */}
          <div className="md:col-span-2">
            <Label className="mb-3 block">
              Preço Máximo: R$ {filters.maxPrice || 500}
            </Label>
            <Slider
              value={[filters.maxPrice || 500]}
              onValueChange={(value) => onFilterChange({ ...filters, maxPrice: value[0] })}
              min={50}
              max={1000}
              step={50}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>R$ 50</span>
              <span>R$ 1000</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}