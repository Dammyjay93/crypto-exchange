"use client"

import { useState, ChangeEvent, useRef, useEffect } from "react"
import { ArrowLeftRight, Check, Loader2 } from "lucide-react"
import { LuBadgeInfo } from "react-icons/lu"
import { Button } from "@/components/ui/button"
import CurrencySelector from "@/components/currency-selector"
import NumberFlow from "@number-flow/react"
import { isNumericInput, isWithinBalance, ERROR_MESSAGES } from "@/utils/input-validation"
import { motion, AnimatePresence } from "framer-motion"

// Currency config with all relevant data in one place
const CURRENCIES = {
  ETH: {
    name: "Ethereum",
    symbol: "ETH",
    icon: "/crypto-icons/eth.png",
    balance: 2.98,
    precision: 4
  },
  USDT: {
    name: "USDT",
    symbol: "USDT",
    icon: "/crypto-icons/usdt.png",
    balance: 10000,
    precision: 2
  }
}

// Exchange rates defined as a single source of truth
const RATES = {
  ETH_TO_USDT: 2184.33,
  USDT_TO_ETH: 1 / 2184.33
}

// Type for exchange direction
type ExchangeDirection = "SEND" | "RECEIVE"
type CurrencyKey = keyof typeof CURRENCIES

// Calculate transaction time based on transaction value
const calculateTransactionMinutes = (value: number): number => {
  // Base time is 10 minutes
  const baseTime = 10
  
  // Add random variation based on value (higher values take longer)
  // Scale factor determines how much the value affects the time
  const scaleFactor = 0.05
  const valueEffect = value * scaleFactor
  
  // Add some randomness (±30%)
  const randomFactor = 0.7 + (Math.random() * 0.6)
  
  // Calculate final time (between 5 and 30 minutes)
  return Math.max(5, Math.min(30, Math.round((baseTime + valueEffect) * randomFactor)))
}

// Format number with commas for thousands
const formatNumberWithCommas = (value: string, precision: number = 4): string => {
  if (!value) return ""
  
  // Remove any existing commas and split by decimal point
  const parts = value.replace(/,/g, '').split('.')
  
  // Format the integer part with commas
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  
  // Join with decimal part if it exists
  return parts.length > 1 
    ? `${parts[0]}.${parts[1].slice(0, precision)}` 
    : parts[0]
}

