type Props = {
  totalCards: number
}

export function AppHeader({ totalCards }: Props) {
  return (
    <header className="site-header">
      <a className="wordmark" href="/" aria-label="Mikudex home">
        <span className="wordmark-icon">M</span>
        <span>MIKU<span>DEX</span></span>
      </a>

      <div className="header-right">
        <span className="save-state"><i /> SAVED LOCALLY</span>
        <a className="header-total" href="/">
          <b>{totalCards}</b>
          <span>cards owned</span>
        </a>
      </div>
    </header>
  )
}
