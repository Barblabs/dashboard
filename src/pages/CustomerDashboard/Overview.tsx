import { BacklogLine } from './BacklogLine'
import { HeadlineCards } from './HeadlineCards'

export function Overview() {
  return (
    <div className="flex flex-col gap-6">
      <HeadlineCards />
      <BacklogLine />
    </div>
  )
}
