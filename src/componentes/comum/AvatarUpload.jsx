import React, { useState, useRef, useEffect } from 'react';
import { SIZE_LIMITS, ALLOWED_TYPES } from '@/lib/storage';
import { Avatar, AvatarFallback, AvatarImage } from '@/componentes/interface do usuário/avatar';
import { Camera, Loader2, User, X } from 'lucide-react';

/**
 * Componente reutilizável para upload de avatar
 * NÃO faz upload automático - apenas mostra preview e passa o arquivo para o componente pai
 *
 * @param {Object} props
 * @param {string} props.currentAvatarUrl - URL atual do avatar (já salvo no banco)
 * @param {string} props.fallbackName - Nome para fallback (iniciais)
 * @param {function} props.onFileSelect - Callback quando arquivo é selecionado (recebe o File ou null)
 * @param {File} props.pendingFile - Arquivo pendente de upload (para preview)
 * @param {string} props.size - Tamanho do avatar ('sm', 'md', 'lg', 'xl') - default: 'lg'
 * @param {boolean} props.disabled - Desabilita o upload
 * @param {boolean} props.uploading - Indica se está fazendo upload (controlado externamente)
 */
export default function AvatarUpload({
  currentAvatarUrl,
  fallbackName = '',
  onFileSelect,
  pendingFile = null,
  size = 'lg',
  disabled = false,
  uploading = false
}) {
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  // Tamanhos do avatar
  const sizeClasses = {
    sm: 'h-12 w-12',
    md: 'h-16 w-16',
    lg: 'h-24 w-24',
    xl: 'h-32 w-32'
  };

  // Tamanhos do ícone da câmera
  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
    xl: 'h-6 w-6'
  };

  // Gerar preview quando pendingFile muda
  useEffect(() => {
    if (pendingFile) {
      const url = URL.createObjectURL(pendingFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [pendingFile]);

  // Gerar iniciais do nome
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validar tipo (usando PHOTOS já que os avatars serão salvos no bucket photos)
    if (!ALLOWED_TYPES.PHOTOS.includes(file.type)) {
      setError('Formato não suportado. Use JPG, PNG, GIF ou WebP.');
      return;
    }

    // Validar tamanho (5MB para avatars)
    const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_AVATAR_SIZE) {
      setError('Arquivo muito grande. Máximo: 5 MB');
      return;
    }

    // Passa o arquivo para o componente pai (não faz upload ainda)
    onFileSelect(file);

    // Limpar input para permitir selecionar o mesmo arquivo novamente
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onFileSelect(null);
  };

  const handleClick = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click();
    }
  };

  // Determinar qual imagem mostrar: preview > url atual > fallback
  const displayUrl = previewUrl || currentAvatarUrl;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Avatar com botão de upload */}
      <div className="relative group">
        <Avatar className={`${sizeClasses[size]} border-2 border-muted`}>
          <AvatarImage src={displayUrl} alt="Avatar" />
          <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
            {fallbackName ? getInitials(fallbackName) : <User className="h-8 w-8" />}
          </AvatarFallback>
        </Avatar>

        {/* Overlay de upload */}
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled || uploading}
          className={`
            absolute inset-0 flex items-center justify-center rounded-full
            bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity
            ${disabled || uploading ? 'cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          {uploading ? (
            <Loader2 className={`${iconSizes[size]} text-white animate-spin`} />
          ) : (
            <Camera className={`${iconSizes[size]} text-white`} />
          )}
        </button>

        {/* Botão de remover (se tiver arquivo pendente ou avatar atual) */}
        {(pendingFile || currentAvatarUrl) && !uploading && !disabled && (
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        )}

        {/* Indicador de alteração pendente */}
        {pendingFile && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
            Não salvo
          </div>
        )}
      </div>

      {/* Input de arquivo oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />

      {/* Texto de ajuda */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          {uploading ? 'Enviando...' : 'Clique para alterar'}
        </p>
        <p className="text-xs text-muted-foreground">
          JPG, PNG, GIF ou WebP (máx. 5 MB)
        </p>
      </div>

      {/* Mensagem de erro */}
      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}
    </div>
  );
}
