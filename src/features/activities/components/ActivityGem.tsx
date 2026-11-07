import { cn } from '@/lib/utils'
import type { ActivityStatus } from '../activityTime'

export type GemTone = ActivityStatus | 'blank'

const OUTLINE = '18,2 46,2 62,18 62,46 46,62 18,62 2,46 2,18'
const TABLE = '23,13 41,13 51,23 51,41 41,51 23,51 13,41 13,23'
/** 8 mặt vát quanh mặt bàn của kiểu cắt emerald, theo chiều kim đồng hồ từ mặt trên. */
const FACETS = [
  '18,2 46,2 41,13 23,13',
  '46,2 62,18 51,23 41,13',
  '62,18 62,46 51,41 51,23',
  '62,46 46,62 41,51 51,41',
  '46,62 18,62 23,51 41,51',
  '18,62 2,46 13,41 23,51',
  '2,46 2,18 13,23 13,41',
  '2,18 18,2 23,13 13,23',
]

const PALETTE: Record<
  ActivityStatus,
  { facets: string[]; table: string; bezel: string; numeral: string }
> = {
  upcoming: {
    facets: [
      '#17a077',
      '#0e8561',
      '#066046',
      '#044e39',
      '#033e2d',
      '#04503a',
      '#087555',
      '#129069',
    ],
    table: '#066f50',
    bezel: '#d2a661',
    numeral: 'text-vcb-gold-soft',
  },
  ongoing: {
    facets: [
      '#fbeec6',
      '#efd591',
      '#cca44c',
      '#b48f37',
      '#9c7a2b',
      '#b5913b',
      '#d7b558',
      '#f4dfa3',
    ],
    table: '#dfbd69',
    bezel: '#9c7a2b',
    numeral: 'text-vcb-ink',
  },
  past: {
    facets: [
      '#f4f1e8',
      '#ece8db',
      '#dcd7c8',
      '#d2ccbb',
      '#cac4b2',
      '#d4cebd',
      '#e0dbcd',
      '#f0ece1',
    ],
    table: '#e6e2d6',
    bezel: '#c9bfa6',
    numeral: 'text-vcb-ink/60',
  },
}

/** Số thứ tự trên viên ngọc cắt kiểu emerald — màu theo trạng thái; `blank` là khung trống chưa gắn ngọc. */
export function ActivityGem({
  tone,
  number,
  className,
}: {
  tone: GemTone
  number: string
  className?: string
}) {
  const palette = tone === 'blank' ? null : PALETTE[tone]
  return (
    <span aria-hidden className={cn('relative grid place-items-center', className)}>
      <svg viewBox="0 0 64 64" className="absolute inset-0 size-full">
        {palette ? (
          <>
            {FACETS.map((points, i) => (
              <polygon key={points} points={points} fill={palette.facets[i]} />
            ))}
            <polygon points={TABLE} fill={palette.table} />
            <polygon points="23,13 41,13 26,51 23,51 13,41 13,23" fill="#fff" opacity="0.09" />
            <polygon points={OUTLINE} fill="none" stroke={palette.bezel} strokeWidth="1.75" />
          </>
        ) : (
          <>
            <polygon points={OUTLINE} fill="#fff" fillOpacity="0.6" />
            <polygon
              points={OUTLINE}
              fill="none"
              stroke="#d2a661"
              strokeWidth="1.5"
              strokeDasharray="4 3.5"
            />
          </>
        )}
      </svg>
      <span
        className={cn(
          'relative font-serif text-[1.0625rem] leading-none @xl:text-xl @3xl:text-[1.375rem]',
          palette ? palette.numeral : 'text-vcb-bronze'
        )}
      >
        {number}
      </span>
    </span>
  )
}
