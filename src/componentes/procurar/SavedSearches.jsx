import React from 'react';
import { SavedSearch } from "@/lib/entities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/componentes/interface do usuário/button";
import { Input } from "@/componentes/interface do usuário/input";
import { Card, CardContent } from "@/componentes/interface do usuário/card";
import { Badge } from "@/componentes/interface do usuário/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentes/interface do usuário/dialog";
import { Save, Bookmark, Trash2, Search, Loader2 } from "lucide-react";
import { showToast } from "@/utils/showToast";

export default function SavedSearches({ currentFilters, onLoadSearch, userId }) {
  const queryClient = useQueryClient();
  const [showSaveDialog, setShowSaveDialog] = React.useState(false);
  const [searchName, setSearchName] = React.useState('');

  const { data: savedSearches = [] } = useQuery({
    queryKey: ['saved-searches', userId],
    queryFn: async () => {
      if (!userId) return [];
      return await SavedSearch.filter({ user_id: userId });
    },
    enabled: !!userId
  });

  const saveMutation = useMutation({
    mutationFn: async (name) => {
      await SavedSearch.create({
        user_id: userId,
        name,
        filters: currentFilters
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
      setShowSaveDialog(false);
      setSearchName('');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await SavedSearch.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
    }
  });

  const handleSave = () => {
    if (!searchName.trim()) {
      showToast.warning('Digite um nome para a busca');
      return;
    }
    saveMutation.mutate(searchName);
  };

  return (
    <div className="space-y-4">
      {/* Save Current Search Button */}
      <Button
        onClick={() => setShowSaveDialog(true)}
        variant="outline"
        className="w-full border-2 border-blue-300 text-blue-600 hover:bg-blue-50"
      >
        <Save className="w-4 h-4 mr-2" />
        Salvar Está Busca
      </Button>

      {/* Saved Searches List */}
      {savedSearches.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Bookmark className="w-4 h-4" />
              Buscas Salvas
            </h3>
            {savedSearches.map((search) => (
              <div
                key={search.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 border"
              >
                <button
                  onClick={() => onLoadSearch(search.filters)}
                  className="flex-1 text-left flex items-center gap-2"
                >
                  <Search className="w-4 h-4 text-slate-400" />
                  <span className="font-medium text-slate-700">{search.name}</span>
                </button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteMutation.mutate(search.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar Busca</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Nome da busca (ex: Pintores São Paulo)"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="flex-1 bg-blue-500 hover:bg-blue-600"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowSaveDialog(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
