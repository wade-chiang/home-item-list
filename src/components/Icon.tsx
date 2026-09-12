import {
  AirVent,
  ArrowLeftRight,
  Bath,
  BedDouble,
  BedSingle,
  Blocks,
  BookOpen,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CookingPot,
  Droplets,
  Fan,
  Flame,
  GripVertical,
  House,
  Image,
  List,
  type LucideIcon,
  Monitor,
  Moon,
  Package,
  Pause,
  Pencil,
  Play,
  Plus,
  Settings,
  SlidersHorizontal,
  Sofa,
  Sun,
  Trash,
  Utensils,
  WashingMachine,
  Wind,
  X,
} from "lucide-react";

// 位置與類別的 icon。名稱照 docs/prototype/p0.html 的精選清單，資料庫存的就是這些名稱。
// 36 個名稱都已確認存在於 lucide-react 1.45.0。
const ICONS: Partial<Record<string, LucideIcon>> = {
  sofa: Sofa,
  utensils: Utensils,
  "cooking-pot": CookingPot,
  "bed-double": BedDouble,
  "bed-single": BedSingle,
  blocks: Blocks,
  "book-open": BookOpen,
  bath: Bath,
  sun: Sun,
  "air-vent": AirVent,
  droplets: Droplets,
  package: Package,
  wind: Wind,
  fan: Fan,
  flame: Flame,
  "washing-machine": WashingMachine,
  plus: Plus,
  check: Check,
  x: X,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  "chevron-down": ChevronDown,
  settings: Settings,
  house: House,
  list: List,
  camera: Camera,
  image: Image,
  pause: Pause,
  play: Play,
  trash: Trash,
  pencil: Pencil,
  "grip-vertical": GripVertical,
  moon: Moon,
  monitor: Monitor,
  "sliders-horizontal": SlidersHorizontal,
  "arrow-left-right": ArrowLeftRight,
};

type Props = {
  name: string;
  size?: number;
  strokeWidth?: number;
};

/** 原型的 ic() 預設是 size 20、線條粗細 1.75 */
function Icon({ name, size = 20, strokeWidth = 1.75 }: Props) {
  // 資料庫裡的名稱不在清單中時（例如手動改過）用 Package 代替，不讓整頁壞掉
  const Component = ICONS[name] ?? Package;
  return <Component size={size} strokeWidth={strokeWidth} aria-hidden />;
}

export default Icon;
