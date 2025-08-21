import React, { useState, useMemo } from 'react';
import { 
  Home, 
  MapPin, 
  DollarSign, 
  Ruler,
  Search,
  Filter,
  Grid,
  List
} from 'lucide-react';
import { AvailableLotsData, AvailableLotItem } from '../../../types';
import { reportsService } from '../../../services';

interface AvailableLotsViewProps {
  data: AvailableLotsData;
}

const AvailableLotsView: React.FC<AvailableLotsViewProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [blockFilter, setBlockFilter] = useState('');
  const [priceRange, setPriceRange] = useState<{ min: string; max: string }>({ min: '', max: '' });
  const [areaRange, setAreaRange] = useState<{ min: string; max: string }>({ min: '', max: '' });
  const [sortBy, setSortBy] = useState<'block' | 'price' | 'area' | 'price_per_m2'>('block');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Get unique blocks
  const blocks = useMemo(() => {
    const uniqueBlocks = [...new Set(data.lots.map(lot => lot.block))];
    return uniqueBlocks.sort();
  }, [data.lots]);

  // Filter and sort lots
  const filteredAndSortedLots = useMemo(() => {
    let filtered = data.lots.filter(lot => {
      const matchesSearch = searchTerm === '' || 
        lot.block.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lot.lot_number.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesBlock = blockFilter === '' || lot.block === blockFilter;
      
      const matchesPriceRange = (priceRange.min === '' || lot.price >= parseFloat(priceRange.min)) &&
                               (priceRange.max === '' || lot.price <= parseFloat(priceRange.max));
      
      const matchesAreaRange = (areaRange.min === '' || lot.area >= parseFloat(areaRange.min)) &&
                              (areaRange.max === '' || lot.area <= parseFloat(areaRange.max));
      
      return matchesSearch && matchesBlock && matchesPriceRange && matchesAreaRange;
    });

    // Sort lots
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'block':
          aValue = a.block;
          bValue = b.block;
          break;
        case 'price':
          aValue = a.price;
          bValue = b.price;
          break;
        case 'area':
          aValue = a.area;
          bValue = b.area;
          break;
        case 'price_per_m2':
          aValue = a.price_per_m2;
          bValue = b.price_per_m2;
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [data.lots, searchTerm, blockFilter, priceRange, areaRange, sortBy, sortOrder]);

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setBlockFilter('');
    setPriceRange({ min: '', max: '' });
    setAreaRange({ min: '', max: '' });
  };

  return (
    <div className="p-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100">Total Lotes</p>
              <p className="text-3xl font-bold">{data.summary.total_count}</p>
            </div>
            <Home className="w-8 h-8 text-green-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">Área Total</p>
              <p className="text-2xl font-bold">{data.summary.total_area.toFixed(0)} m²</p>
            </div>
            <Ruler className="w-8 h-8 text-blue-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100">Valor Total</p>
              <p className="text-xl font-bold">{reportsService.formatCurrency(data.summary.total_value)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-purple-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100">Precio Prom/m²</p>
              <p className="text-xl font-bold">{reportsService.formatCurrency(data.summary.avg_price_per_m2)}</p>
            </div>
            <span className="text-3xl">📊</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Block Filter */}
          <select
            value={blockFilter}
            onChange={(e) => setBlockFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas las manzanas</option>
            {blocks.map(block => (
              <option key={block} value={block}>Manzana {block}</option>
            ))}
          </select>

          {/* Price Range */}
          <input
            type="number"
            placeholder="Precio mín."
            value={priceRange.min}
            onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          <input
            type="number"
            placeholder="Precio máx."
            value={priceRange.max}
            onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Area Range */}
          <input
            type="number"
            placeholder="Área mín. (m²)"
            value={areaRange.min}
            onChange={(e) => setAreaRange(prev => ({ ...prev, min: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          <input
            type="number"
            placeholder="Área máx. (m²)"
            value={areaRange.max}
            onChange={(e) => setAreaRange(prev => ({ ...prev, max: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex items-center justify-between">
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Limpiar filtros
          </button>
          
          <div className="flex items-center space-x-4">
            {/* Sort */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field as typeof sortBy);
                setSortOrder(order as typeof sortOrder);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="block-asc">Manzana (A-Z)</option>
              <option value="block-desc">Manzana (Z-A)</option>
              <option value="price-asc">Precio (menor a mayor)</option>
              <option value="price-desc">Precio (mayor a menor)</option>
              <option value="area-asc">Área (menor a mayor)</option>
              <option value="area-desc">Área (mayor a menor)</option>
              <option value="price_per_m2-asc">Precio/m² (menor a mayor)</option>
              <option value="price_per_m2-desc">Precio/m² (mayor a menor)</option>
            </select>
            
            {/* View Mode */}
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Counter */}
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Mostrando {filteredAndSortedLots.length} de {data.summary.total_count} lotes
        </p>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedLots.map((lot) => (
            <div key={lot.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
                      <Home className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Manzana {lot.block}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Lote {lot.lot_number}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Disponible
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Área:</span>
                    <span className="font-medium">{lot.area} m²</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Precio:</span>
                    <span className="font-bold text-blue-600">
                      {reportsService.formatCurrency(lot.price)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Precio/m²:</span>
                    <span className="font-medium text-green-600">
                      {reportsService.formatCurrency(lot.price_per_m2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Enganche:</span>
                    <span className="font-medium text-orange-600">
                      {reportsService.formatCurrency(lot.initial_payment)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Financiamiento:</span>
                    <span className="font-medium">{lot.financing_months} meses</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('block')}
                  >
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-4 h-4" />
                      <span>Manzana/Lote</span>
                      {sortBy === 'block' && (
                        <span className="text-blue-600">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('area')}
                  >
                    <div className="flex items-center space-x-1">
                      <Ruler className="w-4 h-4" />
                      <span>Área (m²)</span>
                      {sortBy === 'area' && (
                        <span className="text-blue-600">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('price')}
                  >
                    <div className="flex items-center space-x-1">
                      <DollarSign className="w-4 h-4" />
                      <span>Precio</span>
                      {sortBy === 'price' && (
                        <span className="text-blue-600">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('price_per_m2')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Precio/m²</span>
                      {sortBy === 'price_per_m2' && (
                        <span className="text-blue-600">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Enganche
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Financiamiento
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedLots.map((lot) => (
                  <tr key={lot.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        Manzana {lot.block}, Lote {lot.lot_number}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lot.area} m²
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-blue-600">
                        {reportsService.formatCurrency(lot.price)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-green-600">
                        {reportsService.formatCurrency(lot.price_per_m2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600">
                      {reportsService.formatCurrency(lot.initial_payment)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lot.financing_months} meses
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredAndSortedLots.length === 0 && (
        <div className="text-center py-12">
          <Home className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron lotes</h3>
          <p className="text-gray-600">
            {searchTerm || blockFilter || priceRange.min || priceRange.max || areaRange.min || areaRange.max 
              ? 'Intenta ajustar los filtros de búsqueda' 
              : 'No hay lotes disponibles'}
          </p>
        </div>
      )}
    </div>
  );
};

export default AvailableLotsView;
