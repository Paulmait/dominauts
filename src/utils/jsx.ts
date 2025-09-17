export function h(tag: string | Function, props: any, ...children: any[]) {
  if (typeof tag === 'function') {
    return tag({ ...props, children });
  }

  const element = document.createElement(tag);

  if (props) {
    Object.keys(props).forEach(key => {
      if (key === 'className') {
        element.className = props[key];
      } else if (key === 'onClick' || key.startsWith('on')) {
        const eventName = key.substring(2).toLowerCase();
        element.addEventListener(eventName, props[key]);
      } else if (key === 'style' && typeof props[key] === 'object') {
        Object.assign(element.style, props[key]);
      } else {
        element.setAttribute(key, props[key]);
      }
    });
  }

  children.flat().forEach(child => {
    if (child != null) {
      element.appendChild(
        typeof child === 'string' || typeof child === 'number'
          ? document.createTextNode(String(child))
          : child
      );
    }
  });

  return element;
}

export const Fragment = ({ children }: { children: any[] }) => {
  const fragment = document.createDocumentFragment();
  children.flat().forEach(child => {
    if (child != null) {
      fragment.appendChild(
        typeof child === 'string' || typeof child === 'number'
          ? document.createTextNode(String(child))
          : child
      );
    }
  });
  return fragment;
};