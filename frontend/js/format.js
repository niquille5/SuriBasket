export function formatCurrency(value) {
  const amount = Number(value);

  if (Number.isNaN(amount)) {
    return "SRD 0,00";
  }

  const formattedAmount = new Intl.NumberFormat("nl-SR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);

  return "SRD " + formattedAmount;
}

export function getPackageText(item) {
  if (item.package_label) {
    return item.package_label;
  }

  return [item.weight, item.unit].filter(Boolean).join(" ") || "stuk";
}
