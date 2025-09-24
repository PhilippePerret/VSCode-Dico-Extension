export const listen = function(element: HTMLElement, evType: keyof HTMLElementEventMap, method: (this: HTMLElement, ev: HTMLElementEventMap[typeof evType]) => any): void {
 element.addEventListener(evType, method); 
};

export const stopEvent = function(ev: any): false {
  ev.preventDefault();
  ev.stopImmediatePropagation();
  return false;
};