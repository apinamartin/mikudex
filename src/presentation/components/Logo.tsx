import { useState } from 'react'

type Props = {
  src?: string
  fallbackSrc?: string
  alt: string
  className?: string
}

function sourceVariants(url?: string): string[] {
  if (!url) return []
  return /\.(?:webp|png|jpe?g)$/i.test(url) ? [url] : [`${url}.webp`, `${url}.png`, `${url}.jpg`]
}

function LogoImage({ sources, alt, className }: { sources: string[]; alt: string; className: string }) {
  const [sourceIndex, setSourceIndex] = useState(0)

  if (sourceIndex >= sources.length) {
    return <span className={`${className} logo-fallback`} aria-label={alt}>✦</span>
  }

  return (
    <img
      className={className}
      src={sources[sourceIndex]}
      alt={alt}
      loading="lazy"
      onError={() => setSourceIndex(index => index + 1)}
    />
  )
}

export function Logo({ src, fallbackSrc, alt, className = '' }: Props) {
  const sources = [...sourceVariants(src), ...sourceVariants(fallbackSrc)]

  if (!sources.length) {
    return <span className={`${className} logo-fallback`} aria-label={alt}>✦</span>
  }

  return <LogoImage key={sources.join('|')} sources={sources} alt={alt} className={className} />
}
