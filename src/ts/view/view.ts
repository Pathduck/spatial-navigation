
import ENTITY = require('../entity/entity');
import ATTRIBUTE = require('../attribute/attribute');

import MODEL = require('../model/model');
import CONTROLLER = require('../controller/controller');

import STATE = require('../state/module');

import MAP = require('./map');

var id = 0;
const views: { [id: number]: View } = {};

export const state = STATE.state;

export class View {
  constructor(target: Window|Document|Element) {
    views[this.id_] = this;
    this.target_ = target;
    this.handler_ = this.handler_.bind(this);
    this.observe_();
    this.style.innerHTML = [
      '.' + ATTRIBUTE.CURSOR_ID + ' {',
      '  outline: 2px solid turquoise !important;',
      '  outline-offset: -1px !important;',
      '  background-color: rgba(255, 255, 0, 0.4) !important;',
      '}',
      'img.' + ATTRIBUTE.CURSOR_ID + ' {',
      '  outline-offset: -2px !important;',
      '}'
    ].join('\n');
  }
  private id_ = ++id;
  private target_: Window|Document|Element;
  private style = document.createElement('style');

  private handler_(event: KeyboardEvent) {
    undisplayUrl();

    if (!state()) { return; }
    if (event.defaultPrevented) { return; }
    if (isInserting(event.srcElement)) { return; }

    const cursor = <HTMLElement>document.querySelector('.' + ATTRIBUTE.CURSOR_ID),
          entity = new ENTITY.Entity(this.id_),
          attribute = ATTRIBUTE.attribute(event, cursor);

    if (attribute.command === ATTRIBUTE.COMMAND.INVALID) { return; }
    if (!cursor && attribute.command === ATTRIBUTE.COMMAND.ENTER) { return; }
    if (!cursor && attribute.command === ATTRIBUTE.COMMAND.ENTER_S) { return; }

    event.preventDefault();
    event.stopImmediatePropagation();

    CONTROLLER.command(entity, attribute);
    return;

    function isInserting(elem: Element) {
      switch (elem.tagName.toLowerCase()) {
        case 'input':
          switch (elem.getAttribute('type')) {
            case 'checkbox':
            case 'radio':
            case 'file':
            case 'submit':
            case 'reset':
            case 'button':
            case 'image':
            case 'range':
            case 'color':
              return false;
          }
          return true;
        case 'select':
          return false;
        case 'datalist':
        case 'option':
        case 'textarea':
          return true;
      }
      switch (elem.getAttribute('role')) {
        case 'textbox':
          return true;
      }
      do {
        if ((<any>elem).contentEditable === 'true') {
          return true;
        }
      }
      while (elem = elem.parentElement);
      return false;
    }
  }
  private observe_() {
    this.target_.addEventListener('keydown', this.handler_, true);
  }
  private release_() {
    this.target_.removeEventListener('keydown', this.handler_, true);
  }
  private destructor() {
    this.release_();
    delete views[this.id_];
  }

