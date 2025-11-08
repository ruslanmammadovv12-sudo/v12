"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { useData, MOCK_CURRENT_DATE } from '@/context/DataContext';
import { t } from '@/utils/i18n';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Product, SellOrder, PurchaseOrder } from '@/types'; // Import types from types file

type SortConfig = {
  key: 'productName' | 'sku' | 'qtySold' | 'totalSales' | 'totalCOGS' | 'cleanProfit' | 'salesPercentage' | 'daysInStock';
  direction: 'ascending' | 'descending';
};

const Profitability: React.FC = () => {
  const { products, sellOrders, purchaseOrders } = useData();
  const [period, setPeriod] = useState<'allTime' | 'thisYear' | 'thisMonth' | 'thisWeek' | 'today'>('allTime');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'cleanProfit', direction: 'descending' });

  // New states for product filter
  const [productFilterId, setProductFilterId] = useState<number | 'all'>('all');
  const [isProductComboboxOpen, setIsProductComboboxOpen] = useState(false);

  const productMap = useMemo(() => {
    return products.reduce((acc, p) => ({ ...acc, [p.id]: p }), {} as { [key: number]: Product });
  }, [products]);

  const getPeriodDates = useCallback(() => {
    const now = MOCK_CURRENT_DATE;
    let start = new Date(0); // Epoch
    let end = new Date(now);

    switch (period) {
      case 'thisYear':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'thisWeek':
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
        start = new Date(now.setDate(diff));
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        break;
      case 'allTime':
      default:
        start = new Date(0);
        end = new Date(now);
        break;
    }
    return { start, end };
  }, [period]);

  const { start: calculatedStartDate, end: calculatedEndDate } = getPeriodDates();

  const effectiveStartDate = startDate ? new Date(startDate) : calculatedStartDate;
  const effectiveEndDate = endDate ? new Date(endDate) : calculatedEndDate;

  const profitabilityData = useMemo(() => {
    const productStats: {
      [productId: number]: {
        product: Product;
        qtySold: number;
        totalSales: number; // Revenue excl. VAT
        totalCOGS: number;
        cleanProfit: number;
      };
    } = {};

    // Initialize product stats for all products or just the filtered one
    const productsToConsider = productFilterId === 'all' ? products : products.filter(p => p.id === productFilterId);

    productsToConsider.forEach(p => {
      productStats[p.id] = {
        product: p,
        qtySold: 0,
        totalSales: 0,
        totalCOGS: 0,
        cleanProfit: 0,
      };
    });

    // Aggregate sales data
    sellOrders.forEach(order => {
      const orderDate = new Date(order.orderDate);
      if (order.status === 'Shipped' && orderDate >= effectiveStartDate && orderDate <= effectiveEndDate) {
        order.items.forEach(item => {
          // Only process if the item's product is in our consideration set
          if (productStats[item.productId]) {
            const product = productStats[item.productId];
            const itemRevenueExVat = (item.price * item.qty) / (1 + order.vatPercent / 100);
            product.qtySold += item.qty;
            product.totalSales += itemRevenueExVat;
            product.totalCOGS += item.qty * (product.product.averageLandedCost || 0);
          }
        });
      }
    });

    // Calculate clean profit
    Object.values(productStats).forEach(stats => {
      stats.cleanProfit = stats.totalSales - stats.totalCOGS;
    });

    const totalOverallSales = Object.values(productStats).reduce((sum, stats) => sum + stats.totalSales, 0);

    const finalData = Object.values(productStats)
      .filter(stats => stats.qtySold > 0) // Only show products that were sold
      .map(stats => ({
        ...stats,
        productName: stats.product.name,
        sku: stats.product.sku,
        salesPercentage: totalOverallSales > 0 ? (stats.totalSales / totalOverallSales) * 100 : 0,
        // Days in stock calculation (simplified: average days product was in stock during the period)
        // This is a complex calculation, for now, we'll use a placeholder or a simpler metric.
        // For a real system, this would involve tracking inventory levels over time.
        daysInStock: 'N/A', // Placeholder
      }));

    if (sortConfig.key) {
      finalData.sort((a, b) => {
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

    return finalData;
  }, [products, sellOrders, purchaseOrders, effectiveStartDate, effectiveEndDate, sortConfig, productFilterId]);

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
      <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-200 mb-6">{t('profitabilityAnalysis')}</h1>

      <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <Label htmlFor="period-select" className="text-sm font-medium text-gray-700 dark:text-slate-300">{t('period')}</Label>
            <Select onValueChange={(value: typeof period) => { setPeriod(value); setStartDate(''); setEndDate(''); }} value={period}>
              <SelectTrigger id="period-select" className="w-full mt-1">
                <SelectValue placeholder={t('allTime')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="allTime">{t('allTime')}</SelectItem>
                <SelectItem value="thisYear">{t('thisYear')}</SelectItem>
                <SelectItem value="thisMonth">{t('thisMonth')}</SelectItem>
                <SelectItem value="thisWeek">{t('thisWeek')}</SelectItem>
                <SelectItem value="today">{t('today')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="product-filter" className="text-sm font-medium text-gray-700 dark:text-slate-300">
              {t('filterByProduct')}
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
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPeriod('allTime'); }}
              className="mt-1 w-full p-2 border rounded-md shadow-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            />
          </div>
          <div>
            <Label htmlFor="end-date-filter" className="text-sm font-medium text-gray-700 dark:text-slate-300">{t('endDate')}</Label>
            <Input
              type="date"
              id="end-date-filter"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPeriod('allTime'); }}
              className="mt-1 w-full p-2 border rounded-md shadow-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md overflow-x-auto">
        {profitabilityData.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100 dark:bg-slate-700">
                <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={() => requestSort('productName')}>
                  {t('productName')} {getSortIndicator('productName')}
                </TableHead>
                <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={() => requestSort('sku')}>
                  {t('sku')} {getSortIndicator('sku')}
                </TableHead>
                <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={() => requestSort('qtySold')}>
                  {t('qtySold')} {getSortIndicator('qtySold')}
                </TableHead>
                <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={() => requestSort('totalSales')}>
                  {t('totalSales')} (Excl. VAT) {getSortIndicator('totalSales')}
                </TableHead>
                <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={() => requestSort('totalCOGS')}>
                  {t('cogsTotal')} {getSortIndicator('totalCOGS')}
                </TableHead>
                <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={() => requestSort('cleanProfit')}>
                  {t('cleanProfit')} {getSortIndicator('cleanProfit')}
                </TableHead>
                <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={() => requestSort('salesPercentage')}>
                  {t('salesPercentage')} {getSortIndicator('salesPercentage')}
                </TableHead>
                <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={() => requestSort('daysInStock')}>
                  {t('daysInStock')} {getSortIndicator('daysInStock')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profitabilityData.map(data => (
                <TableRow key={data.product.id} className="border-b dark:border-slate-700 text-gray-800 dark:text-slate-300">
                  <TableCell className="p-3">{data.productName}</TableCell>
                  <TableCell className="p-3">{data.sku}</TableCell>
                  <TableCell className="p-3 font-bold">{data.qtySold}</TableCell>
                  <TableCell className="p-3">{data.totalSales.toFixed(2)} AZN</TableCell>
                  <TableCell className="p-3">{data.totalCOGS.toFixed(2)} AZN</TableCell>
                  <TableCell className={`p-3 font-bold ${data.cleanProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {data.cleanProfit.toFixed(2)} AZN
                  </TableCell>
                  <TableCell className="p-3">{data.salesPercentage.toFixed(2)}%</TableCell>
                  <TableCell className="p-3">{data.daysInStock}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="p-4 text-center text-gray-500 dark:text-slate-400">
            {t('noProductsToAnalyze')}
          </p>
        )}
      </div>
    </div>
  );
};

export default Profitability;