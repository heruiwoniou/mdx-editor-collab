import { LexicalExportVisitor } from '@mdxeditor/editor';

import { MdastSuggestion } from './MdastSuggestionVisitor';
import { $isSuggestionNode, SuggestionNode } from './SuggestionNode';

export const LexicalSuggestionVisitor: LexicalExportVisitor<
  SuggestionNode,
  MdastSuggestion
> = {
  testLexicalNode: $isSuggestionNode,
  visitLexicalNode: ({ lexicalNode, mdastParent, actions }) => {
    const text: MdastSuggestion = {
      type: 'text',
      value: lexicalNode.getTextContent(),
      isSuggestion: true,
      key: lexicalNode.getKey(),
    };
    actions.appendToParent(mdastParent, text);
  },
};
