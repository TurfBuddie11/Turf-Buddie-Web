"use client";

import { useState } from "react";
import Image, { ImageProps } from "next/image";
import { cn } from "@/lib/utils";

interface SafeImageProps extends Omit<ImageProps, "onError"> {
  fallbackClassName?: string;
  fallbackContent?: React.ReactNode;
}

export function SafeImage({
  src,
  alt,
  className,
  fallbackClassName,
  fallbackContent,
  ...rest
}: SafeImageProps) {
  const [errored, setErrored] = useState(false);
  const hasSrc = Boolean(src && src !== "");

  if (!hasSrc || errored) {
    return (
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br from-green-700 via-green-600 to-emerald-500 flex items-center justify-center",
          fallbackClassName,
          className,
        )}
        role="img"
        aria-label={alt}
      >
        {fallbackContent ?? (
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
        )}
      </div>
    );
  }

  return (
    <Image
      src={src as string}
      alt={alt}
      className={className}
      onError={() => setErrored(true)}
      {...rest}
    />
  );
}
