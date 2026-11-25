import { BacklogLine } from './BacklogLine'
import { ClosesPanel } from './ClosesPanel'
import { ComingBackSoon } from './ComingBackSoon'
import { HeadlineCards } from './HeadlineCards'
import { StartHere } from './StartHere'

export function Overview() {
  return (
    <div className="flex flex-col gap-6">
      <HeadlineCards />
      <div className="grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
        <BacklogLine />
        <ClosesPanel />
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <StartHere />
        <ComingBackSoon />
      </div>
    </div>
  )
}
