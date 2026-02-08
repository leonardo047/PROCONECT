import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/interface do usuário/card";
import { Badge } from "@/componentes/interface do usuário/badge";
import { Wrench } from "lucide-react";

// Serviços padrao por profissão
const defaultServicesByProfession = {
  pintura_residencial: [
    "Pintura interna",
    "Pintura externa",
    "Textura",
    "Grafiato",
    "Massa corrida",
    "Pintura de portao"
  ],
  pedreiro_alvenaria: [
    "Construcao de muros",
    "Reforma geral",
    "Reboco",
    "Contrapiso",
    "Alvenaria",
    "Caladas"
  ],
  eletricista: [
    "Instalacao eletrica",
    "Manutencao",
    "Troca de disjuntores",
    "Iluminacao",
    "Quadro de luz",
    "Aterramento"
  ],
  hidraulica: [
    "Instalacao hidraulica",
    "Desentupimento",
    "Troca de torneiras",
    "Reparo de vazamentos",
    "Caixa dagua",
    "Esgoto"
  ],
  limpeza: [
    "Limpeza residencial",
    "Limpeza pos-obra",
    "Limpeza comercial",
    "Limpeza de vidros",
    "Higienizacao"
  ],
  jardinagem: [
    "Corte de grama",
    "Poda de arvores",
    "Manutencao de jardim",
    "Plantio",
    "Adubacao",
    "Rocada"
  ],
  gesso_drywall: [
    "Forro de gesso",
    "Drywall",
    "Sancas",
    "Molduras",
    "Divisorias",
    "Reparos"
  ],
  telhados: [
    "Instalacao de telhados",
    "Reforma de telhados",
    "Troca de telhas",
    "Calhas",
    "Impermeabilizacao"
  ],
  marido_aluguel: [
    "Pequenos reparos",
    "Montagem de móveis",
    "Instalacoes",
    "Fixacao de objetos",
    "Manutencao geral"
  ],
  carpinteiro: [
    "Móveis sob medida",
    "Portas",
    "Janelas",
    "Decks",
    "Forros de madeira"
  ],
  marceneiro: [
    "Móveis planejados",
    "Armarios",
    "Cozinhas",
    "Closets",
    "Restauracao"
  ],
  vidraceiro: [
    "Box de banheiro",
    "Janelas de vidro",
    "Portas de vidro",
    "Espelhos",
    "Vidros temperados"
  ],
  serralheiro: [
    "Portoes",
    "Grades",
    "Escadas",
    "Corrimaos",
    "Estruturas metalicas"
  ],
  azulejista: [
    "Assentamento de pisos",
    "Revestimentos",
    "Pastilhas",
    "Rejunte",
    "Porcelanato"
  ],
  ar_condicionado: [
    "Instalacao de ar",
    "Manutencao",
    "Limpeza",
    "Carga de gas",
    "Conserto"
  ],
  dedetizacao: [
    "Dedetizacao residencial",
    "Controle de pragas",
    "Descupinizacao",
    "Desratizacao"
  ],
  mudancas: [
    "Mudancas residenciais",
    "Fretes",
    "Transporte de móveis",
    "Embalagem"
  ],
  montador_móveis: [
    "Montagem de móveis",
    "Desmontagem",
    "Ajustes",
    "Reparos em móveis"
  ],
  instalador_pisos: [
    "Pisó laminado",
    "Pisó vinilico",
    "Porcelanato",
    "Rodapes"
  ],
  marmorista: [
    "Bancadas",
    "Soleiras",
    "Pisos de marmore",
    "Polimento"
  ],
  piscineiro: [
    "Manutencao de piscinas",
    "Limpeza",
    "Tratamento de agua",
    "Reparos"
  ],
  tapeceiro: [
    "Reforma de estofados",
    "Capas",
    "Cortinas",
    "Persianas"
  ],
  chaveiro: [
    "Abertura de portas",
    "Copia de chaves",
    "Troca de fechaduras",
    "Cofres"
  ],
  seguranca_eletronica: [
    "Cameras de seguranca",
    "Alarmes",
    "Cercas eletricas",
    "Interfones"
  ],
  automacao: [
    "Automacao residencial",
    "Iluminacao inteligente",
    "Cortinas automaticas",
    "Ar condicionado smart"
  ],
  energia_solar: [
    "Instalacao solar",
    "Manutencao",
    "Projetos",
    "Limpeza de paineis"
  ],
  impermeabilizacao: [
    "Lajes",
    "Terracos",
    "Banheiros",
    "Piscinas",
    "Reservatorios"
  ],
  arquiteto: [
    "Projetos residenciais",
    "Projetos comerciais",
    "Interiores",
    "Acompanhamento de obras"
  ],
  engenheiro: [
    "Projetos estruturais",
    "Laudos técnicos",
    "ART",
    "Acompanhamento de obras"
  ],
  decorador: [
    "Decoracao de ambientes",
    "Consultoria",
    "Projetos de interiores",
    "Home staging"
  ]
};

export default function ServicesList({ professional, services }) {
  // Se recebeu lista de serviços explicita, usa ela
  // Senao, tenta pegar os serviços padrao pela profissão
  const serviceList = services || defaultServicesByProfession[professional?.profession] || [];

  if (!serviceList || serviceList.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-orange-500" />
          Serviços que Realiza
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {serviceList.map((service, index) => (
            <Badge
              key={index}
              variant="outline"
              className="bg-slate-50 text-slate-700 border-slate-200 px-3 py-1"
            >
              {service}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
