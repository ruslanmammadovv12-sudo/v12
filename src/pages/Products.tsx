"use client";

import React, { useState, useMemo } from 'react';
import { useData, Product } from '@/context/DataContext';
import { t } from '@/utils/i18n';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import FormModal from '@/components/FormModal';
import ProductForm from '@/forms/ProductForm';
import { ArrowUpDown, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';

type SortConfig = {
  key: keyof Product | 'totalStock' | 'priceWithMarkupCalc' | 'priceWithMarkupAndVatCalc';
  direction: 'ascending' | 'descending';
};

const Products: React.FC = () => {
  const { products, deleteItem, settings } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | undefined>(undefined);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'sku', direction: 'ascending' });

  const defaultMarkup = settings.defaultMarkup / 100;
  const defaultVat = settings.defaultVat / 100;

  const sortedProducts = useMemo(() => {
    const sortableItems = products.map(p => ({
      ...p,
      totalStock: Object.values(p.stock || {}).reduce((a, b) => a + b, 0),
      priceWithMarkupCalc: (p.averageLandedCost || 0) * (1 + defaultMarkup),
      priceWithMarkupAndVatCalc: (p.averageLandedCost || 0) * (1 + defaultMarkup) * (1 + defaultVat),
    }));

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
  }, [products, sortConfig, defaultMarkup, defaultVat]);

  const requestSort = (key: SortConfig['key']) => {
    let direction: SortConfig['direction'] = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleAddProduct = () => {
    setEditingProductId(undefined);
    setIsModalOpen(true);
  };

  const handleEditProduct = (id: number) => {
    setEditingProductId(id);
    setIsModalOpen(true);
  };

  const handleDeleteProduct = (id: number) => {
    deleteItem('products', id);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingProductId(undefined);
  };

  const showImageModal = (imageUrl: string, productName: string) => {
    const defaultImage = 'https://placehold.co/600x600/e2e8f0/e2e8f0?text=No-Image';
    const finalImageUrl = imageUrl && imageUrl.startsWith('data:image') ? imageUrl : defaultImage;

    toast.info(productName, {
      duration: 5000,
      description: (
        <div className="flex justify-center">
          <img
            src={finalImageUrl}
            className="max-w-full max-h-[70vh] rounded-lg object-contain"
            alt={productName}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = defaultImage;
            }}
          />
        </div>
      ),
    });
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-200">{t('products')}</h1>
        <Button onClick={handleAddProduct}>
          <PlusCircle className="w-4 h-4 mr-2" />
          {t('addProduct')}
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-100 dark:bg-slate-700">
              <TableHead className="p-3">{t('image')}</TableHead>
              <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={() => requestSort('name')}>
                {t('name')} {sortConfig.key === 'name' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}
              </TableHead>
              <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={() => requestSort('sku')}>
                {t('sku')} {sortConfig.key === 'sku' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}
              </TableHead>
              <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={() => requestSort('category')}>
                {t('category')} {sortConfig.key === 'category' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}
              </TableHead>
              <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={() => requestSort('totalStock')}>
                {t('totalStock')} {sortConfig.key === 'totalStock' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}
              </TableHead>
              <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={() => requestSort('averageLandedCost')}>
                {t('avgLandedCost')} {sortConfig.key === 'averageLandedCost' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}
              </TableHead>
              <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={() => requestSort('priceWithMarkupCalc')}>
                {t('landedCostPlusMarkup')} {sortConfig.key === 'priceWithMarkupCalc' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}
              </TableHead>
              <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={() => requestSort('priceWithMarkupAndVatCalc')}>
                {t('landedCostPlusMarkupPlusVat')} {sortConfig.key === 'priceWithMarkupAndVatCalc' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}
              </TableHead>
              <TableHead className="p-3">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedProducts.length > 0 ? (
              sortedProducts.map(p => {
                const stockIsLow = p.totalStock < p.minStock;
                const landedCostDisplay = p.averageLandedCost > 0 ? `${p.averageLandedCost.toFixed(2)} AZN` : 'N/A';
                const priceWithMarkupDisplay = p.priceWithMarkupCalc > 0 ? `${p.priceWithMarkupCalc.toFixed(2)} AZN` : 'N/A';
                const priceWithMarkupPlusVatDisplay = p.priceWithMarkupAndVatCalc > 0 ? `${p.priceWithMarkupAndVatCalc.toFixed(2)} AZN` : 'N/A';
                const defaultImage = 'https://placehold.co/100x100/e2e8f0/e2e8f0?text=No-Image';

                return (
                  <TableRow key={p.id} className="border-b dark:border-slate-700 text-gray-800 dark:text-slate-300">
                    <TableCell className="p-3">
                      <img
                        src={p.imageUrl || defaultImage}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = defaultImage;
                        }}
                        className="w-16 h-16 rounded-md object-cover cursor-pointer"
                        onClick={() => showImageModal(p.imageUrl, p.name)}
                        alt={p.name}
                      />
                    </TableCell>
                    <TableCell className="p-3">{p.name}</TableCell>
                    <TableCell className="p-3">{p.sku}</TableCell>
                    <TableCell className="p-3">{p.category}</TableCell>
                    <TableCell className={`p-3 font-semibold ${stockIsLow ? 'text-red-500' : ''}`}>
                      {p.totalStock}
                    </TableCell>
                    <TableCell className="p-3">{landedCostDisplay}</TableCell>
                    <TableCell className="p-3 font-semibold text-gray-700 dark:text-slate-300">
                      {priceWithMarkupDisplay}
                    </TableCell>
                    <TableCell className="p-3 font-semibold text-sky-600 dark:text-sky-400">
                      {priceWithMarkupPlusVatDisplay}
                    </TableCell>
                    <TableCell className="p-3">
                      <Button variant="link" onClick={() => handleEditProduct(p.id)} className="mr-2 p-0 h-auto">
                        {t('edit')}
                      </Button>
                      <Button variant="link" onClick={() => handleDeleteProduct(p.id)} className="text-red-500 p-0 h-auto">
                        {t('delete')}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="p-4 text-center text-gray-500 dark:text-slate-400">
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
        title={editingProductId ? t('editProduct') : t('createProduct')}
      >
        <ProductForm productId={editingProductId} onSuccess={handleModalClose} />
      </FormModal>
    </div>
  );
};

export default Products;