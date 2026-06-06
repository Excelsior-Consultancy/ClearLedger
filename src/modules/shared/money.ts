export type Cents = number;

export function dollars(value: number): Cents {
  return Math.round(value * 100);
}

export function formatMoney(cents: Cents): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 2
  }).format(cents / 100);
}

export function sumMoney(values: Cents[]): Cents {
  return values.reduce((total, value) => total + value, 0);
}
