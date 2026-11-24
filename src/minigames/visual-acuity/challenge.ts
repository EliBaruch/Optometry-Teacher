/**
 * Practice-mode recognition challenges with a short teaching explanation.
 * Pure (seeded rng) and unit-tested.
 */
import type { Eye, PatientFindings, Rng } from '@core';
import { formatFeet, formatLogmar2, formatMetric, lowVisionLevel, metricFor, snellenFeet } from './notation';
import { pinholeLogmar } from './optics';
import { PINHOLE_INDICATED, pinholeVerdict } from './report';

export interface Challenge {
  prompt: string;
  options: string[];
  answer: number;
  explain: string;
}

function shuffleWithAnswer(rng: Rng, correct: string, distractors: string[]): { options: string[]; answer: number } {
  const options = rng.shuffle([correct, ...distractors.filter((d) => d !== correct).slice(0, 3)]);
  return { options, answer: options.indexOf(correct) };
}

function worseEye(f: PatientFindings): Eye {
  return f.va.OD.uncorrected >= f.va.OS.uncorrected ? 'OD' : 'OS';
}

export function acuityChallenge(f: PatientFindings, rng: Rng): Challenge {
  const eye = worseEye(f);
  const v = f.va[eye].uncorrected;
  const onChart = lowVisionLevel(v) === null;
  const types: ('logmar' | 'metric' | 'driving' | 'next')[] = onChart ? ['logmar', 'metric', 'driving'] : ['driving'];
  if (v > PINHOLE_INDICATED) types.push('next');
  const type = rng.pick(types);
  const feet = snellenFeet(v);

  if (type === 'logmar') {
    const lm = Math.round(Math.log10(feet / 20) * 10) / 10;
    const correct = formatLogmar2(lm);
    const opts = [lm + 0.2, lm - 0.2, lm + 0.4, lm - 0.1, lm + 0.1].map((x) => formatLogmar2(Math.round(x * 10) / 10));
    const { options, answer } = shuffleWithAnswer(rng, correct, rng.shuffle(opts));
    return {
      prompt: `${eye} read 20/${feet}. What is that in logMAR?`, options, answer,
      explain: `logMAR = log₁₀(MAR) = log₁₀(${feet}/20) ≈ ${correct}. Every line is 0.1 logMAR and every ETDRS letter 0.02 — 20/20 is 0.0, 20/200 is 1.0.`,
    };
  }
  if (type === 'metric') {
    const correct = metricFor(feet);
    const near = [feet * 2, feet / 2, feet * 1.25, feet / 1.25].map((d) => metricFor(snellenFeet(Math.log10(d / 20))));
    const { options, answer } = shuffleWithAnswer(rng, correct, rng.shuffle([...new Set(near)]));
    return {
      prompt: `${eye} read 20/${feet}. How is that written in metres?`, options, answer,
      explain: `The test distance is 6 m ≈ 20 ft, so scale the fraction: 20/${feet} = ${correct}. Same angle, different units.`,
    };
  }
  if (type === 'driving') {
    const better = Math.min(f.va.OD.uncorrected, f.va.OS.uncorrected);
    const meets = better <= 0.3 + 1e-9;
    const options = ['Yes — the better eye sees 20/40 or better', 'No — the better eye is worse than 20/40'];
    return {
      prompt: `Without glasses, does this patient meet the common 20/40 driving standard?`, options, answer: meets ? 0 : 1,
      explain: `The better eye reads ${formatFeet(better)} (${formatMetric(better)}). Most US states ask for 20/40 in the better eye — ${meets ? 'met, uncorrected.' : 'they must drive corrected (and be refracted).'} Legal blindness is 20/200 or worse in the better eye.`,
    };
  }
  const options = ['Pinhole acuity', 'Colour vision plates', 'Repeat with both eyes open', 'Tonometry'];
  return {
    prompt: `${eye} is reduced (${formatFeet(v)}). What quick test best separates refractive blur from disease?`, options, answer: 0,
    explain: 'A pinhole narrows the beam to its central ray, cutting defocus blur. Improvement suggests a refractive cause; no improvement (NI) points to media, macula or optic nerve.',
  };
}

export function pinholeChallenge(f: PatientFindings): Challenge {
  const eye = worseEye(f);
  const sc = f.va[eye].uncorrected;
  if (sc <= PINHOLE_INDICATED) {
    return {
      prompt: 'Both eyes already saw 20/25 or better. What did the pinhole add?',
      options: ['Nothing — there was no deficit to explain', 'It proves macular disease', 'It proves myopia'],
      answer: 0,
      explain: 'Pinhole testing is only informative when acuity is reduced. With 20/20–20/25 vision there is nothing for it to clear.',
    };
  }
  const ph = pinholeLogmar(f, eye);
  const improves = pinholeVerdict(f, eye) === 'improves';
  return {
    prompt: `${eye}: ${formatFeet(sc)} → pinhole ${formatFeet(ph)}. The reduced vision is most likely…`,
    options: ['Refractive — glasses should restore it', 'Pathology — media, macula or nerve'],
    answer: improves ? 0 : 1,
    explain: improves
      ? 'A gain of two lines or more with the pinhole means defocus is the main culprit: refract and expect good best-corrected acuity.'
      : 'The pinhole cancels defocus, so blur that persists comes from something optics can’t fix — cataract, macula or optic nerve. Examine and investigate.',
  };
}
