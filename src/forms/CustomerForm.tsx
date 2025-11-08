"use client";

import React, { useState, useEffect } from 'react';
import { useData } from '@/context/DataContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { t } from '@/utils/i18n';
import { Customer } from '@/types'; // Import types from types file

interface CustomerFormProps {
  customerId?: number;
  onSuccess: () => void;
}

const CustomerForm: React.FC<CustomerFormProps> = ({ customerId, onSuccess }) => {
  const { customers, saveItem } = useData();
  const isEdit = customerId !== undefined;
  const [customer, setCustomer] = useState<Partial<Customer>>({});

  useEffect(() => {
    if (isEdit) {
      const existingCustomer = customers.find(c => c.id === customerId);
      if (existingCustomer) {
        setCustomer(existingCustomer);
      }
    } else {
      setCustomer({});
    }
  }, [customerId, isEdit, customers]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setCustomer(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer.name) {
      alert('Customer Name is required.');
      return;
    }

    const customerToSave: Customer = {
      ...customer,
      id: customer.id || 0, // Will be overwritten by saveItem if new
      name: customer.name,
      contact: customer.contact || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
    };

    saveItem('customers', customerToSave);
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="name" className="text-right">
            {t('customerName')}
          </Label>
          <Input
            id="name"
            value={customer.name || ''}
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
            value={customer.contact || ''}
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
            value={customer.email || ''}
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
            value={customer.phone || ''}
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
            value={customer.address || ''}
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

export default CustomerForm;