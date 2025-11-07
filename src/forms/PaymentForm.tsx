"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
    currencyRates,
  } = useData();

  const isIncoming = type === 'incoming';
  const isEdit = paymentId !== undefined;
  const [payment, setPayment] = useState<Partial<Payment>>({});
  // selectedOrderId will now be a composite string: '0' for manual, or 'orderId-category' (e.g., '123-products', '123-fees')
  const [selectedOrderIdentifier, setSelectedOrderIdentifier] = useState<string>('0'); 

  const allOrders = isIncoming ? sellOrders : purchaseOrders;
  const allPayments = isIncoming ? incomingPayments : outgoingPayments;

  // Memoize order maps for efficient lookups
  const purchaseOrderMap = useMemo(() => purchaseOrders.reduce((acc, o) => ({ ...acc, [o.id]: o }), {} as { [key: number]: PurchaseOrder }), [purchaseOrders]);
  const sellOrderMap = useMemo(() => sellOrders.reduce((acc, o) => ({ ...acc, [o.id]: o }), {} as { [key: number]: SellOrder }), [sellOrders]);

  // Aggregate payments by order ID and category (products/fees)
  const paymentsByOrderAndCategory = useMemo(() => {
    const result: { [orderId: number]: { products: number; fees: number } } = {};
    allPayments.forEach(p => {
      if (p.orderId !== 0) {
        if (!result[p.orderId]) {
          result[p.orderId] = { products: 0, fees: 0 };
        }
        // For backward compatibility, if paymentCategory is undefined, assume it was for products
        const category = p.paymentCategory || 'products'; 
        result[p.orderId][category] += p.amount;
      }
    });
    return result;
  }, [allPayments]);

  // Calculate total products value and total fees value for a purchase order in AZN
  const calculatePurchaseOrderBreakdown = useCallback((order: PurchaseOrder) => {
    const orderNativeToAznRate = order.currency === 'AZN' ? 1 : (order.exchangeRate || currencyRates[order.currency] || 1);

    const productsSubtotalNative = order.items?.reduce((sum, item) => sum + (item.qty * item.price), 0) || 0;
    const productsSubtotalAZN = productsSubtotalNative * orderNativeToAznRate;

    const convertFeeToAzn = (amount: number, feeCurrency: 'AZN' | 'USD' | 'EUR' | 'RUB') => {
      return amount * (feeCurrency === 'AZN' ? 1 : currencyRates[feeCurrency] || 1);
    };

    const transportationFeesAZN = convertFeeToAzn(order.transportationFees, order.transportationFeesCurrency);
    const customFeesAZN = convertFeeToAzn(order.customFees, order.customFeesCurrency);
    const additionalFeesAZN = convertFeeToAzn(order.additionalFees, order.additionalFeesCurrency);
    const totalFeesAZN = transportationFeesAZN + customFeesAZN + additionalFeesAZN;

    return { productsSubtotalAZN, totalFeesAZN };
  }, [currencyRates]);

  useEffect(() => {
    if (isEdit) {
      const existingPayment = allPayments.find(p => p.id === paymentId);
      if (existingPayment) {
        setPayment(existingPayment);
        if (existingPayment.orderId === 0) {
          setSelectedOrderIdentifier('0');
        } else {
          // For existing payments, default category to 'products' if not explicitly set
          const category = existingPayment.paymentCategory || 'products';
          setSelectedOrderIdentifier(`${existingPayment.orderId}-${category}`);
        }
      }
    } else {
      setPayment({
        date: MOCK_CURRENT_DATE.toISOString().slice(0, 10),
        amount: 0,
        method: '',
        orderId: 0,
        paymentCategory: 'manual', // Default for new payments
        manualDescription: '',
      });
      setSelectedOrderIdentifier('0');
    }
  }, [paymentId, isEdit, allPayments]);

  const ordersWithBalance = useMemo(() => {
    const list: {
      id: number;
      display: string;
      remainingAmount: number;
      category: 'products' | 'fees';
      orderType: 'sell' | 'purchase';
    }[] = [];

    allOrders.forEach(order => {
      const currentOrderPayments = paymentsByOrderAndCategory[order.id] || { products: 0, fees: 0 };

      // Adjust for the current payment being edited
      let adjustedProductsPaid = currentOrderPayments.products;
      let adjustedFeesPaid = currentOrderPayments.fees;

      if (isEdit && payment.orderId === order.id) {
        const existingPaymentCategory = payment.paymentCategory || 'products'; // Default for old data
        if (existingPaymentCategory === 'products') {
          adjustedProductsPaid -= (payment.amount || 0);
        } else if (existingPaymentCategory === 'fees') {
          adjustedFeesPaid -= (payment.amount || 0);
        }
      }

      if (isIncoming) { // Sell Orders
        const sellOrder = order as SellOrder;
        const totalOrderValue = sellOrder.total; // Total includes VAT
        const remainingTotal = totalOrderValue - adjustedProductsPaid; // For sell orders, we treat it as one total

        if (remainingTotal > 0.001) {
          list.push({
            id: sellOrder.id,
            display: `${t('orderId')} #${sellOrder.id} (${t('remaining')}: ${remainingTotal.toFixed(2)} AZN)`,
            remainingAmount: remainingTotal,
            category: 'products', // Sell orders are always 'products' category for simplicity
            orderType: 'sell',
          });
        }
      } else { // Outgoing Payments for Purchase Orders
        const purchaseOrder = order as PurchaseOrder;
        const { productsSubtotalAZN, totalFeesAZN } = calculatePurchaseOrderBreakdown(purchaseOrder);

        const remainingProductsBalance = productsSubtotalAZN - adjustedProductsPaid;
        const remainingFeesBalance = totalFeesAZN - adjustedFeesPaid;

        if (remainingProductsBalance > 0.001) {
          list.push({
            id: purchaseOrder.id,
            display: `${t('orderId')} #${purchaseOrder.id} (${t('productsTotal')} - ${t('remaining')}: ${remainingProductsBalance.toFixed(2)} AZN)`,
            remainingAmount: remainingProductsBalance,
            category: 'products',
            orderType: 'purchase',
          });
        }
        if (remainingFeesBalance > 0.001) {
          list.push({
            id: purchaseOrder.id,
            display: `${t('orderId')} #${purchaseOrder.id} (${t('feesTotal')} - ${t('remaining')}: ${remainingFeesBalance.toFixed(2)} AZN)`,
            remainingAmount: remainingFeesBalance,
            category: 'fees',
            orderType: 'purchase',
          });
        }
      }
    });
    return list;
  }, [allOrders, paymentsByOrderAndCategory, isIncoming, isEdit, payment, calculatePurchaseOrderBreakdown]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setPayment(prev => ({ ...prev, [id]: id === 'amount' ? parseFloat(value) || 0 : value }));
  };

  const handleOrderIdentifierChange = (value: string) => {
    setSelectedOrderIdentifier(value);
    if (value === '0') {
      setPayment(prev => ({
        ...prev,
        orderId: 0,
        paymentCategory: 'manual',
        manualDescription: prev?.manualDescription || '',
      }));
    } else {
      const [orderIdStr, category] = value.split('-');
      setPayment(prev => ({
        ...prev,
        orderId: parseInt(orderIdStr),
        paymentCategory: category as 'products' | 'fees',
        manualDescription: undefined, // Clear description if linking to order
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const paymentToSave: Payment = {
      ...payment,
      id: payment.id || 0, // Will be overwritten by saveItem if new
      date: payment.date || MOCK_CURRENT_DATE.toISOString().slice(0, 10),
      amount: payment.amount || 0,
      method: payment.method || '',
    };

    // Determine orderId and paymentCategory from selectedOrderIdentifier
    if (selectedOrderIdentifier === '0') {
      paymentToSave.orderId = 0;
      paymentToSave.paymentCategory = 'manual';
    } else {
      const [orderIdStr, category] = selectedOrderIdentifier.split('-');
      paymentToSave.orderId = parseInt(orderIdStr);
      paymentToSave.paymentCategory = category as 'products' | 'fees';
    }

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

      // Validate amount against remaining balance for the specific category
      const selectedOrderOption = ordersWithBalance.find(o => 
        `${o.id}-${o.category}` === selectedOrderIdentifier && o.orderType === (isIncoming ? 'sell' : 'purchase')
      );

      if (selectedOrderOption && paymentToSave.amount > selectedOrderOption.remainingAmount + 0.001) { // Add tolerance
        showAlertModal('Error', `Payment amount exceeds the remaining balance for this category. Remaining: ${selectedOrderOption.remainingAmount.toFixed(2)} AZN.`);
        return;
      }
    }

    if (paymentToSave.amount <= 0) {
      showAlertModal('Error', 'Please enter a valid positive amount.');
      return;
    }

    saveItem(isIncoming ? 'incomingPayments' : 'outgoingPayments', paymentToSave);
    onSuccess();
  };

  const isManualExpense = selectedOrderIdentifier === '0';

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="orderId" className="text-right">
            {t('linkedOrder')} / {t('manualExpense')}
          </Label>
          <Select onValueChange={handleOrderIdentifierChange} value={selectedOrderIdentifier}>
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder={`-- ${t('manualExpense')} --`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">-- {t('manualExpense')} --</SelectItem>
              {ordersWithBalance.length > 0 ? (
                ordersWithBalance.map(o => (
                  <SelectItem key={`${o.id}-${o.category}`} value={`${o.id}-${o.category}`}>
                    {o.display}
                  </SelectItem>
                ))
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