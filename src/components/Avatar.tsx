interface AvatarProps {
  email: string | null;
  /** Size and text size classes; the top bar's small circle by default. */
  className?: string;
}

/** A round badge with the first letter of the player's email, standing in for a profile photo. */
export function Avatar({ email, className = 'size-9 text-sm' }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full bg-linear-to-br from-sky-400 to-indigo-500 font-semibold text-white uppercase ${className}`}
    >
      {email?.trim().charAt(0) || '?'}
    </span>
  );
}
