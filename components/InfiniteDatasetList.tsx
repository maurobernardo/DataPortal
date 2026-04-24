'use client';

import { useState, useEffect } from 'react';
import { DatasetCatalogCard } from '@/components/DatasetCatalogCard';
import { ChevronDown, Loader2 } from 'lucide-react';

interface Dataset {
  id: number;
  title: string;
  description: string;
  source: string;
  year: number;
  format: string;
  fileSize: string;
  views: number;
  downloads: number;
  keywords: string | null;
  geometry?: string | null;
  coverage?: string | null;
  minimumUnit?: string | null;
  createdAt: Date;
  updatedAt: Date;
  categoryId: number;
  category: {
    id: number;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
}

interface InfiniteDatasetListProps {
  initialDatasets: Dataset[];
  totalCount: number;
  category?: string;
  search?: string;
  source?: string;
  format?: string;
  year?: string;
  sortOrder?: string;
}

export function InfiniteDatasetList({ initialDatasets, totalCount, category, search, source, format, year, sortOrder }: InfiniteDatasetListProps) {
  const [datasets, setDatasets] = useState<Dataset[]>(initialDatasets);
  const [loadedCount, setLoadedCount] = useState(10); // Começa com 10 registros
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Função para carregar datasets via API
  const loadDatasetsFromAPI = async (offset: number, take: number) => {
    try {
      const queryParams = new URLSearchParams();
      if (category) queryParams.append('category', category);
      if (search) queryParams.append('search', search);
      if (source) queryParams.append('source', source);
      if (format) queryParams.append('format', format);
      if (year) queryParams.append('year', year);
      if (sortOrder) queryParams.append('sortOrder', sortOrder);
      queryParams.append('offset', offset.toString());
      queryParams.append('take', take.toString());

      const response = await fetch(`/api/datasets?${queryParams.toString()}`);
      return await response.json();
    } catch (error) {
      console.error('Erro ao carregar datasets:', error);
      return [];
    }
  };

  // Efeito para recarregar dados quando filtros mudam
  useEffect(() => {
    // Se há filtros ativos, recarregar dados via API
    if (category || search || source || format || year) {
      loadDatasetsFromAPI(0, 10).then(newDatasets => {
        setDatasets(newDatasets);
        setLoadedCount(Math.min(newDatasets.length, 10));
        setCurrentPage(1);
        setHasMore(newDatasets.length > 10);
      });
    } else {
      // Se não há filtros, usar dados iniciais
      setDatasets(initialDatasets);
      setLoadedCount(Math.min(initialDatasets.length, 10));
      setCurrentPage(1);
      setHasMore(initialDatasets.length > 10);
    }
  }, [category, search, source, format, year, initialDatasets]);

  // Função para carregar mais datasets
  const loadMore = async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);

    try {
      // Calcular offset para a próxima página
      const offset = currentPage * 10;
      const take = 10;

      const newDatasets = await loadDatasetsFromAPI(offset, take);

      if (newDatasets.length > 0) {
        setDatasets(prev => [...prev, ...newDatasets]);
        setCurrentPage(prev => prev + 1);
        setLoadedCount(prev => prev + newDatasets.length);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Erro ao carregar mais datasets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Atualizar hasMore quando loadedCount muda
  useEffect(() => {
    if (loadedCount >= totalCount) {
      setHasMore(false);
    } else {
      setHasMore(true);
    }
  }, [loadedCount, totalCount]);

  // Pegar os datasets a serem mostrados (os primeiros loadedCount)
  const displayedDatasets = datasets.slice(0, loadedCount);

  return (
    <div className="space-y-6">
      {/* Grid de datasets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        {displayedDatasets.map((dataset, index) => (
          <div
            key={dataset.id}
            className="animate-fade-in"
            style={{ animationDelay: `${Math.min(index * 0.05, 0.5)}s` }}
          >
            <DatasetCatalogCard dataset={dataset} />
          </div>
        ))}
      </div>

      {/* Botão "Ver mais" */}
      {hasMore && (
        <div className="flex justify-center mt-8">
          <button
            onClick={loadMore}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando...
              </>
            ) : (
              <>
                Ver mais
                <ChevronDown className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}