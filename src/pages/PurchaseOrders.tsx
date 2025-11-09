"use client";

import React, { useState, useMemo } from 'react';
import { useData, MOCK_CURRENT_DATE } from '@/context/DataContext';
import { t } from '@/utils/i18n';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import FormModal from '@/components/FormModal';
import PurchaseOrderForm from '@/forms/PurchaseOrderForm';
import { PlusCircle, Eye, Check, ChevronsUpDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { PurchaseOrder, Product, Supplier, Warehouse } from '@/types'; // Import types from types file
import OrderDetailsExcelExportButton from '@/components/OrderDetailsExcelExportButton'; // Import new component

type SortConfig = {
  key: keyof PurchaseOrder | 'supplierName' | 'warehouseName' | 'productsSubtotalNative' | 'totalAdditionalCostsAZN';
  direction: 'ascending' | 'descending';
};

const PurchaseOrders: React.FC = () => {
  const { purchaseOrders, suppliers, warehouses, products, deleteItem, showAlertModal, currencyRates } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<number | undefined>(undefined);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'orderDate', direction: 'descending' });
  const [filterWarehouseId, setFilterWarehouseId] = useState<number | 'all'>('all');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  
  // State for product filter combobox
  const [productFilterId, setProductFilterId] = useState<number | 'all'>('all');
  const [isProductComboboxOpen, setIsProductComboboxOpen] = useState(false);

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<PurchaseOrder | null>(null);

  const supplierMap = useMemo(() => {
    return suppliers.reduce((acc, s) => ({ ...acc, [s.id]: s.name }), {} as { [key: number]: string });
  }, [suppliers]);

  const warehouseMap = useMemo(() => {
    return warehouses.reduce((acc, w) => ({ ...acc, [w.id]: w.name }), {} as { [key: number]: string });
  }, [warehouses]);

  const productMap = useMemo(() => {
    return products.reduce((acc, p) => ({ ...acc, [p.id]: p }), {} as { [key: number]: Product });
  }, [products]);

  const filteredAndSortedOrders = useMemo(() => {
    let filteredOrders = purchaseOrders;

    if (filterWarehouseId !== 'all') {
      filteredOrders = filteredOrders.filter(order => order.warehouseId === filterWarehouseId);
    }

    if (startDateFilter) {
      filteredOrders = filteredOrders.filter(order => order.orderDate >= startDateFilter);
    }
    if (endDateFilter) {
      filteredOrders = filteredOrders.filter(order => order.orderDate <= endDateFilter);
    }

    if (productFilterId !== 'all') {
      filteredOrders = filteredOrders.filter(order =>
        order.items?.some(item => item.productId === productFilterId)
      );
    }

    const sortableItems = filteredOrders.map(order => {
      // Calculate products subtotal in native currency
      const productsSubtotalNative = order.items?.reduce((sum, item) => sum + (item.qty * item.price), 0) || 0;

      // Helper to convert a fee to AZN
      const convertFeeToAZN = (amount: number, feeCurrency: 'AZN' | 'USD' | 'EUR' | 'RUB') => {
        if (amount === 0) return 0;
        return amount * (feeCurrency === 'AZN' ? 1 : currencyRates[feeCurrency] || 1);
      };

      let totalAdditionalCostsAZN = 0;
      totalAdditionalCostsAZN += convertFeeToAZN(order.transportationFees, order.transportationFeesCurrency);
      totalAdditionalCostsAZN += convertFeeToAZN(order.customFees, order.customFeesCurrency);
      totalAdditionalCostsAZN += convertFeeToAZN(order.additionalFees, order.additionalFeesCurrency);

      return {
        ...order,
        supplierName: supplierMap[order.contactId] || 'N/A',
        warehouseName: warehouseMap[order.warehouseId] || 'N/A',
        productsSubtotalNative, // Add for display in column
        totalAdditionalCostsAZN, // Add for display in new column
      };
    });

    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        const key = sortConfig.key;
        let valA: any = a[key];
        let valB: any = b[key];

        // Handle undefined/null values by treating them as empty strings or 0 for numbers
        if (valA === undefined || valA === null) valA = (key === 'id' || key === 'productsSubtotalNative' || key === 'totalAdditionalCostsAZN') ? 0 : '';
        if (valB === undefined || valB === null) valB = (key === 'id' || key === 'productsSubtotalNative' || key === 'totalAdditionalCostsAZN') ? 0 : '';

        let comparison = 0;

        switch (key) {
          case 'id':
          case 'productsSubtotalNative':
          case 'totalAdditionalCostsAZN':
            comparison = (valA as number) - (valB as number);
            break;
          case 'orderDate':
            comparison = new Date(valA).getTime() - new Date(valB).getTime();
            break;
          case 'supplierName':
          case 'warehouseName':
          case 'status':
            comparison = String(valA).localeCompare(String(valB));
            break;
          default:
            // Fallback for other potential string/numeric fields
            if (typeof valA === 'string' && typeof valB === 'string') {
              comparison = valA.localeCompare(valB);
            } else if (typeof valA === 'number' && typeof valB === 'number') {
              comparison = valA - valB;
            } else {
              // Attempt a generic string comparison if types are mixed or unknown
              comparison = String(valA).localeCompare(String(valB));
            }
            break;
        }

        return sortConfig.direction === 'ascending' ? comparison : -comparison;
      });
    }
    return sortableItems;
  }, [purchaseOrders, supplierMap, warehouseMap, productMap, sortConfig, filterWarehouseId, startDateFilter, endDateFilter, productFilterId, currencyRates]);

  const handleAddOrder = () => {
    setEditingOrderId(undefined);
    setIsModalOpen(true);
  };

  const handleEditOrder = (id: number) => {
    setEditingOrderId(id);
    setIsModalOpen(true);
  };

  const handleDeleteOrder = (id: number) => {
    deleteItem('purchaseOrders', id);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingOrderId(undefined);
  };

  const viewOrderDetails = (orderId: number) => {
    const order = filteredAndSortedOrders.find(o => o.id === orderId); // Use filteredAndSortedOrders to get calculated fields
    if (order) {
      setSelectedOrderDetails(order);
      setIsDetailsModalOpen(true);
    } else {
      showAlertModal('Error', 'Order details not found.');
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
        <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-200">{t('purchaseOrders')}</h1>
        <Button onClick={handleAddOrder}>
          <PlusCircle className="w-4 h-4 mr-2" />
          {t('addPO')}
        </Button>
      </div>

      <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
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

      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-100 dark:bg-slate-700">
              <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={() => requestSort('id')}>
                {t('orderId')} {getSortIndicator('id')}
              </TableHead>
              <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={() => requestSort('supplierName')}>
                {t('supplier')} {getSortIndicator('supplierName')}
              </TableHead>
              <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={() => requestSort('orderDate')}>
                {t('orderDate')} {getSortIndicator('orderDate')}
              </TableHead>
              <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={() => requestSort('warehouseName')}>
                {t('warehouse')} {getSortIndicator('warehouseName')}
              </TableHead>
              <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={() => requestSort('status')}>
                {t('status')} {getSortIndicator('status')}
              </TableHead>
              <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={() => requestSort('productsSubtotalNative')}>
                {t('productsSubtotal')} {getSortIndicator('productsSubtotalNative')}
              </TableHead>
              <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={() => requestSort('totalAdditionalCostsAZN')}>
                {t('additionalCosts')} {getSortIndicator('totalAdditionalCostsAZN')}
              </TableHead>
              <TableHead className="p-3">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedOrders.length > 0 ? (
              filteredAndSortedOrders.map(order => (
                <TableRow key={order.id} className="border-b dark:border-slate-700 text-gray-800 dark:text-slate-300">
                  <TableCell className="p-3 font-semibold">#{order.id} ({order.supplierName})</TableCell>
                  <TableCell className="p-3">{order.supplierName}</TableCell>
                  <TableCell className="p-3">{order.orderDate}</TableCell>
                  <TableCell className="p-3">{order.warehouseName}</TableCell>
                  <TableCell className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      order.status === 'Received' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      order.status === 'Ordered' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}>
                      {t(order.status.toLowerCase() as keyof typeof t)}
                    </span>
                  </TableCell>
                  <TableCell className="p-3 font-bold text-sky-600 dark:text-sky-400">{order.productsSubtotalNative.toFixed(2)} {order.currency}</TableCell>
                  <TableCell className="p-3 font-bold text-orange-600 dark:text-orange-400">{order.totalAdditionalCostsAZN.toFixed(2)} AZN</TableCell>
                  <TableCell className="p-3">
                    <Button variant="link" onClick={() => viewOrderDetails(order.id)} className="mr-2 p-0 h-auto">
                      {t('view')}
                    </Button>
                    <Button variant="link" onClick={() => handleEditOrder(order.id)} className="mr-2 p-0 h-auto">
                      {t('edit')}
                    </Button>
                    <Button variant="link" onClick={() => handleDeleteOrder(order.id)} className="text-red-500 p-0 h-auto">
                      {t('delete')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="p-4 text-center text-gray-500 dark:text-slate-400">
                  {filterWarehouseId !== 'all' || startDateFilter || endDateFilter || productFilterId !== 'all' ? t('noItemsFound') : t('noItemsFound')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <FormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        title={editingOrderId ? t('editPurchaseOrder') : t('createPurchaseOrder')}
      >
        <PurchaseOrderForm orderId={editingOrderId} onSuccess={handleModalClose} />
      </FormModal>

      <FormModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title={t('detailsForOrder') + ` #${selectedOrderDetails?.id}`}
      >
        {selectedOrderDetails && (
          <div className="grid gap-4 py-4 text-gray-800 dark:text-slate-300">
            <p><strong>{t('supplier')}:</strong> {supplierMap[selectedOrderDetails.contactId]}</p>
            <p><strong>{t('warehouse')}:</strong> {warehouseMap[selectedOrderDetails.warehouseId]}</p>
            <p><strong>{t('orderDate')}:</strong> {selectedOrderDetails.orderDate}</p>
            <p><strong>{t('status')}:</strong> {t(selectedOrderDetails.status.toLowerCase() as keyof typeof t)}</p>
            <p><strong>{t('orderCurrency')}:</strong> {selectedOrderDetails.currency}</p>
            {selectedOrderDetails.currency !== 'AZN' && selectedOrderDetails.exchangeRate && (
              <p><strong>{t('exchangeRateToAZN')}:</strong> {selectedOrderDetails.exchangeRate}</p>
            )}
            <h3 className="font-semibold mt-4 mb-2">{t('orderItems')}</h3>
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100 dark:bg-slate-700">
                  <TableHead className="p-2">{t('product')}</TableHead>
                  <TableHead className="p-2">{t('qty')}</TableHead>
                  <TableHead className="p-2">{t('price')}</TableHead>
                  <TableHead className="p-2">{t('landedCostPerUnit')}</TableHead>
                  <TableHead className="p-2">{t('totalValue')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedOrderDetails.items?.map((item, index) => {
                  const product = productMap[item.productId];
                  const itemTotalLandedAZN = (item.landedCostPerUnit || 0) * item.qty;
                  return (
                    <TableRow key={index} className="border-b dark:border-slate-600">
                      <TableCell className="p-2">{product?.name || 'N/A'}</TableCell>
                      <TableCell className="p-2">{item.qty}</TableCell>
                      <TableCell className="p-2">{item.price?.toFixed(2)} {item.currency || selectedOrderDetails.currency}</TableCell>
                      <TableCell className="p-2">{item.landedCostPerUnit?.toFixed(2)} AZN}</TableCell>
                      <TableCell className="p-2">{itemTotalLandedAZN.toFixed(2)} AZN}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                {/* Recalculate for display in native currency for consistency with form */}
                {(() => {
                  const productsSubtotalNative = selectedOrderDetails.items?.reduce((sum, item) => sum + (item.price * item.qty), 0) || 0;
                  const orderNativeToAznRate = selectedOrderDetails.currency === 'AZN' ? 1 : (selectedOrderDetails.exchangeRate || currencyRates[selectedOrderDetails.currency] || 1);

                  const convertFeeToOrderNativeCurrency = (amount: number, feeCurrency: 'AZN' | 'USD' | 'EUR' | 'RUB') => {
                    if (amount === 0) return 0;
                    const feeInAzn = amount * (feeCurrency === 'AZN' ? 1 : currencyRates[feeCurrency] || 1);
                    return feeInAzn / orderNativeToAznRate;
                  };

                  let totalFeesNative = 0;
                  totalFeesNative += convertFeeToOrderNativeCurrency(selectedOrderDetails.transportationFees, selectedOrderDetails.transportationFeesCurrency);
                  totalFeesNative += convertFeeToOrderNativeCurrency(selectedOrderDetails.customFees, selectedOrderDetails.customFeesCurrency);
                  totalFeesNative += convertFeeToOrderNativeCurrency(selectedOrderDetails.additionalFees, selectedOrderDetails.additionalFeesCurrency);

                  const totalValueNative = productsSubtotalNative + totalFeesNative;

                  return (
                    <>
                      <TableRow className="bg-gray-100 dark:bg-slate-700 font-bold">
                        <TableCell colSpan={4} className="p-2 text-right">{t('productsSubtotal')} ({selectedOrderDetails.currency}):</TableCell>
                        <TableCell className="p-2">{productsSubtotalNative.toFixed(2)} {selectedOrderDetails.currency}</TableCell>
                      </TableRow>
                      <TableRow className="bg-gray-100 dark:bg-slate-700">
                        <TableCell colSpan={4} className="p-2 text-right">{t('transportationFees')} ({selectedOrderDetails.transportationFeesCurrency}):</TableCell>
                        <TableCell className="p-2">{selectedOrderDetails.transportationFees.toFixed(2)} {selectedOrderDetails.transportationFeesCurrency}</TableCell>
                      </TableRow>
                      <TableRow className="bg-gray-100 dark:bg-slate-700">
                        <TableCell colSpan={4} className="p-2 text-right">{t('customFees')} ({selectedOrderDetails.customFeesCurrency}):</TableCell>
                        <TableCell className="p-2">{selectedOrderDetails.customFees.toFixed(2)} {selectedOrderDetails.customFeesCurrency}</TableCell>
                      </TableRow>
                      <TableRow className="bg-gray-100 dark:bg-slate-700">
                        <TableCell colSpan={4} className="p-2 text-right">{t('additionalFees')} ({selectedOrderDetails.additionalFeesCurrency}):</TableCell>
                        <TableCell className="p-2">{selectedOrderDetails.additionalFees.toFixed(2)} {selectedOrderDetails.additionalFeesCurrency}</TableCell>
                      </TableRow>
                      <TableRow className="bg-gray-200 dark:bg-slate-600 font-bold">
                        <TableCell colSpan={4} className="p-2 text-right">{t('total')} ({selectedOrderDetails.currency}):</TableCell>
                        <TableCell className="p-2 text-sky-600 dark:text-sky-400">{totalValueNative.toFixed(2)} {selectedOrderDetails.currency}</TableCell>
                      </TableRow>
                      <TableRow className="bg-gray-200 dark:bg-slate-600 font-bold">
                        <TableCell colSpan={4} className="p-2 text-right">{t('totalLandedCost')} (AZN):</TableCell>
                        <TableCell className="p-2 text-sky-600 dark:text-sky-400">{selectedOrderDetails.total.toFixed(2)} AZN}</TableCell>
                      </TableRow>
                    </>
                  );
                })()}
              </TableFooter>
            </Table>
            <OrderDetailsExcelExportButton
              order={selectedOrderDetails}
              orderType="purchase"
              productMap={productMap}
              customerMap={{}} // Not needed for PO
              supplierMap={suppliers.reduce((acc, s) => ({ ...acc, [s.id]: s }), {} as { [key: number]: Supplier })}
              warehouseMap={warehouses.reduce((acc, w) => ({ ...acc, [w.id]: w }), {} as { [key: number]: Warehouse })}
              currencyRates={currencyRates}
            />
          </div>
        )}
      </FormModal>
    </div>
  );
};

export default PurchaseOrders;