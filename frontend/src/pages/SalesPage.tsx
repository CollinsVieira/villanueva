import React, { useState } from 'react';
import { SalesList, SaleForm, SaleDetails } from '../components/Sales';
import { Venta } from '../services/salesService';

type ViewMode = 'list' | 'create' | 'edit' | 'details';

const SalesPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedSale, setSelectedSale] = useState<Venta | null>(null);

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

  const handleSaveSuccess = () => {
    setViewMode('list');
    setSelectedSale(null);
  };

  const handleCancel = () => {
    setViewMode('list');
    setSelectedSale(null);
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'create':
        return (
          <SaleForm
            onSave={handleSaveSuccess}
            onCancel={handleCancel}
          />
        );
      
      case 'edit':
        return (
          <SaleForm
            sale={selectedSale!}
            onSave={handleSaveSuccess}
            onCancel={handleCancel}
          />
        );
      
      case 'details':
        return (
          <SaleDetails
            saleId={selectedSale!.id}
            onEdit={handleEditSale}
            onClose={handleCancel}
            onBack={handleCancel}
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
