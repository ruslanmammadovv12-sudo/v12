"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
// The X icon and Button import are no longer needed for the custom close button
// import { Button } from '@/components/ui/button';
// import { X } from 'lucide-react';

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  description?: string;
}

const FormModal: React.FC<FormModalProps> = ({ isOpen, onClose, title, children, description }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[1200px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="py-4">
          {children}
        </div>
        {/* Removed the custom close button, relying on the default one provided by DialogContent */}
      </DialogContent>
    </Dialog>
  );
};

export default FormModal;