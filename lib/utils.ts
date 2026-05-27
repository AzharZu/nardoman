import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function range(length: number) {
  return Array.from({ length }, (_, index) => index);
}

export function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

export function randomPick<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

