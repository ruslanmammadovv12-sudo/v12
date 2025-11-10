"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { useData, MOCK_CURRENT_DATE } from '@/context/DataContext';
import { t } from '@/utils/i18n';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import FormModal from '@/components/FormModal';
import SellOrderForm from '@/forms/SellOrderForm';
import { PlusCircle, Eye, Check, ChevronsUpDown } from 'lucide-react'; // Added Check, ChevronsUpDown
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input'; // Added Input
import { Label } from '@/components/ui/label'; // Added Label
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'; // Added Popover components
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command'; // Added Command components
import { cn } from '@/lib/utils'; // Added cn utility
import { SellOrder, Product, Customer, Warehouse } from '@/types'; // Import types from types file
import OrderDetailsExcelExportButton from '@/components/OrderDetailsExcelExportButton'; // Import new component

type SortConfig = {
  key: keyof SellOrder | 'customerName' | 'warehouseName' | 'totalItems' | 'totalValueAZN' | 'paymentStatus';
  direction: 'ascending' | 'descending';
};

const SellOrders: React.FC = () => {
  const { sellOrders, customers, warehouses, products, incomingPayments, deleteItem, showAlertModal, currencyRates } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<number | undefined>(undefined);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'orderDate', direction: 'descending' });
  const [filterWarehouseId, setFilterWarehouseId] = useState<number | 'all'>('all');
  const [filterCustomerId, setFilterCustomerId] = useState<number | 'all'>('all'); // New state for customer filter
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<SellOrder | null>(null);

  // New states for date range filter
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');

  // New states for product filter combobox
  const [productFilterId, setProductFilterId] = useState<number | 'all'>('all');
  const [isProductComboboxOpen, setIsProductComboboxOpen] = useState(false);

  const requestSort = useCallback((key: SortConfig['key']) => {
    let direction: SortConfig['direction'] = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  }, [sortConfig]);

  const getSortIndicator = useCallback((key: SortConfig['key']) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    }
    return '';
  }, [sortConfig]);

  // Memoized handler for sorting clicks
  const handleSortClick = useCallback((key: SortConfig['key']) => () => {
    requestSort(key);
  }, [requestSort]);

  const customerMap = useMemo(() => {
    return customers.reduce((acc, c) => ({ ...acc, [c.id]: c.name }), {} as { [key: number]: string });
  }, [customers]);

  const warehouseMap = useMemo(() => {
    return warehouses.reduce((acc, w) => ({ ...acc, [w.id]: w.name }), {} as { [key: number]: string });
  }, [warehouses]);

  const productMap = useMemo(() => {
    return products.reduce((acc, p) => ({ ...acc, [p.id]: p }), {} as { [key: number]: Product });
  }, [products]);

  const paymentsByOrder = useMemo(() => {
    return incomingPayments.reduce((acc, payment) => {
      acc[payment.orderId] = (acc[payment.orderId] || 0) + payment.amount;
      return acc;
    }, {} as { [key: number]: number });
  }, [incomingPayments]);

  const getPaymentStatus = useCallback((order: SellOrder) => {
    const totalPaid = paymentsByOrder[order.id] || 0;
    if (totalPaid >= order.total - 0.001) return 'Paid'; // Use tolerance for float comparison
    if (totalPaid > 0) return 'Partially Paid';
    return 'Unpaid';
  }, [paymentsByOrder]);

  const handleAddOrder = () => {
    setEditingOrderId(undefined);
    setIsModalOpen(true);
  };

  const handleEditOrder = (id: number) => {
    setEditingOrderId(id);
    setIsModalOpen(true);
  };

  const handleDeleteOrder = (id: number) => {
    deleteItem('sellOrders', id);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingOrderId(undefined);
  };

  const viewOrderDetails = (orderId: number) => {
    const order = sellOrders.find(o => o.id === orderId);
    if (order) {
      setSelectedOrderDetails(order);
      setIsDetailsModalOpen(true);
    } else {
      showAlertModal('Error', 'Order details not found.');
    }
  };

  const filteredAndSortedOrders = useMemo(() => {
    let filteredOrders = sellOrders;

    if (filterWarehouseId !== 'all') {
    filteredOrders = filteredOrders.filter(order => order.warehouseId === filterWarehouseId);
    }
    // Apply new customer filter
    if (filterCustomerId !== 'all') {
      filteredOrders = filteredOrders.filter(order => order.contactId === filterCustomerId);
    }

    // Apply date range filter
    if (startDateFilter) {
      filteredOrders = filteredOrders.filter(order => order.orderDate >= startDateFilter);
    }
    if (endDateFilter) {
      filteredOrders = filteredOrders.filter(order => order.orderDate <= endDateFilter);
    }

    // Apply product filter
    if (productFilterId !== 'all') {
      filteredOrders = filteredOrders.filter(order =>
        order.items?.some(item => item.productId === productFilterId)
      );
    }

    const sortableItems = filteredOrders.map(order => {
      const totalItems = order.items?.reduce((sum, item) => sum + (item.qty || 0), 0) || 0;
      const totalValueAZN = order.total || 0;
      const paymentStatus = getPaymentStatus(order);

      return {
        ...order,
        customerName: customerMap[order.contactId] || 'N/A',
        warehouseName: warehouseMap[order.warehouseId] || 'N/A',
        totalItems,
        totalValueAZN,
        paymentStatus,
      };
    });

    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        const key = sortConfig.key;
        let valA: any = a[key];
        let valB: any = b[key];

        // Handle undefined/null values by treating them as empty strings or 0 for numbers
        if (valA === undefined || valA === null) valA = (key === 'id' || key === 'totalItems' || key === 'totalValueAZN') ? 0 : '';
        if (valB === undefined || valB === null) valB = (key === 'id' || key === 'totalItems' || key === 'totalValueAZN') ? 0 : '';

        let comparison = 0;

        switch (key) {
          case 'id':
          case 'totalItems':
          case 'totalValueAZN':
            comparison = (valA as number) - (valB as number);
            break;
          case 'orderDate':
            comparison = new Date(valA).getTime() - new Date(valB).getTime();
            break;
          case 'customerName':
          case 'warehouseName':
          case 'status':
          case 'paymentStatus':
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
  }, [sellOrders, customerMap, warehouseMap, productMap, sortConfig, filterWarehouseId, filterCustomerId, startDateFilter, endDateFilter, productFilterId, getPaymentStatus]);

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-200">{t('sellOrders')}</h1>
        <Button onClick={handleAddOrder}>
          <PlusCircle className="w-4 h-4 mr-2" />
          {t('addSO')}
        </Button>
      </div>

      <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end"> {/* Changed to 5 columns */}
          <div>
            <Label htmlFor="customer-filter" className="text-sm font-medium text-gray-700 dark:text-slate-300">
              {t('filterByCustomer')} {/* New Label */}
            </Label>
            <Select onValueChange={(value) => setFilterCustomerId(value === 'all' ? 'all' : parseInt(value))} value={String(filterCustomerId)}>
              <SelectTrigger className="w-full mt-1">
                <SelectValue placeholder={t('allCustomers')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allCustomers')}</SelectItem>
                {customers.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-100 dark:bg-slate-700">
              <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={handleSortClick('id')}>
                {t('orderId')} {getSortIndicator('id')}
              </TableHead>
              <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={handleSortClick('customerName')}>
                {t('customer')} {getSortIndicator('customerName')}
              </TableHead>
              <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={handleSortClick('orderDate')}>
                {t('orderDate')} {getSortIndicator('orderDate')}
              </TableHead>
              <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={handleSortClick('warehouseName')}>
                {t('warehouse')} {getSortIndicator('warehouseName')}
              </TableHead>
              <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={handleSortClick('status')}>
                {t('orderStatus')} {getSortIndicator('status')}
              </TableHead>
              <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={handleSortClick('paymentStatus')}>
                {t('paymentStatus')} {getSortIndicator('paymentStatus')}
              </TableHead>
              <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={handleSortClick('totalValueAZN')}>
                {t('total')} (AZN) {getSortIndicator('totalValueAZN')}
              </TableHead>
              <TableHead className="p-3">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedOrders.length > 0 ? (
              filteredAndSortedOrders.map(order => (
                <TableRow key={order.id} className="border-b dark:border-slate-700 text-gray-800 dark:text-slate-300">
                  <TableCell className="p-3 font-semibold">#{order.id} ({order.customerName})</TableCell>
                  <TableCell className="p-3">{order.customerName}</TableCell>
                  <TableCell className="p-3">{order.orderDate}</TableCell>
                  <TableCell className="p-3">{order.warehouseName}</TableCell>
                  <TableCell className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      order.status === 'Shipped' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      order.status === 'Confirmed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}>
                      {t(order.status.toLowerCase() as keyof typeof t)}
                    </span>
                  </TableCell>
                  <TableCell className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      order.paymentStatus === 'Paid' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      order.paymentStatus === 'Partially Paid' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {t(order.paymentStatus.toLowerCase().replace(' ', '') as keyof typeof t)}
                    </span>
                  </TableCell>
                  <TableCell className="p-3 font-bold text-sky-600 dark:text-sky-400">{order.totalValueAZN.toFixed(2)} AZN</TableCell>
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
                  {filterWarehouseId !== 'all' || startDateFilter || endDateFilter || productFilterId !== 'all' || filterCustomerId !== 'all' ? t('noItemsFound') : t('noItemsFound')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <FormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        title={editingOrderId ? t('editSellOrder') : t('createSellOrder')}
      >
        <SellOrderForm orderId={editingOrderId} onSuccess={handleModalClose} />
      </FormModal>

      <FormModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title={t('detailsForOrder') + ` #${selectedOrderDetails?.id}`}
      >
        {selectedOrderDetails && (
          <div className="grid gap-4 py-4 text-gray-800 dark:text-slate-300">
            <p><strong>{t('customer')}:</strong> {customerMap[selectedOrderDetails.contactId]}</p>
            <p><strong>{t('warehouse')}:</strong> {warehouseMap[selectedOrderDetails.warehouseId]}</p>
            <p><strong>{t('orderDate')}:</strong> {selectedOrderDetails.orderDate}</p>
            <p><strong>{t('orderStatus')}:</strong> {t(selectedOrderDetails.status.toLowerCase() as keyof typeof t)}</p>
            <p><strong>{t('vatPercent')}:</strong> {selectedOrderDetails.vatPercent}%</p>
            <h3 className="font-semibold mt-4 mb-2">{t('orderItems')}</h3>
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100 dark:bg-slate-700">
                  <TableHead className="p-2">{t('product')}</TableHead>
                  <TableHead className="p-2">{t('qty')}</TableHead>
                  <TableHead className="p-2">{t('price')}</TableHead>
                  <TableHead className="p-2">{t('totalValue')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedOrderDetails.items?.map((item, index) => {
                  const product = productMap[item.productId];
                  const itemTotal = item.price * item.qty;
                  return (
                    <TableRow key={index} className="border-b dark:border-slate-600">
                      <TableCell className="p-2">{product?.name || 'N/A'}</TableCell>
                      <TableCell className="p-2">{item.qty}</TableCell>
                      <TableCell className="p-2">{item.price?.toFixed(2)} AZN</TableCell>
                      <TableCell className="p-2">{itemTotal.toFixed(2)} AZN}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow className="bg-gray-100 dark:bg-slate-700 font-bold">
                  <TableCell colSpan={3} className="p-2 text-right">{t('productsSubtotal')}:</TableCell>
                  <TableCell className="p-2">{selectedOrderDetails.items?.reduce((sum, item) => sum + (item.price * item.qty), 0).toFixed(2)} AZN</TableCell>
                </TableRow>
                <TableRow className="bg-gray-100 dark:bg-slate-700">
                  <TableCell colSpan={3} className="p-2 text-right">VAT ({selectedOrderDetails.vatPercent}%):</TableCell>
                  <TableCell className="p-2">{(selectedOrderDetails.total / (1 + selectedOrderDetails.vatPercent / 100) * (selectedOrderDetails.vatPercent / 100)).toFixed(2)} AZN</TableCell>
                </TableRow>
                <TableRow className="bg-gray-200 dark:bg-slate-600 font-bold">
                  <TableCell colSpan={3} className="p-2 text-right">{t('total')}:</TableCell>
                  <TableCell className="p-2 text-sky-600 dark:text-sky-400">{selectedOrderDetails.total.toFixed(2)} AZN</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
            <OrderDetailsExcelExportButton
              order={selectedOrderDetails}
              orderType="sell"
              productMap={productMap}
              customerMap={customers.reduce((acc, c) => ({ ...acc, [c.id]: c }), {} as { [key: number]: Customer })}
              supplierMap={{}} // Not needed for SO
              warehouseMap={warehouses.reduce((acc, w) => ({ ...acc, [w.id]: w }), {} as { [key: number]: Warehouse })}
              currencyRates={currencyRates}
            />
          </div>
        )}
      </FormModal>
    </div>
  );
};

export default SellOrders;