import React from 'react'

export default function SearchInput({ value, onChange, placeholder }) {
    return (
        <div className="relative">
            <input
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="bg-surface-container-lowest text-on-surface-container-lowest placeholder:text-slate-400 border border-outline focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
        </div>
    )
}