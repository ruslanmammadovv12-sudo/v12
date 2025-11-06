"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useData, PurchaseOrder, Product, Supplier, Warehouse, OrderItem } from '@/context/DataContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t } from '@/utils/i18n';
import { MOCK_CURRENT_DATE } from '@/context/DataContext';
import { toast } from 'sonner';

interface PurchaseOrderFormProps {
  orderId?: number;
  onSuccess: () => void;
}

interface PurchaseOrderItemState {
  productId: number | '';
  qty: number;
  price: number;
  currency?: 'AZN' | 'USD' | 'EUR' | 'RUB';
  landedCostPerUnit?: number;
}

const PurchaseOrderForm: React.FC<PurchaseOrderFormProps> = ({ orderId, onSuccess }) => {
  const {
    purchaseOrders,
    suppliers,
    warehouses,
    products,
    currencyRates,
    saveItem,
    updateStockFromOrder,
    updateAverageCosts,
    showAlertModal,
  } = useData();
  const isEdit = orderId !== undefined;

  const [order, setOrder] = useState<Partial<PurchaseOrder>>({});
  const [orderItems, setOrderItems] = useState<PurchaseOrderItemState[]>([{ productId: '', qty: 1, price: 0 }]);
  const [selectedCurrency, setSelectedCurrency] = useState<'AZN' | 'USD' | 'EUR' | 'RUB'>('AZN');
  const [manualExchangeRate, setManualExchangeRate] = useState<number | undefined>(undefined);
  const [openComboboxIndex, setOpenComboboxIndex] = useState<number | null>(null); // State for which product combobox is open

  const supplierMap = useMemo(() => suppliers.reduce((acc, s) => ({ ...acc, [s.id]: s }), {} as { [key: number]: Supplier }), [suppliers]);
  const productMap = useMemo(() => products.reduce((acc, p) => ({ ...acc, [p.id]: p }), {} as { [key: number]: Product }), [products]);

  useEffect(() => {
    if (isEdit) {
      const existingOrder = purchaseOrders.find(o => o.id === orderId);
      if (existingOrder) {
        setOrder(existingOrder);
        setOrderItems(existingOrder.items.map(item => ({
          productId: item.productId,
          qty: item.qty,
          price: item.price,
          currency: item.currency || existingOrder.currency,
          landedCostPerUnit: item.landedCostPerUnit,
        })));
        setSelectedCurrency(existingOrder.currency);
        setManualExchangeRate(existingOrder.exchangeRate);
      }
    } else {
      setOrder({
        orderDate: MOCK_CURRENT_DATE.toISOString().slice(0, 10),
        status: 'Draft',
        currency: 'AZN',
        transportationFees: 0,
        transportationFeesCurrency: 'AZN',
        customFees: 0,
        customFeesCurrency: 'AZN',
        additionalFees: 0,
        additionalFeesCurrency: 'AZN',
        total: 0,
      });
      setOrderItems([{ productId: '', qty: 1, price: 0 }]);
      setSelectedCurrency('AZN');
      setManualExchangeRate(undefined);
    }
  }, [orderId, isEdit, purchaseOrders, products]);

  const currentExchangeRate = useMemo(() => {
    if (selectedCurrency === 'AZN') return 1;
    return manualExchangeRate !== undefined ? manualExchangeRate : currencyRates[selectedCurrency];
  }, [selectedCurrency, manualExchangeRate, currencyRates]);

  const calculateLandedCost = useCallback((item: PurchaseOrderItemState, orderCurrency: 'AZN' | 'USD' | 'EUR' | 'RUB', exchangeRate: number) => {
    const itemPriceInAZN = item.price * (orderCurrency === 'AZN' ? 1 : exchangeRate);
    // For simplicity, we'll distribute fees proportionally by item value.
    // A more complex model might distribute by weight, volume, etc.
    return itemPriceInAZN;
  }, []);

  const calculateTotalOrderValue = useCallback(() => {
    let productsSubtotalNative = 0;
    orderItems.forEach(item => {
      if (item.productId && item.qty > 0 && item.price > 0) {
        productsSubtotalNative += item.qty * item.price;
      }
    });

    const productsSubtotalAZN = productsSubtotalNative * currentExchangeRate;

    const transportationFeesAZN = order.transportationFees * (order.transportationFeesCurrency === 'AZN' ? 1 : (currencyRates[order.transportationFeesCurrency || 'AZN'] || 1));
    const customFeesAZN = order.customFees * (order.customFeesCurrency === 'AZN' ? 1 : (currencyRates[order.customFeesCurrency || 'AZN'] || 1));
    const additionalFeesAZN = order.additionalFees * (order.additionalFeesCurrency === 'AZN' ? 1 : (currencyRates[order.additionalFeesCurrency || 'AZN'] || 1));

    const totalFeesAZN = transportationFeesAZN + customFeesAZN + additionalFeesAZN;
    const totalOrderValueAZN = productsSubtotalAZN + totalFeesAZN;

    // Calculate landed cost per unit for each item
    const updatedOrderItems: OrderItem[] = orderItems.map(item => {
      if (!item.productId || item.qty <= 0 || item.price <= 0) {
        return { productId: item.productId as number, qty: item.qty, price: item.price, currency: item.currency };
      }

      const itemValueNative = item.qty * item.price;
      const itemValueAZN = itemValueNative * currentExchangeRate;

      let landedCostPerUnit = itemValueAZN / item.qty;

      if (productsSubtotalAZN > 0) {
        const proportionalFeeShare = (itemValueAZN / productsSubtotalAZN) * totalFeesAZN;
        landedCostPerUnit = (itemValueAZN + proportionalFeeShare) / item.qty;
      } else if (totalFeesAZN > 0 && orderItems.length === 1) {
        // If only one item and no product subtotal (e.g., all items have 0 price),
        // attribute all fees to this single item.
        landedCostPerUnit = (itemValueAZN + totalFeesAZN) / item.qty;
      }

      return {
        productId: item.productId as number,
        qty: item.qty,
        price: item.price,
        currency: selectedCurrency,
        landedCostPerUnit: parseFloat(landedCostPerUnit.toFixed(4)),
      };
    });

    return { totalOrderValueAZN, updatedOrderItems };
  }, [order, orderItems, selectedCurrency, currentExchangeRate, currencyRates]);

  useEffect(() => {
    const { totalOrderValueAZN, updatedOrderItems } = calculateTotalOrderValue();
    setOrder(prev => ({ ...prev, total: parseFloat(totalOrderValueAZN.toFixed(2)) }));
    setOrderItems(updatedOrderItems.map(item => ({
      productId: item.productId,
      qty: item.qty,
      price: item.price,
      currency: item.currency as 'AZN' | 'USD' | 'EUR' | 'RUB',
      landedCostPerUnit: item.landedCostPerUnit,
    })));
  }, [order.transportationFees, order.customFees, order.additionalFees, order.transportationFeesCurrency, order.customFeesCurrency, order.additionalFeesCurrency, orderItems.map(i => `${i.productId}-${i.qty}-${i.price}`).join(','), selectedCurrency, manualExchangeRate, currencyRates, calculateTotalOrderValue]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setOrder(prev => ({ ...prev, [id]: value }));
  };

  const handleNumericChange = (id: keyof PurchaseOrder, value: string) => {
    setOrder(prev => ({ ...prev, [id]: parseFloat(value) || 0 }));
  };

  const handleSelectChange = (id: keyof PurchaseOrder, value: string) => {
    setOrder(prev => ({ ...prev, [id]: value }));
  };

  const handleCurrencyChange = (value: 'AZN' | 'USD' | 'EUR' | 'RUB') => {
    setSelectedCurrency(value);
    setOrder(prev => ({ ...prev, currency: value }));
    if (value === 'AZN') {
      setManualExchangeRate(undefined);
    }
  };

  const handleExchangeRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setManualExchangeRate(isNaN(value) ? undefined : value);
  };

  const addOrderItem = useCallback(() => {
    setOrderItems(prev => [...prev, { productId: '', qty: 1, price: 0, currency: selectedCurrency }]);
  }, [selectedCurrency]);

  const removeOrderItem = useCallback((index: number) => {
    setOrderItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleOrderItemChange = useCallback((index: number, field: keyof PurchaseOrderItemState, value: any) => {
    setOrderItems(prev =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!order.contactId || !order.warehouseId || !order.orderDate) {
      showAlertModal('Validation Error', 'Supplier, Warehouse, and Order Date are required.');
      return;
    }

    const validOrderItems = orderItems.filter(item => item.productId !== '' && item.qty > 0 && item.price >= 0);
    if (validOrderItems.length === 0) {
      showAlertModal('Validation Error', 'Please add at least one valid order item with a product, quantity, and price.');
      return;
    }

    if (selectedCurrency !== 'AZN' && (!manualExchangeRate || manualExchangeRate <= 0)) {
      showAlertModal('Validation Error', 'Please enter a valid exchange rate for the selected currency.');
      return;
    }

    const finalOrderItems: OrderItem[] = validOrderItems.map(item => ({
      productId: item.productId as number,
      qty: item.qty,
      price: item.price,
      currency: selectedCurrency,
      landedCostPerUnit: item.landedCostPerUnit,
    }));

    const orderToSave: PurchaseOrder = {
      ...order,
      id: order.id || 0,
      contactId: order.contactId as number,
      warehouseId: order.warehouseId as number,
      orderDate: order.orderDate,
      status: order.status || 'Draft',
      items: finalOrderItems,
      currency: selectedCurrency,
      exchangeRate: selectedCurrency === 'AZN' ? undefined : currentExchangeRate,
      transportationFees: order.transportationFees || 0,
      transportationFeesCurrency: order.transportationFeesCurrency || 'AZN',
      customFees: order.customFees || 0,
      customFeesCurrency: order.customFeesCurrency || 'AZN',
      additionalFees: order.additionalFees || 0,
      additionalFeesCurrency: order.additionalFeesCurrency || 'AZN',
      total: order.total || 0,
    };

    const oldOrder = isEdit ? purchaseOrders.find(o => o.id === orderToSave.id) : null;

    saveItem('purchaseOrders', orderToSave);
    updateStockFromOrder(orderToSave, oldOrder);
    if (orderToSave.status === 'Received') {
      updateAverageCosts(orderToSave);
    }
    onSuccess();
    toast.success(t('success'), { description: `Purchase Order #${orderToSave.id || 'new'} saved successfully.` });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="contactId" className="text-right">{t('supplier')}</Label>
          <Select onValueChange={(value) => handleSelectChange('contactId', value)} value={String(order.contactId || '')}>
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder={t('selectSupplier')} />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map(s => (
                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="warehouseId" className="text-right">{t('warehouse')}</Label>
          <Select onValueChange={(value) => handleSelectChange('warehouseId', value)} value={String(order.warehouseId || '')}>
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder={t('selectWarehouse')} />
            </SelectTrigger>
            <SelectContent>
              {warehouses.map(w => (
                <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="orderDate" className="text-right">{t('orderDate')}</Label>
          <Input
            id="orderDate"
            type="date"
            value={order.orderDate || ''}
            onChange={handleChange}
            className="col-span-3"
            required
          />
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="status" className="text-right">{t('status')}</Label>
          <Select onValueChange={(value) => handleSelectChange('status', value)} value={order.status || 'Draft'}>
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder={t('status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Draft">{t('draft')}</SelectItem>
              <SelectItem value="Ordered">{t('ordered')}</SelectItem>
              <SelectItem value="Received">{t('received')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="currency" className="text-right">{t('orderCurrency')}</Label>
          <Select onValueChange={handleCurrencyChange} value={selectedCurrency}>
            <SelectTrigger className="col-span-3">
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

        {selectedCurrency !== 'AZN' && (
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="exchangeRate" className="text-right">{t('exchangeRateToAZN')}</Label>
            <div className="col-span-3">
              <Input
                id="exchangeRate"
                type="number"
                step="0.0001"
                value={manualExchangeRate !== undefined ? manualExchangeRate : ''}
                onChange={handleExchangeRateChange}
                placeholder={t('exchangeRatePlaceholder')}
                className="mb-1"
                required
              />
              <p className="text-xs text-gray-500 dark:text-slate-400">{t('exchangeRateHelpText')}</p>
            </div>
          </div>
        )}

        <h3 className="font-semibold mt-4 mb-2 text-gray-700 dark:text-slate-200">{t('orderItems')}</h3>
        <div id="order-items">
          {orderItems.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 mb-2 items-center">
              <Popover open={openComboboxIndex === index} onOpenChange={(open) => setOpenComboboxIndex(open ? index : null)}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openComboboxIndex === index}
                    className="col-span-5 justify-between"
                  >
                    {item.productId
                      ? productMap[item.productId]?.name || t('selectProduct')
                      : t('selectProduct')}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                  <Command>
                    <CommandInput placeholder={t('searchProductBySku')} />
                    <CommandEmpty>{t('noProductFound')}</CommandEmpty>
                    <CommandGroup>
                      {products.map((product) => (
                        <CommandItem
                          key={product.id}
                          value={`${product.name} ${product.sku}`} // Searchable value
                          onSelect={() => {
                            handleOrderItemChange(index, 'productId', product.id);
                            setOpenComboboxIndex(null);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              item.productId === product.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {product.name} ({product.sku})
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              <Input
                type="number"
                value={item.qty}
                onChange={(e) => handleOrderItemChange(index, 'qty', parseInt(e.target.value) || 0)}
                className="col-span-3"
                min="1"
              />
              <Input
                type="number"
                step="0.01"
                value={item.price}
                onChange={(e) => handleOrderItemChange(index, 'price', parseFloat(e.target.value) || 0)}
                className="col-span-3"
                min="0"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeOrderItem(index)}
                className="col-span-1 text-red-500 hover:text-red-700"
              >
                &times;
              </Button>
            </div>
          ))}
        </div>
        <Button type="button" onClick={addOrderItem} variant="outline" className="mt-2">
          {t('addItem')}
        </Button>

        <h3 className="font-semibold mt-4 mb-2 text-gray-700 dark:text-slate-200">{t('fees')}</h3>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="transportationFees" className="text-right">{t('transportationFees')}</Label>
          <Input
            id="transportationFees"
            type="number"
            step="0.01"
            value={order.transportationFees || 0}
            onChange={(e) => handleNumericChange('transportationFees', e.target.value)}
            className="col-span-2"
            min="0"
          />
          <Select onValueChange={(value) => handleSelectChange('transportationFeesCurrency', value)} value={order.transportationFeesCurrency || 'AZN'}>
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
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="customFees" className="text-right">{t('customFees')}</Label>
          <Input
            id="customFees"
            type="number"
            step="0.01"
            value={order.customFees || 0}
            onChange={(e) => handleNumericChange('customFees', e.target.value)}
            className="col-span-2"
            min="0"
          />
          <Select onValueChange={(value) => handleSelectChange('customFeesCurrency', value)} value={order.customFeesCurrency || 'AZN'}>
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
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="additionalFees" className="text-right">{t('additionalFees')}</Label>
          <Input
            id="additionalFees"
            type="number"
            step="0.01"
            value={order.additionalFees || 0}
            onChange={(e) => handleNumericChange('additionalFees', e.target.value)}
            className="col-span-2"
            min="0"
          />
          <Select onValueChange={(value) => handleSelectChange('additionalFeesCurrency', value)} value={order.additionalFeesCurrency || 'AZN'}>
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

        <div className="grid grid-cols-4 items-center gap-4 mt-6 border-t pt-4 dark:border-slate-700">
          <Label className="text-right text-lg font-bold">{t('total')}</Label>
          <Input
            id="total"
            type="number"
            value={order.total?.toFixed(2) || '0.00'}
            readOnly
            className="col-span-3 font-bold text-lg bg-gray-50 dark:bg-slate-700"
          />
        </div>
      </div>
      <div className="flex justify-end mt-6 border-t pt-4 dark:border-slate-700">
        <Button type="submit">{t('saveOrder')}</Button>
      </div>
    </form>
  );
};

export default PurchaseOrderForm;