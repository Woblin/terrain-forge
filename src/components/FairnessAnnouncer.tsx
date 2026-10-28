import { useState } from 'react';
import { RULE_NAMES } from './fairnessRows';
import type { FairnessReport, RuleId } from '../domain/fairness';

interface FairnessAnnouncerProps {
  report: FairnessReport | null;
}

/**
 * Tells screen reader users when a balance rule starts or stops failing. It stays on the page
 * while the fairness table is folded away or on another tab, so no change goes unheard.
 */
export function FairnessAnnouncer({ report }: FairnessAnnouncerProps) {
  const [shownReport, setShownReport] = useState(report);
  const [announcement, setAnnouncement] = useState('');
  if (report !== shownReport) {
    setShownReport(report);
    setAnnouncement(describeChange(shownReport, report));
  }
  return (
    <p aria-live="polite" className="sr-only">
      {announcement}
    </p>
  );
}

/** What a screen reader hears when rules start or stop failing. */
function describeChange(before: FairnessReport | null, after: FairnessReport | null): string {
  if (before === null || after === null) {
    return '';
  }
  const label = (rule: RuleId) => `${RULE_NAMES[rule].code} ${RULE_NAMES[rule].name}`;
  const nowFailing = after.failedRules.filter((rule) => !before.failedRules.includes(rule));
  const nowPassing = before.failedRules.filter((rule) => !after.failedRules.includes(rule));
  return [
    ...nowFailing.map((rule) => `${label(rule)} now fails.`),
    ...nowPassing.map((rule) => `${label(rule)} passes again.`),
  ].join(' ');
}
