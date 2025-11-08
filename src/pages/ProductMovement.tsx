"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react'; // Added useEffect
import { useData, MOCK_CURRENT_DATE } from '@/context/DataContext';
import { t } from '@/utils/i18n';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import FormModal from '@/components/FormModal';
import ProductMovementForm from '@/forms/ProductMovementForm';
import { PlusCircle, Check, ChevronsUpDown } from 'lucide-react'; // Added Check, ChevronsUpDown
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Added Select components
import { Input } from '@/components/ui/input'; // Added Input
import { Label } from '@/components/ui/label'; // Added Label
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'; // Added Popover components
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command'; // Added Command components
import { cn } from '@/lib/utils'; // Added cn utility
import { ProductMovement, Product } from '@/types'; // Import types from types file

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

  // New states for filters
  const [filterSourceWarehouseId, setFilterSourceWarehouseId] = useState<number | 'all'>('all');
  const [filterDestWarehouseId, setFilterDestWarehouseId] = useState<number | 'all'>('all');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const [productFilterId, setProductFilterId] = useState<number | 'all'>('all');
  const [isProductComboboxOpen, setIsProductComboboxOpen] = useState(false);

  // Log productMovements whenever it changes
  useEffect(() => {
    console.log("[ProductMovement Page] productMovements updated:", productMovements);
  }, [productMovements]);

  const warehouseMap = useMemo(() => {
    return warehouses.reduce((acc, w) => ({ ...acc, [w.id]: w.name }), {} as { [key: number]: string });
  }, [warehouses]);

  const productMap = useMemo(() => {
    return products.reduce((acc, p) => ({ ...acc, [p.id]: p }), {} as { [key: number]: Product });
  }, [products]);

  const filteredAndSortedMovements = useMemo(() => {
    let filteredMovements = productMovements;

    if (filterSourceWarehouseId !== 'all') {
      filteredMovements = filteredMovements.filter(m => m.sourceWarehouseId === filterSourceWarehouseId);
    }
    if (filterDestWarehouseId !== 'all') {
      filteredMovements = filteredMovements.filter(m => m.destWarehouseId === filterDestWarehouseId);
    }
    if (startDateFilter) {
      filteredMovements = filteredMovements.filter(m => m.date >= startDateFilter);
    }
    if (endDateFilter) {
      filteredMovements = filteredMovements.filter(m => m.date <= endDateFilter);
    }
    if (productFilterId !== 'all') {
      filteredMovements = filteredMovements.filter(m =>
        m.items?.some(item => item.productId === productFilterId)
      );
    }

    const sortableItems = filteredMovements.map(m => {
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
  }, [productMovements, warehouseMap, sortConfig, filterSourceWarehouseId, filterDestWarehouseId, startDateFilter, endDateFilter, productFilterId]);

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

      <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <Label htmlFor="from-warehouse-filter" className="text-sm font-medium text-gray-700 dark:text-slate-300">
              {t('fromWarehouse')}
            </Label>
            <Select onValueChange={(value) => setFilterSourceWarehouseId(value === 'all' ? 'all' : parseInt(value))} value={String(filterSourceWarehouseId)}>
              <SelectTrigger className="w-full mt-1">
                <SelectValue placeholder={t('allWarehouses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allWarehouses')}</SelectItem>
                {warehouses.map(w => (
                  <SelectItem key={w.id} value={String(w.id)}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="to-warehouse-filter" className="text-sm font-medium text-gray-700 dark:text-slate-300">
              {t('toWarehouse')}
            </Label>
            <Select onValueChange={(value) => setFilterDestWarehouseId(value === 'all' ? 'all' : parseInt(value))} value={String(filterDestWarehouseId)}>
              <SelectTrigger className="w-full mt-1">
                <SelectValue placeholder={t('allWarehouses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allWarehouses')}</SelectItem>
                {warehouses.map(w => (
                  <SelectItem key={w.id} value={String(w.id)}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="product-filter" className="text-sm font-medium text-gray-700 dark:text-slate-300">
              {t('product')}
            </Label>
            <Popover open={isProductComboboxOpen} onOpenChange={setIsProductComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={isProductComboboxOpen}
                  className="w-full justify-between mt-1"
                >
                  {productFilterId !== 'all'
                    ? productMap[productFilterId as number]?.name || t('allProducts')
                    : t('allProducts')}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                <Command>
                  <CommandInput placeholder={t('searchProductBySku')} />
                  <CommandEmpty>{t('noProductFound')}</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="all-products"
                      onSelect={() => {
                        setProductFilterId('all');
                        setIsProductComboboxOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          productFilterId === 'all' ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {t('allProducts')}
                    </CommandItem>
                    {products.map((product) => (
                      <CommandItem
                        key={product.id}
                        value={`${product.name} ${product.sku}`}
                        onSelect={() => {
                          setProductFilterId(product.id);
                          setIsProductComboboxOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            productFilterId === product.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {product.name} ({product.sku})
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label htmlFor="start-date-filter" className="text-sm font-medium text-gray-700 dark:text-slate-300">{t('startDate')}</Label>
            <Input
              type="date"
              id="start-date-filter"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              className="mt-1 w-full p-2 border rounded-md shadow-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            />
          </div>
          <div>
            <Label htmlFor="end-date-filter" className="text-sm font-medium text-gray-700 dark:text-slate-300">{t('endDate')}</Label>
            <Input
              type="date"
              id="end-date-filter"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              className="mt-1 w-full p-2 border rounded-md shadow-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            />
          </div>
        </div>
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
                  {filterSourceWarehouseId !== 'all' || filterDestWarehouseId !== 'all' || startDateFilter || endDateFilter || productFilterId !== 'all' ? t('noItemsFound') : t('noItemsFound')}
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