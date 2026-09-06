import { useState } from 'react';
import { initialPricingPlans } from '../data/pricingPlans';
import { computePlanPrice, planFeatureList } from '../lib/pricingCalc';

function formatIDR(n) {
  return 'Rp' + Number(n || 0).toLocaleString('id-ID');
}

const CURRENT_PLAN_NAME = 'Starter';

const usageStats = [
  { label: 'Events this month', used: 12, total: 15, color: 'var(--brand)' },
  { label: 'Storage used', used: 3.2, total: 10, unit: 'GB', color: 'var(--green)' },
  { label: 'Team members', used: 2, total: 3, color: 'var(--orange)' },
];

const faqItems = [
  {
    q: 'Can I change plans later?',
    a: 'Yes. You can upgrade or downgrade at any time — changes apply from your next billing cycle, and our team will help migrate your data if needed.',
  },
  {
    q: 'What happens to my data if I downgrade?',
    a: 'Your data is kept safe for 30 days after a downgrade. If you go over the lower plan’s limits (storage, modules, etc.), you’ll be asked to trim usage before the change takes effect.',
  },
  {
    q: 'Do you offer annual billing?',
    a: 'Yes, annual billing is available on Pro and Business plans at a discounted rate. Contact our sales team to switch your billing cycle.',
  },
];

export default function UpgradePage() {
  const [requestedPlanId, setRequestedPlanId] = useState(null);

  return (
    <>
      <h1 className="page-title">Upgrade Your Plan</h1>
      <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: -10, marginBottom: 22 }}>
        Unlock more modules, storage, and AI features for your team. This is a preview — reach out and our team will get your account upgraded.
      </p>

      <div className="card" style={{ marginBottom: 22 }}>
        <div className="section-title">Current Plan</div>
        <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '0 0 16px' }}>
          You&rsquo;re on the <strong style={{ color: 'var(--text)' }}>{CURRENT_PLAN_NAME}</strong> plan.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16 }}>
          {usageStats.map(s => {
            const pct = Math.min(100, Math.round((s.used / s.total) * 100));
            return (
              <div key={s.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-2)' }}>{s.label}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>
                    {s.used}{s.unit ? ` ${s.unit}` : ''} / {s.total}{s.unit ? ` ${s.unit}` : ''}
                  </span>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${pct}%`, background: s.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="upgrade-plan-grid" style={{ marginBottom: 22 }}>
        {initialPricingPlans.map(plan => {
          const price = computePlanPrice(plan);
          const features = planFeatureList(plan);
          const requested = requestedPlanId === plan.id;
          return (
            <div key={plan.id} className={`upgrade-plan-card${plan.highlighted ? ' highlighted' : ''}`}>
              {plan.highlighted && <span className="upgrade-plan-badge">Most Popular</span>}
              <div className="upgrade-plan-name">{plan.name}</div>
              <div className="upgrade-plan-desc">{plan.description}</div>
              <div className="upgrade-plan-price">
                {plan.cycle === 'custom' ? 'Custom' : formatIDR(price)}
                {plan.cycle !== 'custom' && <span>/month</span>}
              </div>
              <ul className="upgrade-plan-features">
                {features.map(f => (
                  <li key={f}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                className={`upgrade-plan-btn${plan.highlighted ? ' primary' : ''}`}
                disabled={requested}
                onClick={() => setRequestedPlanId(plan.id)}
              >
                {requested ? 'Request sent — we’ll be in touch' : plan.cycle === 'custom' ? 'Contact Sales' : `Upgrade to ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="section-title">Frequently Asked Questions</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {faqItems.map(item => (
            <div key={item.q}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{item.q}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>{item.a}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
