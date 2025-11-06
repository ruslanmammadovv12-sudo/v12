"use client";

import React, { useState, useEffect } from 'react';
import { useData, Payment, SellOrder, PurchaseOrder } from '@/context/DataContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { t } from '@/utils/i18n';
import { MOCK_CURRENT_DATE } from '@/context/DataContext';

interface PaymentFormProps {
  paymentId?: number;
  type: 'incoming' | 'outgoing';
  onSuccess: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ paymentId, type, onSuccess }) => {
  const {
    incomingPayments,
    outgoingPayments,
    sellOrders,
    purchaseOrders,
    saveItem,
    showAlertModal,
  } = useData();

  const isIncoming = type === 'incoming';
  const isEdit = paymentId !== undefined;
  const [payment, setPayment] = useState<Partial<Payment>>({});
  const [selectedOrderId, setSelectedOrderId] = useState<string>('0'); // '0' for manual expense

  const allOrders = isIncoming ? sellOrders : purchaseOrders;
  const allPayments = isIncoming ? incomingPayments : outgoingPayments;

  useEffect(() => {
    if (isEdit) {
      const existingPayment = allPayments.find(p => p.id === paymentId);
      if (existingPayment) {
        setPayment(existingPayment);
        setSelectedOrderId(existingPayment.orderId === 0 ? '0' : String(existingPayment.orderId));
      }
    } else {
      setPayment({
        date: MOCK_CURRENT_DATE.toISOString().slice(0, 10),
        amount: 0,
        method: '',
        orderId: 0,
        manualDescription: '',
      });
      setSelectedOrderId('0');
    }
  }, [paymentId, isEdit, allPayments, isIncoming]);

  const paymentsByOrder = allPayments.reduce((acc, p) => {
    acc[p.orderId] = (acc[p.orderId] || 0) + p.amount;
    return acc;
  }, {} as { [key: number]: number });

  const ordersWithBalance = allOrders.filter(o => {
    const totalPaid = paymentsByOrder[o.id] || 0;
    // If editing, include the current payment's amount in the 'paid' total for this order
    const currentPaymentAmount = (isEdit && payment.orderId === o.id) ? (payment.amount || 0) : 0;
    const adjustedTotalPaid = totalPaid - currentPaymentAmount;
    return adjustedTotalPaid < o.total - 0.001; // Using a small tolerance for floating point issues
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setPayment(prev => ({ ...prev, [id]: id === 'amount' ? parseFloat(value) || 0 : value }));
  };

  const handleOrderIdChange = (value: string) => {
    setSelectedOrderId(value);
    setPayment(prev => ({
      ...prev,
      orderId: parseInt(value),
      manualDescription: value === '0' ? (prev?.manualDescription || '') : undefined, // Clear description if linking to order
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const paymentToSave: Payment = {
      ...payment,
      id: payment.id || 0, // Will be overwritten by saveItem if new
      orderId: parseInt(selectedOrderId),
      date: payment.date || MOCK_CURRENT_DATE.toISOString().slice(0, 10),
      amount: payment.amount || 0,
      method: payment.method || '',
    };

    // Validation
    if (paymentToSave.orderId === 0) {
      if (!paymentToSave.manualDescription?.trim()) {
        showAlertModal('Error', 'Manual Expense requires a description.');
        return;
      }
    } else {
      if (isNaN(paymentToSave.orderId) || paymentToSave.orderId === 0) {
        showAlertModal('Error', 'Please select a linked order or choose Manual Expense.');
        return;
      }
      // Ensure manualDescription is not saved if linked to an order
      delete paymentToSave.manualDescription;
    }

    if (paymentToSave.amount <= 0) {
      showAlertModal('Error', 'Please enter a valid positive amount.');
      return;
    }

    saveItem(isIncoming ? 'incomingPayments' : 'outgoingPayments', paymentToSave);
    onSuccess();
  };

  const isManualExpense = selectedOrderId === '0';

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="orderId" className="text-right">
            {t('linkedOrder')} / {t('manualExpense')}
          </Label>
          <Select onValueChange={handleOrderIdChange} value={selectedOrderId}>
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder={`-- ${t('manualExpense')} --`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">-- {t('manualExpense')} --</SelectItem>
              {ordersWithBalance.length > 0 ? (
                ordersWithBalance.map(o => {
                  const totalPaid = paymentsByOrder[o.id] || 0;
                  const currentPaymentAmount = (isEdit && payment.orderId === o.id) ? (payment.amount || 0) : 0;
                  const remainingAdjusted = o.total - (totalPaid - currentPaymentAmount);
                  return (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {t('orderId')} {o.id} ({t('remaining')}: {remainingAdjusted.toFixed(2)} AZN)
                    </SelectItem>
                  );
                })
              ) : (
                <SelectItem value="no-orders" disabled>
                  {t('noOrdersWithBalance')}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {isManualExpense && (
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="manualDescription" className="text-right">
              {t('description')}
            </Label>
            <Input
              id="manualDescription"
              placeholder="e.g., A4 Paper, Fuel, Coffee, Office Supplies"
              value={payment.manualDescription || ''}
              onChange={handleChange}
              className="col-span-3"
            />
          </div>
        )}

        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="date" className="text-right">
            {t('paymentDate')}
          </Label>
          <Input
            id="date"
            type="date"
            value={payment.date || ''}
            onChange={handleChange}
            className="col-span-3"
            required
          />
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="amount" className="text-right">
            {t('amountPaid')}
          </Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            value={payment.amount || ''}
            onChange={handleChange}
            className="col-span-3"
            required
            min="0.01"
          />
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="method" className="text-right">
            {t('method')}
          </Label>
          <Input
            id="method"
            placeholder={t('paymentMethodPlaceholder')}
            value={payment.method || ''}
            onChange={handleChange}
            className="col-span-3"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit">{t('savePayment')}</Button>
      </div>
    </form>
  );
};

export default PaymentForm;