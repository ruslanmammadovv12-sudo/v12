"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { useData, MOCK_CURRENT_DATE } from '@/context/DataContext';
import { t } from '@/utils/i18n';
import { Button } from '@/components/ui/button';
import FormModal from '@/components/FormModal';
import PurchaseOrderForm from '@/forms/PurchaseOrderForm';
import { PlusCircle } from 'lucide-react';

// Import new modular components
import PurchaseOrderFilters from '@/components/PurchaseOrderFilters';
import PurchaseOrdersTable from '@/components/PurchaseOrdersTable';
import PurchaseOrderDetails from '@/components/PurchaseOrderDetails';

import { PurchaseOrder, Product, Supplier, Warehouse } from '@/types'; // Import types from types file

type SortConfig = {
  key: keyof PurchaseOrder | 'supplierName' | 'warehouseName' | 'productsSubtotalNative' | 'totalAdditionalCostsAZN';
  direction: 'ascending' | 'descending';
};

const PurchaseOrders: React.FC = () => {
  const { purchaseOrders, suppliers, warehouses, products, deleteItem, showAlertModal, currencyRates } = useData();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<number | undefined>(undefined);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<PurchaseOrder | null>(null);

  // State for filters, managed by PurchaseOrderFilters component
  const [filters, setFilters] = useState({
    filterWarehouseId: 'all' as number | 'all',
    filterSupplierValue: 'all' as number | 'all' | string,
    startDateFilter: '',
    endDateFilter: '',
    productFilterId: 'all' as number | 'all',
  });

  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'orderDate', direction: 'descending' });

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

  const supplierMap = useMemo(() => {
    return suppliers.reduce((acc, s) => ({ ...acc, [s.id]: s }), {} as { [key: number]: Supplier });
  }, [suppliers]);

  const warehouseMap = useMemo(() => {
    return warehouses.reduce((acc, w) => ({ ...acc, [w.id]: w }), {} as { [key: number]: Warehouse });
  }, [warehouses]);

  const productMap = useMemo(() => {
    return products.reduce((acc, p) => ({ ...acc, [p.id]: p }), {} as { [key: number]: Product });
  }, [products]);

  // Helper function to format fees for display
  const formatFeesDisplay = useCallback((order: PurchaseOrder) => {
    const fees: { amount: number; currency: 'AZN' | 'USD' | 'EUR' | 'RUB' }[] = [];
    if (order.transportationFees > 0) fees.push({ amount: order.transportationFees, currency: order.transportationFeesCurrency });
    if (order.customFees > 0) fees.push({ amount: order.customFees, currency: order.customFeesCurrency });
    if (order.additionalFees > 0) fees.push({ amount: order.additionalFees, currency: order.additionalFeesCurrency });

    if (fees.length === 0) {
      return `0.00 AZN`;
    }

    // Group fees by currency
    const groupedFees: { [currency: string]: number } = {};
    fees.forEach(fee => {
      groupedFees[fee.currency] = (groupedFees[fee.currency] || 0) + fee.amount;
    });

    const parts: string[] = [];
    for (const currency in groupedFees) {
      parts.push(`${groupedFees[currency].toFixed(2)} ${currency}`);
    }

    return parts.join(', ');
  }, []);

  const filteredAndSortedOrders = useMemo(() => {
    let filteredOrders = purchaseOrders;

    if (filters.filterWarehouseId !== 'all') {
      filteredOrders = filteredOrders.filter(order => order.warehouseId === filters.filterWarehouseId);
    }
    
    // Apply supplier filter based on type of filterSupplierValue
    if (filters.filterSupplierValue !== 'all') {
      if (typeof filters.filterSupplierValue === 'number') {
        filteredOrders = filteredOrders.filter(order => order.contactId === filters.filterSupplierValue);
      } else if (typeof filters.filterSupplierValue === 'string') {
        const lowercasedSearch = filters.filterSupplierValue.toLowerCase();
        filteredOrders = filteredOrders.filter(order =>
          (supplierMap[order.contactId]?.name || '').toLowerCase().includes(lowercasedSearch)
        );
      }
    }

    if (filters.startDateFilter) {
      filteredOrders = filteredOrders.filter(order => order.orderDate >= filters.startDateFilter);
    }
    if (filters.endDateFilter) {
      filteredOrders = filteredOrders.filter(order => order.orderDate <= filters.endDateFilter);
    }

    if (filters.productFilterId !== 'all') {
      filteredOrders = filteredOrders.filter(order =>
        order.items?.some(item => item.productId === filters.productFilterId)
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

      const additionalFeesDisplayString = formatFeesDisplay(order); // Use the new helper

      return {
        ...order,
        supplierName: supplierMap[order.contactId]?.name || 'N/A',
        warehouseName: warehouseMap[order.warehouseId]?.name || 'N/A',
        productsSubtotalNative, // Add for display in column
        totalAdditionalCostsAZN, // Keep for sorting
        additionalFeesDisplayString, // New field for display
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
  }, [purchaseOrders, supplierMap, warehouseMap, productMap, sortConfig, filters, currencyRates, formatFeesDisplay]);

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

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-200">{t('purchaseOrders')}</h1>
        <Button onClick={handleAddOrder}>
          <PlusCircle className="w-4 h-4 mr-2" />
          {t('addPO')}
        </Button>
      </div>

      <PurchaseOrderFilters onFiltersChange={setFilters} />

      <PurchaseOrdersTable
        orders={filteredAndSortedOrders}
        handleEditOrder={handleEditOrder}
        handleDeleteOrder={handleDeleteOrder}
        viewOrderDetails={viewOrderDetails}
        sortConfig={sortConfig}
        handleSortClick={handleSortClick}
        getSortIndicator={getSortIndicator}
      />

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
          <PurchaseOrderDetails
            order={selectedOrderDetails}
            supplierMap={supplierMap}
            warehouseMap={warehouseMap}
            productMap={productMap}
            currencyRates={currencyRates}
          />
        )}
      </FormModal>
    </div>
  );
};

export default PurchaseOrders;