import { XIcon } from 'lucide-react';
import { IconButton } from './IconButton';

interface BoardNoticeProps {
  notice: string;
  onDismiss: () => void;
}

/** A message about the board, such as a link that could not be opened, until it is dismissed. */
export function BoardNotice({ notice, onDismiss }: BoardNoticeProps) {
  return (
    <div
      role="alert"
      className="border-warn-line bg-warn-soft text-warn-ink shadow-shade flex items-start gap-2 rounded-sm border py-1 pr-1 pl-3 text-sm shadow-lg"
    >
      <p className="flex-1 py-1.5">{notice}</p>
      <IconButton icon={XIcon} label="Dismiss" onClick={onDismiss} />
    </div>
  );
}
