"use client";

import React, { useState, useMemo } from 'react';
import { useData, MOCK_CURRENT_DATE } from '@/context/DataContext';
import { t } from '@/utils/i18n';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import FormModal from '@/components/FormModal';
import PaymentForm from '@/forms/PaymentForm';
import { PlusCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; // Ensuring this import is present
import { Payment, SellOrder } from '@/types'; // Import types from types file

type SortConfig = {
  key: keyof Payment | 'linkedOrderDisplay';
  direction: 'ascending' | 'descending';
};

const IncomingPayments: React.FC = () => {
  const { incomingPayments, sellOrders, customers, deleteItem } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<number | undefined>(undefined);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'id', direction: 'ascending' });
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');

  const sellOrderMap = sellOrders.reduce((acc, o) => ({ ...acc, [o.id]: o }), {} as { [key: number]: SellOrder });
  const customerMap = customers.reduce((acc, c) => ({ ...acc, [c.id]: c.name }), {} as { [key: number]: string });

  const paymentsByOrder = useMemo(() => {
    return incomingPayments.reduce((acc, p) => {
      acc[p.orderId] = (acc[p.orderId] || 0) + p.amount;
      return acc;
    }, {} as { [key: number]: number });
  }, [incomingPayments]);

  const filteredAndSortedPayments = useMemo(() => {
    let filteredPayments = incomingPayments;

    if (startDateFilter) {
      filteredPayments = filteredPayments.filter(p => p.date >= startDateFilter);
    }
    if (endDateFilter) {
      filteredPayments = filteredPayments.filter(p => p.date <= endDateFilter);
    }

    const sortableItems = filteredPayments.map(p => {
      let linkedOrderDisplay = '';
      if (p.orderId === 0) {
        linkedOrderDisplay = t('manualExpense');
      } else {
        const order = sellOrderMap[p.orderId];
        const customerName = order ? customerMap[order.contactId] || 'Unknown' : 'N/A';
        linkedOrderDisplay = `${t('orderId')} #${p.orderId} (${customerName})`;
      }
      return { ...p, linkedOrderDisplay };
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
  }, [incomingPayments, sellOrders, customers, sortConfig, startDateFilter, endDateFilter, paymentsByOrder]);

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
    deleteItem('incomingPayments', id);
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
        <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-200">{t('incomingPayments')}</h1>
        <Button onClick={handleAddPayment}>
          <PlusCircle className="w-4 h-4 mr-2" />
          {t('addPayment')}
        </Button>
      </div>

      <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="incoming-start-date-filter" className="text-sm font-medium text-gray-700 dark:text-slate-300">{t('startDate')}</Label>
            <Input
              type="date"
              id="incoming-start-date-filter"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              className="mt-1 w-full p-2 border rounded-md shadow-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            />
          </div>
          <div>
            <Label htmlFor="incoming-end-date-filter" className="text-sm font-medium text-gray-700 dark:text-slate-300">{t('endDate')}</Label>
            <Input
              type="date"
              id="incoming-end-date-filter"
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
                const order = sellOrderMap[p.orderId];
                let rowClass = 'border-b dark:border-slate-700 text-gray-800 dark:text-slate-300';
                let remainingAmountText = '';

                if (order && p.orderId !== 0) {
                  const totalPaidForThisOrder = paymentsByOrder[p.orderId] || 0;
                  const orderTotal = order.total;
                  // Corrected calculation: totalPaidForThisOrder already includes p.amount
                  const currentRemainingBalance = orderTotal - totalPaidForThisOrder;

                  const isFullyPaid = currentRemainingBalance <= 0.001;

                  if (isFullyPaid) {
                    rowClass += ' bg-green-100 dark:bg-green-900/50';
                    remainingAmountText = `<span class="text-xs text-green-700 dark:text-green-400 ml-1">(${t('fullyPaid')})</span>`;
                  } else {
                    rowClass += ' bg-red-100 dark:bg-red-900/50';
                    remainingAmountText = `<span class="text-xs text-red-600 dark:text-red-400 ml-1">(${t('remaining')}: ${currentRemainingBalance.toFixed(2)} AZN)</span>`;
                  }
                }

                return (
                  <TableRow key={p.id} className={rowClass}>
                    <TableCell className="p-3 font-semibold">
                      #{p.id} {p.orderId === 0 && p.manualDescription ? `- ${p.manualDescription}` : ''}
                    </TableCell>
                    <TableCell className="p-3">{p.linkedOrderDisplay}</TableCell>
                    <TableCell className="p-3">{p.date}</TableCell>
                    <TableCell className="p-3 font-bold">
                      {p.amount.toFixed(2)} AZN <span dangerouslySetInnerHTML={{ __html: remainingAmountText }} />
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
        title={editingPaymentId ? t('editIncomingPayment') : t('createIncomingPayment')}
      >
        <PaymentForm paymentId={editingPaymentId} type="incoming" onSuccess={handleModalClose} />
      </FormModal>
    </div>
  );
};

export default IncomingPayments;