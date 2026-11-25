import type { PatientProfile, Rng } from '@core';
import { generateAvatar } from '@render';

const NAMES_F = ['Amara Okafor', 'Lena Fischer', 'Priya Raman', 'Sofia Marquez', 'Hana Sato', 'Noor Haddad', 'Chloé Martin', 'Ines Duarte', 'Mei Lin Zhao', 'Ruth Abara'];
const NAMES_M = ['Theo Laurent', 'Kwame Mensah', 'Arjun Mehta', 'Mateo Rossi', 'Yusuf Demir', 'Owen Gallagher', 'Kenji Mori', 'Samir Aziz', 'Luca Bianchi', 'Tomasz Nowak'];
const JOBS = ['Contact-lens wearer', 'Graphic designer', 'Bus driver', 'Violinist', 'Barista', 'Student', 'Welder', 'Librarian', 'Chef', 'Nurse', 'Retired teacher', 'Carpenter'];
const TRAITS = ['Chin steady on the rest, very cooperative.', 'Blinks a lot under the bright beam.', 'Curious about the glowing slit.', 'A little nervous — keeps drifting off the headrest.'];

export function makePatient(rng: Rng, age: number): PatientProfile {
  const sex = rng.chance(0.5) ? 'F' : 'M';
  return {
    name: rng.pick(sex === 'F' ? NAMES_F : NAMES_M),
    age,
    sex,
    occupation: rng.pick(JOBS),
    personality: rng.pick(TRAITS),
    avatar: { ...generateAvatar(rng, { age, sex }), glasses: 'none' },
  };
}
