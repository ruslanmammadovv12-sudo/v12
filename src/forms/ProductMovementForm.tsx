"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useData, MOCK_CURRENT_DATE } from '@/context/DataContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t } from '@/utils/i18n';
import { ProductMovement, Product, Warehouse } from '@/types'; // Import types from types file

interface ProductMovementFormProps {
  movementId?: number;
  onSuccess: () => void;
}

interface MovementItemState {
  productId: number | '';
  quantity: number;
}

const ProductMovementForm: React.FC<ProductMovementFormProps> = ({ movementId, onSuccess }) => {
  const { productMovements, products, warehouses, saveItem, showAlertModal, setProducts } = useData();
  const isEdit = movementId !== undefined;

  const [sourceWarehouseId, setSourceWarehouseId] = useState<number | ''>('');
  const [destWarehouseId, setDestWarehouseId] = useState<number | ''>('');
  const [movementItems, setMovementItems] = useState<MovementItemState[]>([{ productId: '', quantity: 1 }]);
  const [openComboboxIndex, setOpenComboboxIndex] = useState<number | null>(null); // State for which product combobox is open

  useEffect(() => {
    if (isEdit) {
      const existingMovement = productMovements.find(m => m.id === movementId);
      if (existingMovement) {
        setSourceWarehouseId(existingMovement.sourceWarehouseId);
        setDestWarehouseId(existingMovement.destWarehouseId);
        setMovementItems(existingMovement.items.map(item => ({ productId: item.productId, quantity: item.quantity })));
      }
    } else {
      setSourceWarehouseId('');
      setDestWarehouseId('');
      setMovementItems([{ productId: '', quantity: 1 }]);
    }
  }, [movementId, isEdit, productMovements]);

  const addMovementItem = useCallback(() => {
    setMovementItems(prev => [...prev, { productId: '', quantity: 1 }]);
  }, []);

  const removeMovementItem = useCallback((index: number) => {
    setMovementItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleItemChange = useCallback((index: number, field: keyof MovementItemState, value: any) => {
    setMovementItems(prev =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (sourceWarehouseId === '' || destWarehouseId === '') {
      showAlertModal('Validation Error', 'Please select both source and destination warehouses.');
      return;
    }
    if (sourceWarehouseId === destWarehouseId) {
      showAlertModal('Validation Error', 'Source and Destination warehouses cannot be the same.');
      return;
    }

    const newItems = movementItems.filter(item => item.productId !== '' && item.quantity > 0);
    if (newItems.length === 0) {
      showAlertModal('Validation Error', 'Please ensure all items have a selected product and a quantity greater than zero.');
      return;
    }

    // Deep copy products for validation and potential update
    const productsCopy: Product[] = JSON.parse(JSON.stringify(products));
    const currentMovement = isEdit ? productMovements.find(m => m.id === movementId) : null;

    // --- Revert stock change if editing an existing movement ---
    if (isEdit && currentMovement) {
      currentMovement.items.forEach(item => {
        const p = productsCopy.find(p => p.id === item.productId);
        if (p && p.stock) {
          p.stock[currentMovement.sourceWarehouseId] = (p.stock[currentMovement.sourceWarehouseId] || 0) + item.quantity;
          p.stock[currentMovement.destWarehouseId] = (p.stock[currentMovement.destWarehouseId] || 0) - item.quantity;
        }
      });
    }

    // --- Check stock and apply new movement (dry run) ---
    for (const item of newItems) {
      const p = productsCopy.find(p => p.id === item.productId);
      if (!p || !p.stock) {
        showAlertModal('Error', `Product data missing for item ID ${item.productId}`);
        return;
      }

      const stockInSource = p.stock[sourceWarehouseId as number] || 0;
      if (stockInSource < item.quantity) {
        const originalProduct = products.find(prod => prod.id === item.productId);
        const safeProductName = originalProduct?.name || 'Unknown Product';
        showAlertModal('Stock Error', `${t('notEnoughStock')} ${safeProductName}. ${t('available')}: ${stockInSource}, ${t('requested')}: ${item.quantity}.`);
        return;
      }
      // Apply tentative stock changes for subsequent checks in the same form submission
      p.stock[sourceWarehouseId as number] = stockInSource - item.quantity;
      p.stock[destWarehouseId as number] = (p.stock[destWarehouseId as number] || 0) + item.quantity;
    }

    // If all checks pass, update the actual products state
    setProducts(productsCopy);

    const movementToSave: ProductMovement = {
      id: movementId || 0,
      sourceWarehouseId: sourceWarehouseId as number,
      destWarehouseId: destWarehouseId as number,
      items: newItems.map(item => ({ productId: item.productId as number, quantity: item.quantity })),
      date: MOCK_CURRENT_DATE.toISOString().slice(0, 10),
    };

    saveItem('productMovements', movementToSave);
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="sourceWarehouseId" className="text-right">
            {t('from')}
          </Label>
          <Select onValueChange={(value) => setSourceWarehouseId(parseInt(value))} value={String(sourceWarehouseId)}>
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder={t('sourceWarehouse')} />
            </SelectTrigger>
            <SelectContent>
              {warehouses.map(w => (
                <SelectItem key={w.id} value={String(w.id)}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="destWarehouseId" className="text-right">
            {t('to')}
          </Label>
          <Select onValueChange={(value) => setDestWarehouseId(parseInt(value))} value={String(destWarehouseId)}>
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder={t('destinationWarehouse')} />
            </SelectTrigger>
            <SelectContent>
              {warehouses.map(w => (
                <SelectItem key={w.id} value={String(w.id)}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <h4 className="font-semibold mt-4 mb-2 text-gray-700 dark:text-slate-200">{t('productsToMove')}</h4>
        <div id="movement-items">
          {movementItems.map((item, index) => (
            <div key={index} className="grid grid-cols-10 gap-2 mb-2 items-center">
              <Popover open={openComboboxIndex === index} onOpenChange={(open) => setOpenComboboxIndex(open ? index : null)}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openComboboxIndex === index}
                    className="col-span-6 justify-between"
                  >
                    {item.productId
                      ? products.find(p => p.id === item.productId)?.name || t('selectProduct')
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
                            handleItemChange(index, 'productId', product.id);
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
                value={item.quantity}
                onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                className="col-span-3"
                min="1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeMovementItem(index)}
                className="col-span-1 text-red-500 hover:text-red-700"
              >
                &times;
              </Button>
            </div>
          ))}
        </div>
        <Button type="button" onClick={addMovementItem} variant="outline" className="mt-2">
          {t('addItem')}
        </Button>
      </div>
      <div className="flex justify-end mt-6 border-t pt-4 dark:border-slate-700">
        <Button type="submit">{t('saveMovement')}</Button>
      </div>
    </form>
  );
};

export default ProductMovementForm;