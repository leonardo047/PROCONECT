import React, { useState } from 'react';
import { Dialog, DialogContent } from "@/componentes/interface do usuário/dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/componentes/interface do usuário/button";

export default function PhotoGallery({ photos }) {
  const [selectedIndex, setSelectedIndex] = useState(null);
  
  if (!photos || photos.length === 0) return null;
  
  const openPhoto = (index) => setSelectedIndex(index);
  const closePhoto = () => setSelectedIndex(null);
  
  const nextPhoto = () => {
    setSelectedIndex((prev) => (prev + 1) % photos.length);
  };
  
  const prevPhoto = () => {
    setSelectedIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };
  
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {photos.map((photo, index) => (
          <div 
            key={index}
            onClick={() => openPhoto(index)}
            className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group"
          >
            <img 
              src={photo} 
              alt={`Trabalho ${index + 1}`}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
          </div>
        ))}
      </div>
      
      <Dialog open={selectedIndex !== null} onOpenChange={closePhoto}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-0">
          <div className="relative">
            <img 
              src={photos[selectedIndex]} 
              alt={`Trabalho ${selectedIndex + 1}`}
              className="w-full h-auto max-h-[80vh] object-contain"
            />
            
            <Button
              variant="ghost"
              size="icon"
              onClick={closePhoto}
              className="absolute top-4 right-4 text-white hover:bg-white/20"
            >
              <X className="w-6 h-6" />
            </Button>
            
            {photos.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={prevPhoto}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                >
                  <ChevronLeft className="w-8 h-8" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={nextPhoto}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                >
                  <ChevronRight className="w-8 h-8" />
                </Button>
                
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm">
                  {selectedIndex + 1} / {photos.length}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}