"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useData } from '@/context/DataContext';
import { t } from '@/utils/i18n';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Customer, Warehouse, Product } from '@/types';

interface SellOrderFiltersProps {
  onFiltersChange: (filters: {
    filterWarehouseId: number | 'all';
    filterCustomerValue: number | 'all' | string;
    startDateFilter: string;
    endDateFilter: string;
    productFilterId: number | 'all';
  }) => void;
}

const SellOrderFilters: React.FC<SellOrderFiltersProps> = ({ onFiltersChange }) => {
  const { customers, warehouses, products } = useData();

  const [filterWarehouseId, setFilterWarehouseId] = useState<number | 'all'>('all');
  const [filterCustomerValue, setFilterCustomerValue] = useState<number | 'all' | string>('all');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const [productFilterId, setProductFilterId] = useState<number | 'all'>('all');

  const [openCustomerCombobox, setOpenCustomerCombobox] = useState(false);
  const [isProductComboboxOpen, setIsProductComboboxOpen] = useState(false);

  const customerMap = useMemo(() => {
    return customers.reduce((acc, c) => ({ ...acc, [c.id]: c.name }), {} as { [key: number]: string });
  }, [customers]);

  const productMap = useMemo(() => {
    return products.reduce((acc, p) => ({ ...acc, [p.id]: p }), {} as { [key: number]: Product });
  }, [products]);

  useEffect(() => {
    onFiltersChange({
      filterWarehouseId,
      filterCustomerValue,
      startDateFilter,
      endDateFilter,
      productFilterId,
    });
  }, [filterWarehouseId, filterCustomerValue, startDateFilter, endDateFilter, productFilterId, onFiltersChange]);

  return (
    <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
        <div>
          <Label htmlFor="customer-filter" className="text-sm font-medium text-gray-700 dark:text-slate-300">
            {t('filterByCustomer')}
          </Label>
          <Popover open={openCustomerCombobox} onOpenChange={setOpenCustomerCombobox}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openCustomerCombobox}
                className="w-full justify-between mt-1"
              >
                {filterCustomerValue === 'all'
                  ? t('allCustomers')
                  : typeof filterCustomerValue === 'number'
                    ? customerMap[filterCustomerValue] || t('allCustomers')
                    : filterCustomerValue
                }
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
              <Command>
                <CommandInput
                  placeholder={t('searchCustomerByName')}
                  value={typeof filterCustomerValue === 'string' && filterCustomerValue !== 'all' ? filterCustomerValue : ''}
                  onValueChange={(currentValue) => {
                    setFilterCustomerValue(currentValue || 'all');
                  }}
                />
                <CommandEmpty>{t('noCustomerFound')}</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="all-customers"
                    onSelect={() => {
                      setFilterCustomerValue('all');
                      setOpenCustomerCombobox(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        filterCustomerValue === 'all' ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {t('allCustomers')}
                  </CommandItem>
                  {customers.map((customer) => (
                    <CommandItem
                      key={customer.id}
                      value={customer.name}
                      onSelect={() => {
                        setFilterCustomerValue(customer.id);
                        setOpenCustomerCombobox(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          filterCustomerValue === customer.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {customer.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <Label htmlFor="warehouse-filter" className="text-sm font-medium text-gray-700 dark:text-slate-300">
            {t('filterByWarehouse')}
          </Label>
          <Select onValueChange={(value) => setFilterWarehouseId(value === 'all' ? 'all' : parseInt(value))} value={String(filterWarehouseId)}>
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
  );
};

export default SellOrderFilters;