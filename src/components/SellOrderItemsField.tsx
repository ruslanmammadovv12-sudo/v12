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
  qty: number;
  price: number;
  itemTotal: number; // Added itemTotal
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
      <div className="grid grid-cols-11 gap-2 mb-2 items-center text-sm font-medium text-gray-700 dark:text-slate-300">
        <Label className="col-span-4">{t('product')}</Label>
        <Label className="col-span-2">{t('qty')}</Label>
        <Label className="col-span-2">{t('price')}</Label>
        <Label className="col-span-2">{t('itemTotal')}</Label> {/* New Label */}
        <Label className="col-span-1"></Label>
      </div>
      <div id="order-items">
        {orderItems.map((item, index) => (
          <div key={index} className="grid grid-cols-11 gap-2 mb-2 items-center">
            <Popover open={openComboboxIndex === index} onOpenChange={(open) => setOpenComboboxIndex(open ? index : null)}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openComboboxIndex === index}
                  className="col-span-4 justify-between"
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
              type="number"
              value={String(item.qty)}
              onChange={(e) => handleOrderItemChange(index, 'qty', parseInt(e.target.value) || 0)}
              className="col-span-2"
              min="1"
            />
            <Input
              type="number"
              step="0.01"
              value={String(item.price)}
              onChange={(e) => handleOrderItemChange(index, 'price', parseFloat(e.target.value) || 0)}
              className="col-span-2"
              min="0"
            />
            <Input
              type="number" // Now editable
              step="0.01"
              value={item.itemTotal.toFixed(2)} // Display itemTotal
              onChange={(e) => handleOrderItemChange(index, 'itemTotal', parseFloat(e.target.value) || 0)} // Handle change to itemTotal
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
    </>
  );
};

export default SellOrderItemsField;