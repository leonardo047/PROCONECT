import React, { useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentes/interface do usuário/select";
import { Input } from "@/componentes/interface do usuário/input";
import { Label } from "@/componentes/interface do usuário/label";
import { Calendar } from "@/componentes/interface do usuário/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/componentes/interface do usuário/popover";
import { Button } from "@/componentes/interface do usuário/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/componentes/interface do usuário/command";
import { Search, MapPin, Briefcase, Calendar as CalendarIcon, Star, Loader2, Check, ChevronsUpDown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Category } from "@/lib/entities";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

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
  { value: "MS", label: "Mato Grossó do Sul" },
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
  const [selectedDate, setSelectedDate] = useState(filters.availableDate || null);
  const [openCategoryCombobox, setOpenCategoryCombobox] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Buscar categorias do banco
  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['search-filter-categories'],
    queryFn: () => Category.filter({
      filters: { is_active: true },
      orderBy: { field: 'order', direction: 'asc' },
      limit: 500
    }),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Transformar categorias em grupos para o Command
  const professionGroups = useMemo(() => {
    if (!categories.length) return [];

    // Agrupar por category_group
    const groups = {};
    categories.forEach(cat => {
      const group = cat.category_group || 'Outros';
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(cat);
    });

    // Ordenar grupos - home primeiro, depois other_services
    const sortedGroupNamês = Object.keys(groups).sort((a, b) => {
      // Grupos de construção primeiro
      const homeGroups = ['Construção', 'Elétrica/Hidráulica', 'Limpeza/Jardim', 'Madeira/Metal', 'Projetos'];
      const aIsHome = homeGroups.some(g => a.includes(g));
      const bIsHome = homeGroups.some(g => b.includes(g));
      if (aIsHome && !bIsHome) return -1;
      if (!aIsHome && bIsHome) return 1;
      return a.localeCompare(b);
    });

    return sortedGroupNamês.map(groupName => ({
      name: groupName,
      items: groups[groupName]
    }));
  }, [categories]);

  // Label da profissão selecionada
  const selectedProfessionLabel = useMemo(() => {
    if (!filters.profession || filters.profession === 'all') return "Todas as Profissões";
    for (const group of professionGroups) {
      const found = group.items.find(cat => cat.slug === filters.profession);
      if (found) return found.name;
    }
    return "Todas as Profissões";
  }, [filters.profession, professionGroups]);

  // Filtrar categorias baseado no termo de busca
  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return professionGroups;

    const term = searchTerm.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    return professionGroups
      .map(group => ({
        ...group,
        items: group.items.filter(cat => {
          const catName = cat.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          return catName.includes(term);
        })
      }))
      .filter(group => group.items.length > 0);
  }, [professionGroups, searchTerm]);

  const handleDateChange = (date) => {
    setSelectedDate(date);
    onFilterChange({ ...filters, availableDate: date });
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 border-2 border-orange-100 space-y-6">
      <div className={`grid grid-cols-1 ${hideLocationFields ? 'md:grid-cols-1' : 'md:grid-cols-3'} gap-4`}>
        <div className="relative">
          <Popover open={openCategoryCombobox} onOpenChange={setOpenCategoryCombobox}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openCategoryCombobox}
                disabled={loadingCategories}
                className="w-full h-12 justify-between pl-10 border-2 border-orange-200 hover:bg-orange-50 focus:ring-orange-500 focus:border-orange-500"
              >
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-500" />
                {loadingCategories ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Carregando...
                  </div>
                ) : (
                  <span className="truncate">
                    {selectedProfessionLabel}
                  </span>
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              {/* Campo de busca visível */}
              <div className="p-3 border-b-2 border-orange-200 bg-orange-50">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500" />
                  <Input
                    type="text"
                    placeholder="Digite para buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-11 border-2 border-orange-300 focus:border-orange-500 rounded-lg bg-white text-base"
                    autoFocus
                  />
                </div>
              </div>

              {/* Lista de opções */}
              <div className="max-h-[50vh] overflow-y-auto">
                {/* Opção "Todas" */}
                {(!searchTerm.trim() || "todas as profissões".includes(searchTerm.toLowerCase())) && (
                  <div
                    className={cn(
                      "flex items-center px-3 py-3 cursor-pointer hover:bg-orange-50 border-b",
                      filters.profession === 'all' && "bg-orange-100"
                    )}
                    onClick={() => {
                      onFilterChange({ ...filters, profession: 'all' });
                      setOpenCategoryCombobox(false);
                      setSearchTerm('');
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 text-orange-500",
                        filters.profession === 'all' ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="font-medium">Todas as Profissões</span>
                  </div>
                )}

                {/* Mensagem quando não encontra */}
                {filteredGroups.length === 0 && searchTerm.trim() && (
                  <div className="px-3 py-6 text-center text-slate-500">
                    Nenhuma profissão encontrada para "{searchTerm}"
                  </div>
                )}

                {/* Grupos de categorias filtrados */}
                {filteredGroups.map(group => (
                  <div key={group.name}>
                    <div className="px-3 py-2 text-xs font-bold text-slate-500 bg-slate-100 uppercase tracking-wide">
                      {group.name}
                    </div>
                    {group.items.map(cat => (
                      <div
                        key={cat.slug}
                        className={cn(
                          "flex items-center px-3 py-3 cursor-pointer hover:bg-orange-50",
                          filters.profession === cat.slug && "bg-orange-100"
                        )}
                        onClick={() => {
                          onFilterChange({ ...filters, profession: cat.slug });
                          setOpenCategoryCombobox(false);
                          setSearchTerm('');
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 text-orange-500",
                            filters.profession === cat.slug ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span>{cat.name}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
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

        </div>
      </div>
    </div>
  );
}
