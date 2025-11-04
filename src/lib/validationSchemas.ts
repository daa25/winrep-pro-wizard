import { z } from 'zod';

// Auth validation
export const authSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
  fullName: z.string().trim().min(1, 'Full name is required').max(100).optional(),
});

// Customer validation
export const customerSchema = z.object({
  external_id: z.string().max(100).optional(),
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email').max(255).optional().or(z.literal('')),
  phone: z.string().regex(/^[0-9+\-\s()]*$/, 'Invalid phone number').max(20).optional().or(z.literal('')),
  discount: z.number().min(0, 'Discount cannot be negative').max(100, 'Discount cannot exceed 100%'),
  street: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  zip_code: z.string().max(20).optional(),
  notes: z.string().max(1000).optional(),
  status: z.string().max(50).optional(),
  price_list: z.string().max(100).optional(),
});

// Product validation
export const productSchema = z.object({
  external_id: z.string().trim().min(1, 'Product ID is required').max(100),
  name: z.string().trim().min(1, 'Product name is required').max(200),
  long_description: z.string().max(2000).optional(),
  price: z.number().min(0, 'Price cannot be negative').max(999999.99, 'Price is too large'),
  inventory: z.number().int('Inventory must be a whole number').min(0, 'Inventory cannot be negative').max(999999, 'Inventory is too large'),
  unit_of_measure: z.string().max(50).optional(),
  category: z.string().max(100).optional(),
});

// Order validation
export const orderSchema = z.object({
  customer_name: z.string().trim().min(1, 'Customer name is required').max(100),
  customer_email: z.string().email('Invalid email address').max(255),
  total_amount: z.number().min(0, 'Amount cannot be negative').max(9999999.99, 'Amount is too large'),
  status: z.string().max(50).optional(),
  notes: z.string().max(1000).optional(),
});

// Receipt validation
export const receiptSchema = z.object({
  receipt_number: z.string().trim().min(1, 'Receipt number is required').max(100),
  amount: z.number().min(0, 'Amount cannot be negative').max(9999999.99, 'Amount is too large'),
  payment_method: z.string().trim().min(1, 'Payment method is required').max(50),
  notes: z.string().max(1000).optional(),
});
