"use client";

import React, { useState, useEffect } from 'react';
import { useData, MOCK_CURRENT_DATE } from '@/context/DataContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { t } from '@/utils/i18n';
import { Warehouse } from '@/types'; // Import types from types file

interface WarehouseFormProps {
  warehouseId?: number;
  onSuccess: () => void;
}

const WarehouseForm: React.FC<WarehouseFormProps> = ({ warehouseId, onSuccess }) => {
  const { warehouses, saveItem } = useData();
  const isEdit = warehouseId !== undefined;
  const [warehouse, setWarehouse] = useState<Partial<Warehouse>>({});

  useEffect(() => {
    if (isEdit) {
      const existingWarehouse = warehouses.find(w => w.id === warehouseId);
      if (existingWarehouse) {
        setWarehouse(existingWarehouse);
      }
    } else {
      setWarehouse({ type: 'Secondary' }); // Default to Secondary for new warehouses
    }
  }, [warehouseId, isEdit, warehouses]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setWarehouse(prev => ({ ...prev, [id]: value }));
  };

  const handleTypeChange = (value: 'Main' | 'Secondary') => {
    setWarehouse(prev => ({ ...prev, type: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouse.name) {
      alert('Warehouse Name is required.');
      return;
    }

    const warehouseToSave: Warehouse = {
      ...warehouse,
      id: warehouse.id || 0, // Will be overwritten by saveItem if new
      name: warehouse.name,
      location: warehouse.location || '',
      type: warehouse.type || 'Secondary', // Ensure type is set
    };

    saveItem('warehouses', warehouseToSave);
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="name" className="text-right">
            {t('warehouseName')}
          </Label>
          <Input
            id="name"
            value={warehouse.name || ''}
            onChange={handleChange}
            className="col-span-3"
            required
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="location" className="text-right">
            {t('location')}
          </Label>
          <Input
            id="location"
            value={warehouse.location || ''}
            onChange={handleChange}
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="type" className="text-right">
            {t('warehouseType')}
          </Label>
          <Select onValueChange={handleTypeChange} value={warehouse.type || 'Secondary'}>
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder={t('selectWarehouseType')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Main">{t('mainWarehouseType')}</SelectItem>
              <SelectItem value="Secondary">{t('secondaryWarehouseType')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit">{t('saveWarehouse')}</Button>
      </div>
    </form>
  );
};

export default WarehouseForm;