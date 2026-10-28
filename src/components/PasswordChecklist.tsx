import { CheckIcon, CircleIcon, XIcon } from 'lucide-react';
import { PASSWORD_RULES } from '../domain/account';

interface PasswordChecklistProps {
  id: string;
  password: string;
  /** True once the player tried to send the form, so the rules still missing show as wrong. */
  showMissing: boolean;
}

/** The password policy as a checklist under a new password, ticked off while the player types. */
export function PasswordChecklist({ id, password, showMissing }: PasswordChecklistProps) {
  return (
    <ul id={id} aria-label="The password needs" className="mt-2 space-y-1 text-xs">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);
        const Icon = met ? CheckIcon : showMissing ? XIcon : CircleIcon;
        const tone = met ? 'text-pass' : showMissing ? 'text-fail' : 'text-muted';
        return (
          <li key={rule.id} className={`flex items-center gap-1.5 ${tone}`}>
            <Icon className={met || showMissing ? 'size-3.5' : 'size-3'} aria-hidden="true" />
            <span>
              {rule.label}
              <span className="sr-only">{met ? ': done' : ': still needed'}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
