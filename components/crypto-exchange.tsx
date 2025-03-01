"use client"

import { useState, ChangeEvent } from "react"
import { ArrowLeftRight } from "lucide-react"
import { LuBadgeInfo } from "react-icons/lu"
import { Button } from "@/components/ui/button"
import CurrencySelector from "@/components/currency-selector"
import Image from "next/image"
import type { StaticImageData } from "next/image"
import { isNumericInput, isWithinBalance, ERROR_MESSAGES } from "@/utils/input-validation"

// Define crypto icon paths
const ethIcon = "/crypto-icons/eth.png"
const usdtIcon = "/crypto-icons/usdt.png"

interface CurrencySelectorProps {
  currency: string
  setCurrency?: (currency: string) => void
  icon: string
  balance?: string
}

export default function CryptoExchange() {
  const [sendAmount, setSendAmount] = useState("1.00")
  const [receiveAmount, setReceiveAmount] = useState("2184.33")
  const [sendCurrency, setSendCurrency] = useState("Ethereum")
  const [receiveCurrency, setReceiveCurrency] = useState("USDT")
  const [sendIcon, setSendIcon] = useState(ethIcon)
  const [receiveIcon, setReceiveIcon] = useState(usdtIcon)
  const [sendError, setSendError] = useState("")
  const [receiveError, setReceiveError] = useState("")

  const ethPrice = 2184.33 // Price of 1 ETH in USD
  const usdtToEthRate = 0.00046 // 1 USDT = 0.00046 ETH (1/2184.33)
  const maxEthBalance = 2.98 // ETH balance

  const handleSendAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    
    if (!isNumericInput(value)) {
      setSendError(ERROR_MESSAGES.NUMBERS_ONLY)
      return
    }

    if (value && !isWithinBalance(value, maxEthBalance)) {
      setSendError(ERROR_MESSAGES.INSUFFICIENT_ETH)
      return
    }
    
    setSendError("")
    setSendAmount(value)
    
    if (value) {
      const ethAmount = Number.parseFloat(value)
      setReceiveAmount((ethAmount * ethPrice).toFixed(4))
    } else {
      setReceiveAmount("")
    }
  }

  const handleReceiveAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    
    if (!isNumericInput(value)) {
      setReceiveError(ERROR_MESSAGES.NUMBERS_ONLY)
      return
    }
    
    setReceiveError("")
    setReceiveAmount(value)
    
    if (value) {
      const usdtAmount = Number.parseFloat(value)
      const calculatedSendAmount = (usdtAmount * usdtToEthRate).toFixed(4)
      
      // Only validate the amount we're sending
      if (!isWithinBalance(calculatedSendAmount, maxEthBalance)) {
        setSendError(ERROR_MESSAGES.INSUFFICIENT_ETH)
        setSendAmount(calculatedSendAmount) // Still show the amount that would be needed
      } else {
        setSendError("")
        setSendAmount(calculatedSendAmount)
      }
    } else {
      setSendAmount("")
      setSendError("")
    }
  }

  const handleSwap = () => {
    // Only allow swap if there are no errors
    if (sendError || receiveError) return

    const tempAmount = sendAmount
    const tempCurrency = sendCurrency
    const tempIcon = sendIcon
    
    setSendAmount(receiveAmount)
    setReceiveAmount(tempAmount)
    setSendCurrency(receiveCurrency)
    setReceiveCurrency(tempCurrency)
    setSendIcon(receiveIcon)
    setReceiveIcon(tempIcon)
  }

  const handleConfirm = () => {
    // Here you would typically handle the actual exchange transaction
    console.log("Confirming exchange:", {
      send: { amount: sendAmount, currency: sendCurrency },
      receive: { amount: receiveAmount, currency: receiveCurrency }
    })
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="bg-[#26282B] rounded-3xl p-2 relative shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 relative min-h-[200px]">
          {/* Send Section */}
          <div className="bg-[#2D2F32] border border-[#353637] rounded-2xl flex flex-col gap-4 h-full">
            <CurrencySelector 
              currency={sendCurrency} 
              icon={sendIcon}
              balance={`${maxEthBalance} ETH`}
            />

            <div className="pl-6 pr-4 pb-4 flex flex-col">
              <div className="text-gray-400 text-xs mb-1">Send</div>
              <input
                type="text"
                value={sendAmount}
                onChange={handleSendAmountChange}
                className="w-full bg-transparent text-white text-4xl font-regular focus:outline-none"
                placeholder="0.00"
              />
              <div className="flex flex-col gap-1">
                <div className="text-gray-400 text-xs">~${(Number.parseFloat(sendAmount || "0") * ethPrice).toFixed(2)}</div>
                {sendError && <div className="text-red-500 text-xs">{sendError}</div>}
              </div>
            </div>
          </div>

          {/* Receive Section */}
          <div className="bg-[#2D2F32] border border-[#353637] rounded-2xl flex flex-col gap-4 h-full">
            <CurrencySelector 
              currency={receiveCurrency} 
              icon={receiveIcon}
            />

            <div className="pl-6 pr-4 pb-4 flex flex-col">
              <div className="text-gray-400 text-xs mb-1">Receive</div>
              <input
                type="text"
                value={receiveAmount}
                onChange={handleReceiveAmountChange}
                className="w-full bg-transparent text-white text-4xl font-regular focus:outline-none"
                placeholder="0.00"
              />
              <div className="flex flex-col gap-1">
                <div className="text-gray-400 text-xs">~${receiveAmount || "0"}</div>
                {receiveError && <div className="text-red-500 text-xs">{receiveError}</div>}
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
              1 ETH = <span className="text-white">2,184.33 USDT</span>
              <br />Transaction fee (<span className="text-white">~15mins</span>): <span className="text-white">0.5%</span>
            </span>
          </div>

          <Button
            onClick={handleConfirm}
            disabled={!!sendError || !!receiveError}
            className={`bg-[#2D2F32] border border-[#353637] text-white rounded-2xl px-6 py-2.5 text-sm relative overflow-hidden group before:absolute before:inset-0 before:bg-swap-button-gradient before:opacity-100 hover:before:opacity-0 before:transition-opacity before:duration-200 shadow-[inset_0px_-1px_2px_0px_rgba(255,255,255,0.08),inset_0px_-2px_0px_0px_rgba(0,0,0,0.3),inset_0px_1px_0px_0px_rgba(255,255,255,0.1),0px_20px_5px_0px_rgba(0,0,0,0),0px_13px_5px_0px_rgba(0,0,0,0.02),0px_7px_4px_0px_rgba(0,0,0,0.07),0px_3px_3px_0px_rgba(0,0,0,0.13),0px_1px_2px_0px_rgba(0,0,0,0.15)] ${(sendError || receiveError) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className="relative z-[1]">Confirm</span>
          </Button>
        </div>
      </div>
    </div>
  )
}


