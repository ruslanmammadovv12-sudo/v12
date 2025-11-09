"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useData, MOCK_CURRENT_DATE } from '@/context/DataContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { t } from '@/utils/i18n';
import { Payment, SellOrder, PurchaseOrder } from '@/types'; // Import types from types file

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
    customers, // Added customers
    suppliers, // Added suppliers
  }
    = useData();

  const isIncoming = type === 'incoming';
  const isEdit = paymentId !== undefined;
  const [payment, setPayment] = useState<Partial<Payment>>({});
  const [selectedPaymentCurrency, setSelectedPaymentCurrency] = useState<'AZN' | 'USD' | 'EUR' | 'RUB'>('AZN');
  const [manualExchangeRateInput, setManualExchangeRateInput] = useState<string>('');
  const [manualExchangeRate, setManualExchangeRate] = useState<number | undefined>(undefined);

  // selectedOrderId will now be a composite string: '0' for manual, or 'orderId-category' (e.g., '123-products', '123-fees')
  const [selectedOrderIdentifier, setSelectedOrderIdentifier] = useState<string>('0');

  const allOrders = isIncoming ? sellOrders : purchaseOrders;
  const allPayments = isIncoming ? incomingPayments : outgoingPayments;

  // Memoize order maps for efficient lookups
  const purchaseOrderMap = useMemo(() => purchaseOrders.reduce((acc, o) => ({ ...acc, [o.id]: o }), {} as { [key: number]: PurchaseOrder }), [purchaseOrders]);
  const sellOrderMap = useMemo(() => sellOrders.reduce((acc, o) => ({ ...acc, [o.id]: o }), {} as { [key: number]: SellOrder }), [sellOrders]);
  const customerMap = useMemo(() => customers.reduce((acc, c) => ({ ...acc, [c.id]: c.name }), {} as { [key: number]: string }), [customers]); // Added customerMap
  const supplierMap = useMemo(() => suppliers.reduce((acc, s) => ({ ...acc, [s.id]: s.name }), {} as { [key: number]: string }), [suppliers]); // Added supplierMap

  // Aggregate payments by order ID and category (products/fees)
  const paymentsByOrderAndCategory = useMemo(() => {
    const result: { [orderId: number]: { products: number; fees: number } } = {};
    allPayments.forEach(p => {
      if (p.orderId !== 0) {
        if (!result[p.orderId]) {
          result[p.orderId] = { products: 0, fees: 0 };
        }
        // Convert payment amount to AZN for aggregation
        const amountInAZN = p.amount * (p.paymentCurrency === 'AZN' ? 1 : (p.paymentExchangeRate || currencyRates[p.paymentCurrency] || 1));
        const category = p.paymentCategory || 'products'; // Default for old data
        result[p.orderId][category] += amountInAZN;
      }
    });
    return result;
  }, [allPayments, currencyRates]);

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

    return { productsSubtotalAZN, totalFeesAZN, orderNativeToAznRate };
  }, [currencyRates]);

  useEffect(() => {
    if (isEdit) {
      const existingPayment = allPayments.find(p => p.id === paymentId);
      if (existingPayment) {
        setPayment(existingPayment);
        setSelectedPaymentCurrency(existingPayment.paymentCurrency || 'AZN');
        if (existingPayment.paymentCurrency !== 'AZN') {
          setManualExchangeRate(existingPayment.paymentExchangeRate);
          setManualExchangeRateInput(String(existingPayment.paymentExchangeRate || ''));
        } else {
          setManualExchangeRate(undefined);
          setManualExchangeRateInput('');
        }

        if (existingPayment.orderId === 0) {
          setSelectedOrderIdentifier('0');
        } else {
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
        paymentCategory: 'manual',
        manualDescription: '',
        paymentCurrency: 'AZN', // Default for new payments
      });
      setSelectedPaymentCurrency('AZN');
      setManualExchangeRate(undefined);
      setManualExchangeRateInput('');
      setSelectedOrderIdentifier('0');
    }
  }, [paymentId, isEdit, allPayments, currencyRates]);

  const currentPaymentExchangeRate = useMemo(() => {
    if (selectedPaymentCurrency === 'AZN') return 1;
    return manualExchangeRate !== undefined ? manualExchangeRate : currencyRates[selectedPaymentCurrency];
  }, [selectedPaymentCurrency, manualExchangeRate, currencyRates]);

  const ordersWithBalance = useMemo(() => {
    const list: {
      id: number;
      display: string;
      remainingAmount: number; // This will be in the order's native currency for display
      category: 'products' | 'fees';
      orderType: 'sell' | 'purchase';
      currency: 'AZN' | 'USD' | 'EUR' | 'RUB'; // Native currency of the order
      orderDate: string; // Added orderDate
    }[] = [];

    allOrders.forEach(order => {
      const currentOrderPayments = paymentsByOrderAndCategory[order.id] || { products: 0, fees: 0 };

      // Adjust for the current payment being edited
      let adjustedProductsPaidAZN = currentOrderPayments.products;
      let adjustedFeesPaidAZN = currentOrderPayments.fees;

      if (isEdit && payment.orderId === order.id) {
        const existingPaymentCategory = payment.paymentCategory || 'products';
        const existingPaymentAmountInAZN = (payment.amount || 0) * (payment.paymentCurrency === 'AZN' ? 1 : (payment.paymentExchangeRate || currencyRates[payment.paymentCurrency || 'AZN'] || 1));
        if (existingPaymentCategory === 'products') {
          adjustedProductsPaidAZN -= existingPaymentAmountInAZN;
        } else if (existingPaymentCategory === 'fees') {
          adjustedFeesPaidAZN -= existingPaymentAmountInAZN;
        }
      }

      if (isIncoming) { // Sell Orders (always in AZN in current model)
        const sellOrder = order as SellOrder;
        const customerName = customerMap[sellOrder.contactId] || 'Unknown Customer';
        const totalOrderValueAZN = sellOrder.total;

        const remainingTotalAZN = totalOrderValueAZN - adjustedProductsPaidAZN;

        if (remainingTotalAZN > 0.001) {
          list.push({
            id: sellOrder.id,
            display: `${t('orderId')} #${sellOrder.id} (${customerName}) - ${sellOrder.orderDate} - ${t('remaining')}: ${remainingTotalAZN.toFixed(2)} AZN`,
            remainingAmount: remainingTotalAZN,
            category: 'products',
            orderType: 'sell',
            currency: 'AZN',
            orderDate: sellOrder.orderDate, // Populate orderDate
          });
        }
      } else { // Outgoing Payments for Purchase Orders
        const purchaseOrder = order as PurchaseOrder;
        const supplierName = supplierMap[purchaseOrder.contactId] || 'Unknown Supplier';
        const { productsSubtotalAZN, totalFeesAZN, orderNativeToAznRate } = calculatePurchaseOrderBreakdown(purchaseOrder);

        const remainingProductsBalanceAZN = productsSubtotalAZN - adjustedProductsPaidAZN;
        const remainingFeesBalanceAZN = totalFeesAZN - adjustedFeesPaidAZN;

        const remainingProductsBalanceNative = remainingProductsBalanceAZN / orderNativeToAznRate;
        const remainingFeesBalanceNative = remainingFeesBalanceAZN / orderNativeToAznRate;

        if (remainingProductsBalanceNative > 0.001) {
          list.push({
            id: purchaseOrder.id,
            display: `${t('orderId')} #${purchaseOrder.id} (${supplierName}) - ${purchaseOrder.orderDate} - ${t('productsTotal')} - ${t('remaining')}: ${remainingProductsBalanceNative.toFixed(2)} ${purchaseOrder.currency}`,
            remainingAmount: remainingProductsBalanceNative,
            category: 'products',
            orderType: 'purchase',
            currency: purchaseOrder.currency,
            orderDate: purchaseOrder.orderDate, // Populate orderDate
          });
        }
        if (remainingFeesBalanceNative > 0.001) {
          list.push({
            id: purchaseOrder.id,
            display: `${t('orderId')} #${purchaseOrder.id} (${supplierName}) - ${purchaseOrder.orderDate} - ${t('feesTotal')} - ${t('remaining')}: ${remainingFeesBalanceNative.toFixed(2)} ${purchaseOrder.currency}`,
            remainingAmount: remainingFeesBalanceNative,
            category: 'fees',
            orderType: 'purchase',
            currency: purchaseOrder.currency,
            orderDate: purchaseOrder.orderDate, // Populate orderDate
          });
        }
      }
    });
    return list;
  }, [allOrders, paymentsByOrderAndCategory, isIncoming, isEdit, payment, calculatePurchaseOrderBreakdown, customerMap, supplierMap, currencyRates]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setPayment(prev => ({ ...prev, [id]: id === 'amount' ? parseFloat(value) || 0 : value }));
  };

  const handlePaymentCurrencyChange = (value: 'AZN' | 'USD' | 'EUR' | 'RUB') => {
    setSelectedPaymentCurrency(value);
    if (value === 'AZN') {
      setManualExchangeRate(undefined);
      setManualExchangeRateInput('');
    } else {
      const defaultRate = currencyRates[value];
      setManualExchangeRate(defaultRate);
      setManualExchangeRateInput(String(defaultRate));
    }
  };

  const handleExchangeRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (inputValue === '' || /^-?\d*\.?\d*$/.test(inputValue)) {
      setManualExchangeRateInput(inputValue);
      const parsedValue = parseFloat(inputValue);
      setManualExchangeRate(isNaN(parsedValue) ? undefined : parsedValue);
    }
  };

  const handleOrderIdentifierChange = (value: string) => {
    setSelectedOrderIdentifier(value);
    if (value === '0') {
      setPayment(prev => ({
        ...prev,
        orderId: 0,
        paymentCategory: 'manual',
        manualDescription: prev?.manualDescription || '',
        date: MOCK_CURRENT_DATE.toISOString().slice(0, 10), // Reset date for manual
      }));
    } else {
      const [orderIdStr, category] = value.split('-');
      const selectedOrder = ordersWithBalance.find(o => `${o.id}-${o.category}` === value);
      setPayment(prev => ({
        ...prev,
        orderId: parseInt(orderIdStr),
        paymentCategory: category as 'products' | 'fees',
        manualDescription: undefined,
        date: selectedOrder?.orderDate || MOCK_CURRENT_DATE.toISOString().slice(0, 10), // Set date from order
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (payment.amount === undefined || payment.amount <= 0) {
      showAlertModal('Error', 'Please enter a valid positive amount.');
      return;
    }

    if (selectedPaymentCurrency !== 'AZN' && (!manualExchangeRate || manualExchangeRate <= 0)) {
      showAlertModal('Validation Error', 'Please enter a valid exchange rate for the selected payment currency.');
      return;
    }

    const amountInAZN = payment.amount * currentPaymentExchangeRate;

    const paymentToSave: Payment = {
      ...payment,
      id: payment.id || 0,
      date: payment.date || MOCK_CURRENT_DATE.toISOString().slice(0, 10),
      amount: payment.amount, // Native amount
      paymentCurrency: selectedPaymentCurrency,
      paymentExchangeRate: selectedPaymentCurrency === 'AZN' ? undefined : currentPaymentExchangeRate,
      method: payment.method || '',
    };

    if (selectedOrderIdentifier === '0') {
      paymentToSave.orderId = 0;
      paymentToSave.paymentCategory = 'manual';
      if (!paymentToSave.manualDescription?.trim()) {
        showAlertModal('Error', 'Manual Expense requires a description.');
        return;
      }
    } else {
      const [orderIdStr, category] = selectedOrderIdentifier.split('-');
      paymentToSave.orderId = parseInt(orderIdStr);
      paymentToSave.paymentCategory = category as 'products' | 'fees';
      delete paymentToSave.manualDescription;

      const selectedOrderOption = ordersWithBalance.find(o =>
        `${o.id}-${o.category}` === selectedOrderIdentifier && o.orderType === (isIncoming ? 'sell' : 'purchase')
      );

      if (selectedOrderOption) {
        let remainingAmountInAZN = selectedOrderOption.remainingAmount;
        if (selectedOrderOption.currency !== 'AZN') {
          const order = (isIncoming ? sellOrderMap : purchaseOrderMap)[selectedOrderOption.id];
          if (order) {
            const orderNativeToAznRate = order.currency === 'AZN' ? 1 : (order.exchangeRate || currencyRates[order.currency] || 1);
            remainingAmountInAZN = selectedOrderOption.remainingAmount * orderNativeToAznRate;
          }
        }

        if (amountInAZN > remainingAmountInAZN + 0.001) {
          showAlertModal('Error', `Payment amount (${amountInAZN.toFixed(2)} AZN) exceeds the remaining balance for this category. Remaining: ${remainingAmountInAZN.toFixed(2)} AZN.`);
          return;
        }
      }
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
            className="col-span-2"
            required
            min="0.01"
          />
          <Select onValueChange={handlePaymentCurrencyChange} value={selectedPaymentCurrency}>
            <SelectTrigger className="col-span-1">
              <SelectValue placeholder="AZN" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AZN">AZN</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="RUB">RUB</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedPaymentCurrency !== 'AZN' && (
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="exchangeRate" className="text-right">{t('exchangeRateToAZN')}</Label>
            <div className="col-span-3">
              <Input
                id="exchangeRate"
                type="text"
                value={manualExchangeRateInput}
                onChange={handleExchangeRateChange}
                placeholder={t('exchangeRatePlaceholder')}
                className="mb-1"
                required
              />
              <p className="text-xs text-gray-500 dark:text-slate-400">{t('exchangeRateHelpText')}</p>
            </div>
          </div>
        )}

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