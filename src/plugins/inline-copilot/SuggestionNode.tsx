import {
  DecoratorNode,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from 'lexical';
import React from 'react';

export type SerializedSuggestionNode = Spread<
  {
    uuid: string;
    value: string;
  },
  SerializedLexicalNode
>;

export const uuid = Math.random()
  .toString(36)
  .replace(/[^a-z]+/g, '')
  .substr(0, 5);

/** @noInheritDoc */
export class SuggestionNode extends DecoratorNode<React.JSX.Element | null> {
  __uuid: string;
  __value: string;

  static clone(node: SuggestionNode): SuggestionNode {
    return new SuggestionNode(node.__uuid, node.__value, node.__key);
  }

  static getType(): 'suggestion' {
    return 'suggestion';
  }

  static importJSON(serializedNode: SerializedSuggestionNode): SuggestionNode {
    const node = $createSuggestionNode(serializedNode.value);
    return node;
  }

  exportJSON(): SerializedSuggestionNode {
    return {
      ...super.exportJSON(),
      type: 'suggestion',
      uuid: this.__uuid,
      value: this.__value,
      version: 1,
    };
  }

  constructor(uuid: string, value: string, key?: NodeKey) {
    super(key);
    this.__uuid = uuid;
    this.__value = value;
  }

  updateDOM(): boolean {
    return false;
  }

  createDOM(): HTMLElement {
    return document.createElement('span');
  }

  decorate() {
    if (this.__uuid !== uuid) {
      return null;
    }
    return <SuggestionComponent value={this.__value} />;
  }
}

export function $createSuggestionNode(
  text: string,
  key?: string
): SuggestionNode {
  return new SuggestionNode(uuid, text, key);
}

export function $isSuggestionNode(
  node: LexicalNode | null | undefined
): node is SuggestionNode {
  return node instanceof SuggestionNode;
}

function SuggestionComponent({ value }: { value: string }) {
  return (
    <span className="inline-suggestion-node text-gray-500" spellCheck="false">
      {value}
    </span>
  );
}
