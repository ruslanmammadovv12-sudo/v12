"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { useData, MOCK_CURRENT_DATE } from '@/context/DataContext';
import { t } from '@/utils/i18n';
import { Button } from '@/components/ui/button';
import FormModal from '@/components/FormModal';
import SellOrderForm from '@/forms/SellOrderForm';
import { PlusCircle } from 'lucide-react';

// Import new modular components
import SellOrderFilters from '@/components/SellOrderFilters';
import SellOrdersTable from '@/components/SellOrdersTable';
import SellOrderDetails from '@/components/SellOrderDetails';

import { SellOrder, Product, Customer, Warehouse } from '@/types'; // Import types from types file

type SortConfig = {
  key: keyof SellOrder | 'customerName' | 'warehouseName' | 'totalItems' | 'totalValueAZN' | 'paymentStatus';
  direction: 'ascending' | 'descending';
};

const SellOrders: React.FC = () => {
  const { sellOrders, customers, warehouses, products, incomingPayments, deleteItem, showAlertModal, currencyRates } = useData();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<number | undefined>(undefined);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<SellOrder | null>(null);

  // State for filters, managed by SellOrderFilters component
  const [filters, setFilters] = useState({
    filterWarehouseId: 'all' as number | 'all',
    filterCustomerValue: 'all' as number | 'all' | string,
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

  const customerMap = useMemo(() => {
    return customers.reduce((acc, c) => ({ ...acc, [c.id]: c }), {} as { [key: number]: Customer });
  }, [customers]);

  const warehouseMap = useMemo(() => {
    return warehouses.reduce((acc, w) => ({ ...acc, [w.id]: w }), {} as { [key: number]: Warehouse });
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

    if (filters.filterWarehouseId !== 'all') {
      filteredOrders = filteredOrders.filter(order => order.warehouseId === filters.filterWarehouseId);
    }
    
    if (filters.filterCustomerValue !== 'all') {
      if (typeof filters.filterCustomerValue === 'number') {
        filteredOrders = filteredOrders.filter(order => order.contactId === filters.filterCustomerValue);
      } else if (typeof filters.filterCustomerValue === 'string') {
        const lowercasedSearch = filters.filterCustomerValue.toLowerCase();
        filteredOrders = filteredOrders.filter(order =>
          (customerMap[order.contactId]?.name || '').toLowerCase().includes(lowercasedSearch)
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
      const totalItems = order.items?.reduce((sum, item) => sum + (item.qty || 0), 0) || 0;
      const totalValueAZN = order.total || 0;
      const paymentStatus = getPaymentStatus(order);

      return {
        ...order,
        customerName: customerMap[order.contactId]?.name || 'N/A',
        warehouseName: warehouseMap[order.warehouseId]?.name || 'N/A',
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
            if (typeof valA === 'string' && typeof valB === 'string') {
              comparison = valA.localeCompare(valB);
            } else if (typeof valA === 'number' && typeof valB === 'number') {
              comparison = valA - valB;
            } else {
              comparison = String(valA).localeCompare(String(valB));
            }
            break;
        }

        return sortConfig.direction === 'ascending' ? comparison : -comparison;
      });
    }
    return sortableItems;
  }, [sellOrders, customerMap, warehouseMap, productMap, sortConfig, filters, getPaymentStatus]);

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-200">{t('sellOrders')}</h1>
        <Button onClick={handleAddOrder}>
          <PlusCircle className="w-4 h-4 mr-2" />
          {t('addSO')}
        </Button>
      </div>

      <SellOrderFilters onFiltersChange={setFilters} />

      <SellOrdersTable
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
          <SellOrderDetails
            order={selectedOrderDetails}
            customerMap={customerMap}
            warehouseMap={warehouseMap}
            productMap={productMap}
            currencyRates={currencyRates}
          />
        )}
      </FormModal>
    </div>
  );
};

export default SellOrders;