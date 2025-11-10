"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { useData, MOCK_CURRENT_DATE } from '@/context/DataContext';
import { t } from '@/utils/i18n';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import FormModal from '@/components/FormModal';
import PaymentForm from '@/forms/PaymentForm';
import { PlusCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; // Added missing import
import { Payment, PurchaseOrder } from '@/types'; // Import types from types file

type SortConfig = {
  key: keyof Payment | 'linkedOrderDisplay';
  direction: 'ascending' | 'descending';
};

const OutgoingPayments: React.FC = () => {
  const { outgoingPayments, purchaseOrders, suppliers, deleteItem, currencyRates } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<number | undefined>(undefined);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'id', direction: 'ascending' });
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');

  const purchaseOrderMap = useMemo(() => purchaseOrders.reduce((acc, o) => ({ ...acc, [o.id]: o }), {} as { [key: number]: PurchaseOrder }), [purchaseOrders]);
  const supplierMap = useMemo(() => suppliers.reduce((acc, s) => ({ ...acc, [s.id]: s.name }), {} as { [key: number]: string }), [suppliers]);

  // Aggregate payments by order ID and specific category (products/transportationFees/customFees/additionalFees) in AZN
  const paymentsByOrderAndCategoryAZN = useMemo(() => {
    const result: {
      [orderId: number]: {
        products: number;
        transportationFees: number;
        customFees: number;
        additionalFees: number;
      };
    } = {};

    outgoingPayments.forEach(p => {
      if (p.orderId !== 0 && p.paymentCategory !== 'manual') {
        if (!result[p.orderId]) {
          result[p.orderId] = { products: 0, transportationFees: 0, customFees: 0, additionalFees: 0 };
        }
        const amountInAZN = p.amount * (p.paymentCurrency === 'AZN' ? 1 : (p.paymentExchangeRate || currencyRates[p.paymentCurrency] || 1));
        result[p.orderId][p.paymentCategory] += amountInAZN;
      }
    });
    return result;
  }, [outgoingPayments, currencyRates]);

  const filteredAndSortedPayments = useMemo(() => {
    let filteredPayments = outgoingPayments;

    if (startDateFilter) {
      filteredPayments = filteredPayments.filter(p => p.date >= startDateFilter);
    }
    if (endDateFilter) {
      filteredPayments = filteredPayments.filter(p => p.date <= endDateFilter);
    }

    const sortableItems = filteredPayments.map(p => {
      let linkedOrderDisplay = '';
      let remainingAmountText = '';
      let rowClass = 'border-b dark:border-slate-700 text-gray-800 dark:text-slate-300';

      if (p.orderId === 0) {
        linkedOrderDisplay = t('manualExpense');
      } else {
        const order = purchaseOrderMap[p.orderId];
        const supplierName = order ? supplierMap[order.contactId] || 'Unknown' : 'N/A';
        
        let categoryText = '';
        switch (p.paymentCategory) {
          case 'products': categoryText = t('paymentForProducts'); break;
          case 'transportationFees': categoryText = t('paymentForTransportationFees'); break;
          case 'customFees': categoryText = t('paymentForCustomFees'); break;
          case 'additionalFees': categoryText = t('paymentForAdditionalFees'); break;
          default: categoryText = ''; break;
        }
        linkedOrderDisplay = `${t('orderId')} #${p.orderId} (${supplierName}) ${categoryText}`;

        if (order) {
          // Calculate remaining balance for the specific category in its native currency
          let totalCategoryValueNative = 0;
          let totalPaidForCategoryNative = 0;
          let categoryCurrency: 'AZN' | 'USD' | 'EUR' | 'RUB' = 'AZN';

          if (p.paymentCategory === 'products') {
            totalCategoryValueNative = order.items?.reduce((sum, item) => sum + (item.qty * item.price), 0) || 0;
            categoryCurrency = order.currency;
            // Sum payments for 'products' category, converted to order.currency
            totalPaidForCategoryNative = (paymentsByOrderAndCategoryAZN[order.id]?.products || 0) / (order.currency === 'AZN' ? 1 : (order.exchangeRate || currencyRates[order.currency] || 1));
          } else if (p.paymentCategory === 'transportationFees') {
            totalCategoryValueNative = order.transportationFees;
            categoryCurrency = order.transportationFeesCurrency;
            totalPaidForCategoryNative = (paymentsByOrderAndCategoryAZN[order.id]?.transportationFees || 0) / (categoryCurrency === 'AZN' ? 1 : currencyRates[categoryCurrency] || 1);
          } else if (p.paymentCategory === 'customFees') {
            totalCategoryValueNative = order.customFees;
            categoryCurrency = order.customFeesCurrency;
            totalPaidForCategoryNative = (paymentsByOrderAndCategoryAZN[order.id]?.customFees || 0) / (categoryCurrency === 'AZN' ? 1 : currencyRates[categoryCurrency] || 1);
          } else if (p.paymentCategory === 'additionalFees') {
            totalCategoryValueNative = order.additionalFees;
            categoryCurrency = order.additionalFeesCurrency;
            totalPaidForCategoryNative = (paymentsByOrderAndCategoryAZN[order.id]?.additionalFees || 0) / (categoryCurrency === 'AZN' ? 1 : currencyRates[categoryCurrency] || 1);
          }

          const currentRemainingBalanceNative = totalCategoryValueNative - totalPaidForCategoryNative;
          const isFullyPaid = currentRemainingBalanceNative <= 0.001;

          if (isFullyPaid) {
            rowClass += ' bg-green-100 dark:bg-green-900/50';
            remainingAmountText = `<span class="text-xs text-green-700 dark:text-green-400 ml-1">(${t('fullyPaid')})</span>`;
          } else {
            rowClass += ' bg-red-100 dark:bg-red-900/50';
            remainingAmountText = `<span class="text-xs text-red-600 dark:text-red-400 ml-1">(${t('remaining')}: ${currentRemainingBalanceNative.toFixed(2)} ${categoryCurrency})</span>`;
          }
        }
      }
      return { ...p, linkedOrderDisplay, remainingAmountText, rowClass };
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
  }, [outgoingPayments, purchaseOrders, suppliers, sortConfig, startDateFilter, endDateFilter, paymentsByOrderAndCategoryAZN, currencyRates]);

  const requestSort = (key: SortConfig['key']) => {
    let direction: SortConfig['direction'] = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleAddPayment = () => {
    setEditingPaymentId(undefined);
    setIsModalOpen(true);
  };

  const handleEditPayment = (id: number) => {
    setEditingPaymentId(id);
    setIsModalOpen(true);
  };

  const handleDeletePayment = (id: number) => {
    deleteItem('outgoingPayments', id);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingPaymentId(undefined);
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
        <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-200">{t('outgoingPayments')}</h1>
        <Button onClick={handleAddPayment}>
          <PlusCircle className="w-4 h-4 mr-2" />
          {t('addPayment')}
        </Button>
      </div>

      <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="outgoing-start-date-filter" className="text-sm font-medium text-gray-700 dark:text-slate-300">{t('startDate')}</Label>
            <Input
              type="date"
              id="outgoing-start-date-filter"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              className="mt-1 w-full p-2 border rounded-md shadow-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            />
          </div>
          <div>
            <Label htmlFor="outgoing-end-date-filter" className="text-sm font-medium text-gray-700 dark:text-slate-300">{t('endDate')}</Label>
            <Input
              type="date"
              id="outgoing-end-date-filter"
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
                {t('paymentId')} {getSortIndicator('id')}
              </TableHead>
              <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={() => requestSort('linkedOrderDisplay')}>
                {t('linkedOrder')} / {t('manualExpense')} {getSortIndicator('linkedOrderDisplay')}
              </TableHead>
              <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={() => requestSort('date')}>
                {t('paymentDate')} {getSortIndicator('date')}
              </TableHead>
              <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={() => requestSort('amount')}>
                {t('amountPaid')} {getSortIndicator('amount')}
              </TableHead>
              <TableHead className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600" onClick={() => requestSort('method')}>
                {t('method')} {getSortIndicator('method')}
              </TableHead>
              <TableHead className="p-3">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedPayments.length > 0 ? (
              filteredAndSortedPayments.map(p => {
                return (
                  <TableRow key={p.id} className={p.rowClass}>
                    <TableCell className="p-3 font-semibold">
                      #{p.id} {p.orderId === 0 && p.manualDescription ? `- ${p.manualDescription}` : ''}
                    </TableCell>
                    <TableCell className="p-3">{p.linkedOrderDisplay}</TableCell>
                    <TableCell className="p-3">{p.date}</TableCell>
                    <TableCell className="p-3 font-bold">
                      {p.amount.toFixed(2)} {p.paymentCurrency} <span dangerouslySetInnerHTML={{ __html: p.remainingAmountText }} />
                    </TableCell>
                    <TableCell className="p-3">{p.method}</TableCell>
                    <TableCell className="p-3">
                      <Button variant="link" onClick={() => handleEditPayment(p.id)} className="mr-2 p-0 h-auto">
                        {t('edit')}
                      </Button>
                      <Button variant="link" onClick={() => handleDeletePayment(p.id)} className="text-red-500 p-0 h-auto">
                        {t('delete')}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="p-4 text-center text-gray-500 dark:text-slate-400">
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
        title={editingPaymentId ? t('editOutgoingPayment') : t('createOutgoingPayment')}
      >
        <PaymentForm paymentId={editingPaymentId} type="outgoing" onSuccess={handleModalClose} />
      </FormModal>
    </div>
  );
};

export default OutgoingPayments;