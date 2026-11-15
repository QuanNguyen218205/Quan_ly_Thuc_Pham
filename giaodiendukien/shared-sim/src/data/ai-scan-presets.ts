import { shiftIsoDate } from '../domain/calendar-date';
import type { AiScanPreset, AiScanResult } from '../domain/food-entities';

interface AiPresetBlueprint {
  preset_id: string;
  label: string;
  description: string;
  source_type: 'label' | 'receipt' | 'blurry';
  preview_badge: string;
  recognized: boolean;
  confidence: number;
  raw_ocr_lines: string[];
  suggested_template?: {
    food_name: string;
    category_id: number;
    brand: string;
    unit_id: number;
    suggested_quantity: number;
    suggested_shelf_life_days: number;
    description: string;
    suggested_location_id: number;
  };
  error_message?: string;
}

const AI_PRESET_BLUEPRINTS: AiPresetBlueprint[] = [
  {
    preset_id: 'preset-thit-ba-roi',
    label: 'Nhãn khay Thịt ba rọi MeatDeli',
    description: 'Ảnh chụp nhãn bao bì thịt mát có ngày đóng gói & HSD in rõ',
    source_type: 'label',
    preview_badge: 'Nhãn bao bì · 94%',
    recognized: true,
    confidence: 0.94,
    raw_ocr_lines: [
      'MEATDELI - THIT BA ROI HEO MAT',
      'KLT: 600g (0.6 kg)',
      'NSX: Hom nay | HSD: +4 ngay',
      'Bao quan: 0 - 4 do C',
    ],
    suggested_template: {
      food_name: 'Thịt ba rọi heo',
      category_id: 2,
      brand: 'MeatDeli',
      unit_id: 1,
      suggested_quantity: 0.6,
      suggested_shelf_life_days: 4,
      description: 'Thịt ba rọi mát đóng khay 600g (AI trích xuất từ nhãn)',
      suggested_location_id: 2,
    },
  },
  {
    preset_id: 'preset-sua-vinamilk',
    label: 'Hộp Sữa tươi tiệt trùng Vinamilk 1L',
    description: 'Ảnh mặt trước hộp sữa tươi có thương hiệu và hạn sử dụng in nắp',
    source_type: 'label',
    preview_badge: 'Nhãn hộp sữa · 97%',
    recognized: true,
    confidence: 0.97,
    raw_ocr_lines: [
      'VINAMILK 100% SUA TUOI TIET TRUNG',
      'Dung tich: 1 Lit x 2 hop',
      'HSD: +14 ngay ke tu ngay mua',
    ],
    suggested_template: {
      food_name: 'Sữa tươi thanh trùng Vinamilk',
      category_id: 3,
      brand: 'Vinamilk',
      unit_id: 6,
      suggested_quantity: 2,
      suggested_shelf_life_days: 14,
      description: 'Sữa tươi Vinamilk hộp 1 lít (AI quét nhãn hộp)',
      suggested_location_id: 1,
    },
  },
  {
    preset_id: 'preset-hoa-don-winmart',
    label: 'Hóa đơn siêu thị WinMart (Rau cải thìa)',
    description: 'Ảnh hóa đơn đi chợ liệt kê rau xanh hữu cơ mới mua',
    source_type: 'receipt',
    preview_badge: 'Hóa đơn · 86%',
    recognized: true,
    confidence: 0.86,
    raw_ocr_lines: [
      'WINMART+ HOA DON BAN LE',
      'RAU CAI THIA HUU CO WINECO   0.5 KG',
      'Ghi chu: Dung trong 5 ngay',
    ],
    suggested_template: {
      food_name: 'Rau cải thìa hữu cơ',
      category_id: 1,
      brand: 'WinEco',
      unit_id: 1,
      suggested_quantity: 0.5,
      suggested_shelf_life_days: 5,
      description: 'Rau cải thìa hữu cơ đọc từ hóa đơn siêu thị',
      suggested_location_id: 3,
    },
  },
  {
    preset_id: 'preset-blurry-receipt',
    label: 'Hóa đơn siêu thị mờ / lóa sáng',
    description: 'Mẫu kiểm thử lỗi nhận diện ảnh mờ hoặc thiếu sáng để chuyển sang nhập tay',
    source_type: 'blurry',
    preview_badge: 'Ảnh mờ · 18%',
    recognized: false,
    confidence: 0.18,
    raw_ocr_lines: [
      '*** [MO / CHAY SANG] ***',
      'Khong doc duoc ten thuc pham va han su dung',
    ],
    error_message:
      'Ảnh quá mờ hoặc bị lóa sáng — AI không thể nhận diện rõ tên thực phẩm và hạn sử dụng. Vui lòng chụp lại rõ nét hơn hoặc chuyển sang nhập tay trên biểu mẫu.',
  },
];

