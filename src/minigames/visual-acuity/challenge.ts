/**
 * Practice-mode recognition challenges with a short teaching explanation.
 * Pure (seeded rng) and unit-tested.
 */
import { pickStrings, type Eye, type Locale, type PatientFindings, type Rng } from '@core';
import { formatFeet, formatLogmar2, formatMetric, lowVisionLevel, metricFor, snellenFeet } from './notation';
import { pinholeLogmar } from './optics';
import { PINHOLE_INDICATED, pinholeVerdict } from './report';
import { S } from './strings';

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

export function acuityChallenge(f: PatientFindings, rng: Rng, locale: Locale = 'en'): Challenge {
  const t = pickStrings(S, locale);
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
      prompt: t.chLogmarPrompt(eye, feet), options, answer,
      explain: t.chLogmarExplain(feet, correct),
    };
  }
  if (type === 'metric') {
    const correct = metricFor(feet);
    const near = [feet * 2, feet / 2, feet * 1.25, feet / 1.25].map((d) => metricFor(snellenFeet(Math.log10(d / 20))));
    const { options, answer } = shuffleWithAnswer(rng, correct, rng.shuffle([...new Set(near)]));
    return {
      prompt: t.chMetricPrompt(eye, feet), options, answer,
      explain: t.chMetricExplain(feet, correct),
    };
  }
  if (type === 'driving') {
    const better = Math.min(f.va.OD.uncorrected, f.va.OS.uncorrected);
    const meets = better <= 0.3 + 1e-9;
    const options = t.chDrivingOptions;
    return {
      prompt: t.chDrivingPrompt, options, answer: meets ? 0 : 1,
      explain: t.chDrivingExplain(formatFeet(better), formatMetric(better), meets),
    };
  }
  return {
    prompt: t.chNextPrompt(eye, formatFeet(v)), options: t.chNextOptions, answer: 0,
    explain: t.chNextExplain,
  };
}

export function pinholeChallenge(f: PatientFindings, locale: Locale = 'en'): Challenge {
  const t = pickStrings(S, locale);
  const eye = worseEye(f);
  const sc = f.va[eye].uncorrected;
  if (sc <= PINHOLE_INDICATED) {
    return {
      prompt: t.chPhNoneNeededPrompt,
      options: t.chPhNoneNeededOptions,
      answer: 0,
      explain: t.chPhNoneNeededExplain,
    };
  }
  const ph = pinholeLogmar(f, eye);
  const improves = pinholeVerdict(f, eye) === 'improves';
  return {
    prompt: t.chPhPrompt(eye, formatFeet(sc), formatFeet(ph)),
    options: t.chPhOptions,
    answer: improves ? 0 : 1,
    explain: improves ? t.chPhExplainImproves : t.chPhExplainNi,
  };
}
