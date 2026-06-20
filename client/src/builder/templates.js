import { createInstance } from './model.js';
import { COMPONENTS } from './components.jsx';

/** Build a paste-snapshot from a nested spec { component, props, style, children }. */
function build(spec) {
  const instances = {};
  const styles = {};
  const make = (s) => {
    const inst = createInstance(s.component);
    if (s.props) Object.assign(inst.props, s.props);
    if (s.label) inst.label = s.label;
    styles[inst.id] = { base: { ...(COMPONENTS[s.component].defaultStyle || {}), ...(s.style || {}) } };
    inst.children = (s.children || []).map(make);
    instances[inst.id] = inst;
    return inst.id;
  };
  const rootId = make(spec);
  return { rootId, instances, styles };
}

const card = (title, body) => ({
  component: 'Card',
  style: { 'flex-grow': '1', 'flex-basis': '0%', gap: '8px' },
  children: [
    { component: 'Heading', props: { text: title }, style: { 'font-size': '20px', 'font-weight': '700', 'margin-top': '0px', 'margin-bottom': '0px' } },
    { component: 'Text', props: { text: body }, style: { color: '#6b7280', 'margin-top': '0px', 'margin-bottom': '0px' } },
  ],
});

const SPECS = {
  Navbar: {
    label: 'Navbar',
    component: 'Section',
    style: { 'flex-direction': 'row', 'align-items': 'center', 'justify-content': 'space-between', 'padding-top': '18px', 'padding-bottom': '18px', 'padding-left': '40px', 'padding-right': '40px', 'background-color': '#ffffff', 'border-bottom-width': '1px', 'border-bottom-style': 'solid', 'border-color': '#e5e7eb' },
    children: [
      { component: 'Heading', props: { text: 'Brand' }, style: { 'font-size': '22px', 'font-weight': '800', 'margin-top': '0px', 'margin-bottom': '0px' } },
      { component: 'Button', props: { text: 'Sign in' }, style: { 'background-color': '#111827', color: '#ffffff', 'padding-top': '8px', 'padding-bottom': '8px', 'padding-left': '16px', 'padding-right': '16px', 'border-radius': '8px', 'border-style': 'none' } },
    ],
  },
  Hero: {
    label: 'Hero',
    component: 'Section',
    style: { 'padding-top': '96px', 'padding-bottom': '96px', 'padding-left': '64px', 'padding-right': '64px', gap: '20px', 'align-items': 'center', 'background-color': '#0b1020' },
    children: [
      { component: 'Heading', props: { text: 'Build something amazing' }, style: { 'font-size': '56px', 'font-weight': '800', color: '#ffffff', 'text-align': 'center', 'max-width': '760px', 'margin-top': '0px', 'margin-bottom': '0px' } },
      { component: 'Text', props: { text: 'A modern landing page, designed visually in minutes.' }, style: { 'font-size': '20px', color: 'rgba(255,255,255,0.7)', 'text-align': 'center', 'max-width': '560px', 'margin-top': '0px', 'margin-bottom': '0px' } },
      { component: 'Button', props: { text: 'Get started' }, style: { 'background-color': '#4f46e5', color: '#ffffff', 'padding-top': '14px', 'padding-bottom': '14px', 'padding-left': '28px', 'padding-right': '28px', 'border-radius': '10px', 'font-size': '16px', 'font-weight': '700', 'border-style': 'none' } },
    ],
  },
  Features: {
    label: 'Features',
    component: 'Section',
    style: { 'padding-top': '80px', 'padding-bottom': '80px', 'padding-left': '64px', 'padding-right': '64px', gap: '40px', 'align-items': 'center' },
    children: [
      { component: 'Heading', props: { text: 'Why choose us' }, style: { 'font-size': '36px', 'font-weight': '700', 'text-align': 'center', 'margin-top': '0px', 'margin-bottom': '0px' } },
      { component: 'Columns', style: { gap: '24px', 'align-items': 'stretch', width: '100%', 'max-width': '1000px' }, children: [card('Fast', 'Lightning quick to build and ship.'), card('Flexible', 'Style anything, pixel by pixel.'), card('Simple', 'No code required at all.')] },
    ],
  },
  CTA: {
    label: 'Call to action',
    component: 'Section',
    style: { 'padding-top': '72px', 'padding-bottom': '72px', 'padding-left': '64px', 'padding-right': '64px', 'align-items': 'center', gap: '16px', 'background-color': '#4f46e5' },
    children: [
      { component: 'Heading', props: { text: 'Ready to start?' }, style: { color: '#ffffff', 'font-size': '36px', 'text-align': 'center', 'margin-top': '0px', 'margin-bottom': '0px' } },
      { component: 'Button', props: { text: 'Sign up free' }, style: { 'background-color': '#ffffff', color: '#4f46e5', 'padding-top': '14px', 'padding-bottom': '14px', 'padding-left': '28px', 'padding-right': '28px', 'border-radius': '10px', 'font-weight': '700', 'border-style': 'none' } },
    ],
  },
  Footer: {
    label: 'Footer',
    component: 'Section',
    style: { 'padding-top': '48px', 'padding-bottom': '48px', 'padding-left': '64px', 'padding-right': '64px', 'background-color': '#0b1020', gap: '8px', 'align-items': 'center' },
    children: [{ component: 'Text', props: { text: '© 2026 Your Company. All rights reserved.' }, style: { color: 'rgba(255,255,255,0.6)', 'margin-top': '0px', 'margin-bottom': '0px' } }],
  },
};

export const TEMPLATES = Object.values(SPECS).map((spec) => ({ label: spec.label, build: () => build(spec) }));
