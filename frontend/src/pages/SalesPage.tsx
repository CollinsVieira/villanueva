import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { SalesList, SaleForm, SaleDetails } from '../components/Sales';
import { Venta } from '../services/salesService';

type ViewMode = 'list' | 'create' | 'edit' | 'details';

const SalesPage: React.FC = () => {
  const location = useLocation();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedSale, setSelectedSale] = useState<Venta | null>(null);
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);

  // Manejar navegación desde otras páginas
  useEffect(() => {
    if (location.state) {
      const { saleId, viewMode: navViewMode } = location.state as { saleId?: number; viewMode?: ViewMode };
      if (saleId && navViewMode === 'details') {
        setSelectedSaleId(saleId);
        setViewMode('details');
      }
    }
  }, [location.state]);

  const handleCreateSale = () => {
    setSelectedSale(null);
    setViewMode('create');
  };

  const handleEditSale = (sale: Venta) => {
    setSelectedSale(sale);
    setViewMode('edit');
  };

  const handleViewSale = (sale: Venta) => {
    setSelectedSale(sale);
    setViewMode('details');
  };

  const handleCreateSuccess = () => {
    setViewMode('list');
    setSelectedSale(null);
  };

  const handleEditSuccess = () => {
    // Actualizar y regresar a la lista de ventas
    setSelectedSale(null);
    setSelectedSaleId(null);
    setViewMode('list');
  };

  const handleEditCancel = () => {
    // Regresar a los detalles de la venta
    setViewMode('details');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedSale(null);
    setSelectedSaleId(null);
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'create':
        return (
          <SaleForm
            onSave={handleCreateSuccess}
            onCancel={handleBackToList}
          />
        );
      
      case 'edit':
        return (
          <SaleForm
            sale={selectedSale!}
            onSave={handleEditSuccess}
            onCancel={handleEditCancel}
          />
        );
      
      case 'details':
        return (
          <SaleDetails
            saleId={selectedSaleId || selectedSale!.id}
            onEdit={handleEditSale}
            onClose={handleBackToList}
            onBack={handleBackToList}
          />
        );
      
      default:
        return (
          <SalesList
            onCreateSale={handleCreateSale}
            onViewSale={handleViewSale}
            onEditSale={handleEditSale}
          />
        );
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {renderContent()}
    </div>
  );
};

export default SalesPage;
