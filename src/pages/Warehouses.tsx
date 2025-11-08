"use client";

import React, { useState, useMemo } from 'react';
import { useData, MOCK_CURRENT_DATE } from '@/context/DataContext';
import { t } from '@/utils/i18n';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import FormModal from '@/components/FormModal';
import WarehouseForm from '@/forms/WarehouseForm';
import { ChevronRight, PlusCircle, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Product, Warehouse } from '@/types'; // Import types from types file

type SortConfig = {
  key: keyof Product | 'quantity' | 'priceWithMarkupCalc' | 'priceWithMarkupPlusVat';
  direction: 'ascending' | 'descending';
};

const Warehouses: React.FC = () => {
  const { warehouses, products, deleteItem, settings } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWarehouseId, setEditingWarehouseId] = useState<number | undefined>(undefined);
  const [expandedWarehouseId, setExpandedWarehouseId] = useState<number | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'ascending' });

  const defaultMarkup = settings.defaultMarkup / 100;
  const defaultVat = settings.defaultVat / 100;

  const handleAddWarehouse = () => {
    setEditingWarehouseId(undefined);
    setIsModalOpen(true);
  };

  const handleEditWarehouse = (id: number) => {
    setEditingWarehouseId(id);
    setIsModalOpen(true);
  };

  const handleDeleteWarehouse = (id: number) => {
    deleteItem('warehouses', id);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingWarehouseId(undefined);
  };

  const toggleWarehouseDetails = (warehouseId: number) => {
    setExpandedWarehouseId(prevId => (prevId === warehouseId ? null : warehouseId));
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

  const exportWarehouseStock = (warehouseId: number, warehouseName: string) => {
    const warehouseProducts = products
      .filter(p => p && p.stock && p.stock[warehouseId] && p.stock[warehouseId] > 0) // Defensive check for 'p'
      .map(p => ({
        'Product Name': p.name,
        'SKU': p.sku,
        'Stock Quantity': p.stock[warehouseId],
        'Avg Landed Cost (AZN)': (p.averageLandedCost || 0).toFixed(4),
        'Avg LC + Markup (Excl VAT)': ((p.averageLandedCost || 0) * (1 + defaultMarkup)).toFixed(4),
        'Avg LC + Markup + VAT (Incl VAT)': ((p.averageLandedCost || 0) * (1 + defaultMarkup) * (1 + defaultVat)).toFixed(4),
      }));

    if (warehouseProducts.length === 0) {
      alert('No products in this warehouse to export.');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(warehouseProducts);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${warehouseName} Stock`);
    XLSX.writeFile(wb, `${warehouseName}_stock_export.xlsx`);
  };

  const sortedWarehouseProducts = useMemo(() => {
    if (!expandedWarehouseId) return {};

    const productsInWarehouse = products
      .filter(p => p && p.stock && p.stock[expandedWarehouseId] && p.stock[expandedWarehouseId] > 0); // Defensive check for 'p'

    const sortableItems = productsInWarehouse.map(p => {
      const qty = p.stock[expandedWarehouseId];
      const priceWithMarkupCalc = (p.averageLandedCost || 0) * (1 + defaultMarkup);
      const priceWithMarkupPlusVat = priceWithMarkupCalc * (1 + defaultVat);

      return {
        ...p,
        quantity: qty,
        priceWithMarkupCalc: priceWithMarkupCalc,
        priceWithMarkupPlusVat: priceWithMarkupPlusVat,
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
    return { [expandedWarehouseId]: sortableItems };
  }, [products, expandedWarehouseId, sortConfig, defaultMarkup, defaultVat]);


  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-200">{t('warehouses')}</h1>
        <Button onClick={handleAddWarehouse}>
          <PlusCircle className="w-4 h-4 mr-2" />
          {t('addWarehouse')}
        </Button>
      </div>

      <div>
        {warehouses.length > 0 ? (
          warehouses.map(w => {
            const warehouseProducts = sortedWarehouseProducts[w.id] || [];
            let warehouseTotalValue = 0; // Excl. VAT
            let warehouseTotalValueInclVat = 0; // Incl. VAT

            warehouseProducts.forEach(p => {
              warehouseTotalValue += p.priceWithMarkupCalc * p.quantity;
              warehouseTotalValueInclVat += p.priceWithMarkupPlusVat * p.quantity;
            });

            return (
              <div key={w.id} className="bg-white dark:bg-slate-800 rounded-lg shadow-md mb-4 overflow-hidden">
                <div
                  className="p-6 cursor-pointer flex justify-between items-center hover:bg-gray-50 dark:hover:bg-slate-700"
                  onClick={() => toggleWarehouseDetails(w.id)}
                >
                  <div>
                    <h2 className="2xl font-bold text-gray-800 dark:text-slate-200">{w.name}</h2>
                    <p className="text-gray-600 dark:text-slate-400">{w.location}</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      {t('warehouseType')}: <span className="font-medium">{t(((w.type || 'secondary').toLowerCase() + 'WarehouseType') as keyof typeof t)}</span>
                    </p>
                  </div>
                  <div className="flex items-center">
                    <Button variant="link" onClick={(e) => { e.stopPropagation(); handleEditWarehouse(w.id); }} className="mr-4 text-sm p-0 h-auto">
                      {t('edit')}
                    </Button>
                    <Button variant="link" onClick={(e) => { e.stopPropagation(); handleDeleteWarehouse(w.id); }} className="text-red-500 mr-4 text-sm p-0 h-auto">
                      {t('delete')}
                    </Button>
                    <ChevronRight className={`w-6 h-6 text-gray-500 transition-transform ${expandedWarehouseId === w.id ? 'rotate-90' : ''}`} />
                  </div>
                </div>
                <div className={`px-6 pb-6 border-t pt-4 dark:border-slate-700 dark:text-slate-300 ${expandedWarehouseId === w.id ? '' : 'hidden'}`}>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-gray-700 dark:text-slate-300">{t('productsInThisWarehouse')}</h3>
                    <Button onClick={() => exportWarehouseStock(w.id, w.name)} className="bg-sky-500 text-white px-3 py-1 rounded-md hover:bg-sky-600 text-sm shadow flex items-center">
                      <Download className="w-4 h-4 mr-1" />
                      Export Stock
                    </Button>
                  </div>
                  {warehouseProducts.length > 0 ? (
                    <Table className="w-full text-left text-sm mt-4">
                      <TableHeader>
                        <TableRow className="bg-gray-50 dark:bg-slate-700">
                          <TableHead className="p-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={() => requestSort('name')}>
                            {t('productName')} {getSortIndicator('name')}
                          </TableHead>
                          <TableHead className="p-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={() => requestSort('sku')}>
                            {t('sku')} {getSortIndicator('sku')}
                          </TableHead>
                          <TableHead className="p-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={() => requestSort('quantity')}>
                            {t('qty')} {getSortIndicator('quantity')}
                          </TableHead>
                          <TableHead className="p-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={() => requestSort('averageLandedCost')}>
                            {t('avgLandedCost')} {getSortIndicator('averageLandedCost')}
                          </TableHead>
                          <TableHead className="p-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={() => requestSort('priceWithMarkupCalc')}>
                            {t('landedCostPlusMarkup')} {getSortIndicator('priceWithMarkupCalc')}
                          </TableHead>
                          <TableHead className="p-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={() => requestSort('priceWithMarkupPlusVat')}>
                            {t('landedCostPlusMarkupPlusVat')} {getSortIndicator('priceWithMarkupPlusVat')}
                          </TableHead>
                          <TableHead className="p-2">{t('totalValue')} (Excl. VAT)</TableHead>
                          <TableHead className="p-2">Total Value (Incl. VAT)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {warehouseProducts.map(p => (
                          <TableRow key={p.id} className="border-b dark:border-slate-600">
                            <TableCell className="p-2">{p.name}</TableCell>
                            <TableCell className="p-2">{p.sku}</TableCell>
                            <TableCell className="p-2 font-bold">{p.quantity}</TableCell>
                            <TableCell className="p-2">{p.averageLandedCost > 0 ? `${p.averageLandedCost.toFixed(2)} AZN` : 'N/A'}</TableCell>
                            <TableCell className="p-2">{p.priceWithMarkupCalc > 0 ? `${p.priceWithMarkupCalc.toFixed(2)} AZN` : 'N/A'}</TableCell>
                            <TableCell className="p-2">{p.priceWithMarkupPlusVat > 0 ? `${p.priceWithMarkupPlusVat.toFixed(2)} AZN` : 'N/A'}</TableCell>
                            <TableCell className="p-2 font-semibold">{(p.priceWithMarkupCalc * p.quantity).toFixed(2)} AZN</TableCell>
                            <TableCell className="p-2 font-semibold text-sky-600 dark:text-sky-400">{(p.priceWithMarkupPlusVat * p.quantity).toFixed(2)} AZN}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow className="bg-gray-100 dark:bg-slate-700 font-bold">
                          <TableCell colSpan={6} className="p-2 text-right">{t('totals')}:</TableCell>
                          <TableCell className="p-2">{warehouseTotalValue.toFixed(2)} AZN</TableCell>
                          <TableCell className="p-2 text-sky-600 dark:text-sky-400">{warehouseTotalValueInclVat.toFixed(2)} AZN}</TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  ) : (
                    <p className="text-gray-500 dark:text-slate-400 italic mt-4">{t('noProductsStored')}</p>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md text-center text-gray-500 dark:text-slate-400">
            {t('noItemsFound')}
          </div>
        )}
      </div>

      <FormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        title={editingWarehouseId ? t('editWarehouse') : t('createWarehouse')}
      >
        <WarehouseForm warehouseId={editingWarehouseId} onSuccess={handleModalClose} />
      </FormModal>
    </div>
  );
};

export default Warehouses;