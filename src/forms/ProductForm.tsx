"use client";

import React, { useState, useEffect } from 'react';
import { useData, MOCK_CURRENT_DATE } from '@/context/DataContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import ImageUpload from '@/components/ImageUpload';
import { t } from '@/utils/i18n';
import { Product } from '@/types'; // Import types from types file

interface ProductFormProps {
  productId?: number;
  onSuccess: () => void;
}

const ProductForm: React.FC<ProductFormProps> = ({ productId, onSuccess }) => {
  const { products, saveItem } = useData();
  const isEdit = productId !== undefined;
  const [product, setProduct] = useState<Partial<Product>>({});
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isEdit) {
      const existingProduct = products.find(p => p.id === productId);
      if (existingProduct) {
        setProduct(existingProduct);
        setImageUrl(existingProduct.imageUrl || null);
      }
    } else {
      setProduct({});
      setImageUrl(null);
    }
  }, [productId, isEdit, products]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setProduct(prev => ({ ...prev, [id]: id === 'minStock' ? parseInt(value) || 0 : value }));
  };

  const handleImageChange = (base64Image: string | null) => {
    setImageUrl(base64Image);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!product.name || !product.sku) {
      // This should ideally be handled by form validation library like react-hook-form
      // For now, using a simple alert.
      alert('Product Name and SKU are required.');
      return;
    }

    const productToSave: Product = {
      ...product,
      id: product.id || 0, // Will be overwritten by saveItem if new
      name: product.name,
      sku: product.sku,
      category: product.category || '',
      description: product.description || '',
      minStock: product.minStock || 0,
      imageUrl: imageUrl || '',
      stock: product.stock || {}, // Preserve existing stock or initialize empty
      averageLandedCost: product.averageLandedCost || 0, // Preserve existing or initialize
    };

    saveItem('products', productToSave);
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="name" className="text-right">
            {t('productName')}
          </Label>
          <Input
            id="name"
            value={product.name || ''}
            onChange={handleChange}
            className="col-span-3"
            required
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="sku" className="text-right">
            {t('sku')}
          </Label>
          <Input
            id="sku"
            value={product.sku || ''}
            onChange={handleChange}
            className="col-span-3"
            required
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="category" className="text-right">
            {t('category')}
          </Label>
          <Input
            id="category"
            value={product.category || ''}
            onChange={handleChange}
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="description" className="text-right">
            {t('description')}
          </Label>
          <Textarea
            id="description"
            value={product.description || ''}
            onChange={handleChange}
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="minStock" className="text-right">
            {t('minimumStockLevel')}
          </Label>
          <Input
            id="minStock"
            type="number"
            value={product.minStock || 0}
            onChange={handleChange}
            className="col-span-3"
            min="0"
            required
          />
        </div>
        <div className="grid grid-cols-4 items-start gap-4">
          <Label className="text-right">
            {t('productImage')}
          </Label>
          <div className="col-span-3">
            <ImageUpload
              label="" // Label is handled by parent grid
              initialImageUrl={imageUrl || undefined}
              onImageChange={handleImageChange}
            />
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit">{t('saveProduct')}</Button>
      </div>
    </form>
  );
};

export default ProductForm;