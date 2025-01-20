/* eslint-disable no-console */
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $isAtNodeEnd } from '@lexical/selection';
import { mergeRegister } from '@lexical/utils';
import {
  activeEditor$,
  addActivePlugin$,
  addComposerChild$,
  addExportVisitor$,
  addImportVisitor$,
  addLexicalNode$,
  realmPlugin,
} from '@mdxeditor/editor';
import {
  Action,
  Cell,
  Signal,
  useCellValue,
  usePublisher,
  withLatestFrom,
} from '@mdxeditor/gurx';
import * as Popover from '@radix-ui/react-popover';
import {
  $createTextNode,
  $getNodeByKey,
  $getSelection,
  $insertNodes,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  BaseSelection,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_NORMAL,
  createCommand,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_TAB_COMMAND,
  NodeKey,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';
import React, { useEffect, useRef, useState } from 'react';

import { Button } from '~/components/Button';
import { Portal } from '~/components/Portal';
import { debounce } from '~/utils';

import { LexicalSuggestionVisitor } from './LexicalSuggestionVisitor';
import { MdastSuggestionVisitor } from './MdastSuggestionVisitor';
import {
  $createSuggestionNode,
  $isSuggestionNode,
  SuggestionNode,
} from './SuggestionNode';

interface StartSuggestionParameters {
  context: string;
}

interface SuggestionState {
  enabled: boolean;
  loading: boolean;
  context: string;
  text: string;
  startAt: number;
  endAt: number;
}

interface SuggestionResult {
  text: string;
}

export type SuggestionService = (context: string) => Promise<string>;

let existingSuggestionKey: NodeKey | null = null;

export const defaultState = {
  enabled: (() => {
    const cacheEnabled = localStorage.getItem('app.suggestionEnabled');
    if (cacheEnabled) return cacheEnabled === 'true';

    // default is true
    return true;
  })(),
  loading: false,
  index: 0,
  text: '',
  startAt: -1,
  endAt: 0,
  context: '',
};

export const KEY_UP_COMMAND = createCommand('KEY_UP_COMMAND');

function rangeMatcher(text: string, partial: string) {
  const partialLower = partial.toLocaleLowerCase();
  const textLower = text.toLocaleLowerCase();
  const len = partial.length;
  let i = partial.length;
  while (i-- && i >= 0) {
    if (!textLower.includes(partialLower.slice(-(len - i)))) {
      break;
    }
  }
  const matchedPartial = partialLower.slice(i + 1);
  const trimMatchedPartial = matchedPartial.trim();
  if (trimMatchedPartial !== '' && textLower.startsWith(matchedPartial)) {
    const startAt = textLower.indexOf(matchedPartial);
    if (startAt === -1) {
      return { startAt: -1, endAt: 0 };
    }
    return {
      startAt,
      endAt: startAt + matchedPartial.length,
    };
  }
  return { startAt: -1, endAt: 0 };
}

export const suggestionService$ = Cell<SuggestionService | null>(null);

export const suggestionState$ = Cell<SuggestionState>(defaultState);

export const regenerateSuggestion$ = Action((r) => {
  r.sub(
    r.pipe(regenerateSuggestion$, withLatestFrom(suggestionState$)),
    ([, state]) => {
      const context = state.context;
      r.pub(clearSuggestion$);
      r.pub(startSuggestion$, { context });
    }
  );
});

export const toggleSuggestion$ = Signal<boolean>((r) => {
  r.sub(
    r.pipe(toggleSuggestion$, withLatestFrom(suggestionState$)),
    ([enabled, state]) => {
      r.pub(suggestionState$, { ...state, enabled });
      r.pub(clearSuggestion$);
    }
  );
});

export const startSuggestion$ = Signal<StartSuggestionParameters>((r) => {
  r.sub(
    startSuggestion$,
    debounce((values: StartSuggestionParameters) => {
      const suggestionService = r.getValue(suggestionService$);
      if (!suggestionService) {
        throw new Error('No suggestion service');
      }
      const state = r.getValue(suggestionState$);
      r.pub(suggestionState$, { ...state, context: values.context });
      suggestionService(values.context)
        .then((response: string) => {
          r.pub(createSuggestion$, { text: response });
        })
        .catch((e: unknown) => {
          console.log((e as Error).message);
        });
    }, 1000)
  );
});

export const clearSuggestion$ = Action((r) => {
  r.sub(
    r.pipe(clearSuggestion$, withLatestFrom(activeEditor$, suggestionState$)),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ([_, theEditor, state]) => {
      theEditor?.update(() => {
        r.pub(suggestionState$, { ...defaultState, enabled: state.enabled });
        if (existingSuggestionKey !== null) {
          const suggestionNode = $getNodeByKey(existingSuggestionKey);
          if (suggestionNode) {
            const previousNode = suggestionNode.getPreviousSibling();
            suggestionNode.remove();
            if (previousNode) {
              previousNode.selectEnd();
            }
            existingSuggestionKey = null;
          }
        }
      });
    }
  );
});

export const updateSuggestion$ = Signal<{
  startAt: number;
  endAt: number;
  context: string;
}>((r) => {
  r.sub(
    r.pipe(updateSuggestion$, withLatestFrom(suggestionState$, activeEditor$)),
    ([values, state, theEditor]) => {
      theEditor?.update(() => {
        const { startAt, endAt, context } = values;
        r.pub(suggestionState$, { ...state, startAt, endAt, context });
        const node = $createSuggestionNode(
          startAt > -1 ? state.text.slice(endAt) : state.text
        );

        if (existingSuggestionKey !== null) {
          const suggestionNode = $getNodeByKey(existingSuggestionKey);
          if (suggestionNode) {
            existingSuggestionKey = node.getKey();
            suggestionNode.replace(node);
            return;
          }
        }
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          return;
        }
        const selectionCopy = selection.clone();
        existingSuggestionKey = node.getKey();
        $insertNodes([node]);
        selectionCopy.insertNodes([node]);
        $setSelection(selectionCopy);
      });
    }
  );
});

