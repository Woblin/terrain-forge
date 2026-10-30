import { MAT_DARKNESS_RANGE } from '../domain/mats';

/** How dark the mat is drawn, in words. */
export function matDarknessName(darkness: number): string {
  const { min, standard } = MAT_DARKNESS_RANGE;
  if (darkness === min) {
    return 'None, picture as it is';
  }
  if (darkness === standard) {
    return 'Standard';
  }
  return darkness < standard ? 'Lighter' : 'Darker';
}
