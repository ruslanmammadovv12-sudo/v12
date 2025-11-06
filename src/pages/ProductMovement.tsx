"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { useData, ProductMovement, Product } from '@/context/DataContext';
import { t } from '@/utils/i18n';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import FormModal from '@/components/FormModal';
import ProductMovementForm from '@/forms/ProductMovementForm';
import { PlusCircle } from 'lucide-react';

type SortConfig = {
  key: keyof ProductMovement | 'sourceWarehouseName' | 'destWarehouseName' | 'totalItems';
  direction: 'ascending' | 'descending';
};

const ProductMovement: React.FC = () => {
  const { productMovements, warehouses, products, deleteItem, showAlertModal } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMovementId, setEditingMovementId] = useState<number | undefined>(undefined);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedMovementDetails, setSelectedMovementDetails] = useState<ProductMovement | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'descending' });

  const warehouseMap = useMemo(() => {
    return warehouses.reduce((acc, w) => ({ ...acc, [w.id]: w.name }), {} as { [key: number]: string });
  }, [warehouses]);

  const productMap = useMemo(() => {
    return products.reduce((acc, p) => ({ ...acc, [p.id]: p }), {} as { [key: number]: Product });
  }, [products]);

  const filteredAndSortedMovements = useMemo(() => {
    const sortableItems = productMovements.map(m => {
      const totalItems = m.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
      return {
        ...m,
        sourceWarehouseName: warehouseMap[m.sourceWarehouseId] || 'N/A',
        destWarehouseName: warehouseMap[m.destWarehouseId] || 'N/A',
        totalItems,
      };
    });

    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        const key = sortConfig.key;
        const valA = a[key] === undefined ? '' : a[key];
        const valB = b[key] === undefined ? '' : b[key];

        let comparison = 0;
        if (typeof valA === 'string' || typeof valB === 'string') {
          comparison = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
        } else {
          if (valA < valB) comparison = -1;
          if (valA > valB) comparison = 1;
        }
        return sortConfig.direction === 'ascending' ? comparison : -comparison;
      });
    }
    return sortableItems;
  }, [productMovements, warehouseMap, sortConfig]);

  const handleAddMovement = () => {
    setEditingMovementId(undefined);
    setIsModalOpen(true);
  };

  const handleEditMovement = (id: number) => {
    setEditingMovementId(id);
    setIsModalOpen(true);
  };

  const handleDeleteMovement = (id: number) => {
    deleteItem('productMovements', id);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingMovementId(undefined);
  };

  const viewMovementDetails = (movementId: number) => {
    const movement = productMovements.find(m => m.id === movementId);
    if (movement) {
      setSelectedMovementDetails(movement);
      setIsDetailsModalOpen(true);
    } else {
      showAlertModal('Error', 'Movement details not found.');
    }
  };

  const requestSort = (key: SortConfig['key']) => {
    let direction: SortConfig['direction'] = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: SortConfig['key']) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    }
    return '';
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-200">{t('productMovement')}</h1>
        <Button onClick={handleAddMovement}>
          <PlusCircle className="w-4 h-4 mr-2" />
          {t('newMovement')}
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-100 dark:bg-slate-700">
              <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={() => requestSort('id')}>
                {t('orderId')} {getSortIndicator('id')}
              </TableHead>
              <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={() => requestSort('sourceWarehouseName')}>
                {t('from')} {getSortIndicator('sourceWarehouseName')}
              </TableHead>
              <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={() => requestSort('destWarehouseName')}>
                {t('to')} {getSortIndicator('destWarehouseName')}
              </TableHead>
              <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={() => requestSort('date')}>
                {t('orderDate')} {getSortIndicator('date')}
              </TableHead>
              <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={() => requestSort('totalItems')}>
                {t('totalItems')} {getSortIndicator('totalItems')}
              </TableHead>
              <TableHead className="p-3">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedMovements.length > 0 ? (
              filteredAndSortedMovements.map(m => (
                <TableRow key={m.id} className="border-b dark:border-slate-700 text-gray-800 dark:text-slate-300">
                  <TableCell className="p-3 font-semibold">#{m.id}</TableCell>
                  <TableCell className="p-3">{m.sourceWarehouseName}</TableCell>
                  <TableCell className="p-3">{m.destWarehouseName}</TableCell>
                  <TableCell className="p-3">{m.date}</TableCell>
                  <TableCell className="p-3 font-bold">{m.totalItems}</TableCell>
                  <TableCell className="p-3">
                    <Button variant="link" onClick={() => viewMovementDetails(m.id)} className="mr-2 p-0 h-auto">
                      {t('view')}
                    </Button>
                    <Button variant="link" onClick={() => handleEditMovement(m.id)} className="mr-2 p-0 h-auto">
                      {t('edit')}
                    </Button>
                    <Button variant="link" onClick={() => handleDeleteMovement(m.id)} className="text-red-500 p-0 h-auto">
                      {t('delete')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="p-4 text-center text-gray-500 dark:text-slate-400">
                  {t('noItemsFound')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <FormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        title={editingMovementId ? t('editProductMovement') : t('createProductMovement')}
      >
        <ProductMovementForm movementId={editingMovementId} onSuccess={handleModalClose} />
      </FormModal>

      <FormModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title={t('detailsForMovement') + ` #${selectedMovementDetails?.id}`}
      >
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-100 dark:bg-slate-700">
              <TableHead className="p-2">{t('product')}</TableHead>
              <TableHead className="p-2">{t('sku')}</TableHead>
              <TableHead className="p-2">{t('qty')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {selectedMovementDetails?.items?.map((item, index) => {
              const product = productMap[item.productId];
              return (
                <TableRow key={index} className="border-b dark:border-slate-600 dark:text-slate-300">
                  <TableCell className="p-2">{product?.name || 'N/A'}</TableCell>
                  <TableCell className="p-2">{product?.sku || 'N/A'}</TableCell>
                  <TableCell className="p-2">{item.quantity}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </FormModal>
    </div>
  );
};

export default ProductMovement;