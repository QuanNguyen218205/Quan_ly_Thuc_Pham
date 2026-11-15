import {
  Apple,
  Beef,
  Carrot,
  Flame,
  Milk,
  Package,
  Snowflake,
  Utensils,
} from 'lucide-react';

interface FoodCategoryIconProps {
  categoryId: number;
  categoryName?: string;
  size?: number;
}

export function FoodCategoryIcon({ categoryId, categoryName, size = 22 }: FoodCategoryIconProps) {
  const normalized = (categoryName ?? '').toLowerCase();

  if (categoryId === 1 || normalized.includes('rau')) {
    return <Carrot size={size} aria-hidden="true" />;
  }
  if (categoryId === 2 || normalized.includes('thịt') || normalized.includes('hải sản')) {
    return <Beef size={size} aria-hidden="true" />;
  }
  if (categoryId === 3 || normalized.includes('trứng') || normalized.includes('sữa')) {
    return <Milk size={size} aria-hidden="true" />;
  }
  if (categoryId === 4 || normalized.includes('đông lạnh')) {
    return <Snowflake size={size} aria-hidden="true" />;
  }
  if (categoryId === 5 || normalized.includes('đồ khô') || normalized.includes('đồ hộp')) {
    return <Package size={size} aria-hidden="true" />;
  }
  if (categoryId === 6 || normalized.includes('gia vị')) {
    return <Flame size={size} aria-hidden="true" />;
  }
  if (categoryId === 7 || normalized.includes('uống') || normalized.includes('trái cây')) {
    return <Apple size={size} aria-hidden="true" />;
  }
  return <Utensils size={size} aria-hidden="true" />;
}
