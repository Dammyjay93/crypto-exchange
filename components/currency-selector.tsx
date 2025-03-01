"use client"

import Image from "next/image"

interface CurrencySelectorProps {
  currency: string
  icon: string
  balance?: string
}

export default function CurrencySelector({ currency, icon, balance }: CurrencySelectorProps) {
  return (
    <div className="flex items-center justify-between w-full px-4 py-4 border-b border-[#353637]">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 relative">
          <Image
            src={icon}
            alt={`${currency} icon`}
            width={128}
            height={128}
            className="rounded-full w-8 h-8 object-cover"
            quality={100}
            priority
          />
        </div>
        <span className="text-white text-sm font-regular">{currency}</span>
      </div>
      {balance && (
        <div className="text-gray-300 text-xs flex flex-col items-end">
          <span>Balance</span>
          <span className="text-white">{balance}</span>
        </div>
      )}
    </div>
  )
}

