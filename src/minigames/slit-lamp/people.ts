import type { Locale, PatientProfile, Rng } from '@core';
import { PEOPLE_HE } from './he';
import { generateAvatar } from '@render';

const NAMES_F = ['Amara Okafor', 'Lena Fischer', 'Priya Raman', 'Sofia Marquez', 'Hana Sato', 'Noor Haddad', 'Chloé Martin', 'Ines Duarte', 'Mei Lin Zhao', 'Ruth Abara'];
const NAMES_M = ['Theo Laurent', 'Kwame Mensah', 'Arjun Mehta', 'Mateo Rossi', 'Yusuf Demir', 'Owen Gallagher', 'Kenji Mori', 'Samir Aziz', 'Luca Bianchi', 'Tomasz Nowak'];
const JOBS = ['Contact-lens wearer', 'Graphic designer', 'Bus driver', 'Violinist', 'Barista', 'Student', 'Welder', 'Librarian', 'Chef', 'Nurse', 'Retired teacher', 'Carpenter'];
const TRAITS = ['Chin steady on the rest, very cooperative.', 'Blinks a lot under the bright beam.', 'Curious about the glowing slit.', 'A little nervous — keeps drifting off the headrest.'];

export function makePatient(rng: Rng, age: number, locale: Locale = 'en'): PatientProfile {
  const sex = rng.chance(0.5) ? 'F' : 'M';
  const he = locale === 'he';
  const g = sex === 'F' ? 1 : 0;
  return {
    name: rng.pick(he ? (sex === 'F' ? PEOPLE_HE.namesF : PEOPLE_HE.namesM) : sex === 'F' ? NAMES_F : NAMES_M),
    age,
    sex,
    occupation: he ? rng.pick(PEOPLE_HE.jobs)[g]! : rng.pick(JOBS),
    personality: he ? rng.pick(PEOPLE_HE.traits)[g]! : rng.pick(TRAITS),
    avatar: { ...generateAvatar(rng, { age, sex }), glasses: 'none' },
  };
}
