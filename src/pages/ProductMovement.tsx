"use client";

import React, { useState, useMemo } from 'react';
import { useData, ProductMovement } from '@/context/DataContext';
import { t } from '@/utils/i18n';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import FormModal from '@/components/FormModal';
import ProductMovementForm from '@/forms/ProductMovementForm';
import { PlusCircle } from 'lucide-react';

const ProductMovement: React.FC = () => {
  const { productMovements, warehouses, products, deleteItem, showAlertModal } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMovementId, setEditingMovementId] = useState<number | undefined>(undefined);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedMovementDetails, setSelectedMovementDetails] = useState<ProductMovement | null>(null);

  const warehouseMap = useMemo(() => {
    return warehouses.reduce((acc, w) => ({ ...acc, [w.id]: w.name }), {} as { [key: number]: string });
  }, [warehouses]);

  const productMap = useMemo(() => {
    return products.reduce((acc, p) => ({ ...acc, [p.id]: p }), {} as { [key: number]: Product });
  }, [products]);

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
              <TableHead className="p-3">{t('orderId')}</TableHead>
              <TableHead className="p-3">{t('from')}</TableHead>
              <TableHead className="p-3">{t('to')}</TableHead>
              <TableHead className="p-3">{t('orderDate')}</TableHead>
              <TableHead className="p-3">{t('totalItems')}</TableHead>
              <TableHead className="p-3">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productMovements.length > 0 ? (
              productMovements.map(m => {
                const totalItems = m.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
                return (
                  <TableRow key={m.id} className="border-b dark:border-slate-700 text-gray-800 dark:text-slate-300">
                    <TableCell className="p-3 font-semibold">#{m.id}</TableCell>
                    <TableCell className="p-3">{warehouseMap[m.sourceWarehouseId] || 'N/A'}</TableCell>
                    <TableCell className="p-3">{warehouseMap[m.destWarehouseId] || 'N/A'}</TableCell>
                    <TableCell className="p-3">{m.date}</TableCell>
                    <TableCell className="p-3 font-bold">{totalItems}</TableCell>
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
                );
              })
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