export const acceptSuggestion$ = Action((r) => {
  r.sub(
    r.pipe(acceptSuggestion$, withLatestFrom(suggestionState$, activeEditor$)),
    ([, state, theEditor]) => {
      theEditor?.update(() => {
        if (existingSuggestionKey !== null) {
          const suggestionNode = $getNodeByKey(existingSuggestionKey);
          if (suggestionNode) {
            const textNode = $createTextNode(state.text.slice(state.endAt));
            suggestionNode.replace(textNode);
            textNode.selectNext();

            r.pub(clearSuggestion$);
          }
        }
      });
    }
  );
});

export const createSuggestion$ = Signal<SuggestionResult>((r) => {
  r.sub(
    r.pipe(createSuggestion$, withLatestFrom(activeEditor$, suggestionState$)),
    ([values, theEditor, state]) => {
      if (!state.context) return;
      const { startAt, endAt } = rangeMatcher(values.text, state.context);
      r.pub(suggestionState$, {
        ...state,
        loading: false,
        text: values.text,
        startAt,
        endAt,
      });
      theEditor?.update(
        () => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
            return;
          }
          if (existingSuggestionKey !== null) {
            const suggestionNode = $getNodeByKey(existingSuggestionKey);
            if (suggestionNode) {
              suggestionNode.remove();
            }
          }
          const selectionCopy = selection.clone();
          const node = $createSuggestionNode(
            startAt > -1 ? values.text.slice(endAt) : values.text
          );
          existingSuggestionKey = node.getKey();
          $insertNodes([node]);
          selectionCopy.insertNodes([node]);
          $setSelection(selectionCopy);
        },
        { tag: 'history-merge' }
      );
    }
  );
});

const defaultPostion = {
  left: -9999,
  top: 0,
  width: 0,
  height: 0,
};

