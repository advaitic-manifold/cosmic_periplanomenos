import { useState } from 'react';

// Stage descriptions explain what each stage IS. No numbers are shown: real outputs are [REAL DATA REQUIRED].
const STAGES = [
  ['Raw observation', 'The calibrated image as ingested (FITS header, units, WCS status recorded).'],
  ['Preprocessing', 'Quality control, masking, background and noise estimation before any model sees the data.'],
  ['CNN features', 'Convolutional feature maps summarizing local morphology.'],
  ['Transformer attention', 'Attention maps showing which regions the model weighs for a given patch.'],
  ['Feature fusion', 'Combining feature families into one representation (ablated against each family alone).'],
  ['Anomaly analysis', 'Label-free atypicality scoring; scores are statistical atypicality, not validated classes.'],
  ['Scientific interpretation', 'Findings stated only as far as the evidence reaches; failed checks reported.'],
] as const;

export default function Pipeline() {
  const [i, setI] = useState(0);
  return (
    <div>
      <div role="group" aria-label="Pipeline stage" style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
        {STAGES.map(([name], k) => (
          <button key={name} aria-pressed={k === i} onClick={() => setI(k)}>{k + 1}. {name}</button>
        ))}
      </div>
      <div className="panel" aria-live="polite" style={{ marginTop: '1.5rem' }}>
        <h2 style={{ margin: 0 }}>{STAGES[i][0]}</h2>
        <p>{STAGES[i][1]}</p>
        <div role="img" aria-label="Placeholder for stage output" style={{ border: '1px dashed #b79cff', aspectRatio: '16/7', display: 'grid', placeItems: 'center' }} className="mono">
          DEMONSTRATION PLACEHOLDER — [REAL DATA REQUIRED]
        </div>
      </div>
    </div>
  );
}
