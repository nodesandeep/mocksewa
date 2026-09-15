"use client";
import React from "react";

export default function BrandName({ className = "", light = false }) {
  return (
    <span
      className={`font-black tracking-tighter inline-flex items-center ${className}`}
    >
      <span className={`${light ? "text-blue-400" : "text-[#1E3A8A]"}`}>
        my
      </span>
      <span
        className={`${light ? "text-red-500" : "text-[#C41E24]"}`}
        style={{ fontSize: "1.1em" }}
      >
        MOCK
      </span>
      <span className={`${light ? "text-blue-400" : "text-[#1E3A8A]"}`}>
        sewa
      </span>
    </span>
  );
}
