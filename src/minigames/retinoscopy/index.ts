import { h, render } from 'preact';
import type { MiniGameModule } from '@core';
import { Game } from './Game';
import { makeScenario } from './practice';
import { report } from './report';
import './retinoscopy.css';

const retinoscopy: MiniGameModule = {
  id: 'retinoscopy',
  title: 'Retinoscopy',
  instructions: 'Sweep the streak across the pupil: with-motion needs plus, against-motion needs minus. Neutralise each principal meridian, then subtract the working distance.',
  icon: '◐',
  teaches: [
    'With motion means add plus; against motion means add minus (SPAM)',
    'Near neutrality the reflex is brighter, wider and faster; at neutrality the pupil fills at once',
    'In astigmatism the reflex breaks away from the streak unless you sweep a principal meridian',
    'Net Rx = gross neutralising lens minus the working-distance lens (67 cm = +1.50 D)',
    'Scissoring suggests keratoconus; a dull reflex points to a media opacity; no reflex means a dense opacity',
  ],
  text: {
    he: {
      title: 'רטינוסקופיה',
      instructions: 'סורקים עם הפס על פני האישון: תנועה עם הפס — צריך פלוס, תנועה נגד הפס — צריך מינוס. מנטרלים כל מרידיאן ראשי ואז מפחיתים את מרחק העבודה.',
      teaches: [
        'עם התנועה — מוסיפים פלוס; נגד התנועה — מוסיפים מינוס (SPAM: עם ← פלוס, נגד ← מינוס)',
        'קרוב לניטרול הרפלקס בהיר, רחב ומהיר יותר; בניטרול כל האישון מוצף בבת אחת',
        'באסטיגמטיזם הרפלקס נשבר ויוצא מהפס, אלא אם סורקים לאורך מרידיאן ראשי',
        'Rx נטו = עדשת הניטרול (ברוטו) פחות עדשת מרחק העבודה (67 ס״מ = +1.50 D)',
        'רפלקס מספריים מרמז על קרטוקונוס; רפלקס עמום — עכירות במדיה; אין רפלקס — עכירות צפופה',
      ],
    },
  },
  mount(host, ctx, done) {
    let called = false;
    const once: typeof done = (r) => {
      if (called) return;
      called = true;
      done(r);
    };
    host.classList.add('rt-host');
    render(h(Game, { ctx, done: once }), host);
    return () => {
      render(null, host);
      host.classList.remove('rt-host');
    };
  },
  report: (findings, patient) => report(findings, patient),
  practice: (rng, difficulty) => makeScenario(rng, difficulty),
};

export default retinoscopy;
