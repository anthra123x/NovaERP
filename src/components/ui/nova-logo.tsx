import React from 'react'
import { cn } from '@/lib/utils'

interface NovaLogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showWordmark?: boolean
  wordmarkClassName?: string
  subtitle?: string
  logoUrl?: string | null
  businessName?: string
}

export function NovaLogo({
  className,
  size = 'md',
  showWordmark = true,
  wordmarkClassName,
  subtitle,
  logoUrl,
  businessName,
}: NovaLogoProps) {
  const heightClasses = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-10',
    xl: 'h-12',
  }

  const iconSizes = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
    xl: 'h-12 w-12',
  }

  const [imgError, setImgError] = React.useState(false)

  React.useEffect(() => {
    setImgError(false)
  }, [logoUrl])

  // Si hay un logo personalizado de empresa cargado
  if (logoUrl && !imgError) {
    return (
      <div className={cn('inline-flex items-center gap-3 select-none', className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt={businessName || 'Logo de la empresa'}
          className={cn('object-contain', heightClasses[size])}
          onError={() => setImgError(true)}
        />
        {subtitle && <span className="text-[11px] font-medium text-muted-foreground truncate">{subtitle}</span>}
      </div>
    )
  }

  // Si se solicita solo el icono
  if (!showWordmark) {
    return (
      <div className={cn('inline-flex items-center select-none', className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/nova-icon-transparent.png"
          alt="Nova ERP"
          className={cn('object-contain shrink-0', iconSizes[size])}
        />
      </div>
    )
  }

  // Logo completo con marca (Icono N + Nova en blanco + ERP en gris fino)
  return (
    <div className={cn('inline-flex items-center gap-2 select-none', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/nova-logo-transparent.png"
        alt="Nova ERP"
        className={cn('object-contain shrink-0', heightClasses[size], wordmarkClassName)}
      />
      {subtitle && <span className="text-[11px] font-medium text-muted-foreground truncate ml-1">{subtitle}</span>}
    </div>
  )
}
