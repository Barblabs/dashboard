const SIZES = {
  sm: 'text-[1.1875rem] leading-[1.2]',
  lg: 'text-[2rem] leading-[1.2]',
}

interface Props {
  size?: keyof typeof SIZES
  /** The surface it sits on: "BARB" turns white on the navy panels and navy on light ones. */
  background?: 'dark' | 'light'
}

export function Wordmark({ size = 'sm', background = 'dark' }: Props) {
  return (
    <span className={`font-title whitespace-nowrap ${SIZES[size]}`}>
      <span className={background === 'dark' ? 'text-white' : 'text-navy'}>BARB</span>
      <span className="text-cyan">ATTACK</span>
    </span>
  )
}
