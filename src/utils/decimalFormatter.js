// src/utils/decimalFormatter.js
import BigNumber from "bignumber.js";

export function formatDecimal(value, fixedDecimalPlaces = 5) {
  if (value === null || value === undefined || isNaN(value) || value === "") {
    return "";
  }
  const num = new BigNumber(value);

  // Format to the fixed number of decimal places
  const formattedValue = num.toFixed(fixedDecimalPlaces);

  // Add commas for thousands separators
  const parts = formattedValue.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  // Remove unnecessary trailing zeros and the decimal point if there are no decimal places
  const trimmedValue = parts
    .join(".")
    .replace(/(\.\d*?[1-9])0+$/, "$1")
    .replace(/\.0*$/, "");

  return trimmedValue;
}
