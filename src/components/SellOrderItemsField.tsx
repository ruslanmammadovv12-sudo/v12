"use client";

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t } from '@/utils/i18n';
import { Product } from '@/context/DataContext';

interface SellOrderItemState {
  productId: number | '';
  qty: number | string; // Added string type
  price: number | string; // Added string type
  itemTotal: number | string; // Added string type
  cleanProfit?: number; // New field for calculated clean profit per item
}

interface SellOrderItemsFieldProps {
  orderItems: SellOrderItemState[];
  handleOrderItemChange: (index: number, field: keyof SellOrderItemState, value: any) => void;
  removeOrderItem: (index: number) => void;
  addOrderItem: () => void;
  products: Product[];
  productMap: { [key: number]: Product };
  warehouseId?: number;
}

const SellOrderItemsField: React.FC<SellOrderItemsFieldProps> = ({
  orderItems,
  handleOrderItemChange,
  removeOrderItem,
  addOrderItem,
  products,
  productMap,
  warehouseId,
}) => {
  const [openComboboxIndex, setOpenComboboxIndex] = useState<number | null>(null);

  return (
    <>
      <h3 className="font-semibold mt-4 mb-2 text-gray-700 dark:text-slate-200">{t('orderItems')}</h3>
      <div className="grid grid-cols-13 gap-2 mb-2 items-center text-sm font-medium text-gray-700 dark:text-slate-300">
        <Label className="col-span-3">{t('product')}</Label>
        <Label className="col-span-2">{t('qty')}</Label>
        <Label className="col-span-2">{t('price')}</Label>
        <Label className="col-span-2">{t('itemTotal')}</Label>
        <Label className="col-span-2">{t('cleanProfit')}</Label> {/* New column header */}
        <Label className="col-span-1"></Label>
      </div>
      <div id="order-items">
        {orderItems.map((item, index) => (
          <div key={index} className="grid grid-cols-13 gap-2 mb-2 items-center">
            <Popover open={openComboboxIndex === index} onOpenChange={(open) => setOpenComboboxIndex(open ? index : null)}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openComboboxIndex === index}
                  className="col-span-3 justify-between"
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
                        {product.name} ({product.sku}) ({t('stockAvailable')}: {product.stock?.[warehouseId as number] || 0})
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
            <Input
              type="text"
              value={item.qty}
              onChange={(e) => handleOrderItemChange(index, 'qty', e.target.value)}
              className="col-span-2"
            />
            <Input
              type="text"
              step="0.01"
              value={item.price}
              onChange={(e) => handleOrderItemChange(index, 'price', e.target.value)}
              className="col-span-2"
            />
            <Input
              type="text"
              step="0.01"
              value={item.itemTotal}
              onChange={(e) => handleOrderItemChange(index, 'itemTotal', e.target.value)}
              className="col-span-2"
            />
            <Input
              type="text"
              value={item.cleanProfit !== undefined ? item.cleanProfit.toFixed(2) : '0.00'}
              readOnly
              className="col-span-2 bg-gray-50 dark:bg-slate-700"
            /> {/* New input for clean profit */}
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
    </>
  );
};

export default SellOrderItemsField;