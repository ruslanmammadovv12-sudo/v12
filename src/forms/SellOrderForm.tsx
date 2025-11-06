"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useData, SellOrder, Product, Customer, Warehouse, OrderItem, ProductMovement } from '@/context/DataContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Check, ChevronsUpDown, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t } from '@/utils/i18n';
import { MOCK_CURRENT_DATE } from '@/context/DataContext';
import { toast } from 'sonner';

interface SellOrderFormProps {
  orderId?: number;
  onSuccess: () => void;
}

interface SellOrderItemState {
  productId: number | '';
  qty: number;
  price: number;
}

const SellOrderForm: React.FC<SellOrderFormProps> = ({ orderId, onSuccess }) => {
  const {
    sellOrders,
    customers,
    warehouses,
    products,
    settings,
    saveItem,
    updateStockFromOrder,
    showAlertModal,
    setProducts,
    getNextId,
  } = useData();
  const isEdit = orderId !== undefined;

  const customerMap = useMemo(() => customers.reduce((acc, c) => ({ ...acc, [c.id]: c }), {} as { [key: number]: Customer }), [customers]);
  const productMap = useMemo(() => products.reduce((acc, p) => ({ ...acc, [p.id]: p }), {} as { [key: number]: Product }), [products]);
  const warehouseMap = useMemo(() => warehouses.reduce((acc, w) => ({ ...acc, [w.id]: w }), {} as { [key: number]: Warehouse }), [warehouses]);

  const mainWarehouse = useMemo(() => warehouses.find(w => w.type === 'Main'), [warehouses]);

  const [openComboboxIndex, setOpenComboboxIndex] = useState<number | null>(null); 

  const [order, setOrder] = useState<Partial<SellOrder>>(() => {
    if (isEdit && orderId !== undefined) {
      const existingOrder = sellOrders.find(o => o.id === orderId);
      if (existingOrder) return existingOrder;
    }
    // For new orders, generate an ID immediately
    return {
      id: getNextId('sellOrders'), // Pre-generate ID for new orders
      orderDate: MOCK_CURRENT_DATE.toISOString().slice(0, 10),
      status: 'Draft',
      vatPercent: settings.defaultVat,
      total: 0,
    };
  });

  const [orderItems, setOrderItems] = useState<SellOrderItemState[]>(() => {
    if (isEdit && orderId !== undefined) {
      const existingOrder = sellOrders.find(o => o.id === orderId);
      if (existingOrder) return existingOrder.items.map(item => ({
        productId: item.productId,
        qty: item.qty,
        price: item.price,
      }));
    }
    return [{ productId: '', qty: 1, price: 0 }];
  });

  useEffect(() => {
    if (isEdit && orderId !== undefined) {
      const existingOrder = sellOrders.find(o => o.id === orderId);
      if (existingOrder) {
        setOrder(existingOrder);
        setOrderItems(existingOrder.items.map(item => ({
          productId: item.productId,
          qty: item.qty,
          price: item.price,
        })));
      }
    } else if (!isEdit && orderId === undefined) {
      // Reset for new order if component is reused for new entry, ensuring a new ID
      setOrder({
        id: getNextId('sellOrders'), // Ensure new ID on reset
        orderDate: MOCK_CURRENT_DATE.toISOString().slice(0, 10),
        status: 'Draft',
        vatPercent: settings.defaultVat,
        total: 0,
      });
      setOrderItems([{ productId: '', qty: 1, price: 0 }]);
    }
  }, [orderId, isEdit, sellOrders, settings.defaultVat, getNextId]);


  const calculateTotalOrderValue = useCallback(() => {
    let subtotal = 0;
    orderItems.forEach(item => {
      if (item.productId && item.qty > 0 && item.price > 0) {
        subtotal += item.qty * item.price;
      }
    });
    const vatAmount = subtotal * ((order.vatPercent || 0) / 100);
    return parseFloat((subtotal + vatAmount).toFixed(2));
  }, [orderItems, order.vatPercent]);

  useEffect(() => {
    const total = calculateTotalOrderValue();
    setOrder(prev => ({ ...prev, total }));
  }, [orderItems, order.vatPercent, calculateTotalOrderValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setOrder(prev => ({ ...prev, [id]: value }));
  };

  const handleNumericChange = (id: keyof SellOrder, value: string) => {
    setOrder(prev => ({ ...prev, [id]: parseFloat(value) || 0 }));
  };

  const handleSelectChange = (id: keyof SellOrder, value: string) => {
    setOrder(prev => ({ ...prev, [id]: value }));
  };

  const addOrderItem = useCallback(() => {
    setOrderItems(prev => [...prev, { productId: '', qty: 1, price: 0 }]);
  }, []);

  const removeOrderItem = useCallback((index: number) => {
    setOrderItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleOrderItemChange = useCallback((index: number, field: keyof SellOrderItemState, value: any) => {
    setOrderItems(prev =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }, []);

  const handleGenerateProductMovement = useCallback(() => {
    // Ensure the order is saved before generating movement, especially for new orders
    const orderToSave: SellOrder = {
      ...order,
      id: order.id || getNextId('sellOrders'), // Ensure ID is present
      contactId: order.contactId as number,
      warehouseId: order.warehouseId as number,
      orderDate: order.orderDate || MOCK_CURRENT_DATE.toISOString().slice(0, 10),
      status: order.status || 'Draft',
      items: orderItems.filter(item => item.productId !== '' && item.qty > 0 && item.price >= 0).map(item => ({
        productId: item.productId as number,
        qty: item.qty,
        price: item.price,
      })),
      vatPercent: order.vatPercent || 0,
      total: order.total || 0,
    };

    // Perform validation before saving and generating movement
    if (!orderToSave.contactId || !orderToSave.warehouseId || !orderToSave.orderDate) {
      showAlertModal('Validation Error', 'Customer, Warehouse, and Order Date are required before generating a product movement.');
      return;
    }
    if (orderToSave.items.length === 0) {
      showAlertModal('Validation Error', 'Please add at least one valid order item with a product, quantity, and price before generating a product movement.');
      return;
    }

    // Save the order first to ensure it's persisted and has the latest state
    saveItem('sellOrders', orderToSave);
    setOrder(orderToSave); // Update local state with the saved order, including its ID

    if (orderToSave.productMovementId) {
      showAlertModal('Info', t('productMovementAlreadyGenerated'));
      return;
    }
    if (!mainWarehouse) {
      showAlertModal('Error', t('mainWarehouseNotFound'));
      return;
    }
    if (!orderToSave.warehouseId) {
      showAlertModal('Validation Error', t('selectDestinationWarehouse'));
      return;
    }
    if (mainWarehouse.id === orderToSave.warehouseId) {
      showAlertModal('Info', t('movementNotNeeded'));
      return;
    }

    const newMovementItems: { productId: number; quantity: number }[] = [];
    const productsCopy: Product[] = JSON.parse(JSON.stringify(products));

    for (const item of orderItems) {
      if (!item.productId || item.qty <= 0) {
        continue;
      }

      const product = productsCopy.find(p => p.id === item.productId);
      if (!product) {
        showAlertModal('Error', `Product with ID ${item.productId} not found.`);
        return;
      }

      const sourceStock = product.stock?.[mainWarehouse.id] || 0;
      if (sourceStock < item.qty) {
        showAlertModal('Stock Error', `${t('notEnoughStock')} ${product.name} (${product.sku}) in ${mainWarehouse.name}. ${t('available')}: ${sourceStock}, ${t('requested')}: ${item.qty}.`);
        return;
      }

      newMovementItems.push({ productId: item.productId as number, quantity: item.qty });

      if (!product.stock) product.stock = {};
      product.stock[mainWarehouse.id] = sourceStock - item.qty;
      product.stock[orderToSave.warehouseId as number] = (product.stock[orderToSave.warehouseId as number] || 0) + item.qty;
    }

    if (newMovementItems.length === 0) {
      showAlertModal('Info', t('noValidProductsForMovement'));
      return;
    }

    setProducts(productsCopy);

    const newMovementId = getNextId('productMovements');
    const newMovement: ProductMovement = {
      id: newMovementId,
      sourceWarehouseId: mainWarehouse.id,
      destWarehouseId: orderToSave.warehouseId as number,
      items: newMovementItems,
      date: MOCK_CURRENT_DATE.toISOString().slice(0, 10),
    };

    saveItem('productMovements', newMovement);
    
    setOrder(prev => {
      const updatedOrder = { ...prev, productMovementId: newMovementId };
      saveItem('sellOrders', updatedOrder);
      return updatedOrder;
    });

    toast.success(t('success'), { description: `Product Movement #${newMovementId} generated successfully from ${mainWarehouse.name} to ${warehouseMap[orderToSave.warehouseId as number]?.name}.` });

  }, [order, orderItems, products, mainWarehouse, showAlertModal, setProducts, getNextId, saveItem, warehouseMap]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!order.contactId || !order.warehouseId || !order.orderDate) {
      showAlertModal('Validation Error', 'Customer, Warehouse, and Order Date are required.');
      return;
    }

    const validOrderItems = orderItems.filter(item => item.productId !== '' && item.qty > 0 && item.price >= 0);
    if (validOrderItems.length === 0) {
      showAlertModal('Validation Error', 'Please add at least one valid order item with a product, quantity, and price.');
      return;
    }

    if (order.status === 'Shipped') {
      const productsInWarehouses: { [warehouseId: number]: { [productId: number]: number } } = {};
      products.forEach(p => {
        if (p.stock) {
          for (const warehouseId in p.stock) {
            if (!productsInWarehouses[parseInt(warehouseId)]) {
              productsInWarehouses[parseInt(warehouseId)] = {};
            }
            productsInWarehouses[parseInt(warehouseId)][p.id] = p.stock[parseInt(warehouseId)];
          }
        }
      });

      const currentOrderItems = isEdit ? sellOrders.find(o => o.id === orderId)?.items || [] : [];
      const currentOrderWarehouseId = isEdit ? sellOrders.find(o => o.id === orderId)?.warehouseId : undefined;

      for (const item of validOrderItems) {
        const productId = item.productId as number;
        const requestedQty = item.qty;
        const warehouseId = order.warehouseId as number;

        let availableStock = productsInWarehouses[warehouseId]?.[productId] || 0;

        if (isEdit && currentOrderWarehouseId === warehouseId) {
          const oldItem = currentOrderItems.find(old => old.productId === productId);
          if (oldItem) {
            availableStock += oldItem.qty;
          }
        }

        if (availableStock < requestedQty) {
          const productName = productMap[productId]?.name || 'Unknown Product';
          showAlertModal('Stock Error', `${t('notEnoughStock')} ${productName}. ${t('available')}: ${availableStock}, ${t('requested')}: ${requestedQty}.`);
          return;
        }
      }
    }

    const finalOrderItems: OrderItem[] = validOrderItems.map(item => ({
      productId: item.productId as number,
      qty: item.qty,
      price: item.price,
    }));

    const orderToSave: SellOrder = {
      ...order,
      id: order.id || getNextId('sellOrders'), // Ensure ID is present even if not pre-generated
      contactId: order.contactId as number,
      warehouseId: order.warehouseId as number,
      orderDate: order.orderDate || MOCK_CURRENT_DATE.toISOString().slice(0, 10),
      status: order.status || 'Draft',
      items: finalOrderItems,
      vatPercent: order.vatPercent || 0,
      total: order.total || 0,
    };

    const oldOrder = isEdit ? sellOrders.find(o => o.id === orderToSave.id) : null;

    saveItem('sellOrders', orderToSave);
    updateStockFromOrder(orderToSave, oldOrder);
    onSuccess();
    toast.success(t('success'), { description: `Sell Order #${orderToSave.id || 'new'} saved successfully.` });
  };

  const isGenerateMovementDisabled = !!order.productMovementId; // Only disabled if a movement is already linked

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="contactId" className="text-right">{t('customer')}</Label>
          <Select onValueChange={(value) => handleSelectChange('contactId', value)} value={String(order.contactId || '')}>
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder={t('selectCustomer')} />
            </SelectTrigger>
            <SelectContent>
              {customers.map(c => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
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
          <Label htmlFor="status" className="text-right">{t('orderStatus')}</Label>
          <Select onValueChange={(value) => handleSelectChange('status', value)} value={order.status || 'Draft'}>
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder={t('status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Draft">{t('draft')}</SelectItem>
              <SelectItem value="Confirmed">{t('confirmed')}</SelectItem>
              <SelectItem value="Shipped">{t('shipped')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="vatPercent" className="text-right">{t('vatPercent')}</Label>
          <Input
            id="vatPercent"
            type="number"
            step="0.01"
            value={order.vatPercent || 0}
            onChange={(e) => handleNumericChange('vatPercent', e.target.value)}
            className="col-span-3"
            min="0"
            max="100"
          />
        </div>

        <h3 className="font-semibold mt-4 mb-2 text-gray-700 dark:text-slate-200">{t('orderItems')}</h3>
        <div id="order-items">
          {orderItems.map((item, index) => (
            <div key={index} className="grid grid-cols-10 gap-2 mb-2 items-center">
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
                          value={`${product.name} ${product.sku}`}
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
                          {product.name} ({product.sku}) ({t('stockAvailable')}: {product.stock?.[order.warehouseId as number] || 0})
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
                className="col-span-2"
                min="1"
              />
              <Input
                type="number"
                step="0.01"
                value={item.price}
                onChange={(e) => handleOrderItemChange(index, 'price', parseFloat(e.target.value) || 0)}
                className="col-span-2"
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
      <div className="flex justify-end mt-6 border-t pt-4 dark:border-slate-700 space-x-2">
        <Button 
          type="button" 
          onClick={handleGenerateProductMovement} 
          variant="secondary" 
          className="flex items-center"
          disabled={isGenerateMovementDisabled}
        >
          <ArrowRight className="w-4 h-4 mr-2" />
          {t('generateProductMovement')}
        </Button>
        <Button type="submit">{t('saveOrder')}</Button>
      </div>
    </form>
  );
};

export default SellOrderForm;