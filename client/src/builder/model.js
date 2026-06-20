import { newId } from '../lib/ids.js';
import { COMPONENTS } from './components.jsx';

/** Create a fresh instance of a component. */
export function createInstance(component) {
  const def = COMPONENTS[component];
  if (!def) throw new Error(`Unknown component: ${component}`);
  return {
    id: newId('i'),
    component,
    label: def.label,
    children: [],
    props: { ...(def.defaultProps || {}) },
  };
}

/** Find the id of the instance whose children include `childId`. */
export function findParentId(instances, childId) {
  for (const inst of Object.values(instances)) {
    if (inst.children?.includes(childId)) return inst.id;
  }
  return null;
}

/** Collect an instance id and all of its descendants. */
export function collectSubtree(instances, id, acc = []) {
  acc.push(id);
  const inst = instances[id];
  if (inst?.children) for (const c of inst.children) collectSubtree(instances, c, acc);
  return acc;
}

/** Is `maybeAncestor` an ancestor of (or equal to) `id`? Prevents dropping a node into itself. */
export function isAncestor(instances, maybeAncestor, id) {
  return collectSubtree(instances, maybeAncestor).includes(id);
}

/** Serialize a subtree (instances + styles) for copy/paste. */
export function snapshotSubtree(project, id) {
  const instances = {};
  const styles = {};
  const walk = (i) => {
    const inst = project.instances[i];
    if (!inst) return;
    instances[i] = { ...inst, props: { ...inst.props }, children: [...inst.children] };
    styles[i] = JSON.parse(JSON.stringify(project.styles[i] || {}));
    inst.children.forEach(walk);
  };
  walk(id);
  return { rootId: id, instances, styles };
}

/** A starter project: Body > Section > [Heading, Text, Button]. */
export function defaultProject(name = 'My Site') {
  const body = createInstance('Body');
  const section = createInstance('Section');
  const heading = createInstance('Heading');
  const text = createInstance('Text');
  const button = createInstance('Button');

  heading.props.text = 'Build something great';
  text.props.text = 'Edit this text, drag in components from the left, and style everything visually — real HTML, real CSS.';
  button.props.text = 'Get started';

  body.children = [section.id];
  section.children = [heading.id, text.id, button.id];

  const instances = {
    [body.id]: body,
    [section.id]: section,
    [heading.id]: heading,
    [text.id]: text,
    [button.id]: button,
  };

  const styles = {
    [body.id]: { base: { ...COMPONENTS.Body.defaultStyle } },
    [section.id]: { base: { ...COMPONENTS.Section.defaultStyle, 'padding-top': '72px', 'padding-bottom': '72px', gap: '20px' } },
    [heading.id]: { base: { ...COMPONENTS.Heading.defaultStyle, 'font-size': '48px' } },
    [text.id]: { base: { ...COMPONENTS.Text.defaultStyle, 'font-size': '18px', 'max-width': '560px', color: '#4b5563' } },
    [button.id]: { base: { ...COMPONENTS.Button.defaultStyle, 'align-self': 'flex-start' } },
  };

  return {
    id: newId('proj'),
    name,
    pages: [{ id: newId('page'), name: 'Home', rootId: body.id }],
    instances,
    styles,
  };
}
