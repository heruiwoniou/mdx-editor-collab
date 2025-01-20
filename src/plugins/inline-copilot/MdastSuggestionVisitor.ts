import { MdastImportVisitor } from '@mdxeditor/editor';
import * as Mdast from 'mdast';

import { $createSuggestionNode } from './SuggestionNode';

export interface MdastSuggestion extends Mdast.Text {
  isSuggestion: true;
  key: string;
}

export const MdastSuggestionVisitor: MdastImportVisitor<MdastSuggestion> = {
  testNode: (node) => (node as MdastSuggestion).isSuggestion,
  visitNode({ mdastNode, actions }) {
    actions.addAndStepInto(
      $createSuggestionNode(mdastNode.value, mdastNode.key)
    );
  },
};
