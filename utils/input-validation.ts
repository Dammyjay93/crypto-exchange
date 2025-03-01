/**
 * Validates if a value contains only numbers and at most one decimal point
 * @param value - The string value to validate
 * @returns boolean indicating if the value is numeric
 */
export const isNumericInput = (value: string): boolean => {
  // Allow empty string
  if (!value) return true
  // Check for valid number format (numbers and single decimal point)
  return /^\d*\.?\d*$/.test(value)
}

/**
 * Validates if a sending amount is within available balance
 * @param amount - The amount to be sent
 * @param maxBalance - The available balance
 * @returns boolean indicating if the amount can be sent
 */
export const isWithinBalance = (amount: string, maxBalance: number): boolean => {
  if (!amount) return true
  const numValue = Number.parseFloat(amount)
  return !isNaN(numValue) && numValue <= maxBalance && numValue > 0
}

export const ERROR_MESSAGES = {
  NUMBERS_ONLY: "Please enter numbers only",
  INSUFFICIENT_ETH: "Insufficient ETH balance",
  INSUFFICIENT_USDT: "Insufficient USDT balance"
} as const 