export function listAiScanPresets(referenceDate: string): AiScanPreset[] {
  return AI_PRESET_BLUEPRINTS.map((bp) => ({
    preset_id: bp.preset_id,
    label: bp.label,
    description: bp.description,
    source_type: bp.source_type,
    preview_badge: bp.preview_badge,
    recognized: bp.recognized,
    confidence: bp.confidence,
    raw_ocr_lines: [...bp.raw_ocr_lines],
    suggested_fields: bp.suggested_template
      ? {
          ...bp.suggested_template,
          expiry_date: shiftIsoDate(referenceDate, bp.suggested_template.suggested_shelf_life_days),
        }
      : undefined,
    error_message: bp.error_message,
  }));
}

export function runSimulatedAiScan(
  options: { preset_id?: string; file_name?: string; simulated_blur?: boolean },
  referenceDate: string,
): AiScanResult {
  const presets = listAiScanPresets(referenceDate);

  if (options.simulated_blur) {
    const blurry = presets.find((p) => !p.recognized) ?? presets[presets.length - 1];
    return {
      recognized: false,
      confidence: blurry.confidence,
      source_label: options.file_name || blurry.label,
      raw_ocr_lines: blurry.raw_ocr_lines,
      error_message: blurry.error_message,
    };
  }

  if (options.preset_id) {
    const chosen = presets.find((p) => p.preset_id === options.preset_id);
    if (chosen) {
      return {
        recognized: chosen.recognized,
        confidence: chosen.confidence,
        source_label: chosen.label,
        raw_ocr_lines: chosen.raw_ocr_lines,
        suggested_fields: chosen.suggested_fields,
        error_message: chosen.error_message,
      };
    }
  }

  const normalizedName = (options.file_name ?? '').toLowerCase();
  if (normalizedName.includes('mo') || normalizedName.includes('blur') || normalizedName.includes('fail')) {
    const blurry = presets.find((p) => !p.recognized)!;
    return {
      recognized: false,
      confidence: blurry.confidence,
      source_label: options.file_name || blurry.label,
      raw_ocr_lines: blurry.raw_ocr_lines,
      error_message: blurry.error_message,
    };
  }

  if (normalizedName.includes('sua') || normalizedName.includes('milk')) {
    const milk = presets[1];
    return {
      recognized: true,
      confidence: milk.confidence,
      source_label: options.file_name || milk.label,
      raw_ocr_lines: milk.raw_ocr_lines,
      suggested_fields: milk.suggested_fields,
    };
  }

  if (normalizedName.includes('hoa') || normalizedName.includes('receipt') || normalizedName.includes('rau')) {
    const receipt = presets[2];
    return {
      recognized: true,
      confidence: receipt.confidence,
      source_label: options.file_name || receipt.label,
      raw_ocr_lines: receipt.raw_ocr_lines,
      suggested_fields: receipt.suggested_fields,
    };
  }

  const defaultPreset = presets[0];
  return {
    recognized: defaultPreset.recognized,
    confidence: defaultPreset.confidence,
    source_label: options.file_name || defaultPreset.label,
    raw_ocr_lines: defaultPreset.raw_ocr_lines,
    suggested_fields: defaultPreset.suggested_fields,
  };
}
