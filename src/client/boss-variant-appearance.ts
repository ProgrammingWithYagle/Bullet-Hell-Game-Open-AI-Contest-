export function bossVariantAppearance(variant: string, alive = true) {
  return variant === 'brutal' && alive
    ? { tint: 0xffaaa0, ring: 0xd86458, ringAlpha: 0.8, marks: 4 }
    : { tint: 0xffffff, ring: 0, ringAlpha: 0, marks: 0 };
}
