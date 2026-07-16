'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Bell } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface PriceAlertModalProps {
  productId: string;
  productName: string;
  currentBestPrice?: number;
  userEmail?: string;
}

export function PriceAlertModal({ productId, productName, currentBestPrice, userEmail }: PriceAlertModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [targetPrice, setTargetPrice] = useState(currentBestPrice ? Math.floor(currentBestPrice * 0.9).toString() : '');
  const [condition, setCondition] = useState('BELOW');
  const [contactMethod, setContactMethod] = useState('EMAIL');
  const [contactAddress, setContactAddress] = useState(userEmail || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId,
          targetPrice: Number(targetPrice),
          condition,
          contactMethod,
          contactAddress
        })
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          setOpen(false);
          setSuccess(false);
        }, 2000);
      } else {
        alert('Failed to create alert.');
      }
    } catch (err) {
      console.error(err);
      alert('Error creating alert.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-11 rounded-md px-8 flex-1 text-md shadow-sm gap-2">
        <Bell className="w-5 h-5" />
        Notify Me
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Price Alert</DialogTitle>
          <DialogDescription>
            Get notified when {productName} reaches your target price.
          </DialogDescription>
        </DialogHeader>
        
        {success ? (
          <div className="py-6 text-center text-green-600 font-medium">
            Alert created successfully!
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Condition</label>
              <Select value={condition} onValueChange={(v) => v && setCondition(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BELOW">Drops Below</SelectItem>
                  <SelectItem value="ABOVE">Rises Above</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Target Price (₹)</label>
              <Input 
                type="number" 
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                required
                min="1"
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notification Method</label>
              <Select value={contactMethod} onValueChange={(v) => v && setContactMethod(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                  <SelectItem value="PUSH">Push Notification</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Contact Details</label>
              <Input 
                type={contactMethod === 'EMAIL' ? 'email' : 'text'}
                placeholder={contactMethod === 'EMAIL' ? 'your@email.com' : '+91 9876543210'}
                value={contactAddress}
                onChange={(e) => setContactAddress(e.target.value)}
                required
              />
            </div>

            <div className="pt-2">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating...' : 'Create Alert'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
