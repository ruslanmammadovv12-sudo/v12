"use client";

import React, { useState, useEffect } from 'react';
import { useData, MOCK_CURRENT_DATE } from '@/context/DataContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { t } from '@/utils/i18n';
import { Supplier } from '@/types'; // Import types from types file

interface SupplierFormProps {
  supplierId?: number;
  onSuccess: () => void;
}

const SupplierForm: React.FC<SupplierFormProps> = ({ supplierId, onSuccess }) => {
  const { suppliers, saveItem } = useData();
  const isEdit = supplierId !== undefined;
  const [supplier, setSupplier] = useState<Partial<Supplier>>({});

  useEffect(() => {
    if (isEdit) {
      const existingSupplier = suppliers.find(s => s.id === supplierId);
      if (existingSupplier) {
        setSupplier(existingSupplier);
      }
    } else {
      setSupplier({});
    }
  }, [supplierId, isEdit, suppliers]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setSupplier(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier.name) {
      alert('Supplier Name is required.');
      return;
    }

    const supplierToSave: Supplier = {
      ...supplier,
      id: supplier.id || 0, // Will be overwritten by saveItem if new
      name: supplier.name,
      contact: supplier.contact || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
    };

    saveItem('suppliers', supplierToSave);
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="name" className="text-right">
            {t('supplierName')}
          </Label>
          <Input
            id="name"
            value={supplier.name || ''}
            onChange={handleChange}
            className="col-span-3"
            required
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="contact" className="text-right">
            {t('contactPerson')}
          </Label>
          <Input
            id="contact"
            value={supplier.contact || ''}
            onChange={handleChange}
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="email" className="text-right">
            {t('email')}
          </Label>
          <Input
            id="email"
            type="email"
            value={supplier.email || ''}
            onChange={handleChange}
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="phone" className="text-right">
            {t('phone')}
          </Label>
          <Input
            id="phone"
            type="tel"
            value={supplier.phone || ''}
            onChange={handleChange}
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="address" className="text-right">
            {t('address')}
          </Label>
          <Textarea
            id="address"
            value={supplier.address || ''}
            onChange={handleChange}
            className="col-span-3"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit">{t('save')}</Button>
      </div>
    </form>
  );
};

export default SupplierForm;