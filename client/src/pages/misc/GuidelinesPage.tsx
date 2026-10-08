import { Link } from 'react-router';
import { Logo } from '../../components/layout/Logo';

const rules: [string, string][] = [
  [
    'Be a real student',
    'Use your own college account. Do not share it or create accounts for others.',
  ],
  [
    'List honestly',
    'Describe the real condition of items, use your own photos and state a fair price.',
  ],
  [
    'No prohibited items',
    'No alcohol, drugs, tobacco, weapons, counterfeit goods, exam papers or answers, or anything against college rules or the law.',
  ],
  [
    'Respect people',
    'No harassment, hate speech, spam or unwanted contact. Contact details are shared only for the deal.',
  ],
  [
    'Meet safely',
    'Meet in public campus spots (library, canteen, department lobby) during the day. Inspect items before paying. Never pay in advance to someone you have not met.',
  ],
  [
    'Rentals',
    'Agree on dates, deposit and condition in chat before handing over an item, and return items on time.',
  ],
  [
    'Report problems',
    'Use the Report button on any listing, post, comment or profile. Moderators review every report and may remove content or suspend accounts.',
  ],
];

export function GuidelinesPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Logo />
      <h1 className="mt-6 text-2xl font-bold">Community guidelines</h1>
      <p className="mt-2 text-fg-muted">
        CampusKonnect works because everyone on it is a verified student who can be trusted. These
        rules keep it that way. Breaking them can get content removed or an account suspended.
      </p>
      <ol className="mt-6 space-y-4">
        {rules.map(([title, text], i) => (
          <li key={title} className="flex gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-sm font-bold text-brand-700 dark:text-brand-300">
              {i + 1}
            </span>
            <div>
              <h2 className="font-semibold">{title}</h2>
              <p className="text-sm text-fg-muted">{text}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-8 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
        CampusKonnect connects students but is not a party to any deal. Payments and exchanges
        happen in person, at your own discretion.
      </p>
      <Link
        to="/"
        className="mt-6 inline-block text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline"
      >
        Back to CampusKonnect
      </Link>
    </div>
  );
}
