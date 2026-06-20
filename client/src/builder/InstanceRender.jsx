import { lazy, Suspense } from 'react';
import { COMPONENTS, ICON_SET } from './components.jsx';

// Lazy so three.js only loads when a 3D element is present.
const ThreeBox = lazy(() => import('./ThreeBox.jsx'));

/**
 * Recursively render an instance as a real HTML element inside the iframe.
 * Styling comes entirely from the generated stylesheet via the data-ws-id
 * selector — no inline styles — so it matches the exported output exactly.
 */
export function InstanceRender({ id, instances }) {
  const inst = instances[id];
  if (!inst) return null;
  const def = COMPONENTS[inst.component];
  if (!def) return null;
  const Tag = def.tag;
  const common = { 'data-ws-id': id };

  switch (inst.component) {
    case 'Image':
      return <img {...common} src={inst.props.src || undefined} alt={inst.props.alt || ''} />;
    case 'Divider':
      return <hr {...common} />;
    case 'Spacer':
      return <div {...common} />;
    case 'Input':
      return <input {...common} placeholder={inst.props.placeholder || ''} readOnly />;
    case 'Textarea':
      return <textarea {...common} placeholder={inst.props.placeholder || ''} readOnly />;
    case 'Icon': {
      const Ico = ICON_SET[inst.props.iconName] || ICON_SET.Star;
      return (
        <Tag {...common}>
          <Ico style={{ width: '100%', height: '100%' }} />
        </Tag>
      );
    }
    case '3D':
      return (
        <Tag {...common}>
          <Suspense fallback={null}>
            <ThreeBox config={inst.props} />
          </Suspense>
        </Tag>
      );
    default:
      break;
  }

  if (def.container) {
    return (
      <Tag {...common}>
        {inst.children.map((childId) => (
          <InstanceRender key={childId} id={childId} instances={instances} />
        ))}
      </Tag>
    );
  }

  // text-bearing leaf (Heading, Text, Quote, Link, Button)
  const extra = {};
  if (inst.component === 'Link') extra.href = inst.props.href || undefined;
  if (inst.component === 'Button') extra.type = 'button';
  return (
    <Tag {...common} {...extra}>
      {inst.props.text}
    </Tag>
  );
}
