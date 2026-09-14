import { Camera, Plus } from "lucide-react";

/**
 * 照片格子的樣式，照原型：物品照片是 64px 的格子配加號，耗材照片是 56px 配相機。
 * 已存檔的照片（PhotoField）與新增時暫存的照片（StagedPhotoField）共用
 */
export const PHOTO_VARIANT = {
  item: {
    tile: "h-16 w-16",
    iconSize: 20,
    AddIcon: Plus,
    addExtra: "bg-surface",
    viewTitle: "物品照片",
  },
  log: {
    tile: "h-14 w-14",
    iconSize: 18,
    AddIcon: Camera,
    addExtra: "",
    viewTitle: "耗材照片",
  },
} as const;

export type PhotoVariant = keyof typeof PHOTO_VARIANT;
