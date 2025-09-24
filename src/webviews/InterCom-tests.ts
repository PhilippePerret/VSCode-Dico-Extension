// Common TypeScript for all panels
import { Entry } from './models/Entry';
import { Oeuvre } from './models/Oeuvre';
import { Exemple } from './models/Exemple';


type CommonClassItem = typeof Entry | typeof Oeuvre | typeof Exemple;

// Retourne la classe d'element en fonction du panneau
// P.e. 'entries' => Entry (typeof CommonClassItem)
function ItemClass(panelId: string): CommonClassItem | undefined {
  switch(panelId) {
    case 'entries':
      return Entry;
    case 'oeuvres':
      return Oeuvre;
    case 'exemples':
      return Exemple;
  }
}
// VSCode API
interface VSCodeAPI {
  postMessage: (msg: any) => void;
  getState: () => any;
  setState: (state: any) => void;
}
declare function acquireVsCodeApi(): VSCodeAPI;
export const vscode = acquireVsCodeApi();

// Types pour les messages
interface Message {
  command: string;
  [key: string]: any;
}

interface ElementData {
  tagName: string;
  textContent: string;
  classList: string[];
  id: string;
  exists: boolean;
}

// Système de messages pour les tests DOM
window.addEventListener('message', (event: MessageEvent<Message>) => {
  const message = event.data;

  switch (message.command) {
    case 'queryDOM':
      queryDOMObject(message);
      break;
    case 'queryDOMAll':
      handleQueryDOMAll(message);
      break;
    case 'queryDOMVisible':
      handleQueryDOMVisible(message);
      break;
    case 'typeInElement':
      handleTypeInElement(message);
      break;
    case 'clearAndTypeInElement':
      handleClearAndTypeInElement(message);
      break;
    case 'clearElement':
      handleClearElement(message);
      break;
    case 'getElementFromParent':
      handleGetElementFromParent(message);
      break;
    case 'executeScript':
      handleExecuteScript(message);
      break;
    case 'updateContent':
      const targetElement = document.querySelector(message.target);
      if (targetElement) {
        targetElement.innerHTML = message.content;
      }
      break;
  }
});
// Fonction générique pour peup
function queryDOMObject(message: Message): void {
  const element = document.querySelector(message.selector);

  // Construire un objet simplifié de l'élément pour les tests
  let elementData: ElementData | null = null;
  if (element) {
    elementData = {
      tagName: element.tagName.toLowerCase(),
      textContent: element.textContent || '',
      classList: Array.from(element.classList),
      id: element.id,
      exists: true
    };
  }

  // Répondre à l'extension
  vscode.postMessage({
    command: 'domQueryResult',
    selector: message.selector,
    element: elementData
  });
}

// Helper function to create element data object
function createElementData(element: Element): ElementData {
  return {
    tagName: element.tagName.toLowerCase(),
    textContent: element.textContent || '',
    classList: Array.from(element.classList),
    id: element.id,
    exists: true
  };
}

// Handler for queryDOMAll - returns array of all matching elements
function handleQueryDOMAll(message: Message): void {
  const elements = document.querySelectorAll(message.params.selector);
  const elementsData = Array.from(elements).map(createElementData);
  
  vscode.postMessage({
    command: 'queryDOMAllResult',
    params: message.params,
    result: elementsData
  });
}

// Handler for queryDOMVisible - returns array of visible elements
function handleQueryDOMVisible(message: Message): void {
  const elements = document.querySelectorAll(message.params.selector);
  const visibleElements = Array.from(elements).filter(element => {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  });
  const elementsData = visibleElements.map(createElementData);
  
  vscode.postMessage({
    command: 'queryDOMVisibleResult',
    params: message.params,
    result: elementsData
  });
}

// Handler for typeInElement - types text in an input element
function handleTypeInElement(message: Message): void {
  const element = document.querySelector(message.params.selector) as HTMLInputElement | HTMLTextAreaElement;
  if (element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) {
    element.value += message.params.text;
    // Trigger input event for reactive behavior
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }
  
  vscode.postMessage({
    command: 'typeInElementResult',
    params: message.params,
    result: null
  });
}

// Handler for clearAndTypeInElement - clears then types text
function handleClearAndTypeInElement(message: Message): void {
  const element = document.querySelector(message.params.selector) as HTMLInputElement | HTMLTextAreaElement;
  if (element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) {
    element.value = message.params.text;
    // Trigger input event for reactive behavior
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }
  
  vscode.postMessage({
    command: 'clearAndTypeInElementResult',
    params: message.params,
    result: null
  });
}

// Handler for clearElement - clears an input element
function handleClearElement(message: Message): void {
  const element = document.querySelector(message.params.selector) as HTMLInputElement | HTMLTextAreaElement;
  if (element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) {
    element.value = '';
    // Trigger input event for reactive behavior
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }
  
  vscode.postMessage({
    command: 'clearElementResult',
    params: message.params,
    result: null
  });
}

// Handler for getElementFromParent - finds element within a parent
function handleGetElementFromParent(message: Message): void {
  const parentElement = document.getElementById(message.params.parentId);
  let elementData: ElementData | null = null;
  
  if (parentElement) {
    const element = parentElement.querySelector(message.params.selector);
    if (element) {
      elementData = createElementData(element);
    }
  }
  
  vscode.postMessage({
    command: 'getElementFromParentResult',
    params: message.params,
    result: elementData
  });
}

// Handler for executeScript - executes JavaScript code
function handleExecuteScript(message: Message): void {
  let result: any = null;
  try {
    // result = eval(message.params.script);
    result = (0, eval)(message.params.script);
  } catch (error) {
    console.error('Script execution error:', error);
    result = (error as Error).message;
  }
  
  vscode.postMessage({
    command: 'executeScriptResult',
    params: message.params,
    result: result
  });
}

// Fonctions utilitaires communes
export function hideElement(selector: string): void {
  const element = document.querySelector(selector);
  if (element) {
    element.classList.add('hidden');
  }
}

export function showElement(selector: string): void {
  const element = document.querySelector(selector);
  if (element) {
    element.classList.remove('hidden');
  }
}

export function toggleElement(selector: string): void {
  const element = document.querySelector(selector);
  if (element) {
    element.classList.toggle('hidden');
  }
}

// Gestionnaires d'événements communs
document.addEventListener('DOMContentLoaded', () => {
  // Gestion des touches communes (à implémenter plus tard)
  document.addEventListener('keydown', (event) => {
    // TODO: Gestion du système Vim-like
    // f: focus search
    // j/k: navigation
    // etc.
  });
  
  // Gestion de la console
  const consoleInput = document.querySelector('#panel-console') as HTMLInputElement;
  if (consoleInput) {
    consoleInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        const command = consoleInput.value.trim();
        if (command) {
          // Envoyer la commande à l'extension
          vscode.postMessage({
            command: 'console-command',
            value: command
          });
          consoleInput.value = '';
        }
      }
    });
  }
});