import React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";
import SecureImage from "./secure-image";

interface SecureAvatarProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> {
  fileId?: string;
  imageUrl?: string;
  fallbackText?: string;
  size?: number;
  quality?: number;
  lazy?: boolean;
}

const SecureAvatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  SecureAvatarProps
>(({ 
  className, 
  fileId, 
  imageUrl, 
  fallbackText, 
  size = 40, 
  quality = 80,
  lazy = true,
  ...props 
}, ref) => {
  const [imageError, setImageError] = React.useState(false);

  return (
    <AvatarPrimitive.Root
      ref={ref}
      className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)}
      style={{ width: size, height: size }}
      {...props}
    >
      {(fileId || imageUrl) && !imageError ? (
        <SecureImage
          fileId={fileId}
          imageUrl={imageUrl}
          thumbnail={true}
          size={size}
          quality={quality}
          lazy={lazy}
          alt="Profile"
          className="aspect-square h-full w-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <AvatarPrimitive.Fallback
          className="flex h-full w-full items-center justify-center rounded-full bg-muted text-sm font-medium"
        >
          {fallbackText || "U"}
        </AvatarPrimitive.Fallback>
      )}
    </AvatarPrimitive.Root>
  );
});

SecureAvatar.displayName = "SecureAvatar";

export { SecureAvatar };
