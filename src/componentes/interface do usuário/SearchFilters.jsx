import React, { useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentes/interface do usuário/select";
import { Input } from "@/componentes/interface do usuário/input";
import { Label } from "@/componentes/interface do usuário/label";
import { Slider } from "@/componentes/interface do usuário/slider";
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
  const [selectedDate, setSelectedDate] = useState(filters.availableDate || null);
  const [openCategoryCombobox, setOpenCategoryCombobox] = useState(false);

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
    const sortedGroupNames = Object.keys(groups).sort((a, b) => {
      // Grupos de construção primeiro
      const homeGroups = ['Construção', 'Elétrica/Hidráulica', 'Limpeza/Jardim', 'Madeira/Metal', 'Projetos'];
      const aIsHome = homeGroups.some(g => a.includes(g));
      const bIsHome = homeGroups.some(g => b.includes(g));
      if (aIsHome && !bIsHome) return -1;
      if (!aIsHome && bIsHome) return 1;
      return a.localeCompare(b);
    });

    return sortedGroupNames.map(groupName => ({
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
              <Command>
                <CommandInput placeholder="Digite para buscar profissão..." />
                <CommandList>
                  <CommandEmpty>Nenhuma profissão encontrada.</CommandEmpty>
                  {/* Opção "Todas" */}
                  <CommandGroup>
                    <CommandItem
                      value="Todas as Profissões"
                      onSelect={() => {
                        onFilterChange({ ...filters, profession: 'all' });
                        setOpenCategoryCombobox(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          filters.profession === 'all' ? "opacity-100" : "opacity-0"
                        )}
                      />
                      Todas as Profissões
                    </CommandItem>
                  </CommandGroup>
                  {/* Grupos de categorias */}
                  {professionGroups.map(group => (
                    <CommandGroup key={group.name} heading={group.name}>
                      {group.items.map(cat => (
                        <CommandItem
                          key={cat.slug}
                          value={cat.name}
                          onSelect={() => {
                            onFilterChange({ ...filters, profession: cat.slug });
                            setOpenCategoryCombobox(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              filters.profession === cat.slug ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {cat.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ))}
                </CommandList>
              </Command>
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
