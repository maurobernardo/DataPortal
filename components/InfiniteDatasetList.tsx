'use client';

import { useState, useEffect, useRef } from 'react';
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
  dataType?: string;
  category?: string;
  search?: string;
  source?: string;
  format?: string;
  year?: string;
  yearFrom?: string;
  yearTo?: string;
  sortOrder?: string;
}

export function InfiniteDatasetList({ initialDatasets, totalCount, dataType, category, search, source, format, year, yearFrom, yearTo, sortOrder }: InfiniteDatasetListProps) {
  const [datasets, setDatasets] = useState<Dataset[]>(initialDatasets);
  const [loadedCount, setLoadedCount] = useState(() => Math.min(10, initialDatasets.length));
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(() => {
    const n = initialDatasets.length;
    const show = Math.min(10, n);
    return show < n || n < totalCount;
  });
  const loadTriggerRef = useRef<HTMLDivElement | null>(null);
  const listStateRef = useRef({ loadedCount: Math.min(10, initialDatasets.length), datasets: initialDatasets, totalCount });
  listStateRef.current = { loadedCount, datasets, totalCount };

  const loadDatasetsFromAPI = async (offset: number, take: number) => {
    try {
      const queryParams = new URLSearchParams();
      if (dataType) queryParams.append('dataType', dataType);
      if (category) queryParams.append('category', category);
      if (search) queryParams.append('search', search);
      if (source) queryParams.append('source', source);
      if (format) queryParams.append('format', format);
      if (year) queryParams.append('year', year);
      if (yearFrom) queryParams.append('yearFrom', yearFrom);
      if (yearTo) queryParams.append('yearTo', yearTo);
      if (sortOrder) queryParams.append('sortOrder', sortOrder);
      queryParams.append('offset', offset.toString());
      queryParams.append('take', take.toString());

      const response = await fetch(`/api/datasets?${queryParams.toString()}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Erro ao carregar datasets:', error);
      return [];
    }
  };

  // Dados já vêm filtrados do servidor (até 1000 itens); não refazer fetch no cliente ao abrir com busca/filtros —
  // isso substituía a lista por uma resposta vazia/errada e o contador (totalCount) ficava inconsistente.
  useEffect(() => {
    const nextShow = Math.min(10, initialDatasets.length);
    setDatasets(initialDatasets);
    setLoadedCount(nextShow);
  }, [dataType, category, search, source, format, year, yearFrom, yearTo, sortOrder, initialDatasets]);

  useEffect(() => {
    setHasMore(loadedCount < datasets.length || datasets.length < totalCount);
  }, [loadedCount, datasets.length, totalCount]);

  const loadMore = async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);

    try {
      const { loadedCount: lc, datasets: ds, totalCount: tc } = listStateRef.current;

      if (lc < ds.length) {
        setLoadedCount((c) => Math.min(c + 10, ds.length));
        return;
      }

      if (ds.length < tc) {
        const newDatasets = await loadDatasetsFromAPI(ds.length, 10);
        if (newDatasets.length > 0) {
          setDatasets((prev) => [...prev, ...newDatasets]);
          setLoadedCount((c) => c + newDatasets.length);
        } else {
          setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Erro ao carregar mais datasets:', error);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Pegar os datasets a serem mostrados (os primeiros loadedCount)
  const displayedDatasets = datasets.slice(0, loadedCount);

  useEffect(() => {
    const node = loadTriggerRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting && hasMore && !isLoading) {
          loadMore()
        }
      },
      { rootMargin: '300px 0px' }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasMore, isLoading, loadedCount, datasets.length, dataType, category, search, source, format, year, yearFrom, yearTo, sortOrder])

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
            <DatasetCatalogCard dataset={dataset} highlight={search} />
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

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {Array.from({ length: 2 }).map((_, idx) => (
            <div key={idx} className="rounded-2xl border border-gray-200 bg-white p-5 animate-pulse">
              <div className="h-5 w-3/4 bg-gray-200 rounded mb-3" />
              <div className="h-4 w-full bg-gray-100 rounded mb-2" />
              <div className="h-4 w-5/6 bg-gray-100 rounded mb-4" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-12 bg-gray-100 rounded" />
                <div className="h-12 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      <div ref={loadTriggerRef} className="h-1" />
    </div>
  );
}