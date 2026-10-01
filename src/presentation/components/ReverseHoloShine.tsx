export function ReverseHoloShine() {
  return <svg className="reverse-holo-shine" viewBox="0 0 100 140" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="reverse-holo-glow" x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#ffffff" stopOpacity=".92"/>
        <stop offset=".45" stopColor="#b9f5ff" stopOpacity=".72"/>
        <stop offset="1" stopColor="#f0b5ff" stopOpacity=".52"/>
      </linearGradient>
      <filter id="reverse-holo-blur" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation=".7"/>
      </filter>
    </defs>
    <g fill="url(#reverse-holo-glow)" filter="url(#reverse-holo-blur)">
      <path d="M19 13l2.1 6.9L28 22l-6.9 2.1L19 31l-2.1-6.9L10 22l6.9-2.1z"/>
      <path d="M74 18l2.8 9.2L86 30l-9.2 2.8-2.8 9.2-2.8-9.2L62 30l9.2-2.8z"/>
      <path d="M49 49l2.4 7.6L59 59l-7.6 2.4L49 69l-2.4-7.6L39 59l7.6-2.4z"/>
      <path d="M20 87l3 9.8 9.8 3-9.8 3-3 9.8-3-9.8-9.8-3 9.8-3z"/>
      <path d="M76 95l2.1 6.9L85 104l-6.9 2.1-2.1 6.9-2.1-6.9L67 104l6.9-2.1z"/>
      <circle cx="34" cy="37" r="1.8"/><circle cx="88" cy="63" r="1.6"/><circle cx="39" cy="119" r="1.7"/><circle cx="12" cy="56" r="1.3"/>
    </g>
  </svg>
}
