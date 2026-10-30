interface AvatarProps {
  email: string | null;
  /** Size and text size classes; the top bar's small circle by default. */
  className?: string;
}

/** A seal-red badge with the first letter of the player's email, standing in for a profile photo. */
export function Avatar({ email, className = 'size-9 text-lg' }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={`bg-seal border-brass-bright text-on-seal font-display grid shrink-0 place-items-center rounded-full border-2 uppercase ${className}`}
    >
      {email?.trim().charAt(0) || '?'}
    </span>
  );
}
