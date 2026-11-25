import { BacklogLine } from './BacklogLine'
import { ComingBackSoon } from './ComingBackSoon'
import { HeadlineCards } from './HeadlineCards'
import { StartHere } from './StartHere'

export function Overview() {
  return (
    <div className="flex flex-col gap-6">
      <HeadlineCards />
      <BacklogLine />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <StartHere />
        <ComingBackSoon />
      </div>
    </div>
  )
}
