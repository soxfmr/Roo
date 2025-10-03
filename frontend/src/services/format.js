export function fmt(n) {
  return (Math.round((Number(n) || 0) * 100) / 100).toFixed(2);
}
