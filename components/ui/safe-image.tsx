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
        className={cn(fallbackClassName, className)}
        role="img"
        aria-label={alt || "image unavailable"}
      >
        {fallbackContent}
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
