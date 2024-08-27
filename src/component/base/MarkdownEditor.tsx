import { ForwardedRef, forwardRef, useLayoutEffect, useImperativeHandle, useRef, useEffect } from 'react';
import './MarkdownEditor.css';
import MagicDraftEditor, { TEditorForwardRef } from 'markdown-magic-draft';
import { TSelectionStatus } from 'markdown-magic-draft/dist/hooks/useEditorDaemon';

export type TEditorComponentRef = {
  GetDOM: () => { root: HTMLElement | null; editor: HTMLElement | null; mask: HTMLElement | null } | null;
  ExtractMD: () => Promise<string>;
  ExtractSelection: () => Object | null | undefined;
  SetSelection: (SelectionStatus: Object) => void;
  InsertText: (TextContent: string, syncAfter?: boolean) => void;
};

const MarkdownEditor = forwardRef(
  (
    {
      fullPath,
      MDSource,
      LinkElementClicked,
      onEditorUnmounted,
      onEditorMounted,
      EditorCallBacks,
      FileLinks,
    }: {
      fullPath: string; //used as an id when passing up data to parent
      MDSource: string;
      LinkElementClicked?: (linkType: string, linkTarget: string) => void | Promise<void>;
      onEditorMounted?: () => Promise<void> | void;
      onEditorUnmounted?: (extractedData: Object) => Promise<void> | void;
      EditorCallBacks?: {
        OnInit?: (SourceHTMLString: string) => void;
        OnReload?: (SourceHTMLString: string) => void;
      };
      FileLinks?: {
        initCallback?: (linkTarget: string) => void | Promise<void>;
        removeCallback?: (linkTarget: string) => void | Promise<void>;
      };
    },
    ref: ForwardedRef<TEditorComponentRef>,
  ) => {
    const EditorRef = useRef<TEditorForwardRef>(null);

    // cached caret position before FocusOut, or from SetSelection.
    const selectionStatusCacheRef = useRef<TSelectionStatus | null | undefined>(null);

    useImperativeHandle(ref, () => {
      return {
        GetDOM: () => {
          if (!EditorRef.current) return null;
          return EditorRef.current.GetDOM();
        },
        ExtractMD: async () => {
          if (EditorRef.current) return await EditorRef.current.ExtractMD();
          return Promise.resolve('');
        },
        ExtractSelection: () => {
          if (EditorRef.current) return EditorRef.current.ExtractCaretData();
        },
        SetSelection: (SelectionStatus: Object) => {
          if (!SelectionStatus) return;
          if (
            !('StartingOffset' in SelectionStatus) ||
            !('AnchorNodeXPath' in SelectionStatus) ||
            !('StartingOffset' in SelectionStatus)
          ) {
            console.error('Not a valid SelectionStatus');
            return;
          }

          // cache
          selectionStatusCacheRef.current = SelectionStatus as TSelectionStatus;
          //
          if (EditorRef.current) return EditorRef.current.SetCaretData(SelectionStatus as TSelectionStatus);
        },
        InsertText: (TextContent: string, syncAfter: boolean = true) => {
          if (!EditorRef.current) return;
          const editor = EditorRef.current.GetDOM().editor;
          if (!editor) return;

          const cachedSelection = selectionStatusCacheRef.current;
          if (editor !== document.activeElement && cachedSelection) {
            EditorRef.current!.SetCaretData(cachedSelection, true);
          }
          EditorRef.current.InsertText(TextContent, syncAfter);
        },
      };
    });

    // cache the caret position each time before focusout, this is so that InsertText can insert to correct location
    useEffect(() => {
      function CacheCaretPosition() {
        selectionStatusCacheRef.current = EditorRef.current?.ExtractCaretData();
      }

      EditorRef.current?.GetDOM()?.editor?.addEventListener('focusout', CacheCaretPosition);

      return () => {
        EditorRef.current?.GetDOM()?.editor?.removeEventListener('focusout', CacheCaretPosition);
      };
    }, []);

    // run parent passed functions, also pass info the parent before unmounting
    useLayoutEffect(() => {
      return () => {
        if (EditorRef.current) {
          const selectionStatus = EditorRef.current.ExtractCaretData();
          const mdData = EditorRef.current.ExtractMD();

          if (typeof onEditorUnmounted === 'function')
            onEditorUnmounted({
              fullPath,
              selectionStatus,
              mdData,
            });
        }
      };
    }, []);

    // On mount callback
    useEffect(() => {
      (async () => {
        if (typeof onEditorMounted === 'function') await onEditorMounted();
      })();
    });

    // handle Ctrl click on link or file links, calls the LinkElementClicked
    // TODO: hacky, find a more better solution
    useEffect(() => {
      const editorDOM = EditorRef.current?.GetDOM()?.editor;

      function LinkClickHandler(ev: HTMLElementEventMap['click']) {
        if (!ev.ctrlKey) return; // must be holding down ctrl key

        let linkType = '';
        let target = '';

        const clickTarget = ev.target as HTMLElement;
        if (clickTarget.tagName.toLowerCase() === 'a') {
          linkType = 'http';
          // get href as text only, otherwise it will resolve according to current router's address
          target = (clickTarget as HTMLLinkElement).getAttribute('href') || '';
        }

        const datasetElement = clickTarget?.parentElement?.dataset['fileLink'];
        if (clickTarget.tagName.toLowerCase() === 'span' && datasetElement) {
          linkType = 'file';
          target = datasetElement;
        }

        if (typeof LinkElementClicked === 'function') LinkElementClicked(linkType, target);
      }

      editorDOM?.addEventListener('click', LinkClickHandler);

      return () => {
        editorDOM?.removeEventListener('click', LinkClickHandler);
      };
    });

    return (
      <>
        <MagicDraftEditor
          SourceData={MDSource}
          ref={EditorRef}
          DaemonShouldLog={false}
          EditorCallBacks={{
            OnInit: EditorCallBacks?.OnInit,
            OnReload: EditorCallBacks?.OnReload,
          }}
          ComponentCallbacks={{
            FileLinks: FileLinks,
          }}
        />
        {/* a screen space holding element, so that the user can scroll it up even when editing the end of a file*/}
        <div
          className={'h-screen select-none'}
          tabIndex={-1}
          onMouseDown={ev => ev.preventDefault()}
          onMouseUp={ev => ev.preventDefault()}
        ></div>
      </>
    );
  },
);

export default MarkdownEditor;
