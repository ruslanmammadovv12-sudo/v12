"use client";

import React, { useState, useMemo } from 'react';
import { useData, MOCK_CURRENT_DATE } from '@/context/DataContext';
import { t } from '@/utils/i18n';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import FormModal from '@/components/FormModal';
import SupplierForm from '@/forms/SupplierForm';
import { PlusCircle } from 'lucide-react';
import { Supplier } from '@/types'; // Import types from types file

type SortConfig = {
  key: keyof Supplier;
  direction: 'ascending' | 'descending';
};

const Suppliers: React.FC = () => {
  const { suppliers, deleteItem } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<number | undefined>(undefined);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'ascending' });

  const sortedSuppliers = useMemo(() => {
    const sortableItems = [...suppliers];
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
  }, [suppliers, sortConfig]);

  const requestSort = (key: SortConfig['key']) => {
    let direction: SortConfig['direction'] = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleAddSupplier = () => {
    setEditingSupplierId(undefined);
    setIsModalOpen(true);
  };

  const handleEditSupplier = (id: number) => {
    setEditingSupplierId(id);
    setIsModalOpen(true);
  };

  const handleDeleteSupplier = (id: number) => {
    deleteItem('suppliers', id);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingSupplierId(undefined);
  };

  const getSortIndicator = (key: keyof Supplier) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    }
    return '';
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-200">{t('suppliers')}</h1>
        <Button onClick={handleAddSupplier}>
          <PlusCircle className="w-4 h-4 mr-2" />
          {t('addSupplier')}
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-100 dark:bg-slate-700">
              <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={() => requestSort('name')}>
                {t('supplierName')} {getSortIndicator('name')}
              </TableHead>
              <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={() => requestSort('contact')}>
                {t('contactPerson')} {getSortIndicator('contact')}
              </TableHead>
              <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={() => requestSort('email')}>
                {t('email')} {getSortIndicator('email')}
              </TableHead>
              <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={() => requestSort('phone')}>
                {t('phone')} {getSortIndicator('phone')}
              </TableHead>
              <TableHead className="p-3">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedSuppliers.length > 0 ? (
              sortedSuppliers.map(s => (
                <TableRow key={s.id} className="border-b dark:border-slate-700 text-gray-800 dark:text-slate-300">
                  <TableCell className="p-3">{s.name}</TableCell>
                  <TableCell className="p-3">{s.contact}</TableCell>
                  <TableCell className="p-3">{s.email}</TableCell>
                  <TableCell className="p-3">{s.phone}</TableCell>
                  <TableCell className="p-3">
                    <Button variant="link" onClick={() => handleEditSupplier(s.id)} className="mr-2 p-0 h-auto">
                      {t('edit')}
                    </Button>
                    <Button variant="link" onClick={() => handleDeleteSupplier(s.id)} className="text-red-500 p-0 h-auto">
                      {t('delete')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="p-4 text-center text-gray-500 dark:text-slate-400">
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
        title={editingSupplierId ? t('editSupplier') : t('createSupplier')}
      >
        <SupplierForm supplierId={editingSupplierId} onSuccess={handleModalClose} />
      </FormModal>
    </div>
  );
};

export default Suppliers;