export default function CryptoExchange() {
  // Raw values (without formatting)
  const [sendAmount, setSendAmount] = useState("1.00")
  const [receiveAmount, setReceiveAmount] = useState("2184.33")
  const [sendCurrency, setSendCurrency] = useState<CurrencyKey>("ETH")
  const [receiveCurrency, setReceiveCurrency] = useState<CurrencyKey>("USDT")
  const [sendError, setSendError] = useState("")
  const [receiveError, setReceiveError] = useState("")
  const [focused, setFocused] = useState<ExchangeDirection | null>(null)
  const [transactionMinutes, setTransactionMinutes] = useState(15)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const receiveInputRef = useRef<HTMLInputElement>(null)
  
  // Error tracking for shake animation
  const [sendErrorCount, setSendErrorCount] = useState(0)
  const [receiveErrorCount, setReceiveErrorCount] = useState(0)
  const [shakeSendError, setShakeSendError] = useState(false)
  const [shakeReceiveError, setShakeReceiveError] = useState(false)
  
  // Previous error messages to compare
  const prevSendErrorRef = useRef("")
  const prevReceiveErrorRef = useRef("")

  // Derived formatted values
  const formattedSendAmount = formatNumberWithCommas(
    sendAmount, 
    CURRENCIES[sendCurrency].precision
  )
  
  const formattedReceiveAmount = formatNumberWithCommas(
    receiveAmount, 
    CURRENCIES[receiveCurrency].precision
  )

  // Calculate exchange amount
  const calculateExchangeAmount = (
    amount: string,
    fromCurrency: CurrencyKey, 
    toCurrency: CurrencyKey
  ): string => {
    if (!amount) return ""
    
    const numAmount = Number.parseFloat(amount)
    if (isNaN(numAmount)) return ""
    
    // Determine the correct rate to use
    const rate = fromCurrency === "ETH" && toCurrency === "USDT" 
      ? RATES.ETH_TO_USDT 
      : fromCurrency === "USDT" && toCurrency === "ETH" 
        ? RATES.USDT_TO_ETH 
        : 1
    
    // Calculate and format to the correct precision
    return (numAmount * rate).toFixed(CURRENCIES[toCurrency].precision)
  }

  // Validate input based on currency
  const validateAmount = (amount: string, currency: CurrencyKey): string => {
    if (!isNumericInput(amount)) return ERROR_MESSAGES.NUMBERS_ONLY
    
    if (amount && !isWithinBalance(amount, CURRENCIES[currency].balance)) {
      return currency === "ETH" ? ERROR_MESSAGES.INSUFFICIENT_ETH : ERROR_MESSAGES.INSUFFICIENT_USDT
    }
    
    return ""
  }

  // Update transaction minutes based on current values
  const updateTransactionMinutes = (sendVal: string, receiveVal: string) => {
    const sendUsdVal = sendCurrency === "USDT" 
      ? Number.parseFloat(sendVal || "0") 
      : Number.parseFloat(sendVal || "0") * RATES.ETH_TO_USDT
      
    const receiveUsdVal = receiveCurrency === "USDT" 
      ? Number.parseFloat(receiveVal || "0") 
      : Number.parseFloat(receiveVal || "0") * RATES.ETH_TO_USDT
      
    const transactionValue = Math.max(sendUsdVal, receiveUsdVal)
    setTransactionMinutes(calculateTransactionMinutes(transactionValue))
  }

  const handleSendAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    // Get the raw value without commas
    const rawValue = e.target.value.replace(/,/g, '')
    
    // Validate input with raw value
    const error = validateAmount(rawValue, sendCurrency)
    
    // Check if it's the same error as before
    if (error && error === prevSendErrorRef.current) {
      setSendErrorCount(prev => prev + 1)
      // Trigger shake on 3rd consecutive error of the same type
      if (sendErrorCount >= 2) {
        setShakeSendError(true)
        // Reset shake after animation completes
        setTimeout(() => setShakeSendError(false), 500)
      }
    } else {
      // Reset counter for new error type
      setSendErrorCount(0)
    }
    
    // Update error state and ref
    setSendError(error)
    prevSendErrorRef.current = error
    
    // Only update if no format errors
    if (error !== ERROR_MESSAGES.NUMBERS_ONLY) {
      setSendAmount(rawValue)
      
      // Calculate receive amount regardless of balance error
      const newReceiveAmount = calculateExchangeAmount(rawValue, sendCurrency, receiveCurrency)
      setReceiveAmount(newReceiveAmount)
      setReceiveError("")
      prevReceiveErrorRef.current = ""
      setReceiveErrorCount(0)
      
      // Update transaction minutes
      updateTransactionMinutes(rawValue, newReceiveAmount)
    }
  }

  const handleReceiveAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    // Get the raw value without commas
    const rawValue = e.target.value.replace(/,/g, '')
    
    // Validate the format first with raw value
    if (!isNumericInput(rawValue)) {
      const error = ERROR_MESSAGES.NUMBERS_ONLY
      
      // Check if it's the same error as before
      if (error === prevReceiveErrorRef.current) {
        setReceiveErrorCount(prev => prev + 1)
        // Trigger shake on 3rd consecutive error of the same type
        if (receiveErrorCount >= 2) {
          setShakeReceiveError(true)
          // Reset shake after animation completes
          setTimeout(() => setShakeReceiveError(false), 500)
        }
      } else {
        // Reset counter for new error type
        setReceiveErrorCount(0)
      }
      
      setReceiveError(error)
      prevReceiveErrorRef.current = error
      return
    }
    
    setReceiveAmount(rawValue)
    setReceiveError("")
    prevReceiveErrorRef.current = ""
    setReceiveErrorCount(0)
    
    if (rawValue) {
      // Calculate what would be needed to send
      const calculatedSendAmount = calculateExchangeAmount(rawValue, receiveCurrency, sendCurrency)
      
      // Check if we have enough to send
      const sendError = validateAmount(calculatedSendAmount, sendCurrency)
      
      // Check if it's the same error as before
      if (sendError && sendError === prevSendErrorRef.current) {
        setSendErrorCount(prev => prev + 1)
        // Trigger shake on 3rd consecutive error of the same type
        if (sendErrorCount >= 2) {
          setShakeSendError(true)
          // Reset shake after animation completes
          setTimeout(() => setShakeSendError(false), 500)
        }
      } else {
        // Reset counter for new error type
        setSendErrorCount(0)
      }
      
      setSendError(sendError)
      prevSendErrorRef.current = sendError
      setSendAmount(calculatedSendAmount)
      
      // Update transaction minutes
      updateTransactionMinutes(calculatedSendAmount, rawValue)
    } else {
      setSendAmount("")
      setSendError("")
      prevSendErrorRef.current = ""
      setSendErrorCount(0)
      
      // Update transaction minutes with zero values
      updateTransactionMinutes("0", "0")
    }
  }

  const handleSwap = () => {
    // Only prevent swap if there are format errors (not balance errors)
    if ((sendError === ERROR_MESSAGES.NUMBERS_ONLY) || (receiveError === ERROR_MESSAGES.NUMBERS_ONLY)) return

    // Store the values before swapping
    const newSendAmount = receiveAmount
    const newSendCurrency = receiveCurrency
    const newReceiveAmount = sendAmount
    const newReceiveCurrency = sendCurrency
    
    // Update state with swapped values
    setSendAmount(newSendAmount)
    setReceiveAmount(newReceiveAmount)
    setSendCurrency(newSendCurrency)
    setReceiveCurrency(newReceiveCurrency)
    
    // Validate the new send amount immediately
    const newSendError = validateAmount(newSendAmount, newSendCurrency)
    setSendError(newSendError)
    
    // Clear receive error
    setReceiveError("")
    
    // Update transaction minutes with the new values
    updateTransactionMinutes(newSendAmount, newReceiveAmount)
  }

  const handleConfirm = () => {
    setIsLoading(true)
    
    // Simulate API call with timeout
    setTimeout(() => {
      console.log("Confirming exchange:", {
        send: { amount: sendAmount, currency: CURRENCIES[sendCurrency].name },
        receive: { amount: receiveAmount, currency: CURRENCIES[receiveCurrency].name }
      })
      
      setIsLoading(false)
      setIsSuccess(true)
    }, 2000)
  }

  // Input focus management
  const handleInputFocus = (direction: ExchangeDirection) => setFocused(direction)
  const handleInputBlur = () => setFocused(null)

  // USD equivalent calculations
  const sendUsdValue = sendCurrency === "USDT" 
    ? Number.parseFloat(sendAmount || "0") 
    : Number.parseFloat(sendAmount || "0") * RATES.ETH_TO_USDT
    
  const receiveUsdValue = receiveCurrency === "USDT" 
    ? Number.parseFloat(receiveAmount || "0") 
    : Number.parseFloat(receiveAmount || "0") * RATES.ETH_TO_USDT
    
  const currentRate = sendCurrency === "ETH" 
    ? RATES.ETH_TO_USDT 
    : 1/RATES.USDT_TO_ETH
  
  // Initialize transaction minutes on first render
  useEffect(() => {
    updateTransactionMinutes(sendAmount, receiveAmount)
  }, [])

  // Validate send amount whenever it or the currency changes
  useEffect(() => {
    if (sendAmount) {
      const error = validateAmount(sendAmount, sendCurrency)
      
      // Only update error state if it's different to avoid triggering shake
      if (error !== sendError) {
        setSendError(error)
        prevSendErrorRef.current = error
        setSendErrorCount(0)
      }
    }
  }, [sendAmount, sendCurrency])

  // Validate when currencies or receive amount changes
  useEffect(() => {
    // Skip validation during initial render
    const isInitialRender = receiveAmount === "2184.33" && sendAmount === "1.00"
    if (isInitialRender) return
    
    if (receiveAmount) {
      // Calculate what would be needed to send
      const calculatedSendAmount = calculateExchangeAmount(receiveAmount, receiveCurrency, sendCurrency)
      
      // Only update error, not the actual send amount to prevent loops
      const newSendError = validateAmount(calculatedSendAmount, sendCurrency)
      
      // Only update error state if it's different to avoid triggering shake
      if (newSendError !== sendError) {
        setSendError(newSendError)
        prevSendErrorRef.current = newSendError
        setSendErrorCount(0)
      }
    }
  }, [receiveAmount, receiveCurrency, sendCurrency]);

  // Shake animation variants
  const shakeAnimation = {
    shake: {
      x: [0, -5, 5, -5, 5, -3, 3, -2, 2, 0],
      transition: { duration: 0.5 }
    }
  }

  // Success message component
  const SuccessMessage = () => (
    <motion.div 
      className="w-full max-w-xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bg-[#26282B] rounded-3xl p-2 relative shadow-2xl min-h-[350px] flex flex-col items-center justify-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="bg-[#2D2F32] border border-[#353637] rounded-full p-4 mb-6 relative overflow-hidden before:absolute before:inset-0 before:bg-swap-button-gradient before:rounded-full before:opacity-100"
        >
          <Check className="text-white h-8 w-8 relative z-[1]" />
        </motion.div>
        
        <motion.h2 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="text-white text-2xl font-medium mb-2"
        >
          Transaction Submitted
        </motion.h2>
        
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          className="text-gray-400 text-center mb-6 px-4"
        >
          <p className="mb-1">You've exchanged {formattedSendAmount} {CURRENCIES[sendCurrency].symbol} for {formattedReceiveAmount} {CURRENCIES[receiveCurrency].symbol}</p>
          <p>Estimated completion: ~{transactionMinutes} minutes</p>
        </motion.div>
        
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        >
          <Button
            onClick={() => {
              setIsSuccess(false)
              setSendAmount("1.00")
              setReceiveAmount(calculateExchangeAmount("1.00", sendCurrency, receiveCurrency))
            }}
            className="bg-[#2D2F32] border border-[#353637] text-white rounded-2xl px-6 py-2.5 text-sm relative overflow-hidden group before:absolute before:inset-0 before:bg-swap-button-gradient before:opacity-100 hover:before:opacity-0 before:transition-opacity before:duration-200 shadow-[inset_0px_-1px_2px_0px_rgba(255,255,255,0.08),inset_0px_-2px_0px_0px_rgba(0,0,0,0.3),inset_0px_1px_0px_0px_rgba(255,255,255,0.1),0px_20px_5px_0px_rgba(0,0,0,0),0px_13px_5px_0px_rgba(0,0,0,0.02),0px_7px_4px_0px_rgba(0,0,0,0.07),0px_3px_3px_0px_rgba(0,0,0,0.13),0px_1px_2px_0px_rgba(0,0,0,0.15)]"
          >
            <span className="relative z-[1]">New Exchange</span>
          </Button>
        </motion.div>
      </div>
    </motion.div>
  )

  return (
    <div className="w-full max-w-xl mx-auto">
      <AnimatePresence mode="wait">
        {isSuccess ? (
          <SuccessMessage key="success" />
        ) : (
          <motion.div 
            key="exchange"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-[#26282B] rounded-3xl p-2 relative shadow-2xl"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 relative min-h-[200px]">
              {/* Send Section */}
              <div className="bg-[#2D2F32] border border-[#353637] rounded-2xl flex flex-col gap-4 h-full">
                <CurrencySelector 
                  currency={CURRENCIES[sendCurrency].name} 
                  icon={CURRENCIES[sendCurrency].icon}
                  balance={`${CURRENCIES[sendCurrency].balance} ${CURRENCIES[sendCurrency].symbol}`}
                />

                <div className="pl-6 pr-4 pb-4 flex flex-col">
                  <div className="text-gray-400 text-xs mb-1">Send</div>
                  <input
                    type="text"
                    value={formattedSendAmount}
                    onChange={handleSendAmountChange}
                    onFocus={() => handleInputFocus("SEND")}
                    onBlur={handleInputBlur}
                    className="w-full bg-transparent text-white text-4xl font-regular focus:outline-none"
                    placeholder="0.00"
                    style={{ height: '56px' }}
                  />
                  <div className="flex flex-col mt-1 min-h-[36px]">
                    <div className="text-gray-400 text-xs">~$
                      <NumberFlow 
                        value={sendUsdValue} 
                        format={{ maximumFractionDigits: 2 }}
                      />
                    </div>
                    <div className="h-[18px]">
                      {sendError && (
                        <motion.div 
                          className="text-red-500 text-xs mt-0.5"
                          animate={shakeSendError ? "shake" : "idle"}
                          variants={shakeAnimation}
                        >
                          {sendError}
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Receive Section */}
              <div className="bg-[#2D2F32] border border-[#353637] rounded-2xl flex flex-col gap-4 h-full">
                <CurrencySelector 
                  currency={CURRENCIES[receiveCurrency].name} 
                  icon={CURRENCIES[receiveCurrency].icon}
                />

                <div className="pl-6 pr-4 pb-4 flex flex-col">
                  <div className="text-gray-400 text-xs mb-1">Receive</div>
                  <div className="relative" style={{ height: '56px' }}>
                    {/* Always keep NumberFlow in DOM, just control opacity */}
                    <div 
                      className={`w-full text-white text-4xl font-regular cursor-text absolute inset-0 transition-opacity duration-100 overflow-hidden text-ellipsis ${focused === "RECEIVE" ? "opacity-0 pointer-events-none" : "opacity-100"}`}
                      onClick={() => receiveInputRef.current?.focus()}
                    >
                      <NumberFlow 
                        value={Number.parseFloat(receiveAmount || "0")} 
                        format={{ maximumFractionDigits: CURRENCIES[receiveCurrency].precision }}
                      />
                    </div>
                    
                    {/* Always keep input in DOM, just control opacity */}
                    <input
                      ref={receiveInputRef}
                      type="text"
                      value={formattedReceiveAmount}
                      onChange={handleReceiveAmountChange}
                      onFocus={() => handleInputFocus("RECEIVE")}
                      onBlur={handleInputBlur}
                      className={`w-full bg-transparent text-white text-4xl font-regular focus:outline-none absolute inset-0 transition-opacity duration-100 overflow-hidden text-ellipsis ${focused === "RECEIVE" ? "opacity-100" : "opacity-0"}`}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex flex-col mt-1 min-h-[36px]">
                    <div className="text-gray-400 text-xs">~$
                      <NumberFlow 
                        value={receiveUsdValue} 
                        format={{ maximumFractionDigits: 2 }}
                      />
                    </div>
                    <div className="h-[18px]">
                      {receiveError && (
                        <motion.div 
                          className="text-red-500 text-xs mt-0.5"
                          animate={shakeReceiveError ? "shake" : "idle"}
                          variants={shakeAnimation}
                        >
                          {receiveError}
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Swap Button in the middle */}
              <div className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[35%] z-10">
                <div 
                  onClick={handleSwap}
                  className="
                    bg-[#2D2F32] 
                    border 
                    border-[#353637] 
                    p-2.5 
                    rounded-full 
                    hover:bg-[#2D2F32] 
                    transition-all
                    duration-200 
                    cursor-pointer
                    shadow-swap-button
                    relative
                    overflow-hidden
                    group
                    before:absolute
                    before:inset-0
                    before:bg-swap-button-gradient
                    before:rounded-full
                    before:opacity-100
                    hover:before:opacity-0
                    before:transition-opacity
                    before:duration-200
                  ">
                  <ArrowLeftRight className="text-white h-4 w-4 relative z-[1]" />
                </div>
              </div>
            </div>

            {/* Exchange Rate Info */}
            <div className="mt-2 ml-1 flex justify-between items-center">
              <div className="flex items-center text-gray-400 text-xs">
                <LuBadgeInfo className="h-4 w-4" />
                <span className="ml-2">
                  1 {CURRENCIES[sendCurrency].symbol} = <span className="text-white">
                    <NumberFlow 
                      value={currentRate} 
                      format={{ maximumFractionDigits: 2 }}
                      suffix={` ${CURRENCIES[receiveCurrency].symbol}`}
                    />
                  </span>
                  <br />Transaction fee (<span className="text-white">~
                    <NumberFlow 
                      value={transactionMinutes}
                      suffix="mins"
                    />
                  </span>): <span className="text-white">0.5%</span>
                </span>
              </div>

              <Button
                onClick={handleConfirm}
                disabled={!!sendError || !!receiveError || isLoading}
                className={`bg-[#2D2F32] border border-[#353637] text-white rounded-2xl px-6 py-2.5 text-sm relative overflow-hidden group before:absolute before:inset-0 before:bg-swap-button-gradient before:opacity-100 hover:before:opacity-0 before:transition-opacity before:duration-200 shadow-[inset_0px_-1px_2px_0px_rgba(255,255,255,0.08),inset_0px_-2px_0px_0px_rgba(0,0,0,0.3),inset_0px_1px_0px_0px_rgba(255,255,255,0.1),0px_20px_5px_0px_rgba(0,0,0,0),0px_13px_5px_0px_rgba(0,0,0,0.02),0px_7px_4px_0px_rgba(0,0,0,0.07),0px_3px_3px_0px_rgba(0,0,0,0.13),0px_1px_2px_0px_rgba(0,0,0,0.15)] ${(sendError || receiveError) ? 'opacity-100 cursor-not-allowed' : ''}`}
              >
                <span className="relative z-[1] flex items-center">
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Confirm"
                  )}
                </span>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}


