import { Icon } from "@/components/icons";
import { MESSAGE_RULE } from "@/lib/friend-view";

/** Wide screens: the empty pane beside the list until a conversation is chosen. Phones show only the list. */
export default function FriendsPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
      <span aria-hidden className="grid size-14 place-items-center rounded-full bg-fill text-muted"><Icon name="friends" size={26} /></span>
      <p className="m-0 text-[17px] font-semibold">Your messages</p>
      <p className="m-0 max-w-[300px] text-[14px] text-muted">Choose a friend to message. {MESSAGE_RULE}</p>
    </div>
  );
}
