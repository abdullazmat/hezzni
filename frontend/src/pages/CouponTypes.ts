export interface Promotion {
  id: string;
  name: string;
  code: string;
  discount: string;
  discountType: 'Percentage' | 'Fixed Amount';
  discountValue: string;
  validUntil: string;
  usageCount: number;
  maxUsage: number;
  status: 'Active' | 'Expired';
  description: string;
  minOrderAmount?: string;
  eligibleServices: string[];
}
