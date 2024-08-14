import { ForwardedRef, forwardRef, useLayoutEffect, useImperativeHandle, useRef, useEffect } from 'react';
import './MarkdownEditor.css';
import Editor, { TEditorForwardRef } from 'react-magic-draft';
import { TSelectionStatus } from 'react-magic-draft/dist/hooks/useEditorDaemon';

export type TEditorComponentRef = {
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
      onEditorUnmounted,
      onEditorMounted,
      FileLinks,
    }: {
      fullPath: string; //used as an id when passing up data to parent
      MDSource: string;
      onEditorMounted?: () => Promise<void> | void;
      onEditorUnmounted?: (extractedData: Object) => Promise<void> | void;
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
        console.warn('FOCUSOUT');
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

    return (
      <>
        <Editor
          SourceData={MDSource}
          ref={EditorRef}
          ComponentCallbacks={{
            FileLinks: FileLinks,
          }}
        />
      </>
    );
  },
);

export default MarkdownEditor;