const FloatingTooltip = () => {
  const [editor] = useLexicalComposerContext();
  const clearSuggestion = usePublisher(clearSuggestion$);
  const [isScrolling, setIsScrolling] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const acceptSuggestion = usePublisher(acceptSuggestion$);
  const regenerateSuggestion = usePublisher(regenerateSuggestion$);
  const ref = useRef<HTMLDivElement>(null);
  const state = useCellValue(suggestionState$);
  const suggestionOpen =
    !state.loading && state.text.length > 0 && state.text.length > state.endAt;
  const open = suggestionOpen && !isScrolling && !isResizing;
  const [position, setPosition] =
    useState<Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>>(
      defaultPostion
    );

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        editor.update(() => {
          if (existingSuggestionKey) {
            const suggestionNode = $getNodeByKey(existingSuggestionKey);
            if (suggestionNode) {
              const nativeSuggestionNode = document.querySelector(
                '.inline-suggestion-node'
              );
              if (nativeSuggestionNode) {
                const editorRect: DOMRect | undefined = editor
                  .getRootElement()
                  ?.getBoundingClientRect();
                const domRect: DOMRect | undefined = nativeSuggestionNode
                  .closest('[dir]')
                  ?.getBoundingClientRect();
                if (domRect && editorRect) {
                  if (
                    domRect.top >
                    document.documentElement.offsetHeight - 80
                  ) {
                    setPosition(defaultPostion);
                    clearSuggestion();
                  } else {
                    setPosition({
                      top: domRect.top,
                      height: domRect.height + 10,
                      left: editorRect.left,
                      width: editorRect.width,
                    });
                  }
                }
              }
            }
          }
        });
      });
    } else {
      setPosition(defaultPostion);
    }
  }, [clearSuggestion, editor, open, state]);

  useEffect(() => {
    // eslint-disable-next-line no-undef
    let timer: NodeJS.Timeout | null = null;
    function handleScroll() {
      setIsScrolling(true);
      if (timer) {
        clearTimeout(timer);
      }

      timer = setTimeout(() => {
        setIsScrolling(false);
      }, 500);
    }

    const root = editor.getRootElement();
    if (root) {
      root.addEventListener('scroll', handleScroll, false);
    }

    return () => {
      if (root) {
        root.removeEventListener('scroll', handleScroll, false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // eslint-disable-next-line no-undef
    let timer: NodeJS.Timeout | null = null;
    function handleResize() {
      setIsResizing(true);
      if (timer) {
        clearTimeout(timer);
      }

      timer = setTimeout(() => setIsResizing(false), 500);
    }

    window.addEventListener('resize', handleResize, false);

    return () => {
      window.removeEventListener('resize', handleResize, false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Popover.Root open={open}>
      <Portal>
        <Popover.Anchor asChild>
          <div
            ref={ref}
            style={{ position: 'absolute', pointerEvents: 'none', ...position }}
          ></div>
        </Popover.Anchor>
      </Portal>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="center"
          collisionPadding={{ bottom: 65 }}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <div
            className="pointer-events-none flex items-center gap-2 rounded-md border border-solid border-divider bg-common-background p-1 shadow-md"
            tabIndex={-1}
          >
            <Button
              onClick={() => acceptSuggestion()}
              className="pointer-events-auto !capitalize"
              tabIndex={-1}
            >
              Accept (Tab)
            </Button>
            <Button
              onClick={() => regenerateSuggestion()}
              className="pointer-events-auto !capitalize"
              tabIndex={-1}
            >
              Regenerate
            </Button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

const Initialize = () => {
  const [editor] = useLexicalComposerContext();
  const previousSelectionRef = useRef<BaseSelection | null>(null);
  const suggestionState = useCellValue(suggestionState$);
  const startSuggestion = usePublisher(startSuggestion$);
  const updateSuggestion = usePublisher(updateSuggestion$);
  const clearSuggestion = usePublisher(clearSuggestion$);
  const acceptSuggestion = usePublisher(acceptSuggestion$);

  const memoRef = useRef<{
    suggestionState: SuggestionState;
    ignoreTextChangeOnce: boolean;
  }>({
    suggestionState,
    ignoreTextChangeOnce: false,
  });
  memoRef.current.suggestionState = suggestionState;

  useEffect(() => {
    function handleTextChange() {
      const state = memoRef.current.suggestionState;
      if (!state.enabled) {
        return;
      }
      if (memoRef.current.ignoreTextChangeOnce) {
        memoRef.current.ignoreTextChangeOnce = false;
        return;
      }

      editor.update(
        () => {
          const selection = $getSelection();

          if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
            clearSuggestion();
            return;
          }
          const node = selection.getNodes()[0];
          const anchor = selection.anchor;
          if (
            !$isTextNode(node) ||
            !node.isSimpleText() ||
            !$isAtNodeEnd(anchor)
          ) {
            clearSuggestion();
            return;
          }

          const state = memoRef.current.suggestionState;

          const context = node.getTextContent();

          if (context) {
            if (!state.loading && state.text.length > 0) {
              const range = rangeMatcher(state.text, context);
              if (range.startAt > -1) {
                updateSuggestion({ ...range, context });
                return;
              }
            }
            clearSuggestion();
            startSuggestion({ context });
          }
        },
        { tag: 'history-merge' }
      );
    }

    function handleRangeChange() {
      const state = memoRef.current.suggestionState;
      if (!state.enabled) {
        return false;
      }
      if (!state.context) return false;

      editor.update(
        () => {
          const currentSelection = $getSelection();
          const previousSelection = previousSelectionRef.current;
          if (currentSelection !== previousSelection) {
            previousSelectionRef.current = currentSelection;
            if (
              !$isRangeSelection(currentSelection) ||
              !currentSelection.isCollapsed()
            ) {
              clearSuggestion();
              return;
            }
            const nodes = currentSelection.getNodes();
            if (nodes.length > 0) {
              const node = nodes[0];
              const anchor = currentSelection.anchor;
              if (
                !$isTextNode(node) ||
                !node.isSimpleText() ||
                !$isAtNodeEnd(anchor) ||
                $isSuggestionNode(node)
              ) {
                clearSuggestion();
                return;
              }

              const currentContext = node.getTextContent();
              if (
                !state.context ||
                (state.context &&
                  !state.context.includes(currentContext) &&
                  !currentContext.includes(state.context))
              ) {
                clearSuggestion();
              }
            }
          }
        },
        { tag: 'history-merge' }
      );
      return true;
    }

    function $handleKeyPressCommand(e: KeyboardEvent) {
      const state = memoRef.current.suggestionState;
      if (!state.enabled) {
        return false;
      }
      if (existingSuggestionKey !== null) {
        const suggestionNode = $getNodeByKey(existingSuggestionKey);
        if (suggestionNode) {
          acceptSuggestion();
          memoRef.current.ignoreTextChangeOnce = true;
          e.preventDefault();
          return true;
        }
      }
      return false;
    }

    return mergeRegister(
      editor.registerTextContentListener(handleTextChange),
      editor.registerCommand(
        KEY_TAB_COMMAND,
        $handleKeyPressCommand,
        COMMAND_PRIORITY_CRITICAL
      ),
      editor.registerCommand(
        KEY_ARROW_RIGHT_COMMAND,
        $handleKeyPressCommand,
        COMMAND_PRIORITY_CRITICAL
      ),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        handleRangeChange,
        COMMAND_PRIORITY_NORMAL
      ),
      () => {
        clearSuggestion();
      }
    );
  }, [
    acceptSuggestion,
    clearSuggestion,
    editor,
    startSuggestion,
    updateSuggestion,
  ]);

  return <FloatingTooltip />;
};

const inlineCopilotPlugin = realmPlugin<{ service: SuggestionService }>({
  init(realm, params) {
    realm.pubIn({
      [addActivePlugin$]: 'inline-suggestion',
      [addImportVisitor$]: MdastSuggestionVisitor,
      [addLexicalNode$]: SuggestionNode,
      [addExportVisitor$]: LexicalSuggestionVisitor,
      [addComposerChild$]: () => <Initialize />,
    });

    realm.pub(suggestionService$, params?.service ?? null);
  },
  update(realm, params) {
    realm.pub(suggestionService$, params?.service ?? null);
  },
});

export default inlineCopilotPlugin;