  update(command: ATTRIBUTE.COMMAND) {
    if (!this.style.parentElement) {
      document.head.appendChild(this.style);
    }
    const state = MODEL.store.state(this.id_),
          diff = MODEL.store.diff(this.id_);
    var key: string;
    while (key = diff.shift()) {
      switch (key) {
        case 'targets':
          markTarget(state.targets);
      }
    }

    function markTarget(targets: HTMLElement[]) {
      switch (command) {
        case ATTRIBUTE.COMMAND.UP:
        case ATTRIBUTE.COMMAND.UP_S:
        case ATTRIBUTE.COMMAND.DOWN:
        case ATTRIBUTE.COMMAND.DOWN_S:
        case ATTRIBUTE.COMMAND.LEFT:
        case ATTRIBUTE.COMMAND.RIGHT:
          const target = targets[0];
          if (!target) { break; }
          select(target);
          (<any>target).scrollIntoViewIfNeeded();
          break;

        case ATTRIBUTE.COMMAND.EXPAND:
          MAP.map(targets, trigger, false);
          break;

        case ATTRIBUTE.COMMAND.CONTRACT:
          MAP.map(targets, trigger, true);
          break;

        case ATTRIBUTE.COMMAND.ENTER:
          trigger(<HTMLElement>document.querySelector('.' + ATTRIBUTE.CURSOR_ID), false);
          break;

        case ATTRIBUTE.COMMAND.ENTER_S:
          trigger(<HTMLElement>document.querySelector('.' + ATTRIBUTE.CURSOR_ID), true);
          break;

        default:
          unselect();
      }
      return;

      function select(elem: HTMLElement) {
        unselect();
        displayUrl(elem);
        elem.classList.add(ATTRIBUTE.CURSOR_ID);
      }
      function unselect() {
        const selector = document.querySelector('.' + ATTRIBUTE.CURSOR_ID);
        if (!selector) { return; }
        selector.classList.remove(ATTRIBUTE.CURSOR_ID);
        undisplayUrl();
      }
      function trigger(cursor: HTMLElement, shiftKey: boolean) {
        if (!cursor) { return; }
        if (!document.elementFromPoint(cursor.getBoundingClientRect().left, cursor.getBoundingClientRect().top)) { return; }
        if (cursor.tagName.toLowerCase() === 'a'
          || cursor.parentElement.tagName.toLowerCase() === 'a'
          || cursor.onclick
          || cursor.tagName.toLowerCase() === 'option'
          || -1 < ['button'].indexOf(cursor.getAttribute('role'))
        ) {
          select(cursor);
        }
        else {
          unselect();
        }
        cursor.focus();
        click(cursor, !shiftKey && !(cursor.tagName.toLowerCase() === 'a' && cursor.getAttribute('href') === '#'));
      }
    }
  }

  destroy() {
    this.destructor();
  }
}

export function emit(entity: ENTITY.EntityInterface, attribute: ATTRIBUTE.AttributeInterface): boolean {
  const viewId = entity.viewId;
  if (viewId in views) {
    views[viewId].update(attribute.command);
    return true;
  }
  else {
    return false;
  }
}

function displayUrl(cursor: HTMLElement) {
  if (!cursor) { return; }
  if (cursor.tagName.toLowerCase() !== 'a') { return displayUrl(cursor.parentElement); }
  const display = document.createElement('span');
  display.id = ATTRIBUTE.URLDISPLAY_ID;
  display.style.cssText = [
    'position: fixed;',
    'z-index: 9999;',
    'left: 0px;',
    'bottom: 0px;',
    'min-width: 35%;',
    'padding: 3px 3px 0 3px;',
    'background-color: rgb(225, 225, 225);',
    'border-radius: 3px 3px 0px 3px;',
    'font-family: Meiryo, Helvetica, sans-serif;',
    'font-size: 11.5px;',
    'color: rgb(130, 130, 130);',
    'text-align: left;'
  ]
  .map(str => str.split(';')[0] + ' !important;')
  .join('');
  display.textContent = (<HTMLAnchorElement>cursor).href;
  document.body.appendChild(display);
}
function undisplayUrl() {
  const display = document.querySelector('#' + ATTRIBUTE.URLDISPLAY_ID);
  if (!display) { return; }
  display.remove();
}

function click(elem: HTMLElement, newtab: boolean) {
  const target: boolean|string = elem.hasAttribute('target') && elem.getAttribute('target');
  if (elem.tagName.toLowerCase() === 'a') {
    elem.removeAttribute('target');
  }
  ["mouseover", "mousedown", "mouseup", "click"]
    .forEach(sequence => {
      const mouseEvent: any = document.createEvent("MouseEvents");
      mouseEvent.initMouseEvent(
        sequence,
        true, true, window, 1, 0, 0, 0, 0,
        newtab,
        false,
        false,
        false,
        0, null
      );
      elem.dispatchEvent(mouseEvent);
    });
  if (elem.tagName.toLowerCase() === 'a') {
    typeof target === 'boolean' ? elem.removeAttribute('target') : elem.setAttribute('target', target);
  }